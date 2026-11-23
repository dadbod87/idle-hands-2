import assert from 'node:assert/strict';
import { applyCarpentry, CARPENTRY_RULES, createCarpentry } from '../../../../src/game/carpentry.ts';
import { applyGarden, createGarden, GARDEN_HOUR } from '../../../../src/game/garden.ts';
import { draft } from './project-model.mjs';

// This checks a proposed pine reserve without recording or simulating a
// production debit. Actual plants, collections and finishing use the game rules.
function firstEasel(visitHours, assumedPineReserve, flowerReady) {
  const opening = 4 * GARDEN_HOUR;
  const plantedAt = flowerReady ? 0 : opening;
  let carpentry = createCarpentry(opening);
  let garden = createGarden(plantedAt);
  const plant = applyGarden(garden, { action: 'plant', bed: 0, crop: 'marigold' }, plantedAt);
  assert.equal(plant.ok, true, plant.message);
  garden = plant.state;
  const gathers = [];
  const work = (action, at) => {
    const result = applyCarpentry(carpentry, garden, action, at);
    assert.equal(result.ok, true, result.message);
    carpentry = result.state;
    garden = result.garden;
  };
  work({ action: 'learn-saw' }, opening);
  work({ action: 'equip-saw', equipped: true }, opening);
  work({ action: 'gather-pine', station: 'crooked' }, opening);
  gathers.push(0);

  for (const hour of visitHours) {
    const at = opening + hour * GARDEN_HOUR;
    if (carpentry.job) {
      if (carpentry.job.readyAt > at) continue;
      const startHour = (carpentry.job.startedAt - opening) / GARDEN_HOUR;
      work({ action: 'claim-easel' }, at);
      assert.equal(carpentry.produced, 1);
      assert.equal(carpentry.pine.spent, CARPENTRY_RULES.easelPine);
      assert.ok(carpentry.pine.carried >= assumedPineReserve);
      return { startHour, claimHour: hour, gathers };
    }
    if (garden.beds[0].readyAt > at) continue;
    const needed = CARPENTRY_RULES.easelPine + assumedPineReserve;
    if (carpentry.pine.carried < needed) {
      const refill = applyCarpentry(carpentry, garden, { action: 'gather-pine', station: 'forked' }, at);
      if (refill.ok) {
        carpentry = refill.state;
        gathers.push(hour);
      }
    }
    if (carpentry.pine.carried < needed) continue;
    const harvest = applyGarden(garden, { action: 'harvest', bed: 0 }, at);
    assert.equal(harvest.ok, true, harvest.message);
    garden = harvest.state;
    work({ action: 'start-easel' }, at);
  }
  throw new Error('The supplied visits did not complete an easel.');
}

const frequent = [0, 4, 8, 12, 16, 20, 24, 48];
const daily = [0, 24, 48, 72];
const scenarios = [
  { name: 'Frequent visits, first marigold just planted', visits: frequent, flowerReady: false },
  { name: 'Frequent visits, marigold already ready', visits: frequent, flowerReady: true },
  { name: 'Daily visits, first marigold just planted', visits: daily, flowerReady: false },
  { name: 'Daily visits, marigold already ready', visits: daily, flowerReady: true },
];
const comparisons = scenarios.map(({ name, visits, flowerReady }) => ({
  name,
  visits,
  options: [0, draft.pineCost, 3, 4].map(reserve => ({
    reserve,
    ...firstEasel(visits, reserve, flowerReady),
  })),
}));

for (const { options: [baseline, twoPine] } of comparisons) {
  assert.deepEqual([twoPine.startHour, twoPine.claimHour, twoPine.gathers],
    [baseline.startHour, baseline.claimHour, baseline.gathers]);
}
assert.deepEqual(comparisons[1].options.map(option => option.startHour), [0, 0, 4, 8]);
assert.deepEqual(comparisons[3].options.map(option => option.claimHour), [24, 24, 48, 48]);

const openingVisits = [0, 6, 12, 24, 48, 168];
const firstAccess = [6, draft.readyDelayMs / GARDEN_HOUR, 24].map(constructionHours => ({
  constructionHours,
  earlyReturnHour: openingVisits.find(hour => hour >= constructionHours),
  nextDayReturnHour: daily.find(hour => hour >= constructionHours),
  weekAwayReturnHour: 168,
}));

console.log(JSON.stringify({
  assumptions: 'Elapsed hours after an already reachable project. Each example starts with the ordinary personal pine pool and no other pine expenses. Durations and reservations are design sensitivities, with no travel or attendance requirement.',
  comparisons,
  firstAccess,
}, null, 2));
