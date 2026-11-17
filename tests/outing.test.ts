import{test}from'node:test';import assert from'node:assert/strict';import{createOuting,applyOuting,outingSchema,OUTING_STOPS,type OutingIntent,type OutingStation}from'../src/game/outing.ts';import{canStand,routeTo}from'../src/game/world.ts';
import{Session}from'../src/game/session.ts';import{worlds}from'../src/game/world.ts';
import{OutingSaveWriter,OUTING_SAVE_KEY}from'../src/persistence/outing-save.ts';
test('outing: both conditions, tool exchange/detour, physical repair order and recorded return have no outside ledger',()=>{
 let s=createOuting(),tick=100;const act=(a:OutingIntent,at:OutingStation,ok=true)=>{const before=structuredClone(s),r=applyOuting(s,a,tick++,at,'run-'+s.runs);assert.equal(r.ok,ok,r.message);assert.deepEqual(s,before);if(ok)s=r.state;return r;};
 act({action:'start',tool:'rope'},'outing-desk');assert.equal(s.active!.variant,'wind');let runId=s.active!.id;
 act({action:'cross',runId},'outing-crossing',false);act({action:'align',runId,direction:'west'},'outing-post',false);act({action:'borrow',runId,tool:'brace'},'outing-desk');act({action:'cross',runId},'outing-crossing');act({action:'align',runId,direction:'east'},'outing-post',false);act({action:'pin',runId},'outing-post',false);act({action:'align',runId,direction:'west'},'outing-post');act({action:'pin',runId},'outing-post');act({action:'secure',runId},'outing-post');assert.equal(s.journal.length,0);act({action:'finish',runId},'outing-post',false);act({action:'finish',runId},'outing-desk');assert.equal(s.journal.length,1);act({action:'finish',runId},'outing-desk',false);
 act({action:'start',tool:'brace'},'outing-desk');assert.equal(s.active!.variant,'soft-bank');runId=s.active!.id;act({action:'detour',runId},'outing-detour');for(const action of['align','pin','secure']as const)act(action==='align'?{action,runId,direction:'west'}:{action,runId},'outing-post');act({action:'finish',runId},'outing-desk');assert.equal(s.journal.length,2);assert.deepEqual(s.journal.map(j=>j.route),['main','detour']);assert.deepEqual(Object.keys(s).sort(),['active','journal','observedAt','revision','runs','version']);
});
test('outing: unfinished leave, old run, forged actions and backwards clocks never manufacture completion',()=>{
 const initial=createOuting(),started=applyOuting(initial,{action:'start',tool:'brace'},100,'outing-desk','one').state;
 assert.equal(applyOuting(started,{action:'finish',runId:'one'},101,'outing-desk').ok,false);assert.equal(applyOuting(started,{action:'leave',runId:'other'},101,'outing-desk').ok,false);assert.equal(applyOuting(started,{action:'borrow',runId:'one',tool:'rope'},99,'outing-desk').ok,false);
 const left=applyOuting(started,{action:'leave',runId:'one'},101,'outing-desk');assert.equal(left.ok,true);assert.equal(left.state.journal.length,0);assert.equal(left.state.active,null);assert.equal(applyOuting(left.state,{action:'secure',runId:'one'},102,'outing-post').ok,false);
 assert.equal(applyOuting(started,{action:'cross',runId:'one',reward:100}as any,102,'outing-crossing').ok,false);assert.equal(outingSchema.safeParse({...started,version:2}).success,false);
});
test('outing: all original-town stations are reachable before bridge funding without moving old collision shapes',()=>{
 for(const stop of OUTING_STOPS){assert.ok(canStand('square',stop.point),stop.id);assert.ok(routeTo('square',{x:24,y:25},stop.point).length>0,stop.id);}
});
test('outing local: independent storage, lease, stale two-tab input, replay and quota/lost-write recovery preserve the ordinary save',async()=>{
 const data=new Map<string,string>([['ih2:workshop:v2','ORIGINAL ORDINARY SAVE']]);let fail=false,afterWrite=false;const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{if(fail)throw Error('quota');data.set(k,v);if(afterWrite)throw Error('reply lost');}},locks={request:async(_n:string,fn:()=>Promise<unknown>)=>fn()};
 const a=new OutingSaveWriter(storage,locks,()=>100),b=new OutingSaveWriter(storage,locks,()=>101);assert.ok(await a.act({action:'start',tool:'brace'},'outing-desk','start',0));const id=a.state.active!.id;assert.equal(await b.act({action:'start',tool:'rope'},'outing-desk','stale',0),false);assert.equal(b.state.active!.id,id);
 assert.ok(await a.act({action:'start',tool:'brace'},'outing-desk','start',0));assert.equal(a.state.revision,1);assert.equal(await a.act({action:'start',tool:'rope'},'outing-desk','start',0),false);
 fail=true;assert.equal(await a.act({action:'cross',runId:id},'outing-crossing','cross',1),false);assert.equal(a.state.active!.stage,0);assert.ok(a.canRetry);fail=false;assert.ok(await a.retry());assert.equal(a.state.active!.stage,1);
 afterWrite=true;assert.equal(await a.act({action:'align',runId:id,direction:'west'},'outing-post','align',2),false);assert.equal(a.state.active!.stage,1);afterWrite=false;assert.ok(await a.retry());assert.equal(a.state.active!.stage,2);assert.equal(data.get('ih2:workshop:v2'),'ORIGINAL ORDINARY SAVE');assert.equal(new OutingSaveWriter(storage,locks).state.active!.stage,2);
 const unsupported='{"version":999}';data.set(OUTING_SAVE_KEY,unsupported);const unknown=new OutingSaveWriter(storage,locks);assert.ok(unknown.blocked);assert.equal(await unknown.act({action:'start',tool:'rope'},'outing-desk','no',0),false);assert.equal(data.get(OUTING_SAVE_KEY),unsupported);assert.equal(await new OutingSaveWriter(storage,undefined).act({action:'start',tool:'rope'},'outing-desk','no-lock',0),false);
});

test('outing: the entire displayed artwork approaches its own stop without stealing another interaction',()=>{
 for(const stop of OUTING_STOPS){const [x,y,w,h]=stop.doorArea;assert.ok(x<=(stop.point.x+.5)-80/32);assert.ok(x+w>=(stop.point.x+.5)+80/32);assert.ok(y<=(stop.point.y+.5)-132.48/32);assert.ok(y+h>=(stop.point.y+.5)+11.52/32);
 for(const point of[{x:x+.01-.5,y:y+.01-.5},{x:x+w-.01-.5,y:y+h-.01-.5}]){const s=new Session();assert.ok(s.point(point));assert.deepEqual(s.path.at(-1),stop.point);}
 for(const other of worlds.square.stops.filter(s=>s.id!==stop.id&&s.doorArea)){const[a,b,c,d]=other.doorArea!;assert.equal(Math.min(x+w,a+c)>Math.max(x,a)&&Math.min(y+h,b+d)>Math.max(y,b),false,stop.id+' overlaps '+other.id);}
 }
});
