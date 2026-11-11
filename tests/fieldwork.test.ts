import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshop,applyWorkshop,loadWorkshop} from '../src/game/workshop.ts';
import {SURVEY_IDS,SURVEYS} from '../src/game/fieldwork.ts';
import {canStand,worlds,routeTo} from '../src/game/world.ts';
const now=Date.UTC(2026,10,11);
test('legacy workshop gets an empty sketchbook without losing inventory, a queued job or furniture',()=>{
 const legacy:any=createWorkshop(now);legacy.inventory={scrap:2,timber:1,supplies:3};legacy.job={recipe:'bridge-kit',startedAt:now,readyAt:now+12*3600_000};legacy.placements['north-west']='rug';delete legacy.sketches;
 const migrated=loadWorkshop(legacy,now);assert.equal(migrated.recovered,false);assert.deepEqual(migrated.state,{...legacy,sketches:[]});assert.deepEqual(legacy.sketches,undefined);
});
test('three optional studies preserve all economic values and the exact queued deadline through replay and reload',()=>{
 let s=createWorkshop(now);s.job={recipe:'bridge-kit',startedAt:now,readyAt:now+12*3600_000};const economy=({inventory,owned,nodes,job,bridgeKits,stats,skills,placements}:typeof s)=>({inventory,owned,nodes,job,bridgeKits,stats,skills,placements});const before=structuredClone(economy(s));
 for(const [n,station]of SURVEY_IDS.entries()){
  const command={kind:'survey',id:'sketch-'+station,expectedRevision:s.revision,station,choice:SURVEYS[station].answer};const result=applyWorkshop(s,command,now+n*1000);assert.equal(result.ok,true,result.message);s=result.state;assert.deepEqual(economy(s),before);
  const replay=applyWorkshop(s,command,now+n*1000);assert.equal(replay.replayed,true);assert.equal(replay.state,s);
  const duplicate=applyWorkshop(s,{...command,id:'duplicate-'+station,expectedRevision:s.revision},now+n*1000);assert.equal(duplicate.ok,false);assert.equal(duplicate.state,s);
 }
 assert.equal(s.sketches.length,3);assert.equal(s.revision,3);const loaded=loadWorkshop(JSON.parse(JSON.stringify(s)),now+8*86400_000);assert.equal(loaded.recovered,false);assert.deepEqual(loaded.state.sketches,[...SURVEY_IDS]);assert.deepEqual(loaded.state.job,before.job);
});
test('wrong observations, invalid IDs, stale revisions, overflow and duplicate persisted records cannot award progress',()=>{
 const s=createWorkshop(now);for(const command of [{station:'oak',choice:'pale-bark'},{station:'unknown',choice:'broad-crown'},{station:'oak',choice:'invented'},{station:'oak',choice:'broad-crown',extra:1}]){const result=applyWorkshop(s,{kind:'survey',id:'invalid',expectedRevision:0,...command},now);assert.equal(result.ok,false);assert.equal(result.state,s);}
 assert.equal(applyWorkshop(s,{kind:'survey',station:'oak',choice:'broad-crown',id:'stale',expectedRevision:1},now).ok,false);
 assert.equal(loadWorkshop({...s,sketches:['oak','oak']},now).recovered,true);
 assert.equal(loadWorkshop({...s,sketches:['oak','birch','fruit','oak']},now).recovered,true);
});
test('every authored tree study has a reachable square approach before bridge construction',()=>{
 for(const id of SURVEY_IDS){const stop=worlds.square.stops.find(stop=>stop.id==='survey-'+id)!;assert.ok(stop);assert.equal(canStand('square',stop.point),true);assert.ok(routeTo('square',{x:24,y:25},stop.point).length);assert.equal(stop.transition,undefined);}
});
