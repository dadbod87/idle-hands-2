import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const study='docs/evidence/IH2-100/study';
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const catalog=()=>JSON.parse(readFileSync(join(study,'catalog.json'),'utf8'));
test('serving study is reproducible with exact source/output provenance outside the game',()=>{
 const out=mkdtempSync(join(tmpdir(),'ih2-serving-'));
 try{
  execFileSync('python3',['tools/create-serving-study.py','--out',out]);
  assert.deepEqual(readdirSync(out).sort(),readdirSync(study).sort());
  for(const name of readdirSync(out))assert.deepEqual(readFileSync(join(out,name)),readFileSync(join(study,name)),name);
  const c=catalog();for(const [p,h]of Object.entries(c.sources))assert.equal(hash(readFileSync(p)),h);
  for(const [p,h]of Object.entries(c.files))assert.equal(hash(readFileSync(join(study,p))),h);
  const provenance=JSON.parse(readFileSync(join(study,'provenance.json'),'utf8'));
  for(const [p,h]of Object.entries(provenance.files))assert.equal(hash(readFileSync(join(study,p))),h);
  assert.equal(provenance.license,'project-original');
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('all20serving cells preserve same-facing feet and exact accepted idle, with explicit incomplete family',()=>{
 const c=catalog();assert.equal(c.classification,'CANDIDATE_ART_ONLY');assert.equal(c.notImplemented,true);assert.equal(c.gameSaveCompatible,false);
 assert.deepEqual(c.unfinishedRigs,['bea','casey','devon']);assert.equal(c.frames.length,20);assert.equal(c.frameWidth,64);assert.equal(c.frameHeight,80);assert.equal(c.displayScale,.9);
 assert.deepEqual(c.replayTimesMs,[0,160,340,520,720]);
 for(const facing of c.facings){
  const frames=c.frames.filter((f:any)=>f.facing===facing);assert.equal(frames.length,5);assert.equal(new Set(frames.map((f:any)=>f.footVectorSha256)).size,1);
  for(const f of frames){assert.deepEqual(f.foot,{x:32,y:72});if(f.pose==='idle'){assert.equal(f.bodySha256,f.acceptedIdleSha256);assert.equal(f.attachment,null);}else{assert.equal(f.attachment.hasPlate,!['recovery'].includes(f.pose));assert.ok(f.attachment.wrist.x>8&&f.attachment.wrist.x<56);}}
  const reach=frames.find((f:any)=>f.pose==='contact').attachment.wrist,rest=frames.find((f:any)=>f.pose==='recovery').attachment.wrist;
  assert.ok(Math.abs(rest.x-32)<Math.abs(reach.x-32));
 }
});
test('serving exporter rejects live/public and unrelated repository paths without changing any198art files',()=>{
 const before=JSON.parse(readFileSync('docs/evidence/IH2-100/baseline-runtime.json','utf8'));
 for(const destination of ['public/art/variety','src','docs/evidence/IH2-099/study'])assert.throws(()=>execFileSync('python3',['tools/create-serving-study.py','--out',resolve(destination)],{stdio:'pipe'}));
 for(const [p,h]of Object.entries(before.art))assert.equal(hash(readFileSync(join('public/art',p))),h,p);
});
