import test from 'node:test';
import assert from 'node:assert/strict';
import {combinedAuditFixture} from '../tools/combined-audit-fixtures.ts';
import {isCurrentWorkshop} from '../src/game/workshop.ts';
const end=1_000_000_000_000;
test('combined audit fixtures distinguish actual fresh, busy and returned deadlines without arbitrary stock assignment',()=>{
 assert.equal(combinedAuditFixture('fresh',end).state,null);
 const busy=combinedAuditFixture('both-busy',end).state!,returned=combinedAuditFixture('returning',end).state!;
 assert.ok(busy.job!.readyAt>end&&busy.carpentry.job!.readyAt>end);assert.ok(returned.job!.readyAt<end&&returned.carpentry.job!.readyAt<end);
 assert.deepEqual(busy.inventory,returned.inventory);assert.deepEqual(busy.owned,returned.owned);assert.equal(isCurrentWorkshop(busy),true);assert.equal(isCurrentWorkshop(returned),true);
});
test('full-capacity audit fixture conserves earned crops/pine and keeps the route plan separate from physical ownership',()=>{
 const s=combinedAuditFixture('saturated',end).state!;assert.equal(isCurrentWorkshop(s),true);
 assert.deepEqual(s.garden.produce,{radish:12,marigold:12});assert.equal(s.carpentry.pine.carried,24);assert.equal(s.carpentry.pine.gathered,24);assert.equal(s.carpentry.pine.spent,0);
 assert.ok(s.commission.completedAt!==null);assert.equal(s.owned.letterbox,0);assert.equal(s.garden.consumed.commission.radish,0);assert.equal(s.garden.markers.length,4);assert.equal(s.sketches.length,3);
});
