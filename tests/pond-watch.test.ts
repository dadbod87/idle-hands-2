import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {POND_WATCH, POND_WATCH_IDS, POND_WATCH_STOPS, completePondWatch, readPondWatch, recordPondWatch} from '../src/game/pond-watch.ts';
import {canStand, clearSegment, routeTo, worlds} from '../src/game/world.ts';
import {earnedWorkshopPrints, selectedWorkshopPrint} from '../src/game/workshop-print.ts';

test('the pond lookouts and sign can all reach each other over dry ground',()=>{
 const sign=worlds.square.stops.find(stop=>stop.id==='commons-pond')!;
 const places=[sign,...POND_WATCH_STOPS];
 for(const origin of places)for(const target of places){
  if(origin===target)continue;
  assert.ok(canStand('square',origin.point),origin.id);
  const route=routeTo('square',origin.point,target.point);
  assert.ok(route.length>0,origin.id+' → '+target.id);
  assert.deepEqual(route.at(-1),target.point);
  const points=[origin.point,...route];
  for(let i=1;i<points.length;i++)assert.ok(clearSegment('square',points[i-1],points[i]));
 }
});

test('only three distinct correct observations earn the print, in any order',()=>{
 const first = readPondWatch(null);
 assert.equal(recordPondWatch(first,'pond-bank','Moorhen').changed,false);
 assert.deepEqual(first,{version:1,recorded:[]});
 for(const order of [POND_WATCH_IDS,[...POND_WATCH_IDS].reverse()] as const){
  let state=first;
  for(const [index,id] of order.entries()){
   assert.equal(completePondWatch(state),false);
   const observed=recordPondWatch(state,id,POND_WATCH[id].answer);
   assert.equal(observed.changed,true);
   assert.equal(observed.state.recorded.length,index+1);
   state=observed.state;
   assert.equal(recordPondWatch(state,id,POND_WATCH[id].answer).changed,false);
  }
  assert.deepEqual(readPondWatch(JSON.stringify(state)),state);
  assert.equal(completePondWatch(state),true);
  const rights={marigold:true,woodland:false,pond:completePondWatch(state)};
  assert.deepEqual(earnedWorkshopPrints(null,rights),['marigold','pond']);
  assert.equal(selectedWorkshopPrint('pond',null,rights),'pond');
 }
 assert.equal(selectedWorkshopPrint('pond',null,{marigold:true,woodland:true,pond:false}),null);
 assert.throws(()=>readPondWatch('{"version":1,"recorded":["pond-reeds","pond-reeds"]}'));
 assert.throws(()=>readPondWatch('{"version":2,"recorded":[]}'));
});
