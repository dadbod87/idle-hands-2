import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
test('outing artwork is original, reproducible and leaves every prior asset and migration byte unchanged',()=>{
 const prior=JSON.parse(readFileSync('docs/evidence/IH2-119/PRIOR_FILES.json','utf8'));assert.equal(prior.baseline,'8ba0dec41e81f625ecc797ec843b8bc2385037e4');assert.equal(Object.keys(prior.files).filter(p=>p.startsWith('supabase/')).length,8);
 for(const [path,digest]of Object.entries(prior.files))assert.equal(hash(readFileSync(path)),digest,path);
 const manifest=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8'));
 const provenance=JSON.parse(readFileSync('public/art/outing/provenance.json','utf8'));assert.equal(provenance.assets.length,9);
 for(const a of provenance.assets){assert.equal(a.license,'project-original');assert.equal(a.source,'tools/create-outing-art.py');assert.equal(hash(readFileSync(a.path)),a.sha256);assert.ok(manifest.assets.some((m:any)=>m.path===a.path.replace('public/','')&&m.id==='outing-'+a.path.split('/').at(-1).replace('.svg','')));}
 const temp=mkdtempSync(join(tmpdir(),'ih2-outing-art-'));try{cpSync('tools',join(temp,'tools'),{recursive:true,filter:p=>p==='tools'||p.endsWith('create-outing-art.py')});const r=spawnSync('python3',['tools/create-outing-art.py'],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);for(const f of readdirSync('public/art/outing'))assert.deepEqual(readFileSync(join(temp,'public/art/outing',f)),readFileSync(join('public/art/outing',f)),f);}finally{rmSync(temp,{recursive:true,force:true});}
});
