import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{worlds,TILE}from'../src/game/world.ts';import{GARDEN_BEDS}from'../src/art/garden.ts';import{Session}from'../src/game/session.ts';
import{gardenStudyFrame,studyProject}from'../tools/garden-framing-model.ts';
const root='docs/evidence/IH2-096/study',data=JSON.parse(readFileSync(root+'/geometry.json','utf8')),observed=JSON.parse(readFileSync('docs/evidence/IH2-096/baseline-viewports.json','utf8')),geometry={width:data.width,height:data.height,actor:data.actor,activity:data.activity};
test('allotment study current framing reproduces actual native095viewport observations without changing the model',()=>{
 const before=JSON.stringify(data);assert.equal(data.width,worlds.garden.width*TILE);assert.equal(data.height,worlds.garden.height*TILE);assert.deepEqual(data.currentBeds,GARDEN_BEDS);assert.deepEqual(data.actor,{x:304,y:464});
 for(const{measured:m}of observed.cases){const f=gardenStudyFrame({width:m.width,height:m.height},geometry,'current'),p=studyProject({x:304,y:352,width:0,height:0},f);assert.ok(Math.abs(p.x-m.bedProjection.x)<.000001);assert.ok(Math.abs(p.y-m.bedProjection.y)<.000001);}
 assert.equal(JSON.stringify(data),before);assert.deepEqual(observed.api,[]);assert.deepEqual(observed.errors,[]);
});
test('proposed footprint projection explains exact current collision rectangles and fits existing service targets at recorded viewports',()=>{
 const before=JSON.stringify(worlds.garden);for(const[i,r]of worlds.garden.blocked.entries()){const expected={x:r[0]*TILE,y:r[1]*TILE,width:r[2]*TILE,height:r[3]*TILE};assert.deepEqual(data.blocked[i],expected);assert.deepEqual(data.candidateBeds[i],{x:expected.x+48,y:expected.y+96});assert.equal(data.candidateBeds[i].x-data.currentBeds[i].x,0);assert.equal(data.candidateBeds[i].y-data.currentBeds[i].y,0);}
 // Exercise the real tap handler at each exported rectangle's inner/outer
 // edges. Rectangle edges do not receive the actor's half-tile transform.
 for(const target of data.targets){const stop=worlds.garden.stops.find(s=>s.id===target.id)!,r=target.rect;
  const hit=(x:number,y:number)=>{const session=new Session({version:1,room:'garden',position:stop.point});session.point({x:x/TILE-.5,y:y/TILE-.5});return session.takeArrival()?.id;};
  for(const [x,y]of[[r.x+.1,r.y+r.height/2],[r.x+r.width-.1,r.y+r.height/2],[r.x+r.width/2,r.y+.1],[r.x+r.width/2,r.y+r.height-.1]])assert.equal(hit(x,y),target.id,'inside '+target.id);
  for(const [x,y]of[[r.x-.1,r.y+r.height/2],[r.x+r.width+.1,r.y+r.height/2],[r.x+r.width/2,r.y-.1],[r.x+r.width/2,r.y+r.height+.1]])assert.equal(hit(x,y),undefined,'outside '+target.id);
 }
 for(const{measured:m}of observed.cases){const f=gardenStudyFrame({width:m.width,height:m.height},geometry,'proposed');assert.equal(f.fitsActivity,true);for(const t of data.targets){const p=studyProject(t.rect,f);assert.ok(p.width>=44&&p.height>=44,t.id+' remains a usable study target');}}
 const small=gardenStudyFrame({width:200,height:100},geometry,'proposed');assert.equal(small.fitsActivity,false);assert.equal(small.zoom,.75);const panned=gardenStudyFrame({width:200,height:100},geometry,'proposed',{x:1e6,y:-1e6});assert.ok(Number.isFinite(panned.scrollX)&&Number.isFinite(panned.scrollY));assert.ok(panned.scrollX+panned.width<=geometry.width+.000001&&panned.scrollY>=0);assert.equal(JSON.stringify(worlds.garden),before);assert.throws(()=>gardenStudyFrame({width:0,height:400},geometry,'proposed'));
});
test('standalone art export is reproducible, attributed and refuses public before writing',()=>{
 execFileSync(process.execPath,['--experimental-strip-types','tools/create-allotment-study.ts','--check'],{stdio:'pipe'});const catalog=JSON.parse(readFileSync(root+'/catalog.json','utf8'));assert.equal(catalog.attributions.length,16);assert.equal(catalog.attributions.filter((a:any)=>a.source==='tools/create-allotment-study-art.py').length,4);for(const[file,sha]of Object.entries(catalog.files))assert.equal(createHash('sha256').update(readFileSync(root+'/'+file)).digest('hex'),sha);for(const a of catalog.attributions)assert.equal(a.license,'project-original');assert.throws(()=>execFileSync(process.execPath,['--experimental-strip-types','tools/create-allotment-study.ts','public'],{stdio:'pipe'}),/refuses/);
});
