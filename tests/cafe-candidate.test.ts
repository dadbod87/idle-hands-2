import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorkshop, applyWorkshop, isCurrentWorkshop, loadWorkshop, PROP_IDS, type WorkshopState } from '../src/game/workshop.ts';
import { GARDEN_TIME_MAX } from '../src/game/garden.ts';
import { prepared } from './helpers/carpentry.ts';
import { preCommissionWorkshop } from './legacy-workshop.ts';
import {
  CAFE_RULES, CAFE_PRESENTATIONS, cafeWorkshopSchema, cafeProjectSchema, migrateCafeCandidate,
  createCafeProject, serveCafeCandidate, serveLocalCafeCandidate, localCafeProject,
  projectCafeCandidate, settleCafeProject, type CafeWorkshopCandidate, type CafeProject
} from '../src/game/cafe-candidate.ts';

const at = 1_700_000_000_000, H = 3_600_000;
function candidate(stock = 12): CafeWorkshopCandidate {
  // Isolated conserved harvest fixture; never imported into a playable save.
  const old = createWorkshop(at);
  old.garden.produce.radish = stock; old.garden.harvested.radish = stock;
  old.garden.planted = stock; old.garden.practice = stock; old.garden.firstRadishUsed = stock > 0;
  assert.ok(isCurrentWorkshop(old));
  const result = migrateCafeCandidate(old); assert.ok(result.ok);
  return result.state;
}
const action = (state: CafeWorkshopCandidate, presentation = 'slices') => ({ expectedRevision: state.revision, presentation });
function serve(state: CafeWorkshopCandidate, project: CafeProject, now: number, presentation = 'slices') {
  const result = serveCafeCandidate(state, project, action(state, presentation), now);
  assert.ok(result.ok, result.message); assert.ok(cafeWorkshopSchema.safeParse(result.state).success);
  assert.ok(cafeProjectSchema.safeParse(result.project).success); return result;
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const v of Object.values(value)) deepFreeze(v); }
  return value;
}

test('café candidate conserves twelve radishes, fixed cooldowns, one teapot and a fixed opening through absence/reload', () => {
  let state = candidate(), project = createCafeProject(at), awards = 0;
  const baseline = structuredClone(state);
  for (let i = 0; i < 12; i++) {
    const result = serve(deepFreeze(state), deepFreeze(project), at + i * 4 * H);
    awards += Number(result.teapotAwarded); state = result.state; project = result.project;
    assert.equal(state.cafe.totalServes, i + 1); assert.equal(state.garden.produce.radish, 11 - i);
    assert.equal(state.garden.harvested.radish, state.garden.produce.radish + state.garden.consumed.cafe.radish);
    assert.equal(state.cafe.nextServeAt, at + (i + 1) * 4 * H);
    assert.equal(state.owned.teapot, i >= 2 ? 1 : 0); assert.equal(project.credits, i + 1);
    if (i < 11) assert.equal(project.readyAt, null);
  }
  assert.equal(awards, 1); assert.equal(project.fundedAt, at + 44 * H); assert.equal(project.readyAt, at + 48 * H);
  assert.deepEqual(state.inventory, baseline.inventory); assert.deepEqual(state.job, baseline.job);
  assert.deepEqual(state.carpentry, baseline.carpentry); assert.deepEqual(state.commission, baseline.commission);
  assert.deepEqual(state.stats, baseline.stats); assert.deepEqual(state.skills, baseline.skills);
  assert.deepEqual(state.garden.seeds, baseline.garden.seeds); assert.deepEqual(state.garden.practice, baseline.garden.practice);
  const waiting = projectCafeCandidate(state, project, at + 44 * H);
  assert.equal(waiting.public.phase, 'opening'); assert.equal(waiting.private.bothComplete, true); assert.equal(waiting.private.canServe, false);
  assert.equal(projectCafeCandidate(state, project, at + 48 * H - 1).public.phase, 'opening');
  assert.equal(projectCafeCandidate(state, project, at + 48 * H).public.phase, 'open');
  const late = settleCafeProject(project, at + 14 * 24 * H);
  assert.equal(late.openedAt, project.readyAt); assert.equal(late.readyAt, project.readyAt);
  assert.deepEqual(settleCafeProject(JSON.parse(JSON.stringify(late)), late.observedAt), late);
  assert.throws(() => settleCafeProject(late, at), /backwards/);
  const noSpend = serveCafeCandidate(state, project, action(state), at + 100 * H);
  assert.equal(noSpend.ok, false); assert.equal(noSpend.state, state); assert.equal(noSpend.project, project);
  assert.deepEqual(localCafeProject(state), project);
  assert.deepEqual(migrateCafeCandidate(JSON.parse(JSON.stringify(state))), { ok: true, state, migrated: false });
});

test('café cooldown is inclusive at its deadline; refused commands keep every ledger and clock unchanged', () => {
  const first = serve(candidate(), createCafeProject(at), at), before = JSON.stringify(first);
  for (const now of [at, at + 4 * H - 1]) {
    const result = serveCafeCandidate(first.state, first.project, action(first.state), now);
    assert.equal(result.ok, false); assert.equal(result.state, first.state); assert.equal(result.project, first.project);
  }
  assert.equal(projectCafeCandidate(first.state, first.project, at + 4 * H - 1).private.remainingMs, 1);
  assert.equal(projectCafeCandidate(first.state, first.project, at + 4 * H).private.remainingMs, 0);
  assert.equal(serve(first.state, first.project, at + 4 * H).state.cafe.totalServes, 2);
  assert.equal(JSON.stringify(first), before);
  for (const now of [at - 1, NaN, Infinity, -1, at + .5, GARDEN_TIME_MAX + 1]) {
    const result = serveCafeCandidate(first.state, first.project, action(first.state), now);
    assert.equal(result.ok, false); assert.equal(result.state, first.state); assert.equal(result.project, first.project);
  }
  for (const raw of [null, {}, { ...action(first.state), expectedRevision: 0 }, { ...action(first.state), presentation: 'free' }, { ...action(first.state), cost: 0 }, { ...action(first.state), now: at + 4 * H }]) {
    const result = serveCafeCandidate(first.state, first.project, raw, at + 4 * H);
    assert.equal(result.ok, false); assert.equal(result.state, first.state); assert.equal(result.project, first.project);
  }
  const empty = candidate(0), noStock = serveCafeCandidate(empty, createCafeProject(at), action(empty), at);
  assert.equal(noStock.ok, false); assert.equal(noStock.state, empty);
  const limited = candidate(); limited.revision = 1_000_000;
  assert.equal(serveCafeCandidate(limited, createCafeProject(at), action(limited), at).ok, false);
  assert.equal(projectCafeCandidate(limited, createCafeProject(at), at).private.canServe, false);
});

test('final public credit serializes usefulness: late personal entitlement survives, completed residents do not pay', () => {
  let state = candidate(), project = createCafeProject(at);
  for (let i = 0; i < 2; i++) { const result = serve(state, project, at + i * 4 * H); state = result.state; project = result.project; }
  // Other fictional residents supplied the remaining public credits.
  const eleven = { ...project, credits: 11 }, now = at + 8 * H;
  const winner = serve(state, eleven, now);
  assert.equal(winner.teapotAwarded, true); assert.equal(winner.publicChanged, true); assert.equal(winner.project.credits, 12);
  const newcomer = candidate();
  const late = serve(newcomer, winner.project, now);
  assert.equal(late.state.cafe.totalServes, 1); assert.equal(late.publicChanged, false); assert.equal(late.project.credits, 12);
  assert.equal(late.project.readyAt, winner.project.readyAt);
  let personal = late;
  for (let i = 1; i < 3; i++) personal = serve(personal.state, personal.project, now + i * 4 * H);
  assert.equal(personal.teapotAwarded, true); assert.equal(personal.project.fundedAt, now);
  const complete = serveCafeCandidate(winner.state, winner.project, action(winner.state), now + 4 * H);
  assert.equal(complete.ok, false); assert.equal(complete.state, winner.state); assert.equal(complete.project, winner.project);
  // A second completed contributor acts against the locked/reloaded final project.
  const second = serve(state, eleven, now);
  const stopped = serveCafeCandidate(second.state, winner.project, action(second.state), now + 4 * H);
  assert.equal(stopped.ok, false); assert.equal(stopped.state.garden.produce.radish, second.state.garden.produce.radish);
  assert.equal(serveCafeCandidate(winner.state, { ...eleven, credits: 2 }, action(winner.state), now + 4 * H).ok, false);
  assert.throws(() => projectCafeCandidate(winner.state, { ...eleven, credits: 2 }, now + 4 * H), /older/);
});

test('cosmetic presentations have identical costs and local credit derives solely from the same private history', () => {
  const state = deepFreeze(candidate()), results = CAFE_PRESENTATIONS.map(p => serveLocalCafeCandidate(state, action(state, p), at));
  assert.deepEqual([...CAFE_PRESENTATIONS], JSON.parse(readFileSync('docs/evidence/IH2-099/study/catalog.json','utf8')).presentations.map((p:{id:string})=>p.id));
  assert.ok(results.every(r => r.ok)); assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
  assert.deepEqual(localCafeProject(results[0].state), results[0].project);
  const full = candidate(); full.inventory = { scrap: 20, timber: 20, supplies: 20 };
  assert.ok(serveCafeCandidate(full, createCafeProject(at), action(full), at).ok);
  const nearMax = candidate(); nearMax.observedAt = GARDEN_TIME_MAX; nearMax.garden.observedAt = GARDEN_TIME_MAX;
  assert.ok(serveCafeCandidate(nearMax, createCafeProject(GARDEN_TIME_MAX), action(nearMax), GARDEN_TIME_MAX).ok);
});

test('teapot remains distinguishable as owned versus available and may never be duplicated by placement', () => {
  let state = candidate(), project = createCafeProject(at);
  for (let i = 0; i < 3; i++) { const result = serve(state, project, at + i * 4 * H); state = result.state; project = result.project; }
  state.placements['north-west'] = 'teapot'; assert.ok(cafeWorkshopSchema.safeParse(state).success);
  const view = projectCafeCandidate(state, project, at + 8 * H);
  assert.equal(view.private.teapotOwned, 1); assert.equal(view.private.teapotAvailable, 0);
  state.placements['north-east'] = 'teapot'; assert.equal(cafeWorkshopSchema.safeParse(state).success, false);
  assert.equal(PROP_IDS.includes('teapot' as never), false);
});

test('candidate schema rejects forged rewards, sinks, partial fields, clocks and mixed live versions', () => {
  const initial = candidate(), one = serve(initial, createCafeProject(at), at).state;
  const edits: Array<(s: any) => void> = [
    s => s.owned.teapot = 1, s => s.garden.consumed.cafe.radish++, s => s.garden.consumed.cafe.marigold = 1,
    s => s.garden.produce.radish++, s => s.cafe.nextServeAt++, s => s.cafe.lastServeAt = at + 1,
    s => s.garden.observedAt = at + 1, s => s.cafe.totalServes = 13, s => s.cafe.extra = true,
    s => s.placements['north-west'] = 'teapot', s => s.garden.version = 3,
    s => delete s.sketches, s => delete s.cafe, s => delete s.owned.teapot, s => delete s.garden.consumed.cafe,
    s => s.commission.madeCount = 1, s => s.owned.easel = 1
  ];
  for (const edit of edits) {
    const bad = structuredClone(one); edit(bad);
    assert.equal(cafeWorkshopSchema.safeParse(bad).success, false, String(edit));
    const migrated = migrateCafeCandidate(bad); assert.equal(migrated.ok, false); if (!migrated.ok) assert.equal(migrated.raw, bad);
  }
  assert.equal(isCurrentWorkshop(one), false); assert.equal(loadWorkshop(one, at).recovered, true);
  for (const bad of [
    { ...createCafeProject(at), credits: 12 },
    { version: 1, observedAt: at, credits: 11, fundedAt: at, readyAt: at + 4 * H, openedAt: null },
    { version: 1, observedAt: at, credits: 12, fundedAt: at, readyAt: at + 4 * H, openedAt: at + 4 * H },
    { version: 1, observedAt: at, credits: 12, fundedAt: at, readyAt: at + 4 * H + 1, openedAt: null }
  ]) assert.equal(cafeProjectSchema.safeParse(bad).success, false);
});

function checkPreserved(old: WorkshopState) {
  assert.ok(isCurrentWorkshop(old)); const before = JSON.stringify(old), converted = migrateCafeCandidate(deepFreeze(old));
  assert.ok(converted.ok); assert.equal(converted.migrated, true); assert.equal(JSON.stringify(old), before);
  const { cafe, version, ...next } = structuredClone(converted.state);
  const { teapot, ...owned } = next.owned, { cafe: sink, ...consumed } = next.garden.consumed;
  const restored = { ...next, version: 2, owned, garden: { ...next.garden, version: 3, consumed } };
  assert.deepEqual(restored, old); assert.equal(teapot, 0); assert.deepEqual(sink, { radish: 0, marigold: 0 }); assert.equal(cafe.totalServes, 0);
  return converted.state;
}

test('exact current migration preserves populated production, crop, skill, receipts and furniture data without settling', () => {
  let old = prepared(at, true); old.sketches = ['oak'];
  let serial = 0;
  for (const commissionAction of [{action:'accept'}, ...['clerk','caretaker','carpentry-desk'].map(parcel => ({action:'handover',parcel,recipient:parcel})), {action:'complete'}, {action:'make',motif:'leaf'}]) {
    const result = applyWorkshop(old,{id:'migration-populated-'+(++serial),expectedRevision:old.revision,kind:'commission',commissionAction},old.observedAt); assert.ok(result.ok,result.message); old=result.state;
  }
  // The fixture keeps both an ordinary job and a finishing job, with a live crop.
  checkPreserved(old);
  const late = createWorkshop(at); late.nodes.scrap = { stock: 0, lastAt: at - 24 * H };
  const result = checkPreserved(late); assert.equal(result.nodes.scrap.stock, 0); assert.equal(result.nodes.scrap.lastAt, at - 24 * H);
});

test('all three recognized historical tuples migrate additively; partial/unknown/corrupt current saves preserve raw identity', () => {
  const old = prepared(at, true), previous = preCommissionWorkshop(old);
  const preCarpentry = preCommissionWorkshop(prepared(at, false));
  delete preCarpentry.carpentry; delete preCarpentry.owned.easel; preCarpentry.garden.version = 1; delete preCarpentry.garden.consumed;
  const preGarden = structuredClone(preCarpentry); delete preGarden.garden; delete preGarden.sketches;
  for (const value of [previous, preCarpentry, preGarden]) {
    const bytes = JSON.stringify(value), migrated = migrateCafeCandidate(deepFreeze(value)); assert.ok(migrated.ok, bytes);
    const oldParsed = loadWorkshop(value, value.observedAt); assert.equal(oldParsed.recovered, false);
    assert.deepEqual(migrated.state, migrateCafeCandidate(oldParsed.state).ok ? (migrateCafeCandidate(oldParsed.state) as { state: CafeWorkshopCandidate }).state : null);
    assert.equal(JSON.stringify(value), bytes);
  }
  const current = createWorkshop(at);
  const missingSketches: any = structuredClone(current); delete missingSketches.sketches;
  const partialGarden: any = structuredClone(previous); delete partialGarden.carpentry; delete partialGarden.owned.easel;
  const partialRoot: any = structuredClone(previous); partialRoot.carpentry.version = 2;
  const badCurrent: any = structuredClone(current); badCurrent.garden.harvested.radish++;
  for (const value of [null, undefined, [], 'raw damaged save', { ...current, version: 99 }, { ...current, cafe: {} }, missingSketches, partialGarden, partialRoot, badCurrent]) {
    const before = JSON.stringify(value), result = migrateCafeCandidate(value);
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.raw, value); assert.equal(JSON.stringify(value), before);
  }
});

test('pure projection discloses aggregate-only public fields and never mutates clocks, private stock or inputs', () => {
  const result = serve(candidate(), createCafeProject(at), at), before = JSON.stringify(result);
  const view = projectCafeCandidate(deepFreeze(result.state), deepFreeze(result.project), at + 100 * H);
  assert.deepEqual(Object.keys(view.public).sort(), ['credits', 'phase', 'readyAt']);
  assert.equal(view.private.remainingMs, 0); assert.equal(view.private.radishesHeld, 11); assert.equal(JSON.stringify(result), before);
  assert.throws(() => projectCafeCandidate(result.state, result.project, at - 1), /backwards|older/);
});

test('candidate remains unregistered with the live writer, scene and network; migrations are unchanged', () => {
  for (const file of ['src/ui/workshop.ts', 'server/http.ts', 'server/store.ts', 'src/main.ts']) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /cafe-candidate|serveCafeCandidate|cafeWorkshopSchema/);
  }
});

 test('dated café provenance checks both immutable historical bytes and explicitly reviewed current refactor bytes',async()=>{
 const {checkCafeRefactorSources}=await import('../tools/cafe-historical-inputs.ts');
 const manifest=JSON.parse(readFileSync('docs/evidence/IH2-104/validator-refactor.json','utf8'));
 assert.deepEqual(checkCafeRefactorSources(manifest),[]);
 const changed=structuredClone(manifest);changed.currentRefactors['src/game/workshop.ts']='0'.repeat(64);
 assert.ok(checkCafeRefactorSources(changed).some(s=>s.includes('Current café refactor mismatch')));
 const missing=structuredClone(manifest);delete missing.currentRefactors['src/game/workshop.ts'];
 assert.ok(checkCafeRefactorSources(missing).some(s=>s.includes('set changed')));
 const old=structuredClone(manifest);old.historical['src/game/workshop.ts'].sha256='0'.repeat(64);
 assert.ok(checkCafeRefactorSources(old).some(s=>s.includes('Historical café snapshot mismatch')));
 });
