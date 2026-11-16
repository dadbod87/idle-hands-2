import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HOUSING_PLANS,HOUSING_FAMILIES,housingStudyQuote,housingFootprint,housingYard,auditLegacyHome} from '../src/design/housing-options.ts';
import {PARCELS,candidateCanStand,routeToParcel} from '../src/game/neighborhood.ts';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {emptyWorkroom} from '../src/game/live-home-layout.ts';
import {housingPacingStudy} from '../tools/housing-pacing.ts';
test('housing proposals fit persistent parcels, preserve doors and keep yard props off lanes/routes',()=>{
 for(const plan of HOUSING_PLANS)for(const parcel of PARCELS){
  const b=housingFootprint(parcel.slot,plan),max=parcel.building;
  assert.ok(b.x>=max.x&&b.y>=max.y&&b.x+b.width<=max.x+max.width&&b.y+b.height<=max.y+max.height);
  assert.deepEqual(b.door,parcel.foot);assert.deepEqual(b.front,parcel.front);
  for(const a of housingYard(parcel.slot,plan)){
   assert.ok(a.x-.3>=parcel.lot.x&&a.x+.3<=parcel.lot.x+parcel.lot.width&&a.y-.3>=parcel.lot.y&&a.y+.3<=parcel.lot.y+parcel.lot.height);
   assert.ok(!(a.x+.3>b.x&&a.x-.3<b.x+b.width&&a.y+.3>b.y&&a.y-.3<b.y+b.height));
   assert.ok(Math.hypot(a.x-b.front.x,a.y-b.front.y)>.9);
   for(const point of routeToParcel(parcel.slot))assert.ok(Math.hypot(a.x-point.x,a.y-point.y)>.8);
  }
  assert.ok(candidateCanStand(b.front));
 }
});
test('tier proposal never double-charges existing rights or downgrades expanded nooks',()=>{
 for(const family of HOUSING_FAMILIES){
  const q=housingStudyQuote(2,family,1);assert.equal(q.kits,0);assert.equal(q.plan.indoorNooks,8);assert.equal(q.keptIndoorNooks,8);
  const upgrade=housingStudyQuote(1,family,2);assert.equal(upgrade.kits,24);assert.equal(upgrade.totalEarnedKits,36);
  const first=housingStudyQuote(0,family);assert.equal(first.kits,first.plan.tier===1?12:36);
 }
 assert.equal(housingStudyQuote(1,'pocket-cottage').kits,0);
 assert.throws(()=>housingStudyQuote(3 as 2,'pocket-cottage'));assert.throws(()=>housingFootprint(25,HOUSING_PLANS[0]));
});
test('legacy audit preserves all furnishing maps, old appearances and bigint addresses without mutation',()=>{
 const w=createWorkshop(0),placements={...w.placements,'north-west':'planter' as const};
 for(const id of ['1','24','25','999999999999999999'])for(const level of [1,2] as const){
  const layout={level,placements:structuredClone(placements),workroomPlacements:level===2?{'workroom-north':'teapot' as const,'workroom-south':'letterbox' as const}:emptyWorkroom()},before=JSON.stringify(layout),a=auditLegacyHome(id,layout);
  assert.equal(JSON.stringify(layout),before);assert.deepEqual(a.kept,layout);assert.notEqual(a.kept,layout);assert.equal(a.retroactiveKitCharge,0);assert.equal(a.forcedLayoutChange,false);assert.equal(a.indoorNooks,level===2?8:6);
 }
});
test('current-command kit pacing accounts for blocked offline queues and optional competing crafts',()=>{
 const [regular,daily,missed,decor]=housingPacingStudy();
 for(const s of [regular,daily,missed,decor]){assert.equal(s.earnedKits,36);assert.ok(s.keptFirstPlanter);assert.equal(s.root,3);assert.equal(s.garden,4);}
 assert.ok(regular.thresholds[0].elapsedHours>=144&&regular.thresholds[1].elapsedHours>=432);
 assert.ok(daily.thresholds[1].elapsedHours>=864);assert.ok(missed.thresholds[1].elapsedHours-regular.thresholds[1].elapsedHours>=168);
 assert.ok(decor.thresholds[1].elapsedHours>regular.thresholds[1].elapsedHours);assert.equal(decor.ownedPlanters,3);
});
