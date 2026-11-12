import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {CARPENTRY_ASSETS,CARPENTRY_ACTIONS,carpentryActionFrame} from '../src/art/carpentry.ts';
import {FACINGS,ART} from '../src/art/kit.ts';
import {RESIDENT_IDS} from '../src/art/variety.ts';
import {PINE_STATIONS} from '../src/game/carpentry.ts';
import {HOME_ART} from '../src/art/home.ts';
import {worlds} from '../src/game/world.ts';
test('original pine family reproduces exactly and retains each identity, material and authored foot',()=>{
 const path='public/art/carpentry/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8')),manifest=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8'));assert.equal(CARPENTRY_ASSETS.length,25);assert.equal(new Set(CARPENTRY_ASSETS).size,25);
 const paths=[path,...CARPENTRY_ASSETS.map(id=>'public/art/carpentry/'+id+'.svg')],hashes=paths.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex'));const result=spawnSync('python3',['tools/create-carpentry-art.py'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(paths.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex')),hashes);
 for(const a of catalog.assets){const svg=readFileSync('public/art/carpentry/'+a.id+'.svg','utf8');assert.doesNotMatch(svg,/<script|<image|<foreignObject|(?:href|src)=/i);assert.ok(manifest.assets.some((m:any)=>m.id===a.id&&m.path==='art/carpentry/'+a.id+'.svg'));if(a.kind==='action-sheet'||a.kind==='equipped-sheet'){assert.deepEqual(a.foot,{x:32,y:72});assert.equal(a.foot.y/a.frameHeight,ART.actorAnchor.y);assert.equal(a.frameWidth,64);assert.equal(a.frameHeight,80);assert.equal(a.frameCount,a.kind==='action-sheet'?36:28);assert.equal(a.width,a.kind==='action-sheet'?1152:1792);assert.equal(a.height,a.kind==='action-sheet'?160:80);assert.ok(Math.max(a.width,a.height)<=2048);}}
 for(const station of PINE_STATIONS)for(const state of ['available','exhausted'])assert.ok(CARPENTRY_ASSETS.includes('pine-'+station+'-'+state));
 for(const id of RESIDENT_IDS){assert.ok(CARPENTRY_ASSETS.includes('saw-equipped-'+id));assert.ok(CARPENTRY_ASSETS.includes('carpentry-actions-'+id));}
 const easel=readFileSync('public/art/homes/home-easel-world.svg','utf8');assert.deepEqual(HOME_ART.furniture.easel.foot,{x:40,y:106});assert.match(easel,/#8f704e/);assert.match(easel,/#d8ac54/);assert.match(easel,/viewBox="0 0 80 112"/);
});
test('all four directions have distinct prepare/contact/recovery phases and a reduced-motion still without an infinite loop',()=>{
 const frames=new Set<number>();for(const facing of FACINGS)for(const action of CARPENTRY_ACTIONS){const first=carpentryActionFrame(facing,action,0,false);assert.equal(carpentryActionFrame(facing,action,239,false),first);assert.equal(carpentryActionFrame(facing,action,240,false),first+1);assert.equal(carpentryActionFrame(facing,action,480,false),first+2);assert.equal(carpentryActionFrame(facing,action,100000,false),first+2);assert.equal(carpentryActionFrame(facing,action,500,true),first);for(let n=0;n<3;n++)frames.add(first+n);}assert.equal(frames.size,36);assert.deepEqual([...frames],[...Array(36).keys()]);
});
test('pine artwork hit regions cover the full illustrated trees and do not steal older interaction regions',()=>{
 const newcomers=worlds.square.stops.filter(s=>s.id.startsWith('pine-')||s.id==='carpentry-desk');
 for(const a of newcomers){assert.ok(a.doorArea);const[x,y,w,h]=a.doorArea!;assert.ok(w>0&&h>0);for(const b of worlds.square.stops.filter(s=>s.doorArea&&s!==a)){const[bx,by,bw,bh]=b.doorArea!;const overlaps=Math.min(x+w,bx+bw)>Math.max(x,bx)&&Math.min(y+h,by+bh)>Math.max(y,by);assert.equal(overlaps,false,a.id+' overlaps '+b.id);}}
});
