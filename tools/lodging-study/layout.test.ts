import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canStand,clearSegment,routeTo,worlds} from '../../src/game/world.ts';
import {bedCheckpoint,besideBed,displacedByFacade,landing,rehearsalRoutes,rentedRoom,threshold,townWithLodging} from './layout.ts';

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
