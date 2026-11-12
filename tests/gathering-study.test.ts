import{test}from'node:test';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{mkdtempSync,readFileSync,readdirSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
const study='docs/evidence/IH2-077/study',catalog=()=>JSON.parse(readFileSync(join(study,'catalog.json'),'utf8')),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
test('gathering study exports deterministically outside runtime with exact original provenance',()=>{
 const out=mkdtempSync(join(tmpdir(),'ih2-gather-study-'));try{execFileSync('python3',['tools/create-gathering-study.py','--out',out]);assert.deepEqual(readdirSync(out).sort(),readdirSync(study).sort());for(const f of readdirSync(out))assert.deepEqual(readFileSync(join(out,f)),readFileSync(join(study,f)),f);const c=catalog();for(const[p,h]of Object.entries(c.sources))assert.equal(hash(readFileSync(p)),h);for(const[p,h]of Object.entries(c.files))assert.equal(hash(readFileSync(join(study,p))),h);assert.equal(Object.keys(c.files).length,8);}finally{rmSync(out,{recursive:true,force:true});}
});
test('candidate collection contract keeps all48cells/feet and explicitly leaves three rigs unfinished',()=>{
 const c=catalog();assert.equal(c.rig,'aster');assert.deepEqual(c.unfinishedRigs,['bea','casey','devon']);assert.equal(c.frames.length,48);assert.equal(c.frameWidth,64);assert.equal(c.frameHeight,80);assert.equal(c.displayScale,.9);assert.match(c.classification,/not loaded by playable game/);
 for(const facing of c.facings)assert.equal(new Set(c.frames.filter((f:any)=>f.facing===facing).map((f:any)=>f.footVectorSha256)).size,1);
 for(const resource of c.resources){const frames=c.frames.filter((f:any)=>f.resource===resource);assert.equal(new Set(frames.map((f:any)=>f.index)).size,16);for(const f of frames){assert.deepEqual(f.foot,{x:32,y:72});assert.ok(c.facings.includes(f.facing));assert.ok(c.poses.includes(f.pose));if(f.pose==='idle')assert.equal(f.attachment,null);else{assert.ok(f.attachment.x>=16&&f.attachment.x<=49);assert.ok(f.attachment.y>=31&&f.attachment.y<=51);assert.equal(f.attachment.hasProp,f.pose!=='reach');}}}
});
test('study exporter refuses the live public tree before writing',()=>{
 const before=hash(readFileSync('public/art/depots/catalog.json'));assert.throws(()=>execFileSync('python3',['tools/create-gathering-study.py','--out',resolve('public/art/depots')],{stdio:'pipe'}),/Command failed/);assert.equal(hash(readFileSync('public/art/depots/catalog.json')),before);
});
