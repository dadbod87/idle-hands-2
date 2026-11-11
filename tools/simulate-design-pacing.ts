import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { RECIPES, RESOURCE_IDS, NODE_CAPACITY, REGEN_MS, OFFLINE_CAP_MS, STORAGE_LIMIT, ITEM_LIMIT, type ResourceId } from '../src/game/workshop.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS, MAINTENANCE_MS, MAINTENANCE_COST, BRIDGE_BUILD_MS } from '../src/game/town-rules.ts';

/** DESIGN EXPERIMENT ONLY. Imports constants; never sends commands or writes game/account state. */
export const HOUR = 3_600_000, DAY = 24 * HOUR;
type Materials = Record<ResourceId, number>;
const blank = (): Materials => ({ scrap: 0, timber: 0, supplies: 0 });
const integer = (n: number, label: string, min = 0) => { if (!Number.isSafeInteger(n) || n < min) throw new Error(`Invalid ${label}.`); return n; };
export type Cohort = { id: string; minutesPerDay: number; hours: number[] };
export const COHORTS: readonly Cohort[] = [
  { id: 'idle', minutesPerDay: 10, hours: [9] },
  { id: 'regular', minutesPerDay: 30, hours: [9, 21] },
  { id: 'active', minutesPerDay: 120, hours: [8, 12, 20, 23] }
];
export type PacingPolicy = { id: string; firstKitMs: number; homeBuildMs: number; upgradeBuildMs: number; donateKits: number; orientationLessonMs?: number };
export const CURRENT: PacingPolicy = { id: 'current-rules', firstKitMs: RECIPES['bridge-kit'].durationMs, homeBuildMs: 0, upgradeBuildMs: 0, donateKits: 1 };
export const TEACHING: PacingPolicy = { id: 'teaching-kit-candidate', firstKitMs: 5 * 60_000, homeBuildMs: 6 * HOUR, upgradeBuildMs: 12 * HOUR, donateKits: 1 };
export const TEACHING_FAST: PacingPolicy = { ...TEACHING, id: 'teaching-60s-candidate', firstKitMs: 60_000 };
export const GUIDED: PacingPolicy = { ...TEACHING, id: 'paid-maintenance-candidate', firstKitMs: RECIPES['bridge-kit'].durationMs, orientationLessonMs: 60_000 };
export const ORIENTATION_COST: Materials = { scrap: 1, timber: 1, supplies: 1 };
export type Construction = { id: string; target: number; contributed: number; buildMs: number; readyAt: number | null; openedAt: number | null; openedObservedAt: number | null; receipts: string[]; openingReceipts: string[] };
export function construction(id: string, target: number, buildMs: number): Construction {
  integer(target, 'project target', 1); integer(buildMs, 'build duration');
  if (!id) throw new Error('Project ID is required.');
  return { id, target, contributed: 0, buildMs, readyAt: null, openedAt: null, openedObservedAt: null, receipts: [], openingReceipts: [] };
}
export function contribute(project: Construction, receipt: string, now: number): { project: Construction; spent: number } {
  integer(now, 'project clock'); if (!receipt) throw new Error('Contribution receipt is required.');
  if (project.receipts.includes(receipt) || project.contributed >= project.target) return { project, spent: 0 };
  const next = structuredClone(project); next.contributed++; next.receipts.push(receipt);
  if (next.contributed === next.target) next.readyAt = now + next.buildMs;
  return { project: next, spent: 1 };
}
export function observeConstruction(project: Construction, now: number): Construction {
  integer(now, 'project clock');
  if (project.readyAt === null || now < project.readyAt || project.openedAt !== null) return project;
  return { ...project, openedAt: project.readyAt, openedObservedAt: now, openingReceipts: [`${project.id}:opened:v1`] };
}
export type PacingState = {
  at: number; inventory: Materials; nodes: Record<ResourceId, { stock: number; at: number }>;
  generated: Materials; gathered: Materials; materialSpent: Materials;
  kitsProduced: number; kitBalance: number; kitsSpent: { bridge: number; home: number; upgrade: number };
  job: { kind: 'planter' | 'bridge-kit' | 'orientation'; readyAt: number; teaching: boolean } | null;
  peakMaterials: number; planterOwned: number; planterPlaced: boolean; firstKitStarted: boolean; teachingJobs: number; jobsStarted: number; kitJobsStarted: number;
  orientation: { started: boolean; completed: boolean; creditProduced: number; creditSpent: number; completedAt: number | null; paid: Materials; receipts: string[] };
  plot: Construction | null; upgrade: Construction | null; weeklyScore: number;
};
export function freshPacingState(at = 0): PacingState {
  integer(at, 'initial clock');
  return { at, inventory: blank(), nodes: Object.fromEntries(RESOURCE_IDS.map(id => [id, { stock: NODE_CAPACITY, at }])) as PacingState['nodes'], generated: blank(), gathered: blank(), materialSpent: blank(), kitsProduced: 0, kitBalance: 0, kitsSpent: { bridge: 0, home: 0, upgrade: 0 }, job: null, peakMaterials: 0, planterOwned: 0, planterPlaced: false, firstKitStarted: false, teachingJobs: 0, jobsStarted: 0, kitJobsStarted: 0, orientation: { started: false, completed: false, creditProduced: 0, creditSpent: 0, completedAt: null, paid: blank(), receipts: [] }, plot: null, upgrade: null, weeklyScore: 0 };
}
export function rollWeek(input: PacingState): PacingState { return { ...structuredClone(input), weeklyScore: 0 }; }
export function conservation(state: PacingState): boolean {
  return state.orientation.creditProduced === state.orientation.creditSpent + (state.orientation.completed && !state.orientation.creditSpent ? 1 : 0) && state.kitsProduced === state.kitBalance + state.kitsSpent.bridge + state.kitsSpent.home + state.kitsSpent.upgrade && RESOURCE_IDS.every(id => NODE_CAPACITY + state.generated[id] === state.nodes[id].stock + state.inventory[id] + state.materialSpent[id]);
}
function accrue(state: PacingState, now: number) {
  if (now < state.at) throw new Error('Clock rollback is not a reward.');
  state.at = now;
  for (const id of RESOURCE_IDS) {
    const node = state.nodes[id]; if (node.stock === NODE_CAPACITY) continue;
    const elapsed = Math.min(now - node.at, OFFLINE_CAP_MS), units = Math.floor(elapsed / REGEN_MS);
    if (!units) continue;
    const added = Math.min(units, NODE_CAPACITY - node.stock); node.stock += added; state.generated[id] += added;
    node.at = node.stock === NODE_CAPACITY ? now : now - elapsed % REGEN_MS;
  }
  if (state.plot) state.plot = observeConstruction(state.plot, now);
  if (state.upgrade) state.upgrade = observeConstruction(state.upgrade, now);
}
function gather(state: PacingState, now: number) {
  for (const id of RESOURCE_IDS) {
    if (state.inventory[id] >= 18) continue; // Explicit model stock-management policy, not an extra runtime cap.
    const room = STORAGE_LIMIT - RESOURCE_IDS.reduce((sum, key) => sum + state.inventory[key], 0), quantity = Math.min(room, state.nodes[id].stock);
    if (!quantity) continue;
    if (state.nodes[id].stock === NODE_CAPACITY) state.nodes[id].at = now;
    state.nodes[id].stock -= quantity; state.inventory[id] += quantity; state.gathered[id] += quantity;
    state.peakMaterials = Math.max(state.peakMaterials, RESOURCE_IDS.reduce((sum, key) => sum + state.inventory[key], 0));
  }
}
function payRecipe(state: PacingState, recipe: keyof typeof RECIPES): boolean {
  const cost = RECIPES[recipe].cost;
  if (RESOURCE_IDS.some(id => state.inventory[id] < cost[id])) return false;
  for (const id of RESOURCE_IDS) { state.inventory[id] -= cost[id]; state.materialSpent[id] += cost[id]; }
  return true;
}
export function startOrientation(input: PacingState, now: number, durationMs = 60_000): PacingState {
  integer(now, 'orientation clock'); if (now < input.at) throw new Error('Orientation clock rollback.'); integer(durationMs, 'orientation duration', 1000);
  if (durationMs > 5 * 60_000) throw new Error('Orientation duration is outside the candidate range.');
  if (input.orientation.started || !input.planterPlaced || input.job || RESOURCE_IDS.some(id => input.inventory[id] < ORIENTATION_COST[id])) return input;
  const next = structuredClone(input);
  for (const id of RESOURCE_IDS) { next.inventory[id] -= ORIENTATION_COST[id]; next.materialSpent[id] += ORIENTATION_COST[id]; next.orientation.paid[id] += ORIENTATION_COST[id]; }
  next.orientation.started = true; next.orientation.receipts.push('orientation:paid:v1');
  next.job = { kind: 'orientation', readyAt: now + durationMs, teaching: true }; next.jobsStarted++;
  return next;
}
export function completeOrientation(input: PacingState, now: number): PacingState {
  integer(now, 'orientation clock'); if (now < input.at) throw new Error('Orientation clock rollback.');
  if (input.orientation.completed || input.job?.kind !== 'orientation' || now < input.job.readyAt) return input;
  const next = structuredClone(input); next.orientation.completed = true; next.orientation.completedAt = now; next.orientation.creditProduced = 1;
  next.orientation.receipts.push('orientation:completed:v1'); next.job = null;
  return next;
}
export function spendOrientationCredit(input: PacingState): PacingState {
  if (!input.orientation.creditProduced || input.orientation.creditSpent) return input;
  const next = structuredClone(input); next.orientation.creditSpent = 1; next.orientation.receipts.push('orientation:contributed:v1'); next.weeklyScore++;
  return next;
}
function startJob(state: PacingState, policy: PacingPolicy, now: number): boolean {
  if (state.job) return false;
  if (state.planterPlaced && policy.orientationLessonMs && !state.orientation.started) { const next = startOrientation(state, now, policy.orientationLessonMs); if (next === state) return false; Object.assign(state, next); return true; }
  const kind = state.planterOwned === 0 ? 'planter' : 'bridge-kit';
  if (kind === 'bridge-kit' && (!state.planterPlaced || state.kitBalance >= ITEM_LIMIT)) return false;
  if (!payRecipe(state, kind)) return false;
  const teaching = kind === 'bridge-kit' && !state.firstKitStarted && policy.firstKitMs !== RECIPES['bridge-kit'].durationMs;
  const duration = kind === 'planter' ? RECIPES.planter.tutorialDurationMs : !state.firstKitStarted ? policy.firstKitMs : RECIPES['bridge-kit'].durationMs;
  state.job = { kind, readyAt: now + duration, teaching }; state.jobsStarted++;
  if (kind === 'bridge-kit') { state.kitJobsStarted++; state.firstKitStarted = true; if (teaching) state.teachingJobs++; }
  return true;
}
function claim(state: PacingState, now: number, producedAt: number[]) {
  if (!state.job || now < state.job.readyAt) return;
  if (state.job.kind === 'orientation') { Object.assign(state, completeOrientation(state, now)); return; }
  if (state.job.kind === 'planter') state.planterOwned++;
  else { state.kitsProduced++; state.kitBalance++; producedAt.push(now); }
  state.job = null;
}
function spendObjectives(state: PacingState, policy: PacingPolicy, now: number) {
  if (policy.donateKits > 0 && state.orientation.completed) Object.assign(state, spendOrientationCredit(state));
  while (state.kitBalance && state.kitsSpent.bridge + state.orientation.creditSpent < policy.donateKits) { state.kitBalance--; state.kitsSpent.bridge++; state.weeklyScore++; }
  if (!state.plot && state.kitBalance >= PLOT_CLAIM_KITS) {
    state.kitBalance -= PLOT_CLAIM_KITS; state.kitsSpent.home += PLOT_CLAIM_KITS;
    state.plot = contribute(construction('personal-home', 1, policy.homeBuildMs), 'home-materials:v1', now).project;
    state.plot = observeConstruction(state.plot, now);
  }
  if (state.plot?.openedAt !== null && state.plot && !state.upgrade && state.kitBalance >= PLOT_UPGRADE_KITS) {
    state.kitBalance -= PLOT_UPGRADE_KITS; state.kitsSpent.upgrade += PLOT_UPGRADE_KITS;
    state.upgrade = contribute(construction('personal-upgrade', 1, policy.upgradeBuildMs), 'upgrade-materials:v1', now).project;
    state.upgrade = observeConstruction(state.upgrade, now);
  }
}
export function simulateCohort(cohort: Cohort, policy: PacingPolicy, options: { days?: number; absentDays?: number[]; joinDay?: number } = {}) {
  const days = integer(options.days ?? 42, 'days', 1), joinDay = integer(options.joinDay ?? 0, 'join day');
  if (days > 365 || joinDay >= days || !cohort.id || !cohort.hours.length || cohort.hours.length > 24) throw new Error('Invalid bounded cohort.');
  integer(cohort.minutesPerDay, 'minutes per day', 1); if (cohort.minutesPerDay > 1440) throw new Error('Too many daily minutes.');
  if (cohort.hours.some(hour => !Number.isFinite(hour) || hour < 0 || hour >= 24) || new Set(cohort.hours).size !== cohort.hours.length) throw new Error('Invalid visit hours.');
  const sortedHours = [...cohort.hours].sort((a, b) => a - b);
  if (sortedHours.some((hour, index) => (sortedHours[(index + 1) % sortedHours.length] + (index === sortedHours.length - 1 ? 24 : 0) - hour) * 60 < cohort.minutesPerDay / cohort.hours.length)) throw new Error('Visit time budgets overlap.');
  for (const value of [policy.firstKitMs, policy.homeBuildMs, policy.upgradeBuildMs, policy.donateKits, policy.orientationLessonMs ?? 0]) integer(value, 'policy value');
  if (policy.firstKitMs < 1000 || policy.firstKitMs > RECIPES['bridge-kit'].durationMs || policy.homeBuildMs > 7 * DAY || policy.upgradeBuildMs > 7 * DAY || policy.donateKits > 99 || (policy.orientationLessonMs !== undefined && (policy.orientationLessonMs < 1000 || policy.orientationLessonMs > 5 * 60_000))) throw new Error('Invalid policy boundary.');
  const absent = new Set(options.absentDays ?? []); for (const day of absent) integer(day, 'absent day');
  let state = freshPacingState(joinDay * DAY), week = Math.floor(joinDay / 7), visits = 0, blockedRecipeVisits = 0, idleBenchMs = 0, longestNoClaimMs = 0, maxMaterials = 0;
  const productionTimes: number[] = [], checkpoints: { day: number; kits: number; plot: boolean; upgrade: boolean; pendingJob: boolean; weeklyScore: number }[] = [];
  const milestones: { firstPlanterPlaced: number | null; firstKit: number | null; bridgeContribution: number | null; plotClaimed: number | null; homeReady: number | null; homeObservedOpen: number | null; upgradePaid: number | null; upgradeReady: number | null; upgradeObservedOpen: number | null } = { firstPlanterPlaced: null, firstKit: null, bridgeContribution: null, plotClaimed: null, homeReady: null, homeObservedOpen: null, upgradePaid: null, upgradeReady: null, upgradeObservedOpen: null };
  let lastVisitEnd = joinDay * DAY;
  let firstSession: { jobQueuedAtEnd: string | null; materials: Materials; kitOutputs: number; orientationCredits: number } | null = null;
  for (let day = joinDay; day < days; day++) {
    if (Math.floor(day / 7) !== week) { week = Math.floor(day / 7); state = rollWeek(state); checkpoints.push({ day, kits: state.kitBalance, plot: !!state.plot, upgrade: !!state.upgrade, pendingJob: !!state.job, weeklyScore: state.weeklyScore }); }
    if (absent.has(day)) continue;
    for (const hour of [...cohort.hours].sort((a, b) => a - b)) {
      visits++; let now = day * DAY + hour * HOUR; const end = now + cohort.minutesPerDay / cohort.hours.length * 60_000;
      const priorJob = state.job; if (priorJob) longestNoClaimMs = Math.max(longestNoClaimMs, Math.max(0, now - priorJob.readyAt));
      else idleBenchMs += Math.max(0, now - lastVisitEnd);
      accrue(state, now); gather(state, now);
      let actions = 0;
      while (actions++ < 8) {
        if (state.job && state.job.readyAt <= end) { now = Math.max(now, state.job.readyAt); accrue(state, now); claim(state, now, productionTimes); }
        if (state.planterOwned && !state.planterPlaced) { state.planterPlaced = true; milestones.firstPlanterPlaced ??= now; }
        spendObjectives(state, policy, now);
        if (state.kitsProduced) milestones.firstKit ??= productionTimes[0];
        if (state.kitsSpent.bridge || state.orientation.creditSpent) milestones.bridgeContribution ??= now;
        if (state.plot) { milestones.plotClaimed ??= state.plot.readyAt! - policy.homeBuildMs; milestones.homeReady = state.plot.readyAt; milestones.homeObservedOpen = state.plot.openedObservedAt; }
        if (state.upgrade) { milestones.upgradePaid ??= state.upgrade.readyAt! - policy.upgradeBuildMs; milestones.upgradeReady = state.upgrade.readyAt; milestones.upgradeObservedOpen = state.upgrade.openedObservedAt; }
        if (state.job) break;
        if (!startJob(state, policy, now)) { blockedRecipeVisits++; break; }
        if (state.job!.readyAt > end) break;
      }
      if (actions > 8) throw new Error('Unbounded action loop.');
      maxMaterials = state.peakMaterials;
      if (!conservation(state) || state.kitBalance > ITEM_LIMIT || maxMaterials > STORAGE_LIMIT) throw new Error('Ledger or storage invariant failed.');
      if (visits === 1) firstSession = { jobQueuedAtEnd: state.job?.kind ?? null, materials: structuredClone(state.inventory), kitOutputs: state.kitsProduced, orientationCredits: state.orientation.creditSpent };
      lastVisitEnd = end;
    }
  }
  const firstVisitHours = joinDay * 24 + Math.min(...cohort.hours);
  return { cohort: cohort.id, policy: policy.id, firstVisitHours, milestonesAfterArrivalHours: Object.fromEntries(Object.entries(milestones).map(([key, value]) => [key, value === null ? null : Number((value / HOUR - firstVisitHours).toFixed(4))])), simulatedDays: days, firstSession, orientation: state.orientation, joinDay, absentDays: [...absent], visits, firstSessionDurationMinutes: cohort.minutesPerDay / cohort.hours.length, milestonesHours: Object.fromEntries(Object.entries(milestones).map(([key, value]) => [key, value === null ? null : Number((value / HOUR).toFixed(4))])), kits: { produced: state.kitsProduced, balance: state.kitBalance, spent: state.kitsSpent }, materials: { generated: state.generated, gathered: state.gathered, spent: state.materialSpent, remaining: state.inventory, nodeStock: Object.fromEntries(RESOURCE_IDS.map(id => [id, state.nodes[id].stock])), maxStored: maxMaterials }, teachingJobs: state.teachingJobs, blockedRecipeVisits, idleBenchHours: Number((idleBenchMs / HOUR).toFixed(2)), longestFinishedJobWaitHours: Number((longestNoClaimMs / HOUR).toFixed(2)), weeklyCheckpoints: checkpoints, productionTimes, finalState: state };
}

export function simulateGroup(size: number, policy: PacingPolicy, options: { buildMs?: number; joinDay?: number; absentFirstWeek?: boolean; target?: number } = {}) {
  integer(size, 'group size', 1); if (size > 20) throw new Error('Group experiment is capped at twenty people.');
  const buildMs = options.buildMs ?? 0, target = options.target ?? 3;
  let project = construction('bridge', target, buildMs);
  const people = Array.from({ length: size }, (_, index) => ({ id: `resident-${index + 1}`, model: simulateCohort(COHORTS[1], { ...policy, donateKits: 0 }, { joinDay: index === size - 1 ? options.joinDay ?? 0 : 0, absentDays: options.absentFirstWeek && index === 0 ? [0, 1, 2, 3, 4, 5, 6] : [] }) }));
  const events = people.flatMap(person => [...person.model.productionTimes.map((at, index) => ({ at, player: person.id, receipt: `${person.id}:kit:${index}`, kind: 'kit' })), ...(person.model.orientation.completed ? [{ at: person.model.orientation.completedAt!, player: person.id, receipt: `${person.id}:orientation:v1`, kind: 'orientation' }] : [])]).sort((a, b) => a.at - b.at || a.player.localeCompare(b.player));
  const donated = Object.fromEntries(people.map(person => [person.id, 0])); let rejectedAfterCompletion = 0, orientationContributions = 0, kitContributions = 0;
  for (const event of events) {
    const result = contribute(project, event.receipt, event.at);
    project = result.project; donated[event.player] += result.spent; if (result.spent) { if (event.kind === 'orientation') orientationContributions++; else kitContributions++; } if (!result.spent) rejectedAfterCompletion++;
  }
  project = observeConstruction(project, 42 * DAY);
  return { policy: policy.id, size, target, buildHours: buildMs / HOUR, lateJoinDay: options.joinDay ?? 0, absentFirstWeek: !!options.absentFirstWeek, materialsCompleteHours: project.readyAt === null ? null : (project.readyAt - buildMs) / HOUR, readyHours: project.readyAt === null ? null : project.readyAt / HOUR, orientationContributions, kitContributions, contributors: Object.values(donated).filter(n => n > 0).length, contributionCounts: donated, lateJoinerContributions: donated[`resident-${size}`], attemptedKitsAfterCompletion: rejectedAfterCompletion, openingCount: project.openingReceipts.length, interpretation: 'Separate project-demand experiment. Production supply is replayed as potential donations before personal purchases; do not combine these donation totals with the personal housing ledger. No per-person contribution cap is imposed.' };
}

export type MaintenanceLedger = { project: Construction; entries: { playerId: string; receipt: string; kind: 'construction' | 'upkeep'; recordedAt: number }[] };
export function routeOrientationCredit(input: MaintenanceLedger, playerId: string, player: PacingState, now: number): { ledger: MaintenanceLedger; player: PacingState; kind: 'construction' | 'upkeep' | 'replayed' | 'not-ready' } {
  integer(now, 'maintenance clock');
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(playerId)) throw new Error('Invalid maintenance identity.');
  if (input.entries.some(entry => entry.playerId === playerId)) return { ledger: input, player, kind: 'replayed' };
  if (!player.orientation.completed || player.orientation.creditProduced !== 1 || player.orientation.creditSpent || player.orientation.completedAt === null || now < player.orientation.completedAt) return { ledger: input, player, kind: 'not-ready' };
  const kind = input.project.contributed < input.project.target ? 'construction' : 'upkeep';
  const receipt = `orientation:${playerId}:v1`;
  const next = structuredClone(input);
  if (kind === 'construction') next.project = contribute(next.project, receipt, now).project;
  next.project = observeConstruction(next.project, now);
  next.entries.push({ playerId, receipt, kind, recordedAt: now });
  const spent = spendOrientationCredit(player);
  // Proposed upkeep recognizes useful work without kit, currency or competition-score rewards.
  spent.weeklyScore = player.weeklyScore;
  return { ledger: next, player: spent, kind };
}
export function simulateMaintenanceGroup(size = 12, lateJoinDay = 0) {
  integer(size, 'maintenance group size', 1); integer(lateJoinDay, 'maintenance join day'); if (size > 20 || lateJoinDay >= 42) throw new Error('Invalid maintenance group.');
  const people = Array.from({ length: size }, (_, index) => ({ id: `resident-${index + 1}`, model: simulateCohort(COHORTS[1], { ...GUIDED, donateKits: 0 }, { joinDay: index === size - 1 ? lateJoinDay : 0 }) }));
  let ledger: MaintenanceLedger = { project: construction('bridge-with-maintenance', 3, 6 * HOUR), entries: [] };
  const events = people.map(person => ({ id: person.id, at: person.model.orientation.completedAt!, state: person.model.finalState })).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const after: PacingState[] = []; let duplicateCharges = 0;
  for (const event of events) {
    const recorded = routeOrientationCredit(ledger, event.id, event.state, event.at); ledger = recorded.ledger; after.push(recorded.player);
    const replay = routeOrientationCredit(ledger, event.id, recorded.player, event.at + HOUR);
    if (replay.kind !== 'replayed' || replay.ledger !== ledger || replay.player !== recorded.player) duplicateCharges++;
  }
  ledger.project = observeConstruction(ledger.project, 42 * DAY);
  return { policy: 'paid-maintenance-with-upkeep-candidate', size, lateJoinDay, constructionTarget: 3, constructionCredits: ledger.project.contributed, upkeepCredits: ledger.entries.filter(entry => entry.kind === 'upkeep').length, firstSessionLessonsCompleted: people.filter(person => person.model.orientation.completed && person.model.orientation.completedAt! - person.model.firstVisitHours * HOUR <= person.model.firstSessionDurationMinutes * 60_000).length, recognizedResidents: ledger.entries.length, lateJoinerKind: ledger.entries.find(entry => entry.playerId === `resident-${size}`)?.kind ?? null, projectReadyGlobalHours: ledger.project.readyAt! / HOUR, openingCount: ledger.project.openingReceipts.length, lessonMaterialsSpent: Object.fromEntries(RESOURCE_IDS.map(id => [id, people.reduce((sum, person) => sum + person.model.orientation.paid[id], 0)])), inventoryKitsCreatedByLessons: 0, duplicateCharges, allPersonalLedgersConserve: after.every(conservation), receipts: ledger.entries, interpretation: 'Candidate only: first three paid lesson credits advance construction; later once-only lessons record upkeep/inspection separately. Routing spends the already-paid nontradeable credit, never charges materials twice, creates kits or changes construction target/deadline. Future server must commit lesson/player/project/quest migration atomically.' };
}

export type Corpse = { deathId: string; owner: string; dropped: number; protected: number; recovered: number; lost: number; deadline: number; lostFoundAt: number; receipts: string[] };
export type RecoveryPolicy = 'hard-expiry' | 'lost-and-found';
export function createCorpse(deathId: string, owner: string, dropped: number, protectedCount: number, at: number, windowMs = 30 * 60_000, outageGraceMs = 0): Corpse {
  integer(dropped, 'dropped quantity'); integer(protectedCount, 'protected quantity'); integer(at, 'death clock'); integer(windowMs, 'recovery window', 1); integer(outageGraceMs, 'outage grace');
  if (!deathId || !owner || dropped > 1_000_000 || protectedCount > 1_000_000 || !Number.isSafeInteger(at + windowMs + outageGraceMs + 6 * HOUR) || windowMs > 7 * DAY || outageGraceMs > DAY) throw new Error('Invalid recovery policy.');
  return { deathId, owner, dropped, protected: protectedCount, recovered: 0, lost: 0, deadline: at + windowMs + outageGraceMs, lostFoundAt: at + windowMs + outageGraceMs + 6 * HOUR, receipts: [] };
}
export function recoverCorpse(input: Corpse, actor: string, receipt: string, now: number, capacity: number, policy: RecoveryPolicy, reachable = true): { corpse: Corpse; transferred: number; status: string } {
  integer(now, 'recovery clock'); integer(capacity, 'free bag capacity'); if (!receipt || !['hard-expiry', 'lost-and-found'].includes(policy)) throw new Error('Invalid recovery request.');
  if (actor !== input.owner) return { corpse: input, transferred: 0, status: 'not-owner' };
  if (input.receipts.includes(receipt)) return { corpse: input, transferred: 0, status: 'replayed' };
  const next = structuredClone(input), remaining = next.dropped - next.recovered - next.lost;
  if (now > next.deadline && policy === 'hard-expiry') { next.lost += remaining; return { corpse: next, transferred: 0, status: 'expired-loss' }; }
  if (!reachable && now <= next.deadline) return { corpse: input, transferred: 0, status: 'inaccessible-instance' };
  if (now > next.deadline && now < next.lostFoundAt) return { corpse: input, transferred: 0, status: 'lost-found-wait' };
  const transferred = Math.min(remaining, capacity); if (!transferred) return { corpse: input, transferred: 0, status: remaining ? 'bag-full' : 'already-empty' };
  next.recovered += transferred; next.receipts.push(receipt);
  return { corpse: next, transferred, status: now > next.deadline ? 'lost-found-recovered' : 'corpse-recovered' };
}
export function recoveryScenarios() {
  const cases = [
    { id: 'inkwood-near-trail', travel: 8, interruption: 0, downtime: 0, reachable: true },
    { id: 'pumpworks-dungeon', travel: 20, interruption: 12, downtime: 0, reachable: true },
    { id: 'inkwood-mossbank-approach-phone-interruption', travel: 18, interruption: 15, downtime: 0, reachable: true },
    { id: 'bellwether-quay-disconnect', travel: 8, interruption: 31, downtime: 0, reachable: true },
    { id: 'inkwood-service-outage', travel: 15, interruption: 0, downtime: 20, reachable: true },
    { id: 'pumpworks-instance-closed', travel: 18, interruption: 0, downtime: 0, reachable: false }
  ];
  return cases.map(item => {
    const arrive = (item.travel + item.interruption + item.downtime) * 60_000;
    const corpse = createCorpse(item.id, 'owner', 10, 4, 0);
    const hard = recoverCorpse(corpse, 'owner', 'recover:v1', arrive, 10, 'hard-expiry', item.reachable);
    const eventualHard = hard.transferred ? hard : recoverCorpse(hard.corpse, 'owner', 'after-expiry:v1', Math.max(arrive, corpse.deadline + 1), 10, 'hard-expiry', item.reachable);
    const softAtArrival = recoverCorpse(corpse, 'owner', 'recover:v1', arrive, 10, 'lost-and-found', item.reachable);
    const soft = softAtArrival.transferred ? softAtArrival : recoverCorpse(softAtArrival.corpse, 'owner', 'lostfound:v1', Math.max(arrive, corpse.lostFoundAt), 10, 'lost-and-found', true);
    const extended = recoverCorpse(createCorpse(item.id, 'owner', 10, 4, 0, 60 * 60_000), 'owner', 'longer:v1', arrive, 10, 'hard-expiry', item.reachable);
    const grace = recoverCorpse(createCorpse(item.id, 'owner', 10, 4, 0, 30 * 60_000, item.downtime * 60_000), 'owner', 'grace:v1', arrive, 10, 'hard-expiry', item.reachable);
    return { ...item, arrivalMinutes: arrive / 60_000, hard30StatusAtArrival: hard.status, hard30FinalLoss: eventualHard.corpse.lost, softStatusAtArrival: softAtArrival.status, softFinalLoss: soft.corpse.lost, softRecoveryMinutes: softAtArrival.transferred ? arrive / 60_000 : corpse.lostFoundAt / 60_000, longer60Status: extended.status, outageGraceStatus: grace.status, protectedAlwaysRetained: corpse.protected };
  });
}
export function onboardingScenarios() {
  // Seconds after the first playable input; character creation is deliberately not hidden in this budget.
  const paths = [
    { id: 'direct-first-visit', arrival: 45, gather: 45, workshopTravel: 30, planter: 5, placement: 25, bridgeTravel: 30 },
    { id: 'slower-phone-reading', arrival: 75, gather: 90, workshopTravel: 60, planter: 5, placement: 45, bridgeTravel: 60 }
  ];
  return paths.flatMap(path => [60, 300, RECIPES['bridge-kit'].durationMs / 1000].map(lessonSeconds => {
    const beforeQueue = path.arrival + path.gather + path.workshopTravel + path.planter + path.placement;
    const total = beforeQueue + lessonSeconds + path.bridgeTravel;
    return { ...path, lessonSeconds, firstContributionMinutes: Number((total / 60).toFixed(3)), insideFiveMinuteTarget: total <= 300, insideTenMinuteVisit: total <= 600, usefulParallelActivitySeconds: Math.min(lessonSeconds, 60), unallocatedLessonSeconds: Math.max(0, lessonSeconds - 60), assumption: 'During the job: free furniture arrangement and journal reading budgeted at60seconds total; no rewards or forced tasks. Travel/reading values are design estimates, not playtest measurements. Character creation is outside this first-playable-input budget.' };
  }));
}
export function designReport() {
  const cohorts = [CURRENT, TEACHING, TEACHING_FAST, GUIDED].flatMap(policy => COHORTS.map(cohort => simulateCohort(cohort, policy)));
  const missedWeek = simulateCohort(COHORTS[1], CURRENT, { absentDays: [8, 9, 10, 11, 12, 13, 14] });
  const groups = [1, 3, 12].flatMap(size => [simulateGroup(size, CURRENT), simulateGroup(size, TEACHING, { buildMs: 6 * HOUR }), simulateGroup(size, TEACHING_FAST, { buildMs: 6 * HOUR }), simulateGroup(size, GUIDED, { buildMs: 6 * HOUR }), simulateGroup(size, CURRENT, { absentFirstWeek: true }), simulateGroup(size, CURRENT, { joinDay: 14 })]);
  const sourcePaths = ['src/game/workshop.ts', 'src/game/town-rules.ts', 'server/store.ts'];
  return {
    schemaVersion: 1, classification: 'DESIGN-ONLY; no runtime/state/database changes', simulatedDays: 42,
    modelBaseline: 'Historical ordinary-kit-only baseline and unselected comparison policies; current-rules is a stable scenario ID, not a claim to simulate the entire053 runtime.',
    selectedRuntime: {asOf:'IH2-053 working candidate; acceptance tracked separately',physicalHomes:true,homeClaimKits:PLOT_CLAIM_KITS,homeUpgradeAdditionalKits:PLOT_UPGRADE_KITS,homeBuildWaitMs:0,homeUpgradeWaitMs:0,maintenanceLessonMs:MAINTENANCE_MS,maintenanceCost:MAINTENANCE_COST,maintenanceCreatesInventoryKit:false,completedBridgeRoute:'upkeep; no extra material charge',bridgeBuildMs:BRIDGE_BUILD_MS,bridgePhases:['collecting','building','open'],readyArtIsPresentationOnly:true,grandfatheredOpenBridgesKeepAccess:true,townClockChangesProduction:false},
    sourceHashes: Object.fromEntries(sourcePaths.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
    implementedConstantsUsed: { nodeCapacity: NODE_CAPACITY, unitRecoveryHours: REGEN_MS / HOUR, offlineAccrualCapHours: OFFLINE_CAP_MS / HOUR, materialStorage: STORAGE_LIMIT, kitStorage: ITEM_LIMIT, normalKitHours: RECIPES['bridge-kit'].durationMs / HOUR, firstPlanterSeconds: RECIPES.planter.tutorialDurationMs / 1000, claimKits: PLOT_CLAIM_KITS, upgradeAdditionalKits: PLOT_UPGRADE_KITS },
    assumptions: [
      'Independent model imports current constants; it does not execute production transactions. Gathering, costs, single queued job and caps mirror source rules; movement/travel/click overhead is omitted in the cohort model.',
      'Sessions occur at fixed hour offsets and can wait for a job that becomes ready within that visit’s time budget. Daily minutes label visit opportunities, not an income multiplier.',
      'Personal ledger is one participant with one accepted project contribution (one inventory kit, or one separate paid-maintenance credit in that candidate), then actual12-kit plot spending and24additional-kit upgrade spending. The current3-kit bridge cannot accept a donation from every member of a12-person group; group experiment exposes this separately.',
      'The historical current-rules row models immediate plot/upgrade spending, matching052 immediate physical home/upgrade availability. Candidate rows add6h HOME construction and12h HOME upgrade waits; those personal timers remain unimplemented.053 separately implements a six-real-hour SHARED bridge deadline. Historical group rows with build_hours0 remain baseline comparisons, not current runtime bridge timing.',
      'The paid-maintenance comparison consumes1scrap/1timber/1supplies once at60seconds and creates a separate credit, never an inventory kit.052 adopted that bounded lesson with explicit construction/upkeep routing and migration. This historical arithmetic model does not execute or prove those authoritative transactions; its candidate home waits were not adopted.',
      'Candidate teaching kits compare60seconds and300seconds, consume the normal3scrap/2timber/1supplies exactly once and supply no extra grant. All subsequent kits take12hours. Neither candidate is a runtime rule.',
      'Inventory management gathers a material only below18held units to reserve capacity for all types; this is a model strategy, not a new runtime restriction.',
      'Seven-day observation checkpoints clear only the model weekly score. Actual Friday16:00Pacific scheduling is covered by existing server tests, not reimplemented here.',
      'No luck, skill yield bonus, sale prices, trade, buffs, travel rewards or exponential income. Fixed schedules and perfect resource choices are optimistic; simulations are not retention/fun evidence.',
      'Recovery scenarios are arithmetic candidate-policy tests. Ten carried material units are droppable and four essential units protected; equipped gear, final deadlines/loss and outage treatment remain owner decisions. Six-hour fee-free lost-and-found is a comparison, not a promise.'
    ],
    cohorts, missedWeek, groups, maintenanceAlternatives: [simulateMaintenanceGroup(12), simulateMaintenanceGroup(12, 14)], onboarding: onboardingScenarios(), recovery: recoveryScenarios(),
    audit: { allLedgersConserve: cohorts.every(row => conservation(row.finalState)) && conservation(missedWeek.finalState), candidateTeachingUsesAtMostOne: cohorts.every(row => row.teachingJobs <= 1), candidateOrientationUsesAtMostOne: cohorts.every(row => row.orientation.creditProduced <= 1 && row.orientation.creditSpent <= row.orientation.creditProduced), noWeeklyAssetDeletion: cohorts.every(row => { const before = { ...row.finalState, weeklyScore: 0 }; return JSON.stringify(before) === JSON.stringify(rollWeek(row.finalState)); }) }
  };
}
export function writeDesignReport(directory: string) {
  const report = designReport(); mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, 'pacing-experiment.json'), JSON.stringify(report, null, 2) + '\n');
  const head = 'policy,cohort,produced,orientation_credit_spent,bridge_spent,plot_spent,upgrade_spent,balance,first_project_contribution_hours,first_kit_hours,plot_paid_hours,home_ready_hours,upgrade_paid_hours,upgrade_ready_hours';
  const rows = report.cohorts.map(row => [row.policy, row.cohort, row.kits.produced, row.orientation.creditSpent, row.kits.spent.bridge, row.kits.spent.home, row.kits.spent.upgrade, row.kits.balance, row.milestonesAfterArrivalHours.bridgeContribution, row.milestonesAfterArrivalHours.firstKit, row.milestonesAfterArrivalHours.plotClaimed, row.milestonesAfterArrivalHours.homeReady, row.milestonesAfterArrivalHours.upgradePaid, row.milestonesAfterArrivalHours.upgradeReady].join(','));
  writeFileSync(resolve(directory, 'pacing-cohorts.csv'), [head, ...rows].join('\n') + '\n');
  writeFileSync(resolve(directory, 'pacing-groups.csv'), ['policy,people,target,build_hours,late_join_day,absent_first_week,materials_complete_global_hours,ready_global_hours,contributors,orientation_contributions,kit_contributions,late_joiner_contributions', ...report.groups.map(row => [row.policy,row.size,row.target,row.buildHours,row.lateJoinDay,row.absentFirstWeek,row.materialsCompleteHours,row.readyHours,row.contributors,row.orientationContributions,row.kitContributions,row.lateJoinerContributions].join(','))].join('\n') + '\n');
  writeFileSync(resolve(directory, 'pacing-recovery.csv'), ['scenario,arrival_minutes,hard30_status,hard30_final_loss,soft_status,soft_recovery_minutes,soft_final_loss,longer60_status,outage_grace_status', ...report.recovery.map(row => [row.id,row.arrivalMinutes,row.hard30StatusAtArrival,row.hard30FinalLoss,row.softStatusAtArrival,row.softRecoveryMinutes,row.softFinalLoss,row.longer60Status,row.outageGraceStatus].join(','))].join('\n') + '\n');
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = writeDesignReport(process.argv[2] ?? 'docs/evidence/IH2-054');
  process.stdout.write(JSON.stringify({ classification: report.classification, audit: report.audit, cohorts: report.cohorts.map(row => ({ policy: row.policy, cohort: row.cohort, kits: row.kits, milestonesHours: row.milestonesHours })) }, null, 2) + '\n');
}
