import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GLASSHOUSE_ENTRY,GLASSHOUSE_FRONT,GLASSHOUSE_ROOM} from '../src/game/glasshouse-room.ts';
import {INKWOOD_GLASSHOUSE,canStand,clearSegment,routeTo} from '../src/game/world.ts';

test('the nursery doorway is reciprocal and connects every stop on usable feet',()=>{
 assert.equal(INKWOOD_GLASSHOUSE.transition,'glasshouse');
 assert.deepEqual(INKWOOD_GLASSHOUSE.arrival,GLASSHOUSE_ENTRY);
 const exit=GLASSHOUSE_ROOM.stops.at(-1)!;
 assert.equal(exit.transition,'trail');
 assert.deepEqual(exit.arrival,GLASSHOUSE_FRONT);
 assert.ok(canStand('trail',GLASSHOUSE_FRONT));
 assert.ok(canStand('glasshouse',GLASSHOUSE_ENTRY));
 for(const stop of GLASSHOUSE_ROOM.stops){
  const route=routeTo('glasshouse',GLASSHOUSE_ENTRY,stop.point);
  assert.deepEqual(route.at(-1),stop.point,stop.id);
  assert.ok(route.every((point,index)=>clearSegment('glasshouse',route[index-1]??GLASSHOUSE_ENTRY,point)),stop.id);
 }
 assert.equal(canStand('glasshouse',{x:4,y:5}),false,'benches remain solid');
});
