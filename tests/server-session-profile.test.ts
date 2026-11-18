import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {sessionTarget} from '../tools/session-target.ts';
import {startSessionServer} from '../tools/session-process.ts';
import {runSessionProfile} from '../tools/session-profile.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';

test('session diagnostic refuses protected, remote and mismatched targets before spawn or output', async () => {
  const valid = 'postgres://ih2:synthetic-only@127.0.0.1:55434/ih2_load';
  const options = {container: 'idle-hands-2-cafe-candidate-pg'};
  assert.equal(new URL(sessionTarget(valid, '1', options).url).port, '55434');
  assert.equal(sessionTarget('postgres://ih2:synthetic-only@localhost:5432/ih2_load', '1', {ci: 'true', container: 'a'.repeat(64)}).container, 'a'.repeat(64));
  for (const value of [valid.replace('55434', '55432'), valid.replace('ih2_load', 'ih2_preview'),
    valid.replace('127.0.0.1', 'remote.example'), valid + '?host=remote.example', valid + '#ignored',
    valid.replace('55434', '4175'), valid.replace('postgres:', 'https:')]) {
    assert.throws(() => sessionTarget(value, '1', {...options, ci: 'true'}));
  }
  assert.throws(() => sessionTarget(valid, undefined, options));
  assert.throws(() => sessionTarget(valid, '1', {container: 'idle-hands-2-pg'}));
  assert.throws(() => sessionTarget(valid.replace('55434', '5432'), '1', {ci: 'true', container: 'idle-hands-2-pg'}));
  assert.throws(() => sessionTarget(valid.replace('55434', '5432'), '1', {ci: 'false', container: 'a'.repeat(64)}));
  assert.throws(() => sessionTarget('invalid PRIVATE_SENTINEL', '1', options), error =>
    error instanceof Error && !String(error).includes('PRIVATE_SENTINEL'));
  const output = join(mkdtempSync(join(tmpdir(), 'ih2-session-refuse-')), 'not-created');
  await assert.rejects(() => startSessionServer({url: valid.replace('55434', '55432'), reset: '1', ...options, output}));
  await assert.rejects(() => runSessionProfile({url: valid.replace('55434', '55432'), reset: '1', ...options, output}));
  assert.equal(existsSync(output), false);
});

const testUrl = process.env.IH2_TEST_DATABASE_URL;
test('private diagnostic child has distinct resources and drains an actual isolated HTTP stream', {skip: !testUrl, timeout: 45000}, async () => {
  const url = new URL(testUrl!); assert.equal(url.pathname, '/ih2_test'); url.pathname = '/ih2_load';
  const output = 'test-results/server/session-child-smoke';
  const child = await startSessionServer({url: url.href, reset: '1',
    container: process.env.IH2_PG_CONTAINER, ci: process.env.CI, output});
  const abort = new AbortController();
  let pump: Promise<void> | undefined, stopped = false;
  try {
    assert.notEqual(child.pid, process.pid);
    const response = await fetch(child.base + '/api/town/login', {method: 'POST',
      headers: {'X-IH2-Schema': TOWN_SCHEMA, Origin: child.base, 'Content-Type': 'application/json'},
      body: JSON.stringify({fixtureId: 'session-00'}), signal: AbortSignal.timeout(5000)});
    assert.equal(response.status, 200);
    const data = await response.json() as any;
    assert.deepEqual(data.snapshot.workshop.inventory, {scrap: 0, timber: 0, supplies: 0});
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const stream = await fetch(child.base + '/api/town/events', {headers: {'X-IH2-Schema': TOWN_SCHEMA, Cookie: cookie}, signal: abort.signal});
    assert.equal(stream.status, 200);
    const reader = stream.body!.getReader();
    pump = (async () => {try {while (!(await reader.read()).done) { /* consume bounded fixture stream */ }} catch (error) {if (!abort.signal.aborted) throw error;} finally {await reader.cancel().catch(() => {});}})();
    const before = await child.metrics(); assert.equal(before.server.transport.activeStreams, 1);
    await child.phase('idle'); await sleep(1100);
    const idle = await child.metrics(); assert.equal(idle.sql.idle ?? 0, 0);
    abort.abort(); await pump;
    const final = await child.stop(false); stopped = true;
    assert.equal(final.exit.code, 0); assert.equal(final.forceTerminated, false);
    assert.equal(final.report.completed, false, 'Smoke probe is not the full diagnostic.');
    assert.equal(final.report.cleanup.completed, true);
    assert.equal(final.report.cleanup.activeStreamsAfter, 0); assert.equal(final.report.cleanup.activeRequestsAfter, 0);
    assert.equal(final.report.resources.pid, child.pid); assert.notEqual(final.report.resources.pid, process.pid);
    assert.ok(final.report.resources.samples.length >= 2); assert.equal(final.report.resources.dropped, 0);
    assert.equal(final.report.observerIdleSubmissions, 0); assert.deepEqual(final.report.observerErrors, []);
  } finally {
    abort.abort(); await pump?.catch(() => {});
    if (!stopped) await child.stop(false).catch(() => {});
  }
});
