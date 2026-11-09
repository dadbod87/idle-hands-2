import { writeFileSync } from 'node:fs';
import { createWorkshop, applyWorkshop, settleWorkshop, RESOURCE_IDS, OFFLINE_CAP_MS, STORAGE_LIMIT, type WorkshopState, type WorkshopCommand } from '../src/game/workshop.ts';

// Deterministic six-week design experiment, not a prediction of live retention or a housing system.
const DAY = 24 * 3600_000, START = 1_700_000_000_000;
const definitions = [
  { name: 'idle', dailyMinutes: 10, hours: [9] },
  { name: 'regular', dailyMinutes: 30, hours: [9, 21] },
  { name: 'active', dailyMinutes: 120, hours: [8, 12, 20, 23] }
];
const thresholds = { workshopImprovement: 2, starterHome: 12, homeUpgrade: 36, districtExpansion: 120 };
function simulate(def: typeof definitions[number], absentDays: number[] = []) {
  let state = createWorkshop(START), commandCount = 0, lastNow = START, noMaterialVisits = 0, maxInventory = 0;
  const milestones: Record<string, number | null> = Object.fromEntries(Object.keys(thresholds).map(key => [key, null]));
  function command(action: Record<string, unknown>, now: number) {
    const result = applyWorkshop(state, { id: `${def.name}-${++commandCount}`, expectedRevision: state.revision, ...action } as WorkshopCommand, now);
    state = result.state; return result.ok;
  }
  function visit(now: number) {
    lastNow = now; state = settleWorkshop(state, now);
    if (state.job && now >= state.job.readyAt) command({ kind: 'claim' }, now);
    const before = state.stats.gathered;
    for (const resource of RESOURCE_IDS) {
      // Preserve room for every resource; stop collecting a material already stockpiled for many kits.
      if (state.inventory[resource] < 18) command({ kind: 'gather', resource }, now);
    }
    if (state.stats.gathered === before) noMaterialVisits++;
    if (!state.stats.plantersCrafted && !state.job) {
      if (command({ kind: 'craft', recipe: 'planter' }, now)) {
        // Each cohort can remain five seconds during its first session. No synthetic grant/clock leap in UI.
        now += 5000; lastNow = now; command({ kind: 'claim' }, now);
      }
    }
    if (state.stats.plantersCrafted && !state.stats.planterPlacedAfterCraft) command({ kind: 'place', prop: 'planter', slot: 'north-west' }, now);
    if (state.stats.planterPlacedAfterCraft && !state.job) command({ kind: 'craft', recipe: 'bridge-kit' }, now);
    for (const [name, threshold] of Object.entries(thresholds)) if (milestones[name] === null && state.bridgeKits >= threshold) milestones[name] = Number(((now - START) / DAY).toFixed(2));
    maxInventory = Math.max(maxInventory, RESOURCE_IDS.reduce((n, id) => n + state.inventory[id], 0));
  }
  for (let day = 0; day < 42; day++) if (!absentDays.includes(day)) for (const hour of def.hours) visit(START + day * DAY + hour * 3600_000);
  return { cohort: def.name, dailyMinutes: def.dailyMinutes, visitsPerDay: def.hours.length, absentDays, completedKits: state.bridgeKits, materialsGathered: state.stats.gathered, commandsAttempted: commandCount, noMaterialVisits, maxMaterialStorage: maxInventory, milestonesInDays: milestones, pendingJob: state.job?.recipe ?? null, lastObservedDay: Number(((lastNow - START) / DAY).toFixed(2)) };
}
const cohorts = definitions.map(def => simulate(def));
const regular = cohorts.find(c => c.cohort === 'regular')!, active = cohorts.find(c => c.cohort === 'active')!;
const ratio = Number((active.completedKits / regular.completedKits).toFixed(3));
if (cohorts.some(c => c.maxMaterialStorage > STORAGE_LIMIT) || ratio > 2 || cohorts.some(c => !c.milestonesInDays.starterHome)) throw new Error('Pacing/storage acceptance failed.');
const absence = simulate(definitions[1], [8, 9, 10, 11, 12, 13, 14]);
const report = {
  schemaVersion: 1, simulatedDays: 42, clock: 'Injected deterministic millisecond timestamps', source: 'src/game/workshop.ts commands, no live records or grants',
  assumptions: [
    'Visits are evenly repeated at the listed local hour offsets; visit duration is a cohort label, not a reward multiplier.',
    'Every cohort completes the one-time five-second planter lesson and then prioritizes bridge kits.',
    'Gathering recovers one unit per four hours per bin, maximum six; one job at a time, no queue auto-repeat. Offline material accrual capped at 24 hours; finished jobs wait until collected.',
    'Material storage is 60, each prop/kit output cap 99. All cohorts stop stockpiling a material at 18 to keep other resources usable.',
    'Housing and improvement milestones are cumulative kit-equivalent design proxies, NOT implemented purchases/unlocks. No kit is spent in this experiment.',
    'The model does not simulate quests beyond the tutorial, shared contributions, skill bonuses, rare drops, retention or real player schedules. XP has bounded levels and no compounding yield multiplier.'
  ],
  provisionalCumulativeKitThresholds: thresholds, cohorts,
  activeToRegularOutputRatio: ratio, regularWeekAbsence: absence,
  conclusions: [
    `Active output is ${ratio}x regular over six weeks; no click or online-minute income. Returning twice daily matters more than staying online.`,
    'Idle is constrained by one daily collection/start; active extra visits offer flexibility rather than exponential production.',
    'The first useful workshop improvement proxy occurs in days, starter home in roughly one to two weeks, and a home upgrade in weeks. The district expansion remains beyond six weeks for these cohorts.',
    'A missed week pauses additional production after the queued job finishes, preserves that job and holdings, and resumes without a streak penalty. Recovery caps prevent stockpiling unlimited absence gains.',
    'One twelve-hour recipe is a deliberate bounded local test, not enough content for a released game. Later milestone must add useful short-session exploration/choices before treating this pacing as fun.'
  ]
};
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
else process.stdout.write(JSON.stringify(report, null, 2) + '\n');
