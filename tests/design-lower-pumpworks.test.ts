import assert from 'node:assert/strict';
import {test} from 'node:test';
import {canStand,clearSegment,routeTo,type Point} from '../src/game/world.ts';
import {DUNGEON,LANDING_RETURN,LOWER_START,START,type Floor} from '../tools/lower-pumpworks-study/plan.ts';

function distance(floor:Floor,...stops:Point[]){
 const geometry=DUNGEON[floor].world;
 let total=0;
 for(let i=1;i<stops.length;i++){
  let previous=stops[i-1]!;
  const path=routeTo('pumpworks',previous,stops[i]!,geometry);
  assert.ok(path.length>0,'The route must reach its destination on '+floor+'.');
  for(const point of path){
   assert.ok(clearSegment('pumpworks',previous,point,geometry));
   total+=Math.hypot(point.x-previous.x,point.y-previous.y);
   previous=point;
  }
 }
 return total;
}

test('Both Lower Pumpworks floors have reachable landmarks, a side-chest loop, and a meaningful return shortcut',()=>{
 const named=(floor:Floor,id:string)=>DUNGEON[floor].markers.find(marker=>marker.id===id)!.point;
 for(const [floor,arrival] of [['upper',START],['lower',LOWER_START]] as const){
  const level=DUNGEON[floor];
  assert.ok(canStand('pumpworks',arrival,level.world));
  for(const marker of level.markers)assert.ok(distance(floor,arrival,marker.point)>0);
 }
 const down=named('upper','stairs-down'),up=named('lower','stairs-up');
 const chamber=named('lower','collector'),kiln=named('lower','kiln-chest'),lift=named('lower','lift-bottom');
 const main=distance('upper',START,named('upper','mite'),down);
 const stores=distance('upper',START,named('upper','store-chest'),named('upper','crawler'),down);
 assert.ok(stores>main,'The side route should be a detour that rejoins at the stairs.');
 const oldReturn=distance('lower',chamber,up)+distance('upper',down,named('upper','exit'));
 const shortReturn=distance('lower',chamber,lift)+distance('upper',LANDING_RETURN,named('upper','exit'));
 assert.ok(shortReturn<oldReturn*.7,'Exploration should unlock a visibly shorter route home.');
 const lower=DUNGEON.lower;
 const bossRoom=lower.spaces.find(space=>space.kind==='danger')!;
 const withoutBoss={...lower.world,blocked:[...lower.world.blocked,bossRoom.bounds]};
 assert.ok(routeTo('pumpworks',LOWER_START,kiln,withoutBoss).length>0,'The kiln remains reachable when the boss chamber is closed.');
 assert.ok(routeTo('pumpworks',kiln,lift,withoutBoss).length>0,'The freight lift remains reachable when the boss chamber is closed.');
});
