import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {worlds,canStand,routeTo,TILE} from '../src/game/world.ts';import {COMMONS_STOPS,TOWN_SIZE,outdoorZoom} from '../src/game/town-expansion.ts';import {Session} from '../src/game/session.ts';
test('expanded town covers 2K and 4K at native scale; larger screens cannot expose unpainted camera edges',()=>{
 assert.equal(TOWN_SIZE.width*TILE,4096);assert.equal(TOWN_SIZE.height*TILE,3072);
 for(const [width,height]of [[2560,1440],[3840,2160],[5120,2880],[320,640]]){const zoom=outdoorZoom(width,height,4096,3072);assert.ok(width/zoom<=4096&&height/zoom<=3072);if(width<=4096&&height<=3072)assert.equal(zoom,1);}
});
test('additive geography preserves every historical stop, doorway and walkable saved coordinate in the starter square',()=>{
 const old=JSON.parse(readFileSync('docs/evidence/IH2-113/starter-geography.json','utf8')).square;
 for(const stop of old.stops){
  const current=worlds.square.stops.find(s=>s.id===stop.id);
  assert.deepEqual(current,stop.id==='survey-fruit'?{
   ...stop,text:'The round shapes among the leaves are fruit. This corner tree is here for your sketchbook.',
  }:stop);
 }
 for(const box of old.blocked.filter((b:number[])=>b[1]!==10))assert.ok(worlds.square.blocked.some(b=>JSON.stringify(b)===JSON.stringify(box)));
 assert.equal(new Set(worlds.square.stops.map(s=>s.id)).size,worlds.square.stops.length);
 // Explicit authoritative saved doors remain stable; interiors and addresses are untouched.
 assert.equal(old.width,48);assert.deepEqual(worlds.workshop.stops.find(s=>s.id==='door')!.arrival,{x:19.5,y:22.3});
 for(const point of [{x:24,y:25},{x:45,y:46},{x:11.4,y:32.7}]){assert.ok(canStand('square',point));assert.deepEqual(new Session({version:1,room:'square',position:point}).position,point);}
});
test('all expanded destinations have real collision-clear routes; ponds and river cannot be crossed',()=>{
 for(const stop of COMMONS_STOPS){assert.ok(canStand('square',stop.point),stop.id);const path=routeTo('square',{x:24,y:25},stop.point);assert.ok(path.length,stop.id);assert.deepEqual(path.at(-1),stop.point);}
 for(const p of [{x:80,y:36},{x:55,y:63},{x:100,y:10.5}])assert.equal(canStand('square',p),false);
 assert.ok(routeTo('square',{x:104,y:45},{x:27,y:62}).length);
});
