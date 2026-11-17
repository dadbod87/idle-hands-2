import{test}from'node:test';import assert from'node:assert/strict';
import{createGarden,applyGarden,settleGarden,GARDEN_HOUR as H,type GardenAction,type GardenState}from'../src/game/garden.ts';
import{gardenBedView,gardenGrowthLabel,plantingConfirmation}from'../src/game/garden-view.ts';
function use(s:GardenState,a:GardenAction,now:number){const before=structuredClone(s),r=applyGarden(s,a,now);assert.equal(r.ok,true,r.message);assert.deepEqual(s,before);return r.state;}
test('selected empty seed facts match first/later radish and marigold real seed debit and deadline',()=>{
 let s=createGarden(0);for(const[index,crop,expected]of[[0,'radish',5*60_000],[1,'radish',30*60_000],[2,'marigold',4*H]]as const){const before=structuredClone(s),v=gardenBedView(s,index,crop,0);assert.equal(v.occupied,false);assert.equal(v.durationMs,expected);assert.equal(v.name.length>0,true);assert.deepEqual(s,before);s=use(s,{action:'plant',bed:index,crop},0);assert.equal(before.seeds[crop]-s.seeds[crop],v.seedCost);assert.equal(s.beds[index]!.readyAt-s.beds[index]!.plantedAt,v.durationMs);assert.equal(gardenBedView(s,index,crop==='radish'?'marigold':'radish',0).crop,crop);assert.equal(gardenBedView(s,index,crop,0).durationMs,v.durationMs);}
});
test('occupied crop and original deadline stay truthful when next-seed selection changes and time advances',()=>{
 let s=createGarden(0);s=use(s,{action:'plant',bed:2,crop:'marigold'},0);const before=structuredClone(s),v=gardenBedView(s,2,'radish',H);assert.equal(v.crop,'marigold');assert.equal(v.phase,'growing');assert.equal(v.remainingMs,3*H);assert.equal(v.readyAt,4*H);assert.equal(gardenBedView(s,2,'radish',4*H).phase,'ready');assert.deepEqual(s,before);assert.equal(s.produce.marigold,0);assert.equal(s.seeds.marigold,0);assert.equal(gardenGrowthLabel(v.durationMs,false),'4 h real');
});
test('explicit harvest delivers displayed produce and returned seed; rested practice is conditional',()=>{
 let s=createGarden(0),at=0;for(let n=0;n<3;n++){const v=gardenBedView(s,0,'radish',at);s=use(s,{action:'plant',bed:0,crop:'radish'},at);at+=v.durationMs;const before=structuredClone(s);s=use(s,{action:'harvest',bed:0},at);assert.equal(s.produce.radish-before.produce.radish,v.produce);assert.equal(s.seeds.radish-before.seeds.radish,v.seedReturned);assert.equal(s.practice-before.practice,v.basePractice+(before.rested.available?1:0));assert.equal(v.restedBonusConditional,true);}assert.equal(s.rested.available,0);assert.equal(s.practice,5);
});
test('full produce retains the actual ready plant and seed; no-seed preview and confirmation never mutate state',()=>{
 const missing=createGarden(0);missing.seeds.marigold=0;const missingBefore=structuredClone(missing),empty=gardenBedView(missing,2,'marigold',0);assert.equal(empty.phase,'empty');assert.equal(empty.seedsHeld,0);assert.equal(empty.seedCost,1);assert.equal(applyGarden(missing,{action:'plant',bed:2,crop:'marigold'},0).ok,false);assert.deepEqual(missing,missingBefore);let s=createGarden(0),at=0;for(let n=0;n<12;n++){s=use(s,{action:'plant',bed:0,crop:'radish'},at);at=s.beds[0]!.readyAt;s=use(s,{action:'harvest',bed:0},at);}s=use(s,{action:'plant',bed:0,crop:'radish'},at);const before=structuredClone(s),v=gardenBedView(s,0,'marigold',s.beds[0]!.readyAt);assert.equal(v.phase,'full');assert.equal(v.crop,'radish');assert.equal(v.seedReturned,1);assert.deepEqual(s,before);assert.equal(plantingConfirmation(2,'marigold'),'Plant marigold · Bed 3 · 1 seed');assert.throws(()=>gardenBedView(s,3,'radish',at));assert.equal(gardenGrowthLabel(5*60_000,true),'5 min real · first crop');
});

test('optional marker suggestion agrees with the real clipping cost and preserves stock',async()=>{
 const {gardenSideActivity}=await import('../src/game/garden-view.ts');const s=createGarden(0),before=structuredClone(s);assert.equal(gardenSideActivity(s),'field');assert.equal(applyGarden(s,{action:'make-marker',marker:'sunburst'},0).ok,true);assert.deepEqual(s,before);
 const short=structuredClone(s);short.clippings.available=1;assert.equal(gardenSideActivity(short),'errand');assert.equal(applyGarden(short,{action:'make-marker',marker:'sunburst'},0).ok,false);assert.equal(short.clippings.available,1);
});
test('exhausted clipping designs lead to unfinished free errand even when stock recovers',async()=>{
 const {gardenSideActivity}=await import('../src/game/garden-view.ts');let s=createGarden(0);for(const marker of ['sunburst','leaf-fan','little-pennant']as const)s=use(s,{action:'make-marker',marker},0);
 assert.equal(gardenSideActivity(s),'errand');s=use(s,{action:'accept-errand'},0);assert.equal(gardenSideActivity(s),'errand');const recovered=settleGarden(s,90*60_000);assert.equal(gardenSideActivity(recovered),'errand');assert.equal(applyGarden(recovered,{action:'make-marker',marker:'sunburst'},90*60_000).ok,false);
});
test('completed collection suggests an owned display without promising another reward',async()=>{
 const {gardenSideActivity}=await import('../src/game/garden-view.ts');const{STAKE_IDS,STAKE_STUDIES}=await import('../src/game/garden.ts');let s=createGarden(0);for(const marker of ['sunburst','leaf-fan','little-pennant']as const)s=use(s,{action:'make-marker',marker},0);s=use(s,{action:'accept-errand'},0);for(const station of STAKE_IDS)s=use(s,{action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer},0);s=use(s,{action:'assemble-marker'},0);const before=structuredClone(s);assert.equal(gardenSideActivity(s),'display');assert.equal(applyGarden(s,{action:'assemble-marker'},0).ok,false);assert.deepEqual(s,before);
});
