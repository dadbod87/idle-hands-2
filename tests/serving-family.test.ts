import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root='docs/evidence/IH2-106/study',hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const catalog=()=>JSON.parse(readFileSync(root+'/catalog.json','utf8'));
test('serving family: all15original files reproduce, with exact source/provenance and no paid/external art',()=>{
 const temp=mkdtempSync(join(tmpdir(),'ih2-serving-family-'));
 try{execFileSync('python3',['tools/create-serving-family.py','--out',temp]);assert.deepEqual(readdirSync(temp).sort(),readdirSync(root).sort());assert.equal(readdirSync(root).length,15);for(const f of readdirSync(root))assert.deepEqual(readFileSync(join(temp,f)),readFileSync(join(root,f)),f);}finally{rmSync(temp,{recursive:true,force:true});}
 const c=catalog();for(const[p,h]of Object.entries(c.sources))assert.equal(hash(readFileSync(p)),h);for(const[p,h]of Object.entries(c.files))assert.equal(hash(readFileSync(root+'/'+p)),h);
 const p=JSON.parse(readFileSync(root+'/provenance.json','utf8'));assert.equal(p.license,'project-original');for(const[f,h]of Object.entries(p.files))assert.equal(hash(readFileSync(root+'/'+f)),h);
 for(const f of readdirSync(root).filter(n=>n.endsWith('.svg')))assert.doesNotMatch(readFileSync(root+'/'+f,'utf8'),/<script|<foreignObject|(?:href|src)=["'](?:https?:|\/\/)/i);
});
test('serving family: all80cells keep reviewed Aster, same-facing feet and exact accepted resting body',()=>{
 const c=catalog(),old=JSON.parse(readFileSync('docs/evidence/IH2-100/study/catalog.json','utf8'));
 assert.deepEqual(c.rigs,['aster','bea','casey','devon']);assert.deepEqual(c.unfinishedRigs,[]);assert.equal(c.frames.length,80);assert.equal(c.displayScale,.9);assert.deepEqual(c.replayTimesMs,[0,160,340,520,720]);
 for(const who of c.rigs)for(const facing of c.facings){const frames=c.frames.filter((f:any)=>f.rig===who&&f.facing===facing);assert.equal(frames.length,5);assert.equal(new Set(frames.map((f:any)=>f.footVectorSha256)).size,1);for(const f of frames){assert.deepEqual(f.foot,{x:32,y:72});if(f.pose==='idle'){assert.equal(f.bodySha256,f.acceptedIdleSha256);assert.equal(f.attachment,null);}else assert.equal(f.attachment.hasPlate,f.pose!=='recovery');if(who==='aster')assert.deepEqual(f,old.frames.find((v:any)=>v.index===f.index));}}
});
test('teapot: original world silhouette remains exact, icon shares named materials and declared display anchors',()=>{
 const c=catalog();assert.deepEqual(readFileSync(root+'/teapot-world.svg'),readFileSync('docs/evidence/IH2-099/study/art/brave-teapot.svg'));
 assert.equal(c.teapot.icon.displayPixels,56);assert.equal(c.teapot.world.displayPixels,48);assert.deepEqual(c.teapot.world.foot,{x:40,y:74});
 for(const name of ['teapot-icon.svg','teapot-world.svg']){const s=readFileSync(root+'/'+name,'utf8');for(const color of ['#59899d','#e2b955','#f7efd9'])assert.ok(s.includes(color));assert.doesNotMatch(s,/<rect/);}
 assert.equal(c.notImplemented,true);assert.equal(c.gameSaveCompatible,false);
});
test('serving exporter: live, unrelated and protected study destinations refuse; historical21files remain unchanged',()=>{
 for(const path of ['public/art/variety','src','docs/evidence/IH2-099/study','docs/evidence/IH2-100/study'])assert.throws(()=>execFileSync('python3',['tools/create-serving-family.py','--out',resolve(path)],{stdio:'pipe'}));
 const history=JSON.parse(readFileSync('docs/evidence/IH2-102/source-inputs.json','utf8'));for(const study of history.historicalStudies)for(const[f,h]of Object.entries(study.files))assert.equal(hash(readFileSync(study.root+'/'+f)),h);
});
