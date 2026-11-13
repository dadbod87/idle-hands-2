import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CafeWriterCandidate,browserCafeWriter} from '../src/persistence/cafe-writer-candidate.ts';
import {CAFE_SAVE_KEY,CAFE_LEGACY_KEY,CAFE_WRITER_LOCK,type CafeStorage,type CafeWriterLocks} from '../src/persistence/cafe-save-candidate.ts';
import {createWorkshop,isCurrentWorkshop} from '../src/game/workshop.ts';
import {cafeFixture,CAFE_FIXTURE_AT as at} from './helpers/cafe.ts';
import {serveLocalCafeCandidate} from '../src/game/cafe-candidate.ts';
const H=3_600_000;
class Locks implements CafeWriterLocks{
 held=false;calls=0;
 async request<T>(name:string,options:{ifAvailable:true},callback:(lock:{name:string}|null)=>Promise<T>):Promise<T>{
  assert.equal(name,CAFE_WRITER_LOCK);assert.equal(options.ifAvailable,true);this.calls++;
  if(this.held)return callback(null);this.held=true;try{return await callback({name});}finally{this.held=false;}
 }
}
function fixture(){
 const map=new Map([[CAFE_SAVE_KEY,JSON.stringify(cafeFixture())]]),locks=new Locks();let fail=0,reads=0,writes=0,now=at,beforeWrite:(()=>void)|null=null;
 const storage:CafeStorage={getItem:k=>{reads++;return map.get(k)??null;},setItem:(k,v)=>{writes++;beforeWrite?.();if(fail>0){fail--;throw Error('quota');}map.set(k,v);}};
 const writer=new CafeWriterCandidate({storage:()=>storage,locks:()=>locks,now:()=>now});
 return{map,locks,storage,writer,get reads(){return reads;},get writes(){return writes;},set fail(n:number){fail=n;},set now(n:number){now=n;},set beforeWrite(f:(()=>void)|null){beforeWrite=f;},make:()=>new CafeWriterCandidate({storage:()=>storage,locks:()=>locks,now:()=>now})};
}
const command=(revision:number,id='gather')=>({id,expectedRevision:revision,kind:'gather',resource:['scrap','timber','supplies'][revision%3]});
const intent=(revision:number)=>({expectedRevision:revision,presentation:'slices'});
const drain=async()=>{await Promise.resolve();await Promise.resolve();};
test('one lifetime lease serves ordinary and cafe commands without nested acquisitions or optimistic confirmation',async()=>{
 const f=fixture();assert.equal((await f.writer.connect()).status,'ready');assert.equal(f.locks.held,true);const before=f.writer.confirmedSnapshot()!;
 f.beforeWrite=()=>assert.equal(f.writer.confirmedSnapshot()!.revision,before.revision);
 const ordinary=f.writer.command(command(0));assert.equal(ordinary.status,'saved');assert.equal(ordinary.ordinaryAccepted,true);assert.equal(ordinary.state!.revision,1);f.beforeWrite=null;
 const serve=f.writer.serve(intent(1));assert.equal(serve.status,'saved');assert.equal(serve.state!.cafe.totalServes,1);assert.equal(serve.state!.garden.produce.radish,11);assert.equal(f.locks.calls,1);
 assert.deepEqual(JSON.parse(f.map.get(CAFE_SAVE_KEY)!),serve.state);f.writer.dispose();await drain();assert.equal(f.locks.held,false);
});
test('failed ordinary saves retain working practice; cafe is blocked until a separate successful flush',async()=>{
 const f=fixture();await f.writer.connect();const raw=f.map.get(CAFE_SAVE_KEY);f.fail=2;
 const unsaved=f.writer.command(command(0));assert.equal(unsaved.status,'unsaved');assert.equal(unsaved.dirty,true);assert.equal(unsaved.state!.revision,0);assert.equal(unsaved.working!.revision,1);assert.equal(f.map.get(CAFE_SAVE_KEY),raw);
 const writes=f.writes;assert.equal(f.writer.serve(intent(1)).status,'unsaved');assert.equal(f.writes,writes);assert.equal(f.writer.reload().status,'unsaved');assert.equal(f.writer.flush().status,'unsaved');
 assert.equal(f.writer.flush().status,'saved');assert.equal(f.writer.confirmedSnapshot()!.revision,1);assert.equal(f.writer.confirmedSnapshot()!.cafe.totalServes,0);assert.equal(f.writer.serve(intent(1)).status,'saved');f.writer.dispose();
});
test('more ordinary practice can accumulate while unsaved and a later complete-root save retains every action',async()=>{
 const f=fixture();await f.writer.connect();f.fail=2;f.writer.command(command(0,'one'));f.writer.command(command(1,'two'));assert.equal(f.writer.snapshot()!.revision,2);assert.equal(f.writer.confirmedSnapshot()!.revision,0);
 const saved=f.writer.command(command(2,'three'));assert.equal(saved.status,'saved');assert.equal(saved.state!.revision,3);assert.equal(saved.state!.receipts.length,3);assert.deepEqual(saved.state!.inventory,{scrap:6,timber:6,supplies:6});f.writer.dispose();
});
test('pending cafe retry keeps its original detached intent and blocks ordinary/flush; third reward appears only after write',async()=>{
 const f=fixture();let state=cafeFixture();for(let i=0;i<2;i++){const r=serveLocalCafeCandidate(state,intent(state.revision),at+i*4*H);assert.ok(r.ok);state=r.state;}f.map.set(CAFE_SAVE_KEY,JSON.stringify(state));f.now=at+8*H;await f.writer.connect();f.fail=1;
 const request=intent(2),failed=f.writer.serve(request);request.expectedRevision=0;assert.equal(failed.status,'save-failed');assert.equal(failed.teapotAwarded,false);assert.equal(failed.state!.owned.teapot,0);assert.equal(failed.working!.cafe.totalServes,2);assert.equal(failed.canRetry,true);
 assert.equal(f.writer.command(command(2)).status,'blocked');assert.equal(f.writer.flush().status,'blocked');assert.equal(f.writer.serve(intent(2)).status,'blocked');const retry=f.writer.retry();assert.equal(retry.status,'saved');assert.equal(retry.teapotAwarded,true);assert.equal(retry.state!.owned.teapot,1);assert.equal(f.writer.retry().status,'no-pending');f.writer.dispose();
});
test('pending cafe cancellation neither spends nor drops earlier ordinary practice',async()=>{
 const f=fixture();await f.writer.connect();f.writer.command(command(0));f.fail=1;f.writer.serve(intent(1));assert.equal(f.writer.cancelPending(),true);assert.equal(f.writer.retry().status,'no-pending');assert.equal(f.writer.snapshot()!.revision,1);assert.equal(f.writer.snapshot()!.cafe.totalServes,0);assert.equal(f.writer.command(command(1,'two')).status,'saved');f.writer.dispose();
});
test('migration failure keeps exact legacy raw/fallback and blocks actions until successful retry',async()=>{
 const f=fixture();f.map.delete(CAFE_SAVE_KEY);const raw=' \n'+JSON.stringify(createWorkshop(at),null,2)+'\n';f.map.set(CAFE_LEGACY_KEY,raw);f.fail=1;
 const failed=await f.writer.connect();assert.equal(failed.status,'save-failed');assert.equal(failed.state,null);assert.equal(f.map.has(CAFE_SAVE_KEY),false);assert.equal(f.map.get(CAFE_LEGACY_KEY),raw);assert.equal(f.writer.command(command(0)).status,'blocked');
 assert.equal(f.writer.retry().status,'ready');assert.equal(f.writer.confirmedSnapshot()!.version,3);assert.equal(f.map.get(CAFE_LEGACY_KEY),raw);assert.equal(f.writer.command(command(0)).status,'saved');f.writer.dispose();
});
test('missing, malformed or unsupported current save is never replaced or bypassed by fallback',async()=>{
 for(const raw of [null,'{','{"version":3}']){const f=fixture();if(raw===null)f.map.delete(CAFE_SAVE_KEY);else f.map.set(CAFE_SAVE_KEY,raw);if(raw!==null)f.map.set(CAFE_LEGACY_KEY,JSON.stringify(createWorkshop(at)));const before=JSON.stringify([...f.map]);const r=await f.writer.connect();assert.equal(r.status,raw===null?'missing':'unreadable');assert.equal(f.writes,0);assert.equal(f.writer.serve(intent(0)).teapotAwarded,false);assert.equal(JSON.stringify([...f.map]),before);f.writer.dispose();}
});
test('changed raw freezes dirty work and preserves both versions until an explicit valid discard/reload',async()=>{
 const f=fixture();await f.writer.connect();f.fail=1;f.writer.command(command(0));const working=f.writer.snapshot();f.map.set(CAFE_SAVE_KEY,'{"version":3}');assert.equal(f.writer.flush().status,'conflict');assert.deepEqual(f.writer.snapshot(),working);assert.equal(f.writer.discardAndReload().status,'unreadable');assert.deepEqual(f.writer.snapshot(),working);
 const replacement=JSON.stringify(cafeFixture(5));f.map.set(CAFE_SAVE_KEY,replacement);assert.equal(f.writer.discardAndReload().status,'ready');assert.equal(f.writer.snapshot()!.garden.produce.radish,5);assert.equal(f.map.get(CAFE_SAVE_KEY),replacement);f.writer.dispose();
});
test('failed explicit replacement migration restores dirty practice and its conflict instead of silently clearing it',async()=>{
 const f=fixture();await f.writer.connect();f.fail=1;f.writer.command(command(0));const before=f.writer.snapshot();f.map.set(CAFE_SAVE_KEY,JSON.stringify(createWorkshop(at)));assert.equal(f.writer.flush().status,'conflict');f.fail=1;const result=f.writer.discardAndReload();assert.equal(result.status,'unsaved');assert.equal(result.dirty,true);assert.deepEqual(result.working,before);assert.equal(f.writer.command(command(1)).status,'conflict');assert.equal(f.writer.discardAndReload().status,'ready');f.writer.dispose();
});
test('failed migration on clean reconnect cannot be cancelled to overwrite the replacement with an older working snapshot',async()=>{
 const f=fixture();await f.writer.connect();f.writer.suspend();await drain();const replacement=JSON.stringify(createWorkshop(at));f.map.set(CAFE_SAVE_KEY,replacement);f.fail=1;
 assert.equal((await f.writer.connect()).status,'save-failed');assert.equal(f.writer.cancelPending(),false);assert.equal(f.writer.command(command(0)).status,'blocked');assert.equal(f.map.get(CAFE_SAVE_KEY),replacement);
 const migrated=f.writer.retry();assert.equal(migrated.status,'ready');assert.equal(migrated.state!.garden.produce.radish,0);assert.equal(f.writer.command(command(0)).status,'saved');assert.equal(f.writer.snapshot()!.garden.produce.radish,0);f.writer.dispose();
});
test('two writers cannot overlap; clean resume reloads fresh state while dirty resume refuses to rebase',async()=>{
 const f=fixture(),b=f.make();await f.writer.connect();assert.equal((await b.connect()).status,'busy');f.writer.suspend();await drain();assert.equal((await b.connect()).status,'ready');b.command(command(0));b.suspend();await drain();assert.equal((await f.writer.connect()).state!.revision,1);
 f.fail=1;f.writer.command(command(1,'unsaved'));f.writer.suspend();await drain();await b.connect();b.command(command(1,'other'));b.suspend();await drain();const r=await f.writer.connect();assert.equal(r.status,'conflict');assert.equal(r.working!.receipts.at(-1)!.id,'unsaved');assert.equal(r.state!.revision,1);assert.equal(JSON.parse(f.map.get(CAFE_SAVE_KEY)!).receipts.at(-1).id,'other');f.writer.dispose();b.dispose();
});
test('fallback identity includes current-key creation and fallback removal before retry/resume',async()=>{
 for(const change of ['create-current','remove-fallback']){const f=fixture();f.map.delete(CAFE_SAVE_KEY);f.map.set(CAFE_LEGACY_KEY,JSON.stringify(createWorkshop(at)));f.fail=1;await f.writer.connect();f.writer.suspend();await drain();if(change==='create-current')f.map.set(CAFE_SAVE_KEY,JSON.stringify(cafeFixture()));else f.map.delete(CAFE_LEGACY_KEY);assert.equal((await f.writer.connect()).status,'conflict');assert.equal(f.writer.retry().status,'conflict');f.writer.dispose();}
});
test('late acquisition after hide/dispose never reads or writes and cannot cancel a newer lease',async()=>{
 const f=fixture();const callbacks:Array<(lock:{name:string}|null)=>Promise<unknown>>=[];
 const delayed:CafeWriterLocks={request:async(_name,_options,callback)=>{callbacks.push(callback);return await new Promise<never>(()=>{});}};
 const w=new CafeWriterCandidate({storage:()=>f.storage,locks:()=>delayed,now:()=>at});const a=w.connect();assert.equal(w.connect(),a);w.suspend();assert.equal((await a).status,'suspended');const b=w.connect();
 const newer=callbacks[1]({name:CAFE_WRITER_LOCK});assert.equal((await b).status,'ready');const read=f.reads;await callbacks[0]({name:CAFE_WRITER_LOCK});assert.equal(f.reads,read);assert.equal(w.command(command(0)).status,'saved');w.dispose();await newer;assert.equal((await w.connect()).status,'suspended');assert.equal(callbacks.length,2);
});
test('throwing native capability getters, rejected locks, reads and clocks never overwrite saved data',async()=>{
 const f=fixture();for(const environment of [{storage:()=>{throw Error('denied');},locks:()=>f.locks,now:()=>at},{storage:()=>f.storage,locks:()=>{throw Error('denied');},now:()=>at},{storage:()=>f.storage,locks:()=>({request:async()=>{throw Error('denied');}}),now:()=>at}]){const w=new CafeWriterCandidate(environment);assert.equal((await w.connect()).status,'unavailable');assert.equal(f.writes,0);w.dispose();}
 const w=new CafeWriterCandidate({storage:()=>f.storage,locks:()=>f.locks,now:()=>{throw Error('clock');}});await w.connect();assert.equal(w.command(command(0)).status,'unavailable');assert.equal(w.serve(intent(0)).status,'unavailable');assert.equal(f.writes,0);w.dispose();
});
test('storage read refusal preserves confirmed and dirty snapshots without writing or discarding them',async()=>{
 const f=fixture();let deny=false;const storage:CafeStorage={getItem:k=>{if(deny)throw Error('read denied');return f.storage.getItem(k);},setItem:(k,v)=>f.storage.setItem(k,v)};
 const w=new CafeWriterCandidate({storage:()=>storage,locks:()=>f.locks,now:()=>at});await w.connect();f.fail=1;w.command(command(0));const before=w.snapshot(),confirmed=w.confirmedSnapshot(),raw=f.map.get(CAFE_SAVE_KEY);deny=true;
 assert.equal(w.flush().status,'unavailable');assert.equal(w.reload().status,'unavailable');assert.deepEqual(w.snapshot(),before);assert.deepEqual(w.confirmedSnapshot(),confirmed);assert.equal(f.map.get(CAFE_SAVE_KEY),raw);deny=false;assert.equal(w.flush().status,'saved');w.dispose();
});
test('returned snapshots cannot mutate working/confirmed state and reentrant writes cannot cancel or issue another command',async()=>{
 const f=fixture();const ready=await f.writer.connect();ready.state!.owned.teapot=1;ready.working!.cafe.totalServes=5;assert.equal(f.writer.snapshot()!.owned.teapot,0);f.beforeWrite=()=>{assert.equal(f.writer.cancelPending(),false);assert.equal(f.writer.command(command(0)).status,'busy');};const r=f.writer.serve(intent(0));assert.equal(r.status,'saved');assert.equal(r.state!.cafe.totalServes,1);f.writer.snapshot()!.garden.produce.radish=0;assert.equal(f.writer.confirmedSnapshot()!.garden.produce.radish,11);f.writer.dispose();
});
test('browser bootstrap guards native getters and lifecycle listeners reacquire only on persisted show and remove on dispose',async()=>{
 const target=new EventTarget();const host=Object.assign(target,{navigator:{locks:undefined}});Object.defineProperty(host,'localStorage',{get:()=>{throw Error('privacy');}});const binding=browserCafeWriter(host as unknown as Window,()=>at);assert.equal((await binding.writer.connect()).status,'unavailable');target.dispatchEvent(new Event('pagehide'));binding.dispose();assert.equal((await binding.writer.connect()).status,'suspended');
 const f=fixture();const t=new EventTarget();const good=Object.assign(t,{localStorage:f.storage,navigator:{locks:f.locks}});const b=browserCafeWriter(good as unknown as Window,()=>at);await b.writer.connect();t.dispatchEvent(new Event('pagehide'));await drain();assert.equal(f.locks.held,false);const show=new Event('pageshow');Object.defineProperty(show,'persisted',{value:true});t.dispatchEvent(show);await drain();assert.equal(f.locks.held,true);b.dispose();await drain();t.dispatchEvent(show);await drain();assert.equal(f.locks.held,false);assert.equal(isCurrentWorkshop(b.writer.snapshot()),false);
});
