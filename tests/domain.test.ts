import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/game/session.ts';
import { worlds, walkable, pathTo, type Room } from '../src/game/world.ts';

test('every named destination has a walkable route and never crosses blocked cells', () => {
 for (const room of ['square','workshop'] as Room[]) {
  const start = room === 'square' ? {x:24,y:25} : {x:9,y:11};
  for (const stop of worlds[room].stops) {
   const path=pathTo(room,start,stop.point); assert.ok(path.length);
   let previous=start;
   for(const p of path){ assert.ok(walkable(room,p));assert.equal(Math.abs(previous.x-p.x)+Math.abs(previous.y-p.y),1);previous=p; }
   assert.deepEqual(previous,stop.point);
  }
 }
});
test('blocked and out-of-world taps cannot create a movement route', () => {
 assert.deepEqual(pathTo('square',{x:24,y:25},{x:20,y:18}),[]);
 const s=new Session(); assert.equal(s.walk({x:-1,y:25}),false); assert.equal(s.walk({x:1e6,y:1e6}),false);
});
test('keyboard collision and modal lock cannot move through a building', () => {
 const s=new Session({version:1,room:'square',position:{x:20,y:22}});
 for(let i=0;i<100;i++)s.tick(16,{x:0,y:-1});
 assert.deepEqual(s.position,{x:20,y:22});
 s.lock(true);s.walk({x:24,y:25});s.tick(100,{x:1,y:0});assert.deepEqual(s.position,{x:20,y:22});
 s.lock(false);s.tick(16,{x:1,y:0});assert.ok(s.position.x>20);
});
test('huge frame delta is bounded, position save is stable and bad saves cannot spawn inside walls', () => {
 const s=new Session();s.walk({x:25,y:25});s.tick(100000);assert.ok(s.position.x<25);
 assert.deepEqual(new Session({version:1,room:'square',position:{x:20,y:18}}).position,{x:24,y:25});
 assert.deepEqual(new Session({version:2,room:'square',position:{x:25,y:25}}).position,{x:24,y:25});
 s.enter('workshop'); const save=s.save(); const restored=new Session(save);assert.deepEqual(restored.save(),save);
 restored.position.x=1;assert.equal(save.position.x,9);
});
