import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GLASSHOUSE_ENTRY,GLASSHOUSE_ROOM} from '../src/design/glasshouse-room.ts';
import {canStand,clearSegment,routeTo,worlds,INKWOOD_GLASSHOUSE} from '../src/game/world.ts';

test('the proposed room gives every real tour stop a clear walking route in both directions',()=>{
 const geometry=GLASSHOUSE_ROOM;
 const destinations=[GLASSHOUSE_ENTRY,...geometry.stops.map(stop=>stop.point)];
 for(const point of destinations)assert.ok(canStand('workshop',point,geometry),JSON.stringify(point));
 for(const [i,from] of destinations.entries()){
  for(const [j,to] of destinations.entries()){
   if(i===j)continue;
   const path=routeTo('workshop',from,to,geometry);
   assert.deepEqual(path.at(-1),to);
   let previous=from;
   for(const point of path){
    assert.ok(clearSegment('workshop',previous,point,geometry));
    previous=point;
   }
  }
 }
});

test('the original trail entrance is clear and the candidate room never registers itself',()=>{
 assert.ok(canStand('trail',INKWOOD_GLASSHOUSE.point));
 assert.equal(INKWOOD_GLASSHOUSE.transition,undefined);
 assert.equal(Object.values(worlds).some(world=>world===GLASSHOUSE_ROOM),false);
 for(const area of GLASSHOUSE_ROOM.blocked){
  const [x,y,width,height]=area;
  assert.equal(canStand('workshop',{x:x+width/2,y:y+height/2},GLASSHOUSE_ROOM),false);
 }
});
