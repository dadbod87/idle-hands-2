import {test} from 'node:test';
import assert from 'node:assert/strict';
import {neighborhoodFixture} from '../tools/neighborhood-fixtures.ts';
import {loadWorkshop,applyWorkshop} from '../src/game/workshop.ts';
import {simulateWoodland,noticeboardOpening} from '../tools/woodland-plan.ts';
import {woodlandExperiment} from '../tools/simulate-woodland-plan.ts';
import {readFileSync} from 'node:fs';

test('elapsed audit fixtures preserve a normally paid held kit and strictly valid full/private garden',()=>{
 const now=2000000000000,s=neighborhoodFixture('saturated',now);assert.equal(loadWorkshop(s,now).recovered,false);assert.deepEqual(s.garden.produce,{radish:12,marigold:12});assert.equal(s.garden.markers.length,4);assert.equal(s.sketches.length,3);assert.equal(s.garden.clippings.available,0);assert.ok(s.garden.nextRequestAt!>now);assert.equal(s.job!.recipe,'bridge-kit');assert.equal(s.job!.readyAt-s.job!.startedAt,12*3600000);assert.ok(s.job!.readyAt<now);assert.equal(s.bridgeKits,0);assert.deepEqual(Object.values(s.nodes).map(n=>n.stock),[0,0,0]);
 const bed=s.garden.beds.findIndex(b=>b&&b.readyAt<=now);assert.ok(bed>=0);const r=applyWorkshop(s,{kind:'garden',gardenAction:{action:'harvest',bed},id:'audit-full-held',expectedRevision:s.revision},now);assert.equal(r.ok,false);assert.deepEqual(r.state,s);
});
test('unreserved daily welcome-first policy can starve personal making while a selected private goal completes',()=>{
 assert.equal(simulateWoodland(42,1,'legacy-first',4).frames,0);
 const chosen=simulateWoodland(42,1,'reserve-goal',4);assert.equal(chosen.firstFrameDay,2);assert.equal(chosen.sixthFrameDay,7);assert.equal(chosen.frames,6);assert.ok(chosen.orders>0);assert.equal(chosen.requests,6);
});
test('opt-in civic recording keeps the item, works alone and benefits from helpers without a unique-player gate',()=>{
 const solo=noticeboardOpening(1,1,0),team=noticeboardOpening(1,6,0),later=noticeboardOpening(1,6,2);assert.equal(solo.openedDay,8);assert.equal(team.openedDay,3);assert.ok(later.openedDay!>team.openedDay!);assert.ok(later.openedDay!<solo.openedDay!);for(const r of [solo,team,later]){assert.equal(r.accepted.length,6);assert.equal(r.privateFramesKept,true);assert.equal(r.uniqueHelperThreshold,false);}
});
test('all candidate policies remain bounded and recover after a week absent without auto-repeat output',()=>{
 const r=woodlandExperiment();assert.equal(r.cohorts.length,36);assert.equal(r.groups.length,18);
 for(const c of r.cohorts){assert.ok(c.pine>=0&&c.pine<=24);assert.ok(c.frames<=6);assert.equal(c.collected,c.pine+(c.frames+Number(c.queued))*4+c.orders);for(const crop of ['radish','marigold'] as const){assert.equal(c.harvested[crop],c.produce[crop]+c.spent[crop]);assert.ok(c.produce[crop]>=0&&c.produce[crop]<=12);}if(c.absence)assert.equal(c.skippedVisits,7*c.visitsPerDay);}
 const active=simulateWoodland(42,12,'reserve-goal',4);assert.ok(active.quietVisits>0);assert.ok(active.firstFrameDay!>=.5);assert.ok(active.sixthFrameDay!>3);
});
test('committed woodland design output reproduces the current experiment and source fingerprints',()=>{
 assert.deepEqual(JSON.parse(readFileSync('docs/evidence/IH2-066/woodland-model.json','utf8')),woodlandExperiment());
});
