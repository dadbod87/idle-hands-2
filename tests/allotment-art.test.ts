import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{ALLOTMENT_LAYERS,ALLOTMENT_BED_FEET,allotmentCamera}from'../src/art/allotment.ts';import{worlds,TILE,canStand,FOOT_RADIUS}from'../src/game/world.ts';import{rainLayer,rainTranslation}from'../src/art/rain.ts';
test('allotment art retains exact reviewed original layers and aligns only render feet to existing obstacles',()=>{
 const before=JSON.stringify(worlds.garden),catalog=JSON.parse(readFileSync('docs/evidence/IH2-096/study/catalog.json','utf8'));
 for(const key of ALLOTMENT_LAYERS){const b=readFileSync('public/art/allotment/'+key+'.svg'),source=readFileSync('docs/evidence/IH2-096/study/art/'+key+'.svg');assert.ok(b.equals(source));assert.equal(createHash('sha256').update(b).digest('hex'),catalog.files['art/'+key+'.svg']);}
 for(const [i,[x,y,w,h]]of worlds.garden.blocked.entries())assert.deepEqual(ALLOTMENT_BED_FEET[i],{x:(x+w/2)*TILE,y:(y+h)*TILE});
 // Prove both sides of actual authority boundaries. A duplicated +0.5 edge
 // formula would pass a mirrored geometry test but fail these canStand probes.
 const stand=(x:number,y:number)=>canStand('garden',{x:x/TILE-.5,y:y/TILE-.5});
 for(const [i,p]of ALLOTMENT_BED_FEET.entries()){
  const cx=p.x,cy=p.y-48,left=p.x-48,right=p.x+48,top=p.y-96,r=FOOT_RADIUS*TILE;
  assert.equal(stand(cx,cy),false,'bed '+i+' inside');
  assert.equal(stand(left-r+.1,cy),false,'bed '+i+' left collision edge');
  assert.equal(stand(left-r-.1,cy),true,'bed '+i+' left clear gap');
  assert.equal(stand(cx,top-r+.1),false,'bed '+i+' top collision edge');
  assert.equal(stand(cx,top-r-.1),true,'bed '+i+' top clear lane');
  assert.equal(stand(right+r-.1,cy),false,'bed '+i+' right collision edge');
  assert.equal(stand(right+r+.1,cy),true,'bed '+i+' right clear gap');
  assert.equal(stand(cx,p.y+r-.1),false,'bed '+i+' bottom collision edge');
  assert.equal(stand(cx,p.y+r+.1),true,'bed '+i+' bottom clear apron');
 }
 execFileSync('python3',['tools/promote-allotment-art.py','--check'],{stdio:'pipe'});assert.equal(JSON.stringify(worlds.garden),before);assert.equal(ALLOTMENT_BED_FEET.length,3);
});
test('allotment framing bounds the zoom and existing service target sizes without moving the actor or model',()=>{
 const before=JSON.stringify(worlds),observed=JSON.parse(readFileSync('docs/evidence/IH2-096/baseline-viewports.json','utf8'));
 for(const {measured:v}of observed.cases){const c=allotmentCamera(v.width,v.height);assert.ok(c.zoom>=.75&&c.zoom<=1);assert.deepEqual([c.followX,c.followY],[0,64]);for(const stop of worlds.garden.stops){const r=stop.doorArea!;assert.ok(r[2]*TILE*c.zoom>=44&&r[3]*TILE*c.zoom>=44);}assert.ok(c.bounds.width>=v.width/c.zoom&&c.bounds.height>=v.height/c.zoom);}
 assert.equal(allotmentCamera(180,90).zoom,.75);assert.throws(()=>allotmentCamera(0,500));assert.throws(()=>allotmentCamera(NaN,400));assert.equal(JSON.stringify(worlds),before);
});
test('scaled rain preserves zoom-one behavior, world phase and edge coverage through negative scroll and fractional zoom',()=>{
 const mod=(n:number,p:number)=>((n%p)+p)%p;
 for(const z of[.75,.8404255319,.9468085106,1])for(const x of[-333.25,-.001,0,191.999,1200.5])for(const y of[-240.5,0,95.999,700.25])for(const fall of[0,15.5,95.999]){
  const p=rainLayer(x,y,fall,z);assert.ok(Math.min(mod(p.x+x*z,p.periodX),p.periodX-mod(p.x+x*z,p.periodX))<1e-7);assert.ok(Math.min(mod(p.y+(y-fall)*z,p.periodY),p.periodY-mod(p.y+(y-fall)*z,p.periodY))<1e-7);
  assert.ok(-p.inset+p.x<=0&&p.inset+p.x>=0);assert.ok(-p.inset+p.y<=0&&p.inset+p.y>=0);
  if(z===1){const old=rainTranslation(x,y,fall);assert.deepEqual({x:p.x,y:p.y},old);assert.deepEqual([p.periodX,p.periodY,p.inset],[192,96,192]);}
 }
 assert.throws(()=>rainLayer(0,0,0,0));
});
