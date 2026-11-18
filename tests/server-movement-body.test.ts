import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {request as httpRequest, type ClientRequest, type IncomingMessage} from 'node:http';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {mkdirSync, writeFileSync} from 'node:fs';
import {database, migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';

const target = process.env.IH2_HTTP_TEST_DATABASE_URL;
if (target) {
  let u: URL; try {u = new URL(target);} catch {throw Error('Movement body tests require a valid isolated fixture URL.');}
  const container = process.env.IH2_PG_CONTAINER ?? '';
  const local = u.port === '55434' && container === 'idle-hands-2-cafe-candidate-pg';
  const ci = process.env.CI === 'true' && u.port === '5432' && /^[a-f0-9]{12,64}$/.test(container);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !['127.0.0.1', 'localhost'].includes(u.hostname) ||
    u.pathname !== '/ih2_http_test' || u.search || u.hash || (!local && !ci)) {
    throw Error('Movement body tests require the explicit dedicated HTTP fixture, never protected55432.');
  }
}
const samples: Array<Record<string, unknown>> = [];
function record(value: Record<string, unknown>) {
  samples.push(value); mkdirSync('test-results/server', {recursive: true});
  writeFileSync('test-results/server/movement-body.json', JSON.stringify({
    method: 'Actual loopback HTTP and dedicated PostgreSQL.1000ms peer deadline while another body remains incomplete. All fixtures use a fixed synthetic application clock; only expiry cases advance it. HTTP deadlines/latencies use real time. No position/stock grants; expiry-presence alone pauses a real store call.', samples,
  }, null, 2) + '\n');
}
async function bounded<T>(promise: Promise<T>, label: string, ms = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {return await Promise.race([promise, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Error(label + ' exceeded its declared bound.')), ms);
  })]);} finally {if (timer) clearTimeout(timer);}
}
async function fixture(work: (f: Awaited<ReturnType<typeof setup>>) => Promise<void>) {
  const f = await setup();
  try {await work(f);} finally {await f.close();}
}
async function setup() {
  const pool = database(target); let clock = Date.UTC(2026, 10, 18, 12);
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade'); await migrate(pool);
  const app = createTownServer({pool, secret: 'isolated-movement-body-proof-key-124', now: () => clock, transportNow: () => clock, port: 0});
  const base = 'http://127.0.0.1:' + await app.listen();
  const writers: ClientRequest[] = [], rawPromises: Promise<unknown>[] = [];
  async function post(path: string, value: unknown, cookie = '', timeout = 1000) {
    const at = performance.now();
    const response = await fetch(base + '/api/town/' + path, {method: 'POST',
      headers: {'X-IH2-Schema': TOWN_SCHEMA, Origin: base, 'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify(value), signal: AbortSignal.timeout(timeout)});
    const data = await response.json(); return {status: response.status, data, elapsedMs: performance.now() - at, response};
  }
  async function login(id: string) {
    const r = await post('login', {fixtureId: id}); assert.equal(r.status, 200);
    return {cookie: r.response.headers.get('set-cookie')!.split(';')[0], snapshot: r.data.snapshot};
  }
  const actors = {a: await login('aster'), b: await login('bea'), c: await login('casey')};
  async function partial(body: string, cookie = actors.a.cookie) {
    let seen!: () => void; const started = new Promise<void>(resolve => {seen = resolve;});
    const observe = (req: IncomingMessage) => {
      if (req.url === '/api/town/movement' && req.headers.cookie === cookie) req.once('data', () => {app.server.off('request', observe); seen();});
    };
    app.server.on('request', observe); let writer!: ClientRequest, finished = false;
    const response = new Promise<{status: number; body: string}>((resolve, reject) => {
      writer = httpRequest(base + '/api/town/movement', {method: 'POST', headers: {
        'X-IH2-Schema': TOWN_SCHEMA, Origin: base, 'Content-Type': 'application/json', Cookie: cookie,
        'Content-Length': Buffer.byteLength(body),
      }}, res => {let text = ''; res.on('data', chunk => {text += chunk;}); res.on('error', reject);
        res.on('end', () => resolve({status: res.statusCode!, body: text}));});
      writer.on('error', reject); writer.write(body.slice(0, 1));
    });
    writers.push(writer); rawPromises.push(response); void response.catch(() => {});
    try {await bounded(started, 'Raw body admission', 1000); await nextTurn();}
    catch (error) {writer.destroy(); throw error;}
    finally {app.server.off('request', observe);}
    return {response, isFinished: () => finished, finish: () => {finished = true; writer.end(body.slice(1));}, abort: () => {writer.destroy();}};
  }
  function bodies(count: number, cookie = actors.a.cookie) {
    let seen = 0, resolve!: () => void; const done = new Promise<void>(r => {resolve = r;});
    const observe = (req: IncomingMessage) => {if (req.url === '/api/town/movement' && req.headers.cookie === cookie) req.once('data', () => {
      if (++seen === count) {app.server.off('request', observe); resolve();}
    });};
    app.server.on('request', observe); return {done, close: () => app.server.off('request', observe)};
  }
  async function unchanged(id: string, before: unknown) {
    const after = await app.store.snapshot(id); assert.deepEqual(after.workshop, before);
  }
  return {app, pool, actors, post, login, partial, bodies, unchanged, advance: (ms: number) => {clock += ms;},
    close: async () => {for (const writer of writers) writer.destroy(); await bounded(Promise.allSettled(rawPromises), 'Raw client cleanup');
      await bounded(app.close(), 'Fixture server cleanup'); await bounded(pool.end(), 'Fixture pool cleanup');}};
}

test('movement body: independent members move and reach protected doorway validation before a slow body finishes', {skip: !target, timeout: 20000}, async () => {
  await fixture(async f => {
    const {a, b, c} = f.actors, held = await f.partial(JSON.stringify(a.snapshot.position));
    try {
      const peers = await Promise.allSettled([
        f.post('movement', b.snapshot.position, b.cookie),
        f.post('command', {kind: 'enter-neighborhood', districtId: '1', id: randomUUID(), expectedRevision: 0}, c.cookie),
      ]);
      record({case: 'independent-members-probe', bodyStillIncomplete: !held.isFinished(), outcomes: peers.map(p =>
        p.status === 'fulfilled' ? {status: p.status, httpStatus: p.value.status, elapsedMs: p.value.elapsedMs} : {status: p.status, errorName: p.reason?.name ?? 'unknown'})});
      assert.equal(peers[0].status, 'fulfilled', 'Unrelated movement must finish before the held body is released.');
      assert.equal(peers[1].status, 'fulfilled', 'Protected doorway validation must finish before the held body is released.');
      const move = (peers[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof f.post>>>).value;
      const door = (peers[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof f.post>>>).value;
      assert.equal(move.status, 200); assert.deepEqual(move.data.position, b.snapshot.position);
      assert.equal(door.status, 200); assert.equal(door.data.ok, false); assert.equal(held.isFinished(), false);
      held.finish(); assert.equal((await bounded(held.response, 'Held movement')).status, 200);
      for (const [id, actor] of [['aster', a], ['bea', b], ['casey', c]] as const) await f.unchanged(id, actor.snapshot.workshop);
      record({case: 'independent-members', peerMovementMs: move.elapsedMs, protectedRefusalMs: door.elapsedMs, bothBeforeBodyRelease: true, noStockOrPositionGrants: true});
    } finally {held.abort();}
  });
});

test('movement body: own queue stays ordered and bounded while malformed JSON releases every admitted request', {skip: !target, timeout: 20000}, async () => {
  await fixture(async f => {
    const a = f.actors.a, held = await f.partial('{bad}'), observed = f.bodies(3); let finished = 0;
    const queued = Array.from({length: 3}, () => f.post('movement', a.snapshot.position, a.cookie).then(r => {finished++; return r;}));
    for (const request of queued) void request.catch(() => {});
    try {
      await bounded(observed.done, 'Own queued body admission', 1000); await nextTurn(); assert.equal(finished, 0);
      const overflow = await f.post('movement', a.snapshot.position, a.cookie); assert.equal(overflow.status, 429);
      assert.match(overflow.data.message, /last position/); assert.equal(finished, 0);
      const peer = await f.post('movement', f.actors.b.snapshot.position, f.actors.b.cookie); assert.equal(peer.status, 200);
      held.finish(); assert.equal((await bounded(held.response, 'Malformed body')).status, 400);
      for (const result of await Promise.all(queued)) assert.equal(result.status, 200);
      assert.equal((await f.post('movement', a.snapshot.position, a.cookie)).status, 200);
      await f.unchanged('aster', a.snapshot.workshop);
      assert.equal((await f.pool.query('select count(*)::int n from ih2.command_receipts')).rows[0].n, 0);
      record({case: 'own-order-and-cap', ownRepliesCompletedBeforeBodyRelease: 0, queuedFollowers: 3, admittedOwnLimit: 4, overflowStatus: 429, malformedStatus: 400, recovered: true});
    } finally {observed.close(); held.abort(); await Promise.allSettled(queued);}
  });
});

test('movement body: an aborted body releases its own queue without changing progress', {skip: !target, timeout: 20000}, async () => {
  await fixture(async f => {
    const a = f.actors.a, held = await f.partial(JSON.stringify(a.snapshot.position)), observed = f.bodies(1); let finished = false;
    const next = f.post('movement', a.snapshot.position, a.cookie).then(r => {finished = true; return r;}); void next.catch(() => {});
    try {
      await bounded(observed.done, 'Queued request admission', 1000); await nextTurn(); assert.equal(finished, false);
      held.abort(); assert.equal((await next).status, 200);
      assert.equal((await f.post('movement', f.actors.b.snapshot.position, f.actors.b.cookie)).status, 200);
      await f.unchanged('aster', a.snapshot.workshop); assert.equal(f.app.metrics.positionCheckpoints, 0);
      record({case: 'abort-release', ownBlockedBeforeAbort: true, recovered: true, positionCheckpoints: 0});
    } finally {observed.close(); held.abort(); await Promise.allSettled([next]);}
  });
});

test('movement body: auth expiry during body or shared presence wait cannot move confirmed feet', {skip: !target, timeout: 25000}, async () => {
  for (const phase of ['body', 'presence'] as const) await fixture(async f => {
    const a = f.actors.a, c = f.actors.c, original = f.app.store.execute.bind(f.app.store);
    let release = () => {}; let doorway: ReturnType<typeof f.post> | undefined;
    if (phase === 'presence') {
      let entered!: () => void; const started = new Promise<void>(r => {entered = r;}), gate = new Promise<void>(r => {release = r;});
      f.app.store.execute = async (...args) => {entered(); await gate; return original(...args);};
      doorway = f.post('command', {kind: 'enter-neighborhood', districtId: '1', id: randomUUID(), expectedRevision: 0}, c.cookie, 5000); void doorway.catch(() => {});
      await bounded(started, 'Protected doorway lock admission', 1000);
    }
    const held = await f.partial(JSON.stringify(a.snapshot.position));
    try {
      if (phase === 'presence') {held.finish(); await nextTurn();}
      f.advance(24 * 3600_000 + 1); release();
      if (phase === 'body') held.finish();
      assert.equal((await bounded(held.response, 'Expired movement')).status, 401);
      if (doorway) assert.equal((await doorway).status, 200);
      const returned = await f.login('aster'); assert.deepEqual(returned.snapshot.position, a.snapshot.position); await f.unchanged('aster', a.snapshot.workshop);
      assert.equal(f.app.metrics.movementAccepted, 0); assert.equal(f.app.metrics.positionCheckpoints, 0);
      record({case: 'expiry-' + phase, expiredStatus: 401, confirmedFeetPreserved: true, noMovementAccepted: true, syntheticAuthClock: true, realStorePauseOnly: phase === 'presence'});
    } finally {release(); f.app.store.execute = original; held.abort(); if (doorway) await doorway.catch(() => {});}
  });
});
