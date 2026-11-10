import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CURRENT, TEACHING, TEACHING_FAST, GUIDED, startOrientation, completeOrientation, spendOrientationCredit, freshPacingState, COHORTS, HOUR, DAY, simulateCohort, simulateGroup, simulateMaintenanceGroup, routeOrientationCredit, conservation, construction, contribute, observeConstruction, rollWeek, createCorpse, recoverCorpse, recoveryScenarios, onboardingScenarios, designReport } from '../tools/simulate-design-pacing.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS } from '../src/game/town-rules.ts';
import { RECIPES, NODE_CAPACITY, STORAGE_LIMIT } from '../src/game/workshop.ts';

test('six-week ledgers spend bridge, plot and additional upgrade costs once and conserve every material/kit', () => {
  for (const policy of [CURRENT, TEACHING, TEACHING_FAST, GUIDED]) for (const cohort of COHORTS) {
    const row = simulateCohort(cohort, policy); assert.ok(conservation(row.finalState));
    assert.equal(row.kits.spent.bridge + row.orientation.creditSpent, 1); assert.equal(row.kits.spent.home, PLOT_CLAIM_KITS); assert.equal(row.kits.spent.upgrade, PLOT_UPGRADE_KITS);
    assert.equal(row.kits.produced, row.kits.balance + row.kits.spent.bridge + PLOT_CLAIM_KITS + PLOT_UPGRADE_KITS);
    assert.ok(row.materials.maxStored <= STORAGE_LIMIT);
    for (const id of ['scrap', 'timber', 'supplies'] as const) {
      assert.equal(NODE_CAPACITY + row.materials.generated[id], row.materials.nodeStock[id] + row.materials.remaining[id] + row.materials.spent[id]);
      assert.equal(row.materials.spent[id], RECIPES.planter.cost[id] + row.finalState.kitJobsStarted * RECIPES['bridge-kit'].cost[id] + row.orientation.paid[id]);
    }
    assert.equal(row.finalState.plot!.receipts.length, 1); assert.equal(row.finalState.upgrade!.receipts.length, 1);
  }
});
test('teaching path consumes ordinary materials, is once-only, and does not turn later clicks into output', () => {
  const beforePolicy = structuredClone(TEACHING_FAST), beforeCohort = structuredClone(COHORTS[1]);
  const normal = simulateCohort(COHORTS[1], CURRENT), quick = simulateCohort(COHORTS[1], TEACHING_FAST);
  assert.equal(normal.teachingJobs, 0); assert.equal(quick.teachingJobs, 1);
  assert.equal(quick.milestonesAfterArrivalHours.firstKit, Number(((5000 + 60_000) / HOUR).toFixed(4)));
  for (let i = 1; i < quick.productionTimes.length; i++) assert.ok(quick.productionTimes[i] - quick.productionTimes[i - 1] >= RECIPES['bridge-kit'].durationMs);
  assert.deepEqual(TEACHING_FAST, beforePolicy); assert.deepEqual(COHORTS[1], beforeCohort);
  const dense = simulateCohort({ id: 'hourly', minutesPerDay: 24, hours: Array.from({ length: 24 }, (_, i) => i) }, TEACHING_FAST);
  assert.ok(dense.kits.produced <= 85); assert.ok(dense.kits.produced <= quick.kits.produced * 1.1);
  assert.equal(dense.teachingJobs, 1); assert.ok(conservation(dense.finalState));
});
test('paid maintenance lesson produces one nontradeable credit and leaves a normal return job queued', () => {
  const input = freshPacingState(); input.planterOwned = 1; input.planterPlaced = true; input.inventory = { scrap: 4, timber: 4, supplies: 5 }; input.materialSpent = { scrap: 2, timber: 2, supplies: 1 }; for (const id of ['scrap', 'timber', 'supplies'] as const) { input.nodes[id].stock = 0; input.gathered[id] = 6; } assert.ok(conservation(input)); const copy = structuredClone(input);
  const started = startOrientation(input, 0); assert.deepEqual(input, copy); assert.deepEqual(started.inventory, { scrap: 3, timber: 3, supplies: 4 }); assert.deepEqual(started.orientation.paid, { scrap: 1, timber: 1, supplies: 1 });
  assert.equal(startOrientation(started, 1000), started); assert.equal(completeOrientation(started, 59_999), started);
  const done = completeOrientation(started, 60_000); assert.equal(done.kitBalance, 0); assert.equal(done.kitsProduced, 0); assert.equal(done.orientation.creditProduced, 1);
  assert.equal(completeOrientation(done, 61_000), done); assert.equal(startOrientation(done, 61_000), done);
  const paid = spendOrientationCredit(done); assert.equal(paid.orientation.creditSpent, 1); assert.equal(spendOrientationCredit(paid), paid); assert.equal(paid.kitBalance, 0); assert.equal(paid.plot, null); assert.equal(paid.kitsSpent.home, 0); assert.ok(conservation(paid));
  assert.deepEqual(paid.orientation.receipts, ['orientation:paid:v1', 'orientation:completed:v1', 'orientation:contributed:v1']);
  for (const cohort of COHORTS) {
    const row = simulateCohort(cohort, GUIDED); assert.equal(row.teachingJobs, 0); assert.equal(row.firstSession!.jobQueuedAtEnd, 'bridge-kit'); assert.deepEqual(row.firstSession!.materials, { scrap: 0, timber: 1, supplies: 3 });
    assert.equal(row.firstSession!.kitOutputs, 0); assert.equal(row.firstSession!.orientationCredits, 1); assert.equal(row.kits.spent.bridge, 0); assert.ok(conservation(row.finalState));
    assert.ok(row.milestonesAfterArrivalHours.plotClaimed! >= (cohort.id === 'idle' ? 12 : 6) * 24);
    assert.ok(row.productionTimes.every((time, index) => index === 0 || time - row.productionTimes[index - 1] >= RECIPES['bridge-kit'].durationMs));
  }
  assert.equal(simulateCohort(COHORTS[1], TEACHING_FAST).firstSession!.jobQueuedAtEnd, null, 'Full-cost fast kit comparison retains its exposed scrap shortage.');
  const group = simulateGroup(3, GUIDED, { buildMs: 6 * HOUR }); assert.equal(group.orientationContributions, 3); assert.equal(group.kitContributions, 0); assert.equal(group.contributors, 3);
});
test('construction starts only after materials, uses one immutable deadline and opens once without attendance', () => {
  const initial = construction('ledgerwick-bridge', 3, 6 * HOUR), copy = structuredClone(initial);
  let p = contribute(initial, 'one', 0).project; assert.equal(p.readyAt, null); assert.deepEqual(initial, copy);
  assert.equal(contribute(p, 'one', HOUR).spent, 0);
  p = contribute(p, 'two', HOUR).project; p = contribute(p, 'three', 2 * HOUR).project; assert.equal(p.readyAt, 8 * HOUR);
  const extra = contribute(p, 'four', 4 * HOUR); assert.equal(extra.spent, 0); assert.equal(extra.project.readyAt, 8 * HOUR);
  assert.equal(observeConstruction(p, 8 * HOUR - 1).openedAt, null);
  const reopened = observeConstruction(p, 20 * HOUR); assert.equal(reopened.openedAt, 8 * HOUR); assert.equal(reopened.openedObservedAt, 20 * HOUR);
  assert.deepEqual(observeConstruction(reopened, 30 * HOUR), reopened); assert.equal(reopened.openingReceipts.length, 1);
  assert.equal(observeConstruction(construction('empty', 1, 0), 100 * DAY).openedAt, null);
});
test('a missed week preserves queued work and permanent spending; weekly score clearing deletes no assets', () => {
  const regular = simulateCohort(COHORTS[1], CURRENT), absent = simulateCohort(COHORTS[1], CURRENT, { absentDays: [8, 9, 10, 11, 12, 13, 14] });
  assert.ok(absent.kits.produced < regular.kits.produced); assert.ok(absent.finalState.plot); assert.ok(absent.finalState.upgrade); assert.ok(conservation(absent.finalState));
  assert.ok(absent.longestFinishedJobWaitHours >= 7 * 24);
  const before = structuredClone(absent.finalState), rolled = rollWeek(before); assert.equal(rolled.weeklyScore, 0);
  assert.deepEqual({ ...rolled, weeklyScore: before.weeklyScore }, before); assert.deepEqual(before, absent.finalState);
  assert.ok(absent.weeklyCheckpoints.every(check => check.weeklyScore === 0));
});
test('group experiment exposes early closure and late-newcomer exclusion rather than inventing contribution slots', () => {
  const solo = simulateGroup(1, CURRENT), three = simulateGroup(3, CURRENT), twelve = simulateGroup(12, CURRENT);
  assert.equal(solo.contributors, 1); assert.equal(three.contributors, 3); assert.equal(twelve.contributors, 3);
  for (const row of [solo, three, twelve]) assert.equal(Object.values(row.contributionCounts).reduce((sum, n) => sum + n, 0), 3);
  const late = simulateGroup(12, CURRENT, { joinDay: 14 }); assert.equal(late.lateJoinerContributions, 0);
  const absentSolo = simulateGroup(1, CURRENT, { absentFirstWeek: true }); assert.ok(absentSolo.materialsCompleteHours! > solo.materialsCompleteHours!);
  const absentLarge = simulateGroup(12, CURRENT, { absentFirstWeek: true }); assert.equal(absentLarge.materialsCompleteHours, twelve.materialsCompleteHours);
  const timer = simulateGroup(3, TEACHING_FAST, { buildMs: 6 * HOUR }); assert.equal(timer.readyHours! - timer.materialsCompleteHours!, 6); assert.equal(timer.openingCount, 1);
});
test('once-only paid upkeep recognizes late residents without replay charges or changing construction stages', () => {
  const paidLesson = (at: number) => { const state = freshPacingState(at); state.planterOwned = 1; state.planterPlaced = true; state.inventory = { scrap: 4, timber: 4, supplies: 5 }; state.materialSpent = { scrap: 2, timber: 2, supplies: 1 }; for (const id of ['scrap', 'timber', 'supplies'] as const) { state.nodes[id].stock = 0; state.gathered[id] = 6; } return completeOrientation(startOrientation(state, at), at + 60_000); };
  let ledger = { project: construction('upkeep-test', 3, 6 * HOUR), entries: [] } as Parameters<typeof routeOrientationCredit>[0];
  for (const id of ['one', 'two', 'three']) { const result = routeOrientationCredit(ledger, id, paidLesson(0), 60_000); assert.equal(result.kind, 'construction'); ledger = result.ledger; assert.ok(conservation(result.player)); }
  const building = structuredClone(ledger.project), fourth = paidLesson(0), before = structuredClone(fourth);
  const upkeep = routeOrientationCredit(ledger, 'four', fourth, 60_000); assert.equal(upkeep.kind, 'upkeep'); assert.deepEqual(upkeep.ledger.project, building); assert.deepEqual(fourth, before); assert.ok(conservation(upkeep.player));
  assert.deepEqual(upkeep.player.materialSpent, fourth.materialSpent); assert.equal(upkeep.player.kitBalance, fourth.kitBalance); assert.equal(upkeep.player.weeklyScore, fourth.weeklyScore);
  const again = routeOrientationCredit(upkeep.ledger, 'four', upkeep.player, 2 * HOUR); assert.equal(again.kind, 'replayed'); assert.equal(again.ledger, upkeep.ledger); assert.equal(again.player, upkeep.player);
  const opened = { ...upkeep.ledger, project: observeConstruction(upkeep.ledger.project, 7 * HOUR) }; const exact = structuredClone(opened.project);
  const late = routeOrientationCredit(opened, 'late', paidLesson(14 * DAY), 14 * DAY + 60_000); assert.equal(late.kind, 'upkeep'); assert.deepEqual(late.ledger.project, exact); assert.equal(late.ledger.project.readyAt, building.readyAt); assert.equal(late.ledger.project.openingReceipts.length, 1);
  assert.equal(routeOrientationCredit(ledger, 'unpaid', freshPacingState(), 60_000).kind, 'not-ready'); assert.throws(() => routeOrientationCredit(ledger, '', fourth, 60_000));
  for (const day of [0, 14]) { const report = simulateMaintenanceGroup(12, day); assert.equal(report.constructionCredits, 3); assert.equal(report.upkeepCredits, 9); assert.equal(report.recognizedResidents, 12); assert.equal(report.firstSessionLessonsCompleted, 12); assert.deepEqual(report.lessonMaterialsSpent, { scrap: 12, timber: 12, supplies: 12 }); assert.equal(report.inventoryKitsCreatedByLessons, 0); assert.equal(report.duplicateCharges, 0); assert.ok(report.allPersonalLedgersConserve); assert.equal(report.lateJoinerKind, 'upkeep'); }
});
test('recovery protects essentials, validates owner/capacity, conserves partial loot and rejects replay', () => {
  const original = createCorpse('death-one', 'owner', 10, 4, 0), copy = structuredClone(original);
  assert.equal(recoverCorpse(original, 'visitor', 'stolen', 1000, 20, 'hard-expiry').status, 'not-owner');
  assert.equal(recoverCorpse(original, 'owner', 'full', 1000, 0, 'hard-expiry').status, 'bag-full');
  const partial = recoverCorpse(original, 'owner', 'first', 1000, 3, 'hard-expiry'); assert.equal(partial.transferred, 3);
  const replay = recoverCorpse(partial.corpse, 'owner', 'first', 1001, 10, 'hard-expiry'); assert.equal(replay.transferred, 0);
  const rest = recoverCorpse(partial.corpse, 'owner', 'second', 1002, 20, 'hard-expiry'); assert.equal(rest.transferred, 7); assert.equal(rest.corpse.recovered + rest.corpse.lost, 10); assert.equal(rest.corpse.protected, 4);
  assert.deepEqual(original, copy);
  const anotherDeath = createCorpse('death-two', 'owner', 5, 4, 2000); assert.equal(anotherDeath.deathId, 'death-two'); assert.equal(rest.corpse.deathId, 'death-one');
});
test('deadline boundary, server outage grace and inaccessible instances have explicit different outcomes', () => {
  const p = createCorpse('deadline', 'owner', 10, 4, 0);
  assert.equal(recoverCorpse(p, 'owner', 'at', p.deadline, 10, 'hard-expiry').transferred, 10);
  assert.equal(recoverCorpse(p, 'owner', 'late', p.deadline + 1, 10, 'hard-expiry').corpse.lost, 10);
  assert.equal(recoverCorpse(p, 'owner', 'closed', 18 * 60_000, 10, 'hard-expiry', false).status, 'inaccessible-instance');
  const soft = recoverCorpse(p, 'owner', 'later', p.lostFoundAt, 10, 'lost-and-found'); assert.equal(soft.transferred, 10); assert.equal(soft.corpse.lost, 0);
  const rows = recoveryScenarios(), outage = rows.find(row => row.id === 'inkwood-service-outage')!;
  assert.equal(outage.hard30FinalLoss, 10); assert.equal(outage.outageGraceStatus, 'corpse-recovered');
  assert.ok(rows.every(row => row.protectedAlwaysRetained === 4 && row.softFinalLoss === 0));
  assert.equal(rows.find(row => row.id === 'pumpworks-instance-closed')!.longer60Status, 'inaccessible-instance');
});
test('60-second and300-second lessons include travel/reading and expose the phone session bottleneck', () => {
  const rows = onboardingScenarios();
  const direct = rows.find(row => row.id === 'direct-first-visit' && row.lessonSeconds === 60)!; assert.equal(direct.firstContributionMinutes, 4); assert.equal(direct.unallocatedLessonSeconds, 0);
  const long = rows.find(row => row.id === 'slower-phone-reading' && row.lessonSeconds === 300)!; assert.equal(long.insideTenMinuteVisit, false); assert.equal(long.unallocatedLessonSeconds, 240);
  assert.ok(rows.filter(row => row.lessonSeconds === 43200).every(row => !row.insideTenMinuteVisit));
});
test('invalid, negative, unbounded and overlapping model policies fail instead of granting progress', () => {
  for (const policy of [{ ...CURRENT, firstKitMs: 0 }, { ...CURRENT, donateKits: -1 }, { ...CURRENT, homeBuildMs: Infinity }, { ...CURRENT, upgradeBuildMs: 8 * DAY }]) assert.throws(() => simulateCohort(COHORTS[1], policy));
  assert.throws(() => simulateCohort(COHORTS[1], CURRENT, { days: 0 })); assert.throws(() => simulateCohort(COHORTS[1], CURRENT, { days: 366 }));
  assert.throws(() => simulateCohort({ id: 'bad', minutesPerDay: 30, hours: [9, 9.01] }, CURRENT));
  assert.throws(() => simulateGroup(0, CURRENT)); assert.throws(() => simulateGroup(21, CURRENT));
  assert.throws(() => construction('bad', 0, 1)); assert.throws(() => construction('bad', 1, -1));
  assert.throws(() => createCorpse('bad', 'owner', -1, 1, 0)); assert.throws(() => createCorpse('bad', 'owner', 1, 1, 0, 0)); assert.throws(() => createCorpse('bad', 'owner', 1, 1, Number.MAX_SAFE_INTEGER));
  const corpse = createCorpse('valid', 'owner', 1, 1, 0); assert.throws(() => recoverCorpse(corpse, 'owner', 'bad', 1, -1, 'hard-expiry')); assert.throws(() => recoverCorpse(corpse, 'owner', 'bad', 1, 1, 'unknown' as any));
});
test('report and CLI artifacts are deterministic design outputs with source fingerprints', () => {
  const first = designReport(), second = designReport(); assert.deepEqual(first, second); assert.ok(Object.values(first.audit).every(Boolean));
  const directory = mkdtempSync(join(tmpdir(), 'ih2-design-pacing-'));
  try {
    execFileSync(process.execPath, ['--experimental-strip-types', 'tools/simulate-design-pacing.ts', directory]);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'pacing-experiment.json'), 'utf8')), first);
    assert.equal(readFileSync(join(directory, 'pacing-cohorts.csv'), 'utf8').trim().split('\n').length, 13);
    for (const file of ['pacing-experiment.json', 'pacing-cohorts.csv', 'pacing-groups.csv', 'pacing-recovery.csv']) assert.equal(readFileSync(join(directory, file), 'utf8'), readFileSync(join('docs/evidence/IH2-054', file), 'utf8'), `${file}: refresh committed design evidence after a source/model change`);
    assert.ok(Object.values(first.sourceHashes).every(hash => /^[a-f0-9]{64}$/.test(hash)));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
