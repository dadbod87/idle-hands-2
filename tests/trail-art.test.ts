import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRAIL_ART,TRAIL_ASSETS} from '../src/art/trail.ts';
import {worlds,TILE,canStand,routeTo,clearSegment,TRAIL_LANDMARK_IDS} from '../src/game/world.ts';
test('trail art uses authoritative marker approaches and the shared bridge threshold',()=>{
 assert.equal(TRAIL_ASSETS.length,10);assert.equal(new Set(TRAIL_ASSETS).size,10);const gate=worlds.square.stops.find(stop=>stop.id==='trail-gate')!;
 assert.deepEqual({x:(gate.point.x+.5)*TILE,y:(gate.point.y+.5)*TILE},{x:832,y:408});assert.deepEqual({x:832-TRAIL_ART.bridge.foot.x,y:408-TRAIL_ART.bridge.foot.y},{x:784,y:296});
 for(const id of TRAIL_LANDMARK_IDS){const stop=worlds.trail.stops.find(stop=>stop.id===id)!;assert.deepEqual(TRAIL_ART.landmarks[id].point,stop.point);assert.ok(canStand('trail',stop.point));const route=routeTo('trail',gate.arrival!,stop.point);assert.ok(route.length);let previous=gate.arrival!;for(const point of route){assert.ok(clearSegment('trail',previous,point));previous=point;}assert.deepEqual(previous,stop.point);}
 const exit=worlds.trail.stops.find(stop=>stop.id==='trail-exit')!;assert.deepEqual(exit.arrival,{x:25.5,y:12.6});assert.ok(canStand('square',exit.arrival!));assert.ok(canStand('trail',gate.arrival!));
});
