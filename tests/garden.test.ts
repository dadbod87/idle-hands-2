import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGarden,applyGarden,settleGarden,gardenSchema,gardenStage,nextGardenDeadline,GARDEN_HOUR as H,GARDEN_DAY as D,GARDEN_TIME_MAX,CLIPPING_MARKERS,STAKE_IDS,STAKE_STUDIES,type GardenState,type GardenAction} from '../src/game/garden.ts';
const doIt=(s:GardenState,a:GardenAction,at:number)=>{const r=applyGarden(s,a,at);assert.equal(r.ok,true,r.message);assert.equal(gardenSchema.safeParse(r.state).success,true);return r.state;};
const rejection=(s:GardenState,a:unknown,at:number)=>{const before=JSON.stringify(s),r=applyGarden(s,a,at);assert.equal(r.ok,false);assert.equal(r.state,s);assert.equal(JSON.stringify(s),before);assert.equal(r.requestCredit,false);assert.equal(r.publicChanged,false);return r;};
function planted(at=0){let s=createGarden(at);s=doIt(s,{action:'plant',bed:0,crop:'radish'},at);s=doIt(s,{action:'plant',bed:1,crop:'radish'},at);return doIt(s,{action:'plant',bed:2,crop:'marigold'},at);}
function earnProduce(s:GardenState,at:number){for(let bed=0;bed<3;bed++){const b=s.beds[bed];if(b&&b.readyAt<=at&&s.produce[b.crop]<12)s=doIt(s,{action:'harvest',bed},at);}return s;}
test('garden version and closed schemas reject corrupt clocks, unknown fields, over-cap and invented history',()=>{
 const s=createGarden(100);assert.equal(gardenSchema.safeParse(s).success,true);
 for(const value of [{...s,version:3},{...s,extra:true},{...s,observedAt:NaN},{...s,seeds:{radish:3,marigold:1}},{...s,produce:{radish:1,marigold:0}},{...s,practice:1},{...s,markers:['sunburst','sunburst']},{...s,selectedMarker:'sunburst'},{...s,rested:{available:2,lastAt:101}},{...s,errand:{accepted:false,pieces:['forked'],assembled:false}}])assert.equal(gardenSchema.safeParse(value).success,false);
 for(const at of [NaN,Infinity,-1,1.2,GARDEN_TIME_MAX+1])assert.throws(()=>createGarden(at));
 assert.throws(()=>settleGarden(s,99));assert.throws(()=>settleGarden(s,NaN));
});
test('one five-minute first radish, normal subsequent deadlines and a four-hour flower survive absence unchanged',()=>{
 let s=planted();assert.deepEqual(s.beds.map(b=>b!.readyAt),[300000,1800000,4*H]);assert.deepEqual(s.seeds,{radish:0,marigold:0});
 rejection(s,{action:'plant',bed:0,crop:'radish'},0);rejection(s,{action:'harvest',bed:0},299999);
 const original=structuredClone(s.beds);s=settleGarden(s,8*D);assert.deepEqual(s.beds,original);assert.deepEqual(s.produce,{radish:0,marigold:0});assert.equal(s.rested.available,6);
 s=doIt(s,{action:'harvest',bed:0},8*D);assert.equal(s.produce.radish,1);assert.equal(s.seeds.radish,1);assert.equal(s.practice,2);rejection(s,{action:'harvest',bed:0},8*D);
 s=doIt(s,{action:'plant',bed:0,crop:'radish'},8*D);assert.equal(s.beds[0]!.readyAt,8*D+30*60000);assert.equal(s.beds[1]!.readyAt,1800000);
});
test('seed recovery repairs only missing family entitlement and cannot duplicate an occupied seed',()=>{
 let s=createGarden(0);s.seeds={radish:0,marigold:0};s=doIt(s,{action:'recover-seeds'},0);assert.deepEqual(s.seeds,{radish:2,marigold:1});rejection(s,{action:'recover-seeds'},0);
 s=doIt(s,{action:'plant',bed:0,crop:'radish'},0);s.seeds.marigold=0;s=doIt(s,{action:'recover-seeds'},0);assert.deepEqual(s.seeds,{radish:1,marigold:1});assert.ok(s.beds[0]);rejection(s,{action:'recover-seeds'},D);
 const forged={...s,seeds:{radish:2,marigold:1}};assert.equal(gardenSchema.safeParse(forged).success,false);
});
test('full produce holds its plant and seed while another family remains harvestable',()=>{
 let s=planted();for(let n=0;n<12;n++){const at=(n+1)*H;s=doIt(s,{action:'harvest',bed:0},at);s=doIt(s,{action:'plant',bed:0,crop:'radish'},at);}
 assert.equal(s.produce.radish,12);const before=structuredClone(s);rejection(s,{action:'harvest',bed:0},13*H);assert.deepEqual(s,before);
 s=doIt(s,{action:'harvest',bed:2},13*H);assert.equal(s.produce.marigold,1);s=doIt(s,{action:'submit-request'},13*H);assert.equal(s.produce.radish,11);s=doIt(s,{action:'harvest',bed:0},13*H);assert.equal(s.produce.radish,12);assert.equal(s.seeds.radish,1);
});
test('every harvest earns base practice when rested bonus is empty; refills cap and preserve partial periods',()=>{
 let s=planted();s.rested.available=0;s=doIt(s,{action:'harvest',bed:0},300000);assert.equal(s.practice,1);assert.equal(s.bonusPractice,0);
 let r=settleGarden(s,12*H-1);assert.equal(r.rested.available,0);r=settleGarden(r,12*H);assert.equal(r.rested.available,1);r=settleGarden(r,100*D);assert.equal(r.rested.available,6);const fullAt=r.rested.lastAt;
 r=settleGarden(r,fullAt+H);assert.equal(r.rested.lastAt,fullAt+H);r=doIt(r,{action:'harvest',bed:1},fullAt+H);assert.equal(r.rested.available,5);assert.equal(r.practice,3);assert.equal(r.bonusPractice,1);assert.equal(settleGarden(r,fullAt+12*H).rested.available,5);assert.equal(settleGarden(r,fullAt+13*H).rested.available,6);
});
test('three finite hand-made designs use one clipping bank; repeated ownership cannot consume more',()=>{
 let s=createGarden(0);for(const marker of CLIPPING_MARKERS)s=doIt(s,{action:'make-marker',marker},0);assert.equal(s.clippings.available,0);assert.deepEqual(s.markers,[...CLIPPING_MARKERS]);
 rejection(s,{action:'make-marker',marker:'sunburst'},H);assert.equal(settleGarden(s,15*60000-1).clippings.available,0);assert.equal(settleGarden(s,15*60000).clippings.available,1);assert.equal(settleGarden(s,2*H).clippings.available,6);
 assert.equal(s.practice,0);assert.equal(s.selectedMarker,null);assert.equal(s.planted,0);
});
test('public changes occur only on an explicit owned marker selection or removal',()=>{
 let s=createGarden(0);rejection(s,{action:'display-marker',marker:'sunburst'},0);s=doIt(s,{action:'make-marker',marker:'sunburst'},0);assert.equal(s.selectedMarker,null);
 const chosen=applyGarden(s,{action:'display-marker',marker:'sunburst'},0);assert.equal(chosen.ok,true);assert.equal(chosen.publicChanged,true);s=chosen.state;rejection(s,{action:'display-marker',marker:'sunburst'},0);
 const hidden=applyGarden(s,{action:'display-marker',marker:null},0);assert.equal(hidden.publicChanged,true);assert.equal(hidden.state.selectedMarker,null);assert.deepEqual(hidden.state.markers,['sunburst']);
});
test('stake errand is independent of plants, clippings, rested credit and coworkers and awards exactly one owned design',()=>{
 let s=planted();s.clippings.available=0;s.rested.available=0;rejection(s,{action:'inspect-stake',station:'forked',choice:'sound-end'},0);s=doIt(s,{action:'accept-errand'},0);rejection(s,{action:'accept-errand'},0);rejection(s,{action:'assemble-marker'},0);
 const deadlines=structuredClone(s.beds);rejection(s,{action:'inspect-stake',station:'forked',choice:'paint-mark'},0);
 for(const station of STAKE_IDS){s=doIt(s,{action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer},0);rejection(s,{action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer},0);}
 s=doIt(s,{action:'assemble-marker'},0);assert.deepEqual(s.markers,['almost-straight']);assert.equal(s.selectedMarker,null);assert.equal(s.practice,0);assert.deepEqual(s.beds,deadlines);assert.equal(s.clippings.available,0);rejection(s,{action:'assemble-marker'},D);s=doIt(s,{action:'display-marker',marker:'almost-straight'},D);assert.equal(s.selectedMarker,'almost-straight');
});
test('mixed request debits one of each exactly once per rolling day and emits a transaction intent, not a public award',()=>{
 let s=earnProduce(planted(),4*H);const a=applyGarden(s,{action:'submit-request'},4*H);assert.equal(a.ok,true);assert.equal(a.requestCredit,true);assert.equal(a.publicChanged,false);s=a.state;assert.deepEqual(s.produce,{radish:1,marigold:0});assert.equal(s.requests,1);assert.equal(s.nextRequestAt,28*H);
 s=doIt(s,{action:'plant',bed:2,crop:'marigold'},4*H);s=doIt(s,{action:'harvest',bed:2},8*H);rejection(s,{action:'submit-request'},28*H-1);const b=applyGarden(s,{action:'submit-request'},28*H);assert.equal(b.ok,true);assert.equal(b.requestCredit,true);assert.equal(b.state.requests,2);assert.deepEqual(b.state.produce,{radish:0,marigold:0});assert.equal(b.state.practice,s.practice);
});
test('free bed swaps preserve every production timestamp, seed count and practice',()=>{
 const s=planted(),r=doIt(s,{action:'swap-beds',from:0,to:2},100);assert.deepEqual(r.beds,[s.beds[2],s.beds[1],s.beds[0]]);assert.deepEqual(r.seeds,s.seeds);assert.equal(r.practice,s.practice);assert.equal(r.planted,s.planted);rejection(r,{action:'swap-beds',from:1,to:1},100);
});
test('optional care is once per plant and changes no deadline, output or practice',()=>{
 const s=planted(),r=doIt(s,{action:'observe',bed:0},0);assert.equal(r.beds[0]!.cared,true);assert.equal(r.beds[0]!.readyAt,s.beds[0]!.readyAt);assert.equal(r.practice,0);assert.deepEqual(r.produce,s.produce);rejection(r,{action:'observe',bed:0},0);rejection(createGarden(0),{action:'observe',bed:0},0);
});
test('invalid action shapes, noninteger slots, forged extra grants and clock rollback leave exact input untouched',()=>{
 const s=planted(100);for(const a of [{action:'harvest',bed:-1},{action:'harvest',bed:3},{action:'harvest',bed:.5},{action:'plant',bed:0,crop:'money'},{action:'recover-seeds',amount:999},{action:'make-marker',marker:'almost-straight'},{action:'display-marker',marker:'private-data'},{action:'inspect-stake',station:'unknown',choice:'sound-end'},{action:'speed-up'},null])rejection(s,a,100);
 for(const at of [99,NaN,Infinity,-1,GARDEN_TIME_MAX+1])rejection(s,{action:'harvest',bed:0},at);
});
test('growth presentation and next-deadline selectors use real crop timestamps and settle refills without awarding produce',()=>{
 const s=planted();assert.equal(gardenStage(null,0),'empty');assert.equal(gardenStage(s.beds[0],0),'sow');assert.equal(gardenStage(s.beds[0],100000),'sprout');assert.equal(gardenStage(s.beds[0],200000),'growing');assert.equal(gardenStage(s.beds[0],300000),'ready');assert.equal(nextGardenDeadline(s,0),300000);assert.equal(nextGardenDeadline(s,300000),1800000);
 let r=createGarden(0);r.clippings.available=0;assert.equal(nextGardenDeadline(r,31*60000),45*60000);assert.deepEqual(r.produce,{radish:0,marigold:0});assert.throws(()=>gardenStage(s.beds[0],NaN));
});
test('six weeks of mixed visits serialize/reload without crop loss, seed inflation or weather/economy input',()=>{
 let s=planted();for(let n=1;n<=42*12;n++){const at=n*2*H;s=earnProduce(s,at);if(s.produce.radish&&s.produce.marigold&&(s.nextRequestAt===null||s.nextRequestAt<=at))s=doIt(s,{action:'submit-request'},at);s=earnProduce(s,at);for(let bed=0;bed<3;bed++)if(!s.beds[bed]){const crop=bed===2?'marigold':'radish';if(s.seeds[crop])s=doIt(s,{action:'plant',bed,crop},at);}s=gardenSchema.parse(JSON.parse(JSON.stringify(s)));assert.equal(s.seeds.radish+s.seeds.marigold+s.beds.filter(Boolean).length,3);}
 assert.equal(s.requests,42);assert.ok(s.practice>0);assert.ok(s.produce.radish<=12&&s.produce.marigold<=12);assert.equal(s.planted,s.harvested.radish+s.harvested.marigold+s.beds.filter(Boolean).length);
});
