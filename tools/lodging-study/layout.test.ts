import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canStand,clearSegment,routeTo,worlds} from '../../src/game/world.ts';
import {bedCheckpoint,besideBed,displacedByFacade,landing,rehearseFacadeRecovery,rehearsalRoutes,rentedRoom,threshold,townWithLodging} from './layout.ts';

test('the rented-room feet stay out of furnishings and native routing reaches the threshold and clerk',()=>{
 const {clerk,firstRoute,roomRoute}=rehearsalRoutes();
 assert.ok(canStand('workshop',bedCheckpoint,rentedRoom));
 assert.ok(clearSegment('workshop',bedCheckpoint,besideBed,rentedRoom));
 assert.deepEqual(roomRoute.at(-1),threshold);
 assert.deepEqual(firstRoute.at(-1),clerk);
 for(const [route,start,world,room] of [[firstRoute,landing,townWithLodging,'square'],[roomRoute,besideBed,rentedRoom,'workshop']] as const){
  assert.ok(route.every((point,i)=>clearSegment(room,i?route[i-1]:start,point,world)));
 }
});

test('the candidate footprint leaves existing reachable destinations accessible and identifies the explicit saved-feet risk',()=>{
 const squareSpawn={x:24,y:25};
 const savedDoors=Object.values(worlds).flatMap(room=>room.stops).filter(stop=>stop.transition==='square');
 assert.ok(savedDoors.every(stop=>!stop.arrival||!displacedByFacade(stop.arrival)));
 const oldReachable=worlds.square.stops.filter(stop=>routeTo('square',squareSpawn,stop.point).length);
 assert.ok(oldReachable.length>=30);
 for(const stop of oldReachable)assert.ok(routeTo('square',squareSpawn,stop.point,townWithLodging).length,stop.id);
 assert.equal(displacedByFacade({x:10,y:18}),true);
 assert.equal(displacedByFacade(squareSpawn),false);
 assert.equal(displacedByFacade(landing),false);
});

test('only previously safe feet covered by the new facade move to the existing front landing once',()=>{
 let count=0, largest=0;
 for(let y=14;y<=23;y+=.25){
  for(let x=6;x<=15.5;x+=.25){
   const feet={x,y};
   const expected=canStand('square',feet);
   const result=rehearseFacadeRecovery(feet);
   if(!expected){
    assert.equal(result.kind,'unavailable');
   }else if(canStand('square',feet,townWithLodging)){
    assert.deepEqual(result,{kind:'keep',feet});
   }else{
    assert.deepEqual(result,{kind:'arrive-outside',oldFeet:feet,feet:landing});
    assert.ok(canStand('square',landing,townWithLodging));
    assert.deepEqual(rehearseFacadeRecovery(landing),{kind:'keep',feet:landing});
    largest=Math.max(largest,Math.hypot(x-landing.x,y-landing.y));
    count++;
   }
  }
 }
 assert.ok(count>=400);
 assert.ok(largest<=7);
 const {clerk,firstRoute}=rehearsalRoutes();
 assert.deepEqual(firstRoute.at(-1),clerk);
 for(const position of [{x:Infinity,y:10},{x:NaN,y:21},{x:-2,y:80}]){
  assert.equal(rehearseFacadeRecovery(position).kind,'unavailable');
 }
});
