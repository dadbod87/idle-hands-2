import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{homeExteriorForPlot,RESIDENTIAL_FAMILIES,RESIDENTIAL_ASSETS,writeSmokePose,type SmokePose}from'../src/art/residential.ts';
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
test('residential generator is reproducible, licensed and preserves all190accepted art bytes',()=>{
 const prior=JSON.parse(readFileSync('docs/evidence/IH2-090/prior-art-sha256.json','utf8'));assert.equal(Object.keys(prior.files).length,190);for(const[path,sha]of Object.entries(prior.files))assert.equal(hash(readFileSync('public/'+path)),sha,path);
 const root='public/art/residential',expected=new Map(readdirSync(root).map(f=>[f,hash(readFileSync(root+'/'+f))]));execFileSync('python3',['tools/create-residential-art.py']);assert.equal(expected.size,8);for(const[name,sha]of expected)assert.equal(hash(readFileSync(root+'/'+name)),sha,name);
 const c=JSON.parse(readFileSync(root+'/catalog.json','utf8')),p=JSON.parse(readFileSync('licenses/asset-provenance.json','utf8')),m=JSON.parse(readFileSync('src/game/asset-manifest.json','utf8'));assert.equal(c.generatorSha256,hash(readFileSync(c.generator)));assert.equal(c.assets.length,7);
 for(const a of c.assets){const path=root+'/'+a.file;assert.equal(p.original.find((v:any)=>v.id===a.id).sha256,hash(readFileSync(path)));assert.equal(p.original.find((v:any)=>v.id===a.id).license,'project-original');assert.equal('public/'+m.assets.find((v:any)=>v.id===a.id).path,path);}
 for(const[path,sha]of Object.entries(prior.files))assert.equal(hash(readFileSync('public/'+path)),sha,path);
});
test('stable exterior families survive level changes, future IDs and render metadata mutation',()=>{
 const all=new Map<string,Set<string>>();for(let i=1;i<=25;i++){
  const one=homeExteriorForPlot(String(i),1),two=homeExteriorForPlot(String(i),2);assert.equal(one.family,two.family);assert.notEqual(one.id,two.id);assert.deepEqual(one.foot,{x:104,y:240});assert.deepEqual(two.doorFoot,{x:104,y:240});assert.equal(one.width,208);assert.equal(two.height,248);for(const a of [one,two]){assert.ok(a.chimney.x>0&&a.chimney.x<208&&a.chimney.y>=0&&a.chimney.y<248);for(const w of a.lightingWindows){assert.ok(w.x>=0&&w.y>=0&&w.x+w.width<=208&&w.y+w.height<=248);}}
  all.set(one.family,(all.get(one.family)??new Set()).add(one.id).add(two.id));if(i%3===0)assert.ok(RESIDENTIAL_FAMILIES.includes(two.family as any));
 }
 assert.equal(all.size,3);assert.ok([...all.values()].every(x=>x.size===2));assert.equal(new Set([3,6,9].map(id=>homeExteriorForPlot(String(id),2).family)).size,3);
 for(const id of ['9007199254740993','999999999999999999'])assert.equal(homeExteriorForPlot(id,1).family,homeExteriorForPlot(id,2).family);
 const a=homeExteriorForPlot('2',1),before=homeExteriorForPlot('2',1);a.chimney.x=0;a.foot.x=0;a.lightingWindows[0].x=0;assert.deepEqual(homeExteriorForPlot('2',1),before);
 for(const id of ['0','-1','abc','01','1000000000000000000'])assert.throws(()=>homeExteriorForPlot(id,1));assert.throws(()=>homeExteriorForPlot('1',3 as any));
});
test('cached smoke poses remain bounded and become completely still/hidden when disabled',()=>{
 const pose:SmokePose={x:0,y:0,alpha:0,scale:0},identity=pose;let sawMotion=false,prior=0;
 for(let t=0;t<10800;t+=75){writeSmokePose(pose,t,.173,true);assert.equal(pose,identity);assert.ok(pose.alpha>=0&&pose.alpha<=.180001);assert.ok(pose.scale>=.55&&pose.scale<=1);assert.ok(pose.y>=-35&&pose.y<=0);assert.ok(Math.abs(pose.x)<=8);sawMotion ||=pose.y!==prior;prior=pose.y;}assert.ok(sawMotion);
 writeSmokePose(pose,5000,.173,false);const still={...pose};for(const t of [0,6000,999999,NaN]){writeSmokePose(pose,t,.173,false);assert.deepEqual(pose,still);}writeSmokePose(pose,NaN,0,true);assert.equal(pose.alpha,0);writeSmokePose(pose,0,NaN,true);assert.equal(pose.alpha,0);
 assert.equal(RESIDENTIAL_ASSETS.filter(a=>a.kind==='low-walk-through-verge').length,2);
});
