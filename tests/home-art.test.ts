import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOME_ART,HOME_ASSETS,HOME_CATALOG} from '../src/art/home.ts';
import {worlds,canStand} from '../src/game/world.ts';
test('original home families have manifest sources, compatible anchors and collision-safe thresholds',()=>{
 const manifest=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8'));assert.equal(HOME_ASSETS.length,21);assert.equal(new Set(HOME_ASSETS).size,21);
 for(const asset of HOME_CATALOG.assets){const svg=readFileSync('public/art/homes/'+asset.id+'.svg','utf8');assert.match(svg,new RegExp('viewBox="0 0 '+asset.width+' '+asset.height+'"'));assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);assert.ok(manifest.assets.some((entry:any)=>entry.id===asset.id&&entry.path==='art/homes/'+asset.id+'.svg'));}
 assert.deepEqual(worlds.home.blocked[0],HOME_ART.bedBlockedTiles);assert.deepEqual(worlds['home-expanded'].blocked[0],HOME_ART.bedBlockedTiles);assert.ok(worlds['home-expanded'].width>worlds.home.width);
 for(const room of ['home','home-expanded'] as const){const exit=worlds[room].stops[0];assert.ok(canStand(room,{x:9,y:11}));assert.ok(canStand('square',exit.arrival!));assert.deepEqual(exit.arrival,{x:30,y:35.5});}
});
