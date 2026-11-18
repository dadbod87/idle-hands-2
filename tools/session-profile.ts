/** Fixed five-minute opt-in diagnostic. Never changes normal saved previews. */
import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {loadavg, cpus} from 'node:os';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {routeTo, canStand, worlds, type Point} from '../src/game/world.ts';
import type {TownSnapshot, TownPosition} from '../server/live-store.ts';
import {distribution} from './load-profile.ts';
import {sessionTarget, safeDiagnosticError} from './session-target.ts';
import {startSessionServer} from './session-process.ts';
import {SessionResources} from './session-resources.ts';

type Actor = {
  id: string; cookie: string; snapshot: TownSnapshot; position: TownPosition;
  peers: Array<{id: string}> | null; heartbeats: number; lastCommand?: Record<string, unknown>;
  stream?: {abort: AbortController; pump: Promise<void>};
};
type Options = {url: string | undefined; reset: string | undefined; container?: string; ci?: string; output: string};

/** A clean EOF is still a lost connection unless this client deliberately closed. */
export async function consumeSessionStream(body: ReadableStream<Uint8Array>, closing: () => boolean,
  handlers: {bytes: (n: number) => void; heartbeat: () => void;
    presence: (peers: Array<{id: string}>) => void; error: (code: string) => void}) {
  const reader = body.getReader(), decoder = new TextDecoder(); let buffer = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) {if (!closing()) handlers.error('UNEXPECTED_SSE_EOF'); break;}
      handlers.bytes(part.value.byteLength); buffer += decoder.decode(part.value, {stream: true});
      assert.ok(buffer.length < 65536, 'Bounded diagnostic SSE parser.');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (frame.startsWith(':')) {handlers.heartbeat(); continue;}
        const name = frame.match(/^event: (.+)$/m)?.[1], data = frame.match(/^data: (.+)$/m)?.[1];
        if (name === 'presence' && data) {
          const peers = JSON.parse(data);
          assert.ok(Array.isArray(peers) && peers.every(p => p && typeof p.id === 'string'));
          handlers.presence(peers);
        }
      }
    }
  } catch (error) {if (!closing()) handlers.error(safeDiagnosticError(error));}
  finally {await reader.cancel().catch(() => {});}
}

export async function runSessionProfile(options: Options) {
  const target = sessionTarget(options.url, options.reset, {ci: options.ci, container: options.container});
  assert.equal(process.version, 'v24.22.2', 'Use the repository pinned diagnostic runtime.');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const provenanceFiles = ['tools/session-profile.ts', 'tools/session-child.ts', 'tools/session-process.ts',
    'tools/session-target.ts', 'tools/session-resources.ts'];
  const provenance = {head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    workingTreeCandidate: true, files: Object.fromEntries(provenanceFiles.map(name =>
      [name, createHash('sha256').update(readFileSync(new URL('../' + name, import.meta.url))).digest('hex')]))};
  const output = resolve(options.output);
  if (['session-profile.json', 'server-process.json', 'load-profile.json', 'wave-progress.json'].some(name => existsSync(resolve(output, name)))) {
    throw Error('Choose an unused diagnostic output directory; previous evidence is preserved.');
  }
  mkdirSync(output, {recursive: true});
  const abort = new AbortController();
  const watchdog = setTimeout(() => abort.abort(), 330000); // reserves30seconds for bounded cleanup
  let phase = 'setup', stage = 'setup', app: Awaited<ReturnType<typeof startSessionServer>> | undefined;
  const resources = new SessionResources(() => phase), hostStart = loadavg();
  const actors: Actor[] = [], latencies: Record<string, number[]> = {};
  const http = {requests: 0, requestBodyBytes: 0, responseBodyBytes: 0, streamConnections: 0};
  const sse = {bytes: 0, presence: 0, heartbeats: 0, errors: [] as string[]};
  const waves: Array<{wave: number; atMs: number; reconnects: number; relogins: number}> = [];
  const checkpoints: Array<{stage: string; atMs: number}> = [];
  let workloadAt = 0, workloadFinishedAt = 0, completed = false, failure: unknown,
    failureStage: string | null = null, conservation: any, idle: any, stopped: any;
  const mark = (next: string) => {resources.capture(); phase = next; stage = next;
    checkpoints.push({stage: next, atMs: workloadAt ? performance.now() - workloadAt : 0});};
  const sleep = (ms: number) => delay(Math.max(0, ms), undefined, {signal: abort.signal});
  async function until(predicate: () => boolean, message: string) {
    const end = performance.now() + 5000;
    while (!predicate()) {assert.ok(performance.now() < end, message); await sleep(25);}
  }
  function timing(label: string, at: number) {(latencies[label] ??= []).push(performance.now() - at);}
  async function request(path: string, actor?: Actor, body?: unknown, label = path) {
    const encoded = body === undefined ? undefined : JSON.stringify(body), at = performance.now();
    http.requests++; http.requestBodyBytes += encoded ? Buffer.byteLength(encoded) : 0;
    const response = await fetch(app!.base + '/api/town/' + path, {
      method: encoded === undefined ? 'GET' : 'POST',
      headers: {'X-IH2-Schema': TOWN_SCHEMA, ...(actor ? {Cookie: actor.cookie} : {}),
        ...(encoded === undefined ? {} : {Origin: app!.base, 'Content-Type': 'application/json'})},
      body: encoded, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]),
    });
    const text = await response.text(); http.responseBodyBytes += Buffer.byteLength(text); timing(label, at);
    assert.equal(response.status, 200, 'Diagnostic HTTP admission: ' + label);
    const data = JSON.parse(text);
    if (actor && data.snapshot) assert.equal(data.snapshot.playerId, actor.id);
    return {response, data};
  }
  async function command(actor: Actor, action: Record<string, unknown>) {
    const dto = {...action, id: randomUUID(), expectedRevision: actor.snapshot.workshop.revision};
    const {data} = await request('command', actor, dto);
    assert.equal(data.ok, true, 'Ordinary first-lesson command accepted.');
    assert.equal(data.replayed, false); actor.snapshot = data.snapshot; actor.lastCommand = dto;
  }
  async function movement(actor: Actor, position: TownPosition) {
    const {data} = await request('movement', actor, position);
    assert.equal(data.ok, true); assert.deepEqual(data.position, position); actor.position = position;
  }
  async function walk(actor: Actor, to: Point) {
    let prior = actor.position.position;
    const room = actor.position.room, route = routeTo(room, prior, to);
    assert.ok(route.length || Math.hypot(prior.x - to.x, prior.y - to.y) < .001, 'Legal diagnostic route exists.');
    for (const point of route) {
      const from = prior, steps = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / .75));
      for (let n = 1; n <= steps; n++) {
        await sleep(200);
        await movement(actor, {room, position: {x: from.x + (point.x - from.x) * n / steps, y: from.y + (point.y - from.y) * n / steps}});
      }
      prior = point;
    }
  }
  async function events(actor: Actor) {
    const controller = new AbortController(), at = performance.now();
    const timer = setTimeout(() => controller.abort(), 5000); // headers only, never healthy stream lifetime
    http.requests++; http.streamConnections++; actor.peers = null;
    let response: Response;
    try {
      response = await fetch(app!.base + '/api/town/events', {headers: {'X-IH2-Schema': TOWN_SCHEMA, Cookie: actor.cookie},
        signal: AbortSignal.any([controller.signal, abort.signal])});
    } finally {clearTimeout(timer);}
    timing('eventsHeaders', at); assert.equal(response.status, 200);
    const pump = consumeSessionStream(response.body!, () => controller.signal.aborted || abort.signal.aborted, {
      bytes: n => {sse.bytes += n;}, heartbeat: () => {actor.heartbeats++; sse.heartbeats++;},
      presence: peers => {actor.peers = peers; sse.presence++;}, error: code => {sse.errors.push(code);},
    });
    actor.stream = {abort: controller, pump};
  }
  async function disconnect(actor: Actor) {
    const stream = actor.stream; actor.stream = undefined;
    if (stream) {stream.abort.abort(); await stream.pump;}
  }
  try {
    app = await startSessionServer({...options, url: target.url});
    assert.notEqual(app.pid, process.pid);
    mark('load'); await app.phase('load'); workloadAt = performance.now(); stage = 'ordinary-first-lesson';
    const roster = Array.from({length: 20}, (_, n) => 'session-' + String(n).padStart(2, '0'));
    actors.push(...await Promise.all(roster.map(async id => {
      const {response, data} = await request('login', undefined, {fixtureId: id});
      assert.equal(data.snapshot.playerId, id);
      assert.deepEqual(data.snapshot.workshop.inventory, {scrap: 0, timber: 0, supplies: 0});
      return {id, cookie: response.headers.get('set-cookie')!.split(';')[0], snapshot: data.snapshot, position: data.snapshot.position, peers: null, heartbeats: 0};
    })));
    await Promise.all(actors.map(events));
    await until(() => actors.every(a => a.peers?.length === 19), 'Initial public presence19peers.');
    for (const actor of actors) assert.deepEqual(new Set(actor.peers!.map(p => p.id)), new Set(roster.filter(id => id !== actor.id)));
    await Promise.all(actors.map(async actor => {
      for (const resource of ['scrap', 'timber', 'supplies']) {
        await walk(actor, worlds.square.stops.find(s => s.id === resource)!.point);
        await command(actor, {kind: 'gather', resource});
      }
    }));
    async function enter(actor: Actor) {
      await walk(actor, worlds.square.stops.find(s => s.id === 'workshop')!.point);
      await movement(actor, {room: 'workshop', position: {x: 9, y: 11}});
    }
    await Promise.all(actors.slice(0, 10).map(enter));
    await until(() => actors.slice(0, 10).every(a => a.peers?.length === 0) && actors.slice(10).every(a => a.peers?.length === 9), 'Mixed-room presence is private.');
    const privateIds = new Set(actors.slice(0, 10).map(a => a.id));
    assert.ok(actors.slice(10).every(a => a.peers!.every(p => !privateIds.has(p.id))));
    await Promise.all(actors.slice(10).map(enter));
    await Promise.all(actors.map(async actor => {
      await walk(actor, worlds.workshop.stops.find(s => s.id === 'bench')!.point);
      await command(actor, {kind: 'craft', recipe: 'planter'});
      const first = actor.snapshot.workshop.job!; assert.equal(first.readyAt - first.startedAt, 5000);
      await sleep(first.readyAt - Date.now() + 30);
      await command(actor, {kind: 'claim'}); await command(actor, {kind: 'place', prop: 'planter', slot: 'north-west'});
      await command(actor, {kind: 'craft', recipe: 'bridge-kit'});
    }));
    assert.ok(performance.now() - workloadAt < 60000, 'Ordinary progress must finish before the first60second wave.');
    const checkpoint = await app.checkpoint();
    assert.equal(checkpoint.uniqueReceipts, 140);
    for (const [index, seconds] of [60, 105, 150, 195, 240].entries()) {
      await sleep(workloadAt + seconds * 1000 - performance.now()); stage = 'wave-' + (index + 1);
      assert.ok(performance.now() - workloadAt < seconds * 1000 + 5000, 'Wave started within its declared5second bound.');
      await Promise.all(actors.map(async (actor, actorIndex) => {
        await disconnect(actor);
        if (index === 1 && actorIndex < 5) {
          await request('logout', actor, {});
          const {response, data} = await request('login', undefined, {fixtureId: actor.id});
          actor.cookie = response.headers.get('set-cookie')!.split(';')[0];
          assert.equal(data.snapshot.playerId, actor.id); assert.equal(data.snapshot.workshop.revision, 7);
          actor.snapshot = data.snapshot; assert.deepEqual(data.snapshot.position, actor.position);
        }
        const bench = worlds.workshop.stops.find(s => s.id === 'bench')!.point, sign = index % 2 ? -1 : 1;
        const point = [{x: bench.x + .25 * sign, y: bench.y}, {x: bench.x, y: bench.y + .25 * sign}]
          .find(p => canStand('workshop', p) && routeTo('workshop', actor.position.position, p).length > 0);
        assert.ok(point, 'A legal short movement is available.'); await walk(actor, point);
        const snapshot = await request('snapshot', actor); actor.snapshot = snapshot.data.snapshot;
        assert.ok(actor.lastCommand); const replay = await request('command', actor, actor.lastCommand, 'replay');
        assert.equal(replay.data.ok, true); assert.equal(replay.data.replayed, true); assert.equal(replay.data.snapshot.workshop.revision, 7);
        await events(actor);
      }));
      await until(() => actors.every(a => a.peers?.length === 0), 'Reconnected private rooms have0peers.');
      waves.push({wave: index + 1, atMs: performance.now() - workloadAt, reconnects: 20, relogins: index === 1 ? 5 : 0});
      writeFileSync(output + '/wave-progress.json', JSON.stringify({provenance, waves, http, stage}, null, 2) + '\n');
      console.log(JSON.stringify({wave: index + 1, seconds: Math.round((performance.now() - workloadAt) / 1000)}));
    }
    await sleep(workloadAt + 270000 - performance.now());
    const before = await app.phase('idle'), presenceBefore = sse.presence, heartbeatsBefore = sse.heartbeats;
    const individualBefore = actors.map(a => a.heartbeats);
    assert.equal(before.server.transport.activeStreams, 20); assert.equal(before.server.transport.activeRequests, 0);
    mark('idle'); const idleAt = performance.now(); await sleep(30000);
    const after = await app.metrics();
    workloadFinishedAt = performance.now();
    idle = {elapsedMs: performance.now() - idleAt, sqlQueries: (after.sql.idle ?? 0) - (before.sql.idle ?? 0),
      presenceEvents: sse.presence - presenceBefore, heartbeats: sse.heartbeats - heartbeatsBefore,
      individualHeartbeats: actors.map((a, i) => a.heartbeats - individualBefore[i]),
      activeStreamsBefore: before.server.transport.activeStreams, activeStreamsAfter: after.server.transport.activeStreams,
      activeRequestsBefore: before.server.transport.activeRequests, activeRequestsAfter: after.server.transport.activeRequests};
    assert.equal(idle.sqlQueries, 0); assert.equal(idle.presenceEvents, 0); assert.ok(idle.heartbeats >= 20);
    assert.ok(idle.individualHeartbeats.every((n: number) => n >= 1));
    assert.equal(idle.activeStreamsAfter, 20); assert.equal(idle.activeRequestsAfter, 0);
    assert.deepEqual(sse.errors, []); assert.equal(waves.length, 5);
    mark('verification'); await app.phase('verification'); conservation = await app.verify();
    assert.equal(conservation.all17TablesEveryFieldMatchCheckpoint, true);
    completed = true;
  } catch (error) {failure = error; failureStage = stage;}
  finally {
    clearTimeout(watchdog); mark('cleanup'); abort.abort();
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([Promise.allSettled(actors.map(disconnect)), new Promise<never>((_, reject) => {
        disconnectTimer = setTimeout(() => reject(Error('Diagnostic stream cleanup exceeded5seconds.')), 5000);
      })]);
    } catch (error) {failure ??= error; failureStage ??= 'stream-cleanup'; completed = false;}
    finally {if (disconnectTimer) clearTimeout(disconnectTimer);}
    if (app) {
      try {stopped = await app.stop(completed);}
      catch (error) {failure ??= error; failureStage ??= 'child-cleanup'; completed = false; await app.forceStop().catch(() => {});}
    }
    const driver = resources.finish(), latency = Object.fromEntries(Object.entries(latencies).map(([k, v]) => [k, distribution(v)]));
    const server = stopped?.report;
    if (completed) {
      try {
        assert.equal(stopped.exit.code, 0); assert.equal(stopped.forceTerminated, false);
        assert.equal(server.completed, true); assert.equal(server.cleanup.completed, true);
        assert.equal(server.traceComplete, true); assert.equal(server.observerIdleSubmissions, 0);
        assert.equal(server.server.sseBackpressure, 0); assert.equal(server.server.sseExpired, 0); assert.equal(server.server.sseOversize, 0);
        assert.deepEqual(server.observerErrors, []); assert.equal(driver.dropped, 0); assert.equal(server.resources.dropped, 0);
      } catch (error) {failure ??= error; failureStage ??= 'completion-verification'; completed = false;}
    }
    const budgets = {commandP95TargetMs: 500, replayP95TargetMs: 500, snapshotP95TargetMs: 500, serverEventLoopP95TargetMs: 50,
      commandP95Pass: (latency.command?.p95 ?? Infinity) <= 500, replayP95Pass: (latency.replay?.p95 ?? Infinity) <= 500,
      snapshotP95Pass: (latency.snapshot?.p95 ?? Infinity) <= 500, serverEventLoopP95Pass: (server?.resources.eventLoopP95Ms ?? Infinity) <= 50};
    const report = {completed, failureCode: failure ? safeDiagnosticError(failure) : null, failureStage,
      method: 'Three-run candidate study: each invocation fixed300seconds from first request including ordinary teaching progress, five finite reconnect/retry waves and30seconds real idle.20protocol identities, not20rendered clients or public invalidation/coalescing coverage. Detailed observer/sampler overhead included; no overhead or leak inference. Original mandatory500ms CI workload remains unchanged.',
      provenance, environment: {node: process.version, platform: process.platform, arch: process.arch,
        logicalCpus: cpus().length, hostLoadAtStart: hostStart, hostLoadAtEnd: loadavg(), poolMaximum: 5, observerPoolMaximum: 1},
      workloadElapsedMs: workloadFinishedAt ? workloadFinishedAt - workloadAt : null,
      totalAfterFirstRequestMs: workloadAt ? performance.now() - workloadAt : null, checkpoints, waves, http, sse,
      latencyMs: latency, budgets, conservation: conservation ?? null, idle: idle ?? null,
      resources: {driver, server: server?.resources ?? null}, serverCompletion: stopped ?? null,
      disclosure: 'Explicit dedicated disposable ih2_load only; generated in-memory child key and in-memory cookies never saved. Ordinary earned stock, actual5second teaching job and12hour queued kit; no clock/stock/position grants, protected preview changes, real players or cloud. No physical-device/WAN/hosted-capacity or rendered-FPS acceptance.'};
    writeFileSync(output + '/session-profile.json', JSON.stringify(report, null, 2) + '\n');
    if (failure) throw failure;
    return report;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSessionProfile({url: process.env.IH2_LOAD_DATABASE_URL, reset: process.env.IH2_LOAD_RESET,
    container: process.env.IH2_PG_CONTAINER, ci: process.env.CI, output: process.env.IH2_SESSION_OUT ?? 'test-results/server/session'})
    .then(report => {
      console.log(JSON.stringify({completed: report.completed, seconds: report.workloadElapsedMs! / 1000,
        commandP95Ms: report.latencyMs.command?.p95, replayP95Ms: report.latencyMs.replay?.p95,
        snapshotP95Ms: report.latencyMs.snapshot?.p95, idle: report.idle, budgets: report.budgets}));
      if (!Object.entries(report.budgets).filter(([key]) => key.endsWith('Pass')).every(([, value]) => value)) process.exitCode = 2;
    }).catch(error => {console.error('Session diagnostic failed:', safeDiagnosticError(error)); process.exitCode = 1;});
}
