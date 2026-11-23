import assert from 'node:assert/strict';
import test from 'node:test';
import { firstVisit, millAction, willowView, WILLOW } from './willow.mjs';
import { routesFrom } from '../../IH2-213/study/layout.mjs';

const HOUR = 3_600_000;
function act(state, action, now = 0, repaired = false) {
  const next = millAction(state, action, now, repaired);
  assert.equal(next.ok, true, next.message);
  return next.state;
}
const walk = (state, destination, now = 0) => act(state, { kind: 'walk', destination }, now);
const stock = () => act(walk(firstVisit(0), 'woodYard'), { kind: 'gather' });
const start = s => act(s, { kind: 'weave', revision: s.revision });

test('stops use the verified safe Mossbank route and north repair is optional', () => {
  const before = firstVisit(0);
  assert.equal(millAction(before, { kind: 'gather' }, 0).state, before);
  assert.equal(millAction(before, { kind: 'walk', destination: 'northEast' }, 0).ok, false);
  assert.equal(walk(before, 'woodYard').place, 'woodYard');
  const closed = routesFrom('gate', false).get('woodYard').tiles;
  const repaired = routesFrom('gate', true).get('woodYard').tiles;
  assert.ok(repaired < closed);
});

test('preview, stale review and side activities do not pay willow', () => {
  const gathered = stock();
  assert.equal(gathered.held, 4);
  const moved = walk(gathered, 'canal');
  assert.deepEqual(willowView(moved, 0), { available: 0, ready: false, remaining: null });
  const stale = millAction(walk(moved, 'woodYard'), { kind: 'weave', revision: gathered.revision }, 0);
  assert.equal(stale.ok, false);
  assert.equal(stale.state.held, 4);
  const queued = start(gathered);
  assert.equal(queued.held, 1);
  assert.equal(queued.job.readyAt, 6 * HOUR);
  assert.equal(queued.basket, null);
});

test('taking the canal walk preserves the deadline and expiry never auto-collects', () => {
  const job = start(stock());
  const elsewhere = walk(job, 'quay');
  assert.equal(millAction(elsewhere, { kind: 'collect' }, WILLOW.weaveMs).ok, false);
  const atYard = walk(elsewhere, 'woodYard', WILLOW.weaveMs - 1);
  assert.equal(millAction(atYard, { kind: 'collect' }, WILLOW.weaveMs - 1).ok, false);
  assert.equal(willowView(atYard, 7 * 24 * HOUR).ready, true);
  assert.equal(atYard.basket, null);
  assert.deepEqual(atYard.job, job.job);
});

test('a complete basket can be collected once and explicitly placed in the sample yard', () => {
  const job = start(stock());
  const finished = act(job, { kind: 'collect' }, WILLOW.weaveMs);
  assert.equal(finished.held, 1);
  assert.equal(finished.basket, 'bag');
  assert.equal(millAction(finished, { kind: 'collect' }, WILLOW.weaveMs).ok, false);
  assert.equal(millAction(finished, { kind: 'display' }, WILLOW.weaveMs).ok, false);
  const placed = act(walk(finished, 'homes', WILLOW.weaveMs), { kind: 'display' }, WILLOW.weaveMs);
  assert.equal(placed.basket, 'yard');
  assert.equal(millAction(placed, { kind: 'display' }, WILLOW.weaveMs).ok, false);
});

test('stock regrows by real-duration boundaries with a cap and no backward clock writes', () => {
  const initial = stock();
  assert.equal(willowView(initial, WILLOW.refillEvery - 1).available, 0);
  assert.equal(willowView(initial, WILLOW.refillEvery).available, 1);
  assert.equal(willowView(initial, 7 * 24 * HOUR).available, 4);
  const after = act(initial, { kind: 'gather' }, WILLOW.refillEvery);
  assert.equal(after.nextWillowAt, 2 * WILLOW.refillEvery);
  assert.equal(after.held, 5);
  const full = act(after, { kind: 'gather' }, 7 * 24 * HOUR);
  assert.equal(full.held, 8);
  assert.equal(full.yard, 1);
  const denied = millAction(full, { kind: 'gather' }, -1);
  assert.equal(denied.state, full);
});
