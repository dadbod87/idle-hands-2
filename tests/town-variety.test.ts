import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RESIDENT_IDS,residentArt,residentFrame,ambientPose,cosmeticStep} from '../src/art/variety.ts';

test('resident identity and four-direction sheets retain shared foot and frame contracts',()=>{
 const catalog=JSON.parse(fs.readFileSync('public/art/variety/catalog.json','utf8'));
 for(const id of RESIDENT_IDS){const asset=catalog.assets.find((a:any)=>a.id==='resident-'+id);assert.deepEqual(asset.foot,{x:32,y:72});assert.equal(asset.width,64*28);assert.equal(asset.height,80);assert.equal(asset.frameCount,28);assert.equal(residentArt(id),id);}
 assert.equal(residentArt('unknown-new-resident'),'devon');
 assert.equal(residentFrame('south',0),0);assert.equal(residentFrame('north',6),13);assert.equal(residentFrame('east',2),16);assert.equal(residentFrame('west',6),27);
});

test('ambient transforms stay bounded and disabled motion is static independent of time',()=>{
 const frozen={rotation:0,canopyX:0,steamAlpha:0,steamY:0,gesture:0};
 for(const t of [0,17,1000,60000,24*3600_000]){assert.deepEqual(ambientPose(t,false,3),frozen);const p=ambientPose(t,true,3);assert.equal(p.rotation,0);assert.ok(Math.abs(p.canopyX)<=2.2);assert.ok(p.steamAlpha>=.05&&p.steamAlpha<=.19);assert.ok(p.steamY>=-8&&p.steamY<=0);assert.ok(Math.abs(p.gesture)<=.45);}
 assert.notDeepEqual(ambientPose(500,true),ambientPose(1500,true));
});

test('new building anchors preserve existing door thresholds and ground envelopes',()=>{
 const catalog=JSON.parse(fs.readFileSync('public/art/variety/catalog.json','utf8'));
 for(const [id,localFootY] of [['workshop',240],['cafe',272]] as const){const asset=catalog.assets.find((a:any)=>a.id==='building-'+id);assert.deepEqual(asset.foot,{x:104,y:localFootY});assert.equal(asset.width,208);}
 const ground=catalog.assets.find((a:any)=>a.id==='ground-square');assert.deepEqual(ground.geometry,{roadHorizontal:[448,704,736,224],roadVertical:[736,384,96,704],river:[0,318,1536,68]});
 assert.equal(catalog.assets.find((a:any)=>a.id==='comparison-sheet').sampleOnly,true);
});


test('cosmetic motion advances equally at idle10fps and active60fps and bounds resume gaps',()=>{const idle=Array.from({length:10},()=>100).reduce((sum,delta)=>sum+cosmeticStep(delta),0),active=Array.from({length:60},()=>1000/60).reduce((sum,delta)=>sum+cosmeticStep(delta),0);assert.ok(Math.abs(idle-active)<.0001);assert.equal(cosmeticStep(10000),150);for(const invalid of [NaN,Infinity,-Infinity,-10])assert.equal(cosmeticStep(invalid),0);const positions=Array.from({length:16},(_,i)=>ambientPose(i*250,true).canopyX);assert.ok(Math.max(...positions)-Math.min(...positions)>1);});
