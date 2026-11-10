import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movementFrameSteps} from '../src/game/movement-frame.ts';
import {Session} from '../src/game/session.ts';
import {canStand} from '../src/game/world.ts';

test('visible movement keeps the same speed at60,20,10 and5fps',()=>{
 for(const frames of [60,20,10,5]){
  const session=new Session();
  for(let frame=0;frame<frames;frame++)for(const step of movementFrameSteps(1000/frames,true,false))session.tick(step,{x:1,y:0});
  assert.ok(Math.abs(session.position.x-29)<1e-8,`${frames}fps`);
 }
 const a=new Session(),b=new Session();
 for(const step of movementFrameSteps(200,true,false))a.tick(step,{x:1,y:1});
 for(let i=0;i<2;i++)for(const step of movementFrameSteps(100,true,false))b.tick(step,{x:1,y:1});
 assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)<1e-8);
});
test('hidden, reset and invalid frames discard time; stalls are capped without debt',()=>{
 for(const elapsed of [NaN,Infinity,-1,0])assert.deepEqual(movementFrameSteps(elapsed,true,false),[0]);
 assert.deepEqual(movementFrameSteps(100000,false,false),[0]);
 assert.deepEqual(movementFrameSteps(100000,true,true),[0]);
 assert.deepEqual(movementFrameSteps(100000,true,false),[50,50,50,50,50]);
 assert.deepEqual(movementFrameSteps(16,true,false),[16]);
});
test('bounded low-frame walking retains collision safety and one-shot arrival',()=>{
 const session=new Session({version:1,room:'square',position:{x:20,y:24}});
 assert.equal(session.point({x:19.5,y:20.5}),true);
 let arrivals=0;
 for(let frame=0;frame<100;frame++){
  const before={...session.position};
  for(const step of movementFrameSteps(250,true,false))session.tick(step);
  assert.ok(canStand(session.room,session.position));
  assert.ok(Math.hypot(session.position.x-before.x,session.position.y-before.y)<=1.250001);
  if(session.takeArrival())arrivals++;
 }
 assert.equal(arrivals,1);
});
