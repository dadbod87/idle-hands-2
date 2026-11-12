import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DEPOT_CATALOG,depotArt} from '../src/art/depots.ts';
import {worlds} from '../src/game/world.ts';
test('authored depot family reproduces exactly and fits the existing resource targets without stock authority',()=>{
 const output=mkdtempSync(join(tmpdir(),'ih2-depot-art-'));
 try{
  const result=spawnSync('python3',['tools/create-depot-art.py',output],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8')),provenance=JSON.parse(readFileSync('licenses/asset-provenance.json','utf8'));
  assert.deepEqual(DEPOT_CATALOG.assets.map(a=>a.resourceId),['scrap','timber','supplies']);
  for(const id of ['scrap','timber','supplies'] as const){
   const a=depotArt(id),svg=readFileSync('public/art/depots/'+a.file);assert.deepEqual(readFileSync(join(output,a.file)),svg);
   const meta=provenance.original.find((p:any)=>p.id===a.id);assert.equal(meta.source,'tools/create-depot-art.py');assert.equal(meta.license,'project-original');assert.equal(meta.sha256,createHash('sha256').update(svg).digest('hex'));
   assert.ok(manifest.assets.some((p:any)=>p.id===a.id&&p.path==='art/depots/'+a.file));assert.deepEqual({w:a.width,h:a.height,foot:a.foot},{w:56,h:48,foot:{x:28,y:40}});
   assert.doesNotMatch(svg.toString(),/<script|<foreignObject|<animate|https?:\/\/(?!www.w3.org)/);
   const stop=worlds.square.stops.find(s=>s.id===id)!;assert.deepEqual(stop.doorArea,[stop.point.x-.5,27.5,2,2]);
  }
  assert.deepEqual(readFileSync(join(output,'catalog.json')),readFileSync('public/art/depots/catalog.json'));
 }finally{rmSync(output,{recursive:true,force:true});}
});
