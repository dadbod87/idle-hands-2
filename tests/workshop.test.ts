import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshop, loadWorkshop, settleWorkshop, applyWorkshop, recipeDuration, questStep, skillLevel, REGEN_MS, OFFLINE_CAP_MS, STORAGE_LIMIT, PLACEMENT_SLOTS, type WorkshopState, type WorkshopCommand } from '../src/game/workshop.ts';
const start = 1_700_000_000_000;
let serial = 0;
function act(state: WorkshopState, action: Omit<WorkshopCommand, 'id' | 'expectedRevision'> | Record<string, unknown>, now = start) {
  return applyWorkshop(state, { id: `test-${++serial}`, expectedRevision: state.revision, ...action }, now);
}
function gathered() { let s = createWorkshop(start); for (const resource of ['scrap', 'timber', 'supplies']) { const r = act(s, { kind: 'gather', resource }); assert.ok(r.ok, r.message); s = r.state; } return s; }
function tutorial() {
  let s = gathered(); let r = act(s, { kind: 'craft', recipe: 'planter' }); assert.ok(r.ok, r.message); s = r.state;
  r = act(s, { kind: 'claim' }, start + 5000); assert.ok(r.ok, r.message); s = r.state;
  r = act(s, { kind: 'place', prop: 'planter', slot: 'north-west' }, start + 5000); assert.ok(r.ok, r.message); return r.state;
}
test('first five-second craft, owned placement and quest preserve exact resource changes', () => {
  const initial = createWorkshop(start); assert.equal(initial.owned.planter, 0); assert.equal(questStep(initial).id, 'gather');
  const s = tutorial(); assert.deepEqual(s.inventory, { scrap: 4, timber: 4, supplies: 5 }); assert.equal(s.owned.planter, 1);
  assert.equal(s.placements['north-west'], 'planter'); assert.equal(questStep(s).id, 'bridge');
  assert.equal(s.stats.plantersCrafted, 1); assert.equal(recipeDuration(s, 'planter'), 8 * 3600_000); assert.equal(s.skills.gathering, 18); assert.equal(s.skills.making, 1);
  assert.equal(skillLevel(0), 1); assert.equal(skillLevel(30), 2); assert.equal(skillLevel(500), 5);
  assert.deepEqual(loadWorkshop(JSON.parse(JSON.stringify(s)), start + 5000), { state: s, recovered: false });
  const firstVisitJob = act(s, { kind: 'craft', recipe: 'bridge-kit' }, start + 5000); assert.ok(firstVisitJob.ok, firstVisitJob.message); assert.equal(firstVisitJob.state.job!.recipe, 'bridge-kit');
});
test('replays, stale revisions and duplicate claims never spend or produce twice', () => {
  const s = gathered(); const cmd = { id: 'fixed', expectedRevision: s.revision, kind: 'craft', recipe: 'planter' };
  const once = applyWorkshop(s, cmd, start); assert.ok(once.ok); const twice = applyWorkshop(once.state, cmd, start); assert.ok(twice.replayed); assert.equal(twice.state, once.state);
  const old = applyWorkshop(once.state, { ...cmd, id: 'new-id' }, start); assert.equal(old.ok, false); assert.equal(old.state, once.state);
  const claim = { id: 'claim', expectedRevision: once.state.revision, kind: 'claim' };
  const done = applyWorkshop(once.state, claim, start + 5000); assert.ok(done.ok); assert.equal(applyWorkshop(done.state, claim, start + 5000).state, done.state);
  const empty = act(done.state, { kind: 'claim' }, start + 5000); assert.equal(empty.ok, false); assert.equal(empty.state, done.state);
});
test('invalid actions fail atomically and cannot pay costs or bypass the tutorial', () => {
  const s = createWorkshop(start), snapshot = structuredClone(s);
  for (const action of [
    { kind: 'craft', recipe: 'planter' }, { kind: 'craft', recipe: 'bridge-kit' }, { kind: 'gather', resource: 'money' },
    { kind: 'place', prop: 'planter', slot: 'north-west' }, { kind: 'place', prop: 'rug', slot: 'doorway' },
    { kind: 'gather', resource: 'scrap', extra: 'unrecognized' }
  ]) { const r = act(s, action); assert.equal(r.ok, false); assert.equal(r.state, s); assert.deepEqual(s, snapshot); }
  const first = act(gathered(), { kind: 'craft', recipe: 'planter' }); const busy = act(first.state, { kind: 'craft', recipe: 'planter' }); assert.equal(busy.ok, false); assert.equal(busy.state, first.state);
  const early = act(first.state, { kind: 'claim' }, start + 4999); assert.equal(early.ok, false); assert.equal(early.state, first.state);
});
test('production survives absence, requires one explicit claim and cannot repeat its tutorial shortcut', () => {
  let s = tutorial(); const later = start + REGEN_MS * 2;
  for (const resource of ['scrap', 'timber']) { const r = act(s, { kind: 'gather', resource }, later); assert.ok(r.ok, r.message); s = r.state; }
  let r = act(s, { kind: 'craft', recipe: 'bridge-kit' }, later); assert.ok(r.ok); s = r.state; assert.equal(questStep(s).complete, true);
  assert.equal(s.job!.readyAt, later + 12 * 3600_000);
  const afterMonth = loadWorkshop(s, later + 30 * OFFLINE_CAP_MS).state; assert.equal(afterMonth.bridgeKits, 0); assert.ok(afterMonth.job);
  r = act(afterMonth, { kind: 'claim' }, later + 30 * OFFLINE_CAP_MS); assert.ok(r.ok); assert.equal(r.state.bridgeKits, 1); assert.equal(r.state.job, null);
  assert.equal(act(r.state, { kind: 'claim' }, later + 30 * OFFLINE_CAP_MS).ok, false);
  let replenished = r.state; for (const resource of ['scrap', 'timber', 'supplies']) replenished = act(replenished, { kind: 'gather', resource }, later + 30 * OFFLINE_CAP_MS).state;
  const normalPlanter = act(replenished, { kind: 'craft', recipe: 'planter' }, later + 30 * OFFLINE_CAP_MS); assert.ok(normalPlanter.ok); assert.equal(normalPlanter.state.job!.readyAt - normalPlanter.state.job!.startedAt, 8 * 3600_000);
});
test('gathering has bounded elapsed recovery, a visible storage cap and stable idle settlement', () => {
  const empty = act(createWorkshop(start), { kind: 'gather', resource: 'scrap' }).state;
  assert.equal(settleWorkshop(empty, start + REGEN_MS - 1), empty);
  const plusOne = settleWorkshop(empty, start + REGEN_MS); assert.equal(plusOne.nodes.scrap.stock, 1);
  assert.equal(settleWorkshop(plusOne, start + REGEN_MS), plusOne);
  const long = settleWorkshop(empty, start + 200 * OFFLINE_CAP_MS); assert.equal(long.nodes.scrap.stock, 6); assert.equal(long.inventory.scrap, 6);
  assert.equal(settleWorkshop(long, start + 201 * OFFLINE_CAP_MS), long);
  const full = createWorkshop(start); full.inventory = { scrap: STORAGE_LIMIT, timber: 0, supplies: 0 };
  const rejected = act(full, { kind: 'gather', resource: 'timber' }); assert.equal(rejected.ok, false); assert.equal(rejected.state, full);
  const partial = createWorkshop(start); partial.inventory.scrap = STORAGE_LIMIT - 1;
  const one = act(partial, { kind: 'gather', resource: 'timber' }); assert.ok(one.ok); assert.equal(one.state.inventory.timber, 1); assert.equal(one.state.nodes.timber.stock, 5);
});
test('placement validates ownership, occupancy and atomic moves while cancel remains domain-free', () => {
  let s = createWorkshop(start); const before = structuredClone(s);
  // UI previews do not issue a command; inspecting/exporting the definitions cannot change progress.
  assert.equal(PLACEMENT_SLOTS.length, 6); assert.deepEqual(s, before);
  s = act(s, { kind: 'place', prop: 'rug', slot: 'north-west' }).state;
  const occupied = act(s, { kind: 'place', prop: 'crate', slot: 'north-west' }); assert.equal(occupied.ok, false); assert.equal(occupied.state, s);
  assert.equal(act(s, { kind: 'place', prop: 'rug', slot: 'south-west' }).ok, false);
  const moved = act(s, { kind: 'place', prop: 'rug', slot: 'south-west', fromSlot: 'north-west' }); assert.ok(moved.ok); s = moved.state;
  assert.equal(s.placements['north-west'], null); assert.equal(s.placements['south-west'], 'rug'); assert.equal(s.owned.rug, 1);
  const removed = act(s, { kind: 'remove', slot: 'south-west' }); assert.ok(removed.ok); assert.equal(removed.state.owned.rug, 1); assert.equal(removed.state.placements['south-west'], null);
});
test('corrupt/unknown saves recover safely rather than importing unbounded or unowned progress', () => {
  const base = createWorkshop(start);
  for (const mutation of [
    { ...base, version: 9 }, { ...base, inventory: { ...base.inventory, scrap: -1 } },
    { ...base, inventory: { ...base.inventory, scrap: Number.MAX_SAFE_INTEGER } },
    { ...base, placements: { ...base.placements, 'north-west': 'planter' } },
    { ...base, nodes: { ...base.nodes, scrap: { stock: 9, lastAt: start } } },
    { ...base, job: { recipe: 'planter', startedAt: start, readyAt: start + 1 } },
    { ...base, hiddenAccount: 'not accepted' }
  ]) { const r = loadWorkshop(mutation, start); assert.equal(r.recovered, true); assert.deepEqual(r.state, base); }
  assert.equal(loadWorkshop(null, start).recovered, false);
});
test('rollback, noninteger time and output saturation never lose a queued output or create progress', () => {
  const s = tutorial(); assert.equal(settleWorkshop(s, start), s);
  const backwards = act(s, { kind: 'gather', resource: 'scrap' }, start); assert.equal(backwards.ok, false); assert.equal(backwards.state, s);
  assert.equal(act(s, { kind: 'gather', resource: 'scrap' }, NaN).ok, false);
  assert.equal(act(s, { kind: 'gather', resource: 'scrap' }, start + .5).ok, false);
  const full = gathered(); full.owned.planter = 99; const blocked = act(full, { kind: 'craft', recipe: 'planter' }); assert.equal(blocked.ok, false); assert.equal(blocked.state, full);
  const nearly = gathered(); nearly.stats.gathered = 1_000_000; const result = act(nearly, { kind: 'gather', resource: 'scrap' }, start + REGEN_MS); assert.equal(result.ok, false); assert.equal(result.state, nearly);
});
test('evicted receipts still cannot replay an old command revision', () => {
  let s = createWorkshop(start); const old = { id: 'old', expectedRevision: 0, kind: 'place', prop: 'rug', slot: 'north-west' };
  s = applyWorkshop(s, old, start).state;
  for (let i = 0; i < 70; i++) { const r = act(s, i % 2 === 0 ? { kind: 'remove', slot: 'north-west' } : { kind: 'place', prop: 'rug', slot: 'north-west' }); assert.ok(r.ok); s = r.state; }
  assert.equal(s.receipts.length, 64); const replay = applyWorkshop(s, old, start); assert.equal(replay.ok, false); assert.equal(replay.state, s);
});

test('six-week real-command pacing simulation is deterministic, bounded and survives a missed week', async () => {
  const { execFileSync } = await import('node:child_process');
  const run = () => JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', 'tools/simulate-progression.ts'], { encoding: 'utf8' }));
  const first = run(); assert.deepEqual(run(), first);
  assert.equal(first.simulatedDays, 42); assert.ok(first.activeToRegularOutputRatio <= 2);
  for (const cohort of first.cohorts) {
    assert.ok(cohort.maxMaterialStorage <= STORAGE_LIMIT);
    assert.ok(cohort.milestonesInDays.workshopImprovement >= 1 && cohort.milestonesInDays.workshopImprovement <= 3);
    assert.ok(cohort.milestonesInDays.starterHome >= 6 && cohort.milestonesInDays.starterHome <= 14);
    assert.equal(cohort.milestonesInDays.districtExpansion, null);
  }
  const regular = first.cohorts.find((c: { cohort: string }) => c.cohort === 'regular');
  assert.equal(regular.completedKits - first.regularWeekAbsence.completedKits, 14);
  assert.equal(first.regularWeekAbsence.pendingJob, 'bridge-kit');
});
