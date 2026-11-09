import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/game/session.ts';
import { worlds, walkable, pathTo, canStand, clearSegment, routeTo, type Room } from '../src/game/world.ts';

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
 assert.ok(s.position.y>=21.74 && s.position.y<=22);assert.ok(canStand('square',s.position));
 const stopped={...s.position};
 s.lock(true);s.walk({x:24,y:25});s.tick(100,{x:1,y:0});assert.deepEqual(s.position,stopped);
 s.lock(false);s.tick(16,{x:1,y:0});assert.ok(s.position.x>20);
});
test('huge frame delta is bounded, position save is stable and bad saves cannot spawn inside walls', () => {
 const s=new Session();s.walk({x:25,y:25});s.tick(100000);assert.ok(s.position.x<25);
 assert.deepEqual(new Session({version:1,room:'square',position:{x:20,y:18}}).position,{x:24,y:25});
 assert.deepEqual(new Session({version:2,room:'square',position:{x:25,y:25}}).position,{x:24,y:25});
 s.enter('workshop'); const save=s.save(); const restored=new Session(save);assert.deepEqual(restored.save(),save);
 restored.position.x=1;assert.equal(save.position.x,9);
});

test('continuous keyboard motion turns immediately and stops at the exact fractional position', () => {
 const s=new Session();s.tick(20,{x:1,y:0});assert.ok(Math.abs(s.position.x-24.1)<1e-8);
 s.tick(20,{x:0,y:1});assert.ok(Math.abs(s.position.x-24.1)<1e-8);assert.ok(Math.abs(s.position.y-25.1)<1e-8);
 const stopped={...s.position};s.tick(20);assert.deepEqual(s.position,stopped);
 s.lock(true);assert.deepEqual(s.position,stopped);s.lock(false);s.stop();assert.deepEqual(s.position,stopped);
 assert.deepEqual(new Session(s.save()).position,stopped);
});
test('diagonals have the same total speed as cardinal motion, across frame partitions', () => {
 const straight=new Session(),diagonal=new Session(),partitioned=new Session();
 for(let i=0;i<20;i++){straight.tick(20,{x:1,y:0});diagonal.tick(20,{x:1,y:1});}
 for(let i=0;i<40;i++)partitioned.tick(10,{x:1,y:0});
 const dist=(s:Session)=>Math.hypot(s.position.x-24,s.position.y-25);
 assert.ok(Math.abs(dist(straight)-dist(diagonal))<1e-8);assert.ok(Math.abs(straight.position.x-partitioned.position.x)<1e-8);
});
test('pointer paths use clear segments and finish at exact free-form targets around buildings', () => {
 const from={x:20.13,y:23.17},to={x:20.37,y:14.29};
 const route=routeTo('square',from,to);assert.ok(route.length>1);assert.ok(route.length<10);
 let prior=from;for(const point of route){assert.ok(clearSegment('square',prior,point));prior=point;}
 const s=new Session({version:1,room:'square',position:from});assert.equal(s.walk(to),true);
 for(let i=0;i<1000;i++){s.tick(16);assert.ok(canStand('square',s.position));}
 assert.deepEqual(s.position,to);assert.equal(s.snapshot().walking,false);
 s.walk({x:20,y:18});assert.equal(s.snapshot().walking,false);
});
test('wall sliding stays outside obstacles and manual steering interrupts a pointer route immediately', () => {
 const s=new Session({version:1,room:'square',position:{x:20,y:22}});
 for(let i=0;i<20;i++){s.tick(16,{x:1,y:-1});assert.ok(canStand(s.room,s.position));}
 assert.ok(s.position.x>20);assert.ok(s.position.y>=21.74);
 s.enter('square');s.walk({x:30,y:25});s.tick(20);const prior={...s.position};s.tick(20,{x:0,y:1});
 assert.equal(s.position.x,prior.x);assert.ok(s.position.y>prior.y);s.tick(20);assert.equal(s.snapshot().walking,false);
});
