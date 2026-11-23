import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathTo,routeTo,clearSegment,canStand,worlds} from './src/game/world.ts';
import {Session,WALK_SPEED} from './src/game/session.ts';
import {squareWithLodging} from './src/game/lodging.ts';

const cases=[];
for (const [room,geometry] of [
 ['square',worlds.square],['square',squareWithLodging(worlds.square)],
 ['neighborhood',worlds.neighborhood],['workshop',worlds.workshop],
 ['trail',worlds.trail],['garden',worlds.garden],['lodging',worlds.lodging],
]) {
 const session=new Session(undefined,undefined,room==='lodging'||geometry!==worlds[room]);
 session.enter(room);
 const origins=[{id:'spawn',point:session.position},...geometry.stops];
 const targets=geometry.stops;
 const tests=[];
 for(const from of origins)for(const to of targets){
  if(from.id===to.id)continue;
  const start=performance.now();
  const path=routeTo(room,from.point,to.point,geometry);
  const ms=performance.now()-start;
  let distance=0;
  assert.ok(path.length,room+' '+from.id+' → '+to.id);
  assert.deepEqual(path.at(-1),to.point);
  let cursor=from.point;
  for(const step of path){
   assert.ok(clearSegment(room,cursor,step,geometry));
   distance+=Math.hypot(step.x-cursor.x,step.y-cursor.y);
   cursor=step;
  }
  tests.push({from:from.id,to:to.id,ms,distance,path});
 }
 const times=tests.map(test=>test.ms).sort((a,b)=>a-b);
 const p=n=>times[Math.ceil(times.length*n)-1];
 cases.push({
  room, variant:geometry===worlds[room]?'ordinary':'lodging-enabled',
  routes:tests.length, p50:p(.5),p95:p(.95),positionChecks:targets.every(stop=>canStand(room,stop.point,geometry)),
  exactPathDigest:createHash('sha256').update(JSON.stringify(tests.map(({from,to,path})=>({from,to,path})))).digest('hex'),
  slowestTime:tests.sort((a,b)=>b.ms-a.ms).slice(0,4).map(({from,to,ms})=>({from,to,ms})),
  longestWalk:tests.sort((a,b)=>b.distance-a.distance).slice(0,3).map(({from,to,distance})=>({from,to,seconds:distance/WALK_SPEED})),
 });
}

writeFileSync(process.env.IH2_ROUTE_OUTPUT,JSON.stringify({source:process.env.IH2_ROUTE_SOURCE,node:process.version,cases},null,2)+'\n');
