/** Private opt-in diagnostic child; never a normal game entry point. */
import assert from 'node:assert/strict';
import {randomBytes, createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {database, migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {LoadProfile} from './load-profile.ts';
import {sessionTarget, safeDiagnosticError} from './session-target.ts';
import {preparePublicRefresh,verifyPublicRefresh} from './public-refresh-fixture.ts';
import {SessionResources} from './session-resources.ts';

type Phase = 'setup' | 'load' | 'idle' | 'verification' | 'cleanup';
export const SESSION_ROSTER = Array.from({length: 20}, (_, n) => ({
  id: 'session-' + String(n).padStart(2, '0'), name: 'Session fixture ' + n,
}));
export type SessionMessage = {id: number; kind: 'phase'; phase: Phase} |
  {id: number; kind: 'metrics' | 'checkpoint' | 'verify'} |
  {id: number; kind: 'stop'; completed: boolean};

function sendMessage(message: unknown) {
  return new Promise<void>((resolve, reject) => {
    if (!process.connected || !process.send) return resolve();
    process.send(message, error => error ? reject(error) : resolve());
  });
}

export async function sessionChild() {
  if (!process.send || process.env.IH2_SESSION_CHILD !== '1') throw Error('Private IPC child required.');
  const target = sessionTarget(process.env.IH2_LOAD_DATABASE_URL, process.env.IH2_LOAD_RESET,
    {ci: process.env.CI, container: process.env.IH2_PG_CONTAINER});
  const publicWorkload = process.env.IH2_SESSION_WORKLOAD === 'public';
  if (process.env.IH2_SESSION_WORKLOAD && !publicWorkload) throw Error('Unknown diagnostic workload.');
  assert.ok(!publicWorkload || process.env.CI==='true'&&new URL(target.url).port==='5432','Public study child requires the explicit CI service.');
  const output = resolve(process.env.IH2_SESSION_OUT ?? 'test-results/server/session');
  mkdirSync(output, {recursive: true});
  let phase: Phase = 'setup', closing = false, verified = false;
  const sql: Partial<Record<Phase, number>> = {};
  const pool = database(target.url);
  pool.on('connect', client => {
    const query = client.query.bind(client) as (...args: any[]) => any;
    (client as any).query = (...args: any[]) => {
      sql[phase] = (sql[phase] ?? 0) + 1;
      return query(...args);
    };
  });
  const profile = new LoadProfile(target.url, () => phase, output);
  profile.attach(pool);
  const resources = new SessionResources(() => phase);
  let app: ReturnType<typeof createTownServer> | undefined;
  let golden: Awaited<ReturnType<typeof tables>> | undefined;
  let queue = Promise.resolve();
  const watchdog = setTimeout(() => {
    void sendMessage({kind: 'fatal', errorCode: 'SESSION_WATCHDOG'}).catch(() => {})
      .then(() => stop(false)).catch(() => {}).finally(() => { if (process.connected) process.disconnect(); process.exitCode = 1; });
  }, 360000);
  watchdog.unref();
  const setPhase = (next: Phase) => { resources.capture(); phase = next; };
  const stats = () => ({
    pid: process.pid, sql: {...sql}, phase, server: structuredClone(app?.metrics ?? null),
    pool: {total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount, maximum: 5},
  });

  async function tables() {
    const names = (await pool.query("select tablename from pg_tables where schemaname='ih2' order by tablename")).rows.map(r => String(r.tablename));
    assert.equal(names.length, 17);
    const result: Record<string, {rows: number; sha256: string}> = {};
    for (const name of names) {
      assert.match(name, /^[a-z_]+$/);
      const row = (await pool.query(`select count(*)::int as n,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text as data from ih2.${name} t`)).rows[0];
      result[name] = {rows: row.n, sha256: createHash('sha256').update(row.data).digest('hex')};
    }
    return result;
  }

  async function conservation() {
    if (publicWorkload) return verifyPublicRefresh(pool, SESSION_ROSTER.map(r => r.id));
    const rows = (await pool.query('select id,workshop from ih2.players order by id')).rows;
    assert.deepEqual(rows.map(r => r.id), SESSION_ROSTER.map(r => r.id));
    for (const {workshop: s} of rows) {
      assert.deepEqual(s.inventory, {scrap: 1, timber: 2, supplies: 4});
      assert.equal(s.revision, 7); assert.equal(s.bridgeKits, 0);
      assert.equal(s.owned.planter, 1); assert.equal(s.placements['north-west'], 'planter');
      assert.equal(s.job.recipe, 'bridge-kit');
      assert.equal(s.job.readyAt - s.job.startedAt, 12 * 3600_000);
    }
    const receipts = (await pool.query('select player_id,count(*)::int as n from ih2.command_receipts group by player_id order by player_id')).rows;
    assert.deepEqual(receipts.map(r => r.player_id), SESSION_ROSTER.map(r => r.id));
    assert.ok(receipts.every(r => r.n === 7));
    const migrations = (await pool.query('select version,checksum from ih2_meta.migrations order by version')).rows;
    const dir = new URL('../supabase/migrations/', import.meta.url);
    const expected = [];
    for (const version of (await readdir(dir)).filter(f => /^\d+_.+\.sql$/.test(f)).sort()) {
      expected.push({version, checksum: createHash('sha256').update(await readFile(new URL(version, dir))).digest('hex')});
    }
    assert.equal(migrations.length, 10); assert.deepEqual(migrations, expected);
    const settings = (await pool.query("select name,setting from pg_settings where name in ('fsync','full_page_writes','synchronous_commit') order by name")).rows;
    assert.equal(settings.length, 3); assert.ok(settings.every(r => r.setting === 'on'));
    return {residents: 20, uniqueReceipts: 140, revisionEach: 7,
      inventoryEach: {scrap: 1, timber: 2, supplies: 4}, ownedPlanters: 20,
      outputKits: 0, queuedKitHours: 12, all9MetadataChecksumsExact: true, durability: settings};
  }

  async function stop(completed: boolean) {
    if (closing) return;
    closing = true; setPhase('cleanup');
    clearTimeout(watchdog);
    const errors: string[] = [];
    try { await app?.close(); } catch (error) { errors.push(safeDiagnosticError(error)); }
    const cleanup = {completed: false, activeStreamsAfter: app?.metrics.transport.activeStreams ?? 0,
      activeRequestsAfter: app?.metrics.transport.activeRequests ?? 0, errors};
    try { await pool.end(); } catch (error) { errors.push(safeDiagnosticError(error)); }
    cleanup.completed = !errors.length && cleanup.activeStreamsAfter === 0 && cleanup.activeRequestsAfter === 0;
    if (completed && verified && cleanup.completed) profile.succeeded(); else profile.failed(Error('incomplete diagnostic'));
    let trace: Awaited<ReturnType<LoadProfile['finish']>> | undefined;
    try { trace = await profile.finish(cleanup); } catch (error) { errors.push(safeDiagnosticError(error)); cleanup.completed = false; }
    const report = {method: 'Separate ordinary API Node process; no driver/browser/PostgreSQL CPU or RSS. Includes detailed trace/read-only observer/sampler overhead. Synthetic secret stays in child memory; no key file or HTTP debug endpoint.',
      completed: completed && verified && cleanup.completed, cleanup, resources: resources.finish(), sql: {...sql},
      server: structuredClone(app?.metrics ?? null), traceComplete: !!trace && trace.totals.dropped === 0,
      observerIdleSubmissions: trace?.observer.idleSubmissions ?? null, observerErrors: trace?.observer.errors ?? ['trace_incomplete']};
    writeFileSync(output + '/server-process.json', JSON.stringify(report, null, 2) + '\n');
    return report;
  }

  try {
    await profile.startObserver();
    // These writes are reachable only after both parent and child target guards.
    await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
    await migrate(pool);
    app = createTownServer({pool, secret: randomBytes(32).toString('base64url'),
      fixtureResidents: SESSION_ROSTER, port: 0, allowedOrigins: publicWorkload ? ['http://127.0.0.1:4251'] : []});
    if (publicWorkload) await preparePublicRefresh(pool, app.store, SESSION_ROSTER);
    profile.attachHttp(app.server);
    const port = await app.listen();
    process.on('message', (raw: unknown) => {
      queue = queue.then(async () => {
        assert.ok(raw && typeof raw === 'object');
        const message = raw as SessionMessage;
        assert.ok(Number.isSafeInteger(message.id));
        let result: unknown;
        if (message.kind === 'phase') {
          assert.ok(['setup', 'load', 'idle', 'verification', 'cleanup'].includes(message.phase));
          setPhase(message.phase); result = stats();
        } else if (message.kind === 'metrics') result = stats();
        else if (message.kind === 'checkpoint' || message.kind === 'verify') {
          const prior = phase; setPhase('verification');
          try {
            const conserved = await conservation(), current = await tables();
            if (message.kind === 'checkpoint') { assert.ok(!golden); golden = current; }
            else { assert.ok(golden); assert.deepEqual(current, golden); verified = true; }
            result = {...conserved, all17TablesEveryFieldMatchCheckpoint: message.kind === 'verify', tables: current};
          } finally { setPhase(prior); }
        } else if (message.kind === 'stop') {
          assert.equal(typeof message.completed, 'boolean');
          result = await stop(message.completed);
        } else throw Error('Unknown private diagnostic message.');
        await sendMessage({kind: 'reply', id: message.id, result});
        if (closing) process.disconnect();
      }).catch(async error => {
        await sendMessage({kind: 'fatal', errorCode: safeDiagnosticError(error)}).catch(() => {});
        await stop(false).catch(() => {});
        if (process.connected) process.disconnect();
        process.exitCode = 1;
      });
    });
    process.on('disconnect', () => { if (!closing) void stop(false).catch(() => {process.exitCode = 1;}); });
    await sendMessage({kind: 'ready', port, pid: process.pid});
  } catch (error) {
    await sendMessage({kind: 'fatal', errorCode: safeDiagnosticError(error)}).catch(() => {});
    await stop(false).catch(() => {});
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sessionChild().catch(async error => {
    await sendMessage({kind: 'fatal', errorCode: safeDiagnosticError(error)}).catch(() => {});
    if (process.connected) process.disconnect();
    process.exitCode = 1;
  });
}
