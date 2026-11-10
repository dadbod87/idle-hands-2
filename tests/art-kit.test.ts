import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ART,FACINGS,facingFor,walkFrame} from '../src/art/kit.ts';

test('direction follows movement without diagonal flicker or idle facing reset',()=>{
 assert.equal(facingFor(1,0,'north'),'east');assert.equal(facingFor(-1,0,'south'),'west');
 assert.equal(facingFor(0,-1,'west'),'north');assert.equal(facingFor(0,1,'north'),'south');
 assert.equal(facingFor(1,-1,'south'),'north');assert.equal(facingFor(1,1.000001,'west'),'south');
 assert.equal(facingFor(0,0,'west'),'west');
});
test('walk poses are distance-based, stop at idle and honor reduced motion',()=>{
 assert.equal(walkFrame(0,true,false),1);assert.equal(walkFrame(12,true,false),2);
 assert.equal(walkFrame(72,true,false),1);assert.equal(walkFrame(24,false,false),0);assert.equal(walkFrame(24,true,true),0);
 assert.deepEqual(ART.actorAnchor,{x:.5,y:.9});
 for(const face of FACINGS)for(let frame=0;frame<7;frame++){
  const svg=fs.readFileSync(`public/art/original/employee-${face}-${frame}.svg`,'utf8');
  assert.ok(svg.includes('width="64" height="80" viewBox="0 0 64 80"'));
 }
});
test('every selected/comparison asset matches its recorded source fingerprint and license',()=>{
 const p=JSON.parse(fs.readFileSync('licenses/asset-provenance.json','utf8'));
 assert.equal(p.original.filter((a:any)=>a.source==='tools/create-original-art.py').length,39);assert.ok(p.original.filter((a:any)=>a.source==='tools/create-town-variety.py').length>=14);
 for(const asset of [...p.original,...p.comparison.files.map((x:any)=>({path:x.imported_path,sha256:x.sha256}))]){
  const b=fs.readFileSync(asset.path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),asset.sha256);
 }
 assert.equal(p.comparison.license,'CC0-1.0');
 for(const name of ['tiny-town','tiny-dungeon'])assert.match(fs.readFileSync(`public/art/evaluation/kenney/${name}-LICENSE.txt`,'utf8'),/CC0/);
 assert.deepEqual(JSON.parse(fs.readFileSync('src/game/asset-manifest.json','utf8')).external_playable_art,[]);
});
