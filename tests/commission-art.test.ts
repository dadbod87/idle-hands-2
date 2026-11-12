import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {MOTIFS} from '../src/game/commission.ts';
test('promoted commission art retains all original accepted geometry, anchors, exact provenance and stable runtime keys',()=>{
 assert.match(execFileSync('python3',['tools/promote-commission-art.py','--check'],{encoding:'utf8'}),/PASS 14/);
 const catalog=JSON.parse(readFileSync('public/art/commission/catalog.json','utf8')),manifest=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8')),provenance=JSON.parse(readFileSync('licenses/asset-provenance.json','utf8'));assert.equal(catalog.assets.length,14);
 for(const a of catalog.assets){const raw=readFileSync('public/art/commission/'+a.file,'utf8'),accepted=readFileSync('docs/evidence/IH2-069/concept/art/'+a.file,'utf8');assert.equal(raw,accepted.replace('<title>Candidate ','<title>'));assert.equal(createHash('sha256').update(raw).digest('hex'),a.sha256);assert.equal(manifest.assets.find((x:any)=>x.id===a.id)?.path,'art/commission/'+a.file);assert.equal(provenance.original.find((x:any)=>x.id===a.id)?.sha256,a.sha256);if(a.id.startsWith('letterbox')){assert.equal(a.width,80);assert.equal(a.height,112);assert.deepEqual(a.anchor,[40,106]);for(const identity of ['letterbox-shell','letterbox-cap','letterbox-side'])assert.ok(raw.includes('data-identity="'+identity+'"'));}}
 for(const motif of MOTIFS)for(const pose of ['closed','open'])assert.ok(catalog.assets.some((a:any)=>a.id==='letterbox-'+motif+'-'+pose));
});
