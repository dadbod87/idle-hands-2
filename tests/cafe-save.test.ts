import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorkshop} from '../src/game/workshop.ts';
import {serveLocalCafeCandidate, type CafeWorkshopCandidate} from '../src/game/cafe-candidate.ts';
import {CafeSaveCandidate, CAFE_SAVE_KEY, CAFE_LEGACY_KEY, CAFE_WRITER_LOCK, type CafeStorage, type CafeWriterLocks} from '../src/persistence/cafe-save-candidate.ts';
import {cafeFixture, CAFE_FIXTURE_AT as at} from './helpers/cafe.ts';
const H = 3_600_000;
class Locks implements CafeWriterLocks {
  held = false; denied = false; reject = false;
  async request<T>(name:string, options:{ifAvailable:true}, callback:(lock:{name:string}|null)=>Promise<T>):Promise<T> {
    assert.equal(name,CAFE_WRITER_LOCK); assert.deepEqual(options,{ifAvailable:true});
    if(this.reject) throw new Error('Injected unavailable lock');
    if(this.held || this.denied) return callback(null);
    this.held=true;
    try { return await callback({name}); } finally { this.held=false; }
  }
}
class MemoryStorage implements CafeStorage {
  values = new Map<string,string>(); readFailure=false; failures=0; reads=0; attempts=0; writes=0;
  beforeWrite:(()=>void)|null=null; afterWrite:(()=>void)|null=null;
  readonly locks:Locks;
  constructor(locks:Locks, initial:string|null=JSON.stringify(cafeFixture()), key=CAFE_SAVE_KEY) { this.locks=locks;if(initial!==null)this.values.set(key,initial); }
  getItem(key:string) { assert.ok(this.locks.held,'read must follow exclusive acquisition'); this.reads++;if(this.readFailure)throw new Error('Injected private error');return this.values.get(key)??null; }
  setItem(key:string,value:string) {
    assert.ok(this.locks.held,'write must occur under exclusive acquisition'); assert.equal(key,CAFE_SAVE_KEY);
    this.attempts++;this.beforeWrite?.();if(this.failures>0){this.failures--;throw new DOMException('Injected quota','QuotaExceededError');}
    this.values.set(key,value);this.writes++;this.afterWrite?.();
  }
}
function fixture(state=cafeFixture()) {
  const locks=new Locks(),storage=new MemoryStorage(locks,JSON.stringify(state));let now=at;
  const save=new CafeSaveCandidate(storage,locks,()=>now);
  return {locks,storage,save,get now(){return now;},set now(n:number){now=n;}};
}
const intent=(state:CafeWorkshopCandidate)=>({expectedRevision:state.revision,presentation:'slices'});
function thirdReady() {
  let state=cafeFixture();for(let i=0;i<2;i++){const r=serveLocalCafeCandidate(state,intent(state),at+i*4*H);assert.ok(r.ok);state=r.state;}return state;
}

test('café save confirms only after setItem returns; failed third reward keeps raw bytes, stock, cooldown and entitlement',async()=>{
  const f=fixture(thirdReady());f.now=at+8*H;await f.save.load();const before=f.storage.values.get(CAFE_SAVE_KEY)!;
  const original=f.save.snapshot()!;f.storage.failures=2;
  f.storage.beforeWrite=()=>assert.deepEqual(f.save.snapshot(),original);
  for(const operation of [()=>f.save.serve(intent(original)),()=>f.save.retry()]){
    const r=await operation();assert.equal(r.status,'save-failed');assert.equal(r.current,false);assert.equal(r.canRetry,true);assert.equal(r.teapotAwarded,false);
    assert.deepEqual(r.state,original);assert.equal(f.storage.values.get(CAFE_SAVE_KEY),before);assert.equal(f.storage.writes,0);
  }
  f.storage.afterWrite=()=>{assert.deepEqual(f.save.snapshot(),original);assert.equal(JSON.parse(f.storage.values.get(CAFE_SAVE_KEY)!).owned.teapot,1);};
  const saved=await f.save.retry();assert.equal(saved.status,'saved');assert.equal(saved.teapotAwarded,true);assert.equal(saved.state!.cafe.totalServes,3);
  assert.equal(saved.state!.garden.produce.radish,original.garden.produce.radish-1);assert.equal(saved.state!.cafe.nextServeAt,f.now+4*H);
  assert.equal(saved.state!.owned.teapot,1);assert.equal(f.storage.writes,1);assert.equal(f.save.canRetry(),false);
  f.now+=8*H;assert.equal((await f.save.retry()).status,'no-pending');assert.equal(f.storage.writes,1);
  const stale=await f.save.serve(intent(original));assert.equal(stale.status,'stale');assert.equal(stale.teapotAwarded,false);assert.equal(stale.state!.owned.teapot,1);assert.equal(f.storage.writes,1);
});

test('migration failure leaves populated legacy text untouched and exposes no candidate; retry upgrades only once',async()=>{
  const locks=new Locks(),old=createWorkshop(at);old.inventory.scrap=4;old.nodes.scrap.stock=2;old.revision=7;
  const raw=' \n'+JSON.stringify(old,null,2)+'\n',storage=new MemoryStorage(locks,raw),save=new CafeSaveCandidate(storage,locks,()=>at+24*H);
  storage.failures=1;const failed=await save.load();assert.equal(failed.status,'save-failed');assert.equal(failed.state,null);assert.equal(failed.teapotAwarded,false);assert.equal(storage.values.get(CAFE_SAVE_KEY),raw);
  const upgraded=await save.retry();assert.equal(upgraded.status,'ready');assert.equal(upgraded.state!.version,3);assert.equal(upgraded.state!.revision,7);
  assert.equal(upgraded.state!.observedAt,at);assert.deepEqual(upgraded.state!.nodes,old.nodes);assert.deepEqual(upgraded.state!.inventory,old.inventory);
  assert.equal(upgraded.state!.cafe.totalServes,0);assert.equal(storage.writes,1);
  assert.equal((await save.retry()).status,'no-pending');await save.load();assert.equal(storage.writes,1);
});

test('fallback migrations keep the old key and require a successful same-current-key write, including candidate data under the fallback key',async()=>{
  for(const raw of [JSON.stringify(createWorkshop(at)),JSON.stringify(cafeFixture())]){
    const locks=new Locks(),storage=new MemoryStorage(locks,raw,CAFE_LEGACY_KEY),save=new CafeSaveCandidate(storage,locks,()=>at);
    storage.failures=1;assert.equal((await save.load()).status,'save-failed');assert.equal(storage.values.get(CAFE_SAVE_KEY),undefined);assert.equal(storage.values.get(CAFE_LEGACY_KEY),raw);
    const r=await save.retry();assert.equal(r.status,'ready');assert.equal(r.state!.version,3);assert.equal(storage.values.get(CAFE_LEGACY_KEY),raw);
    assert.deepEqual([...storage.values.keys()].sort(),[CAFE_LEGACY_KEY,CAFE_SAVE_KEY].sort());assert.equal(storage.writes,1);
  }
});

test('missing, malformed, unsupported and partial saves are preserved without fallback, starter grants or repair writes',async()=>{
  const bad:any=cafeFixture();delete bad.cafe;
  const corrupt:any=cafeFixture();corrupt.garden.produce.radish++;
  for(const raw of [null,'','null','{bad json','{}',JSON.stringify({...createWorkshop(at),version:99}),JSON.stringify(bad),JSON.stringify(corrupt)]){
    const locks=new Locks(),storage=new MemoryStorage(locks,raw),save=new CafeSaveCandidate(storage,locks,()=>at);
    if(raw!==null)storage.values.set(CAFE_LEGACY_KEY,JSON.stringify(createWorkshop(at)));
    const before=JSON.stringify([...storage.values]);const r=await save.load();assert.equal(r.status,raw===null?'missing':'unreadable');assert.equal(r.state,null);assert.equal(r.canRetry,false);
    assert.equal(JSON.stringify([...storage.values]),before);assert.equal(storage.attempts,0);assert.equal((await save.retry()).status,'no-pending');
  }
});

test('a tasting cannot operate against an uncommitted old schema or silently perform migration as a side effect',async()=>{
  const locks=new Locks(),raw=JSON.stringify(createWorkshop(at)),storage=new MemoryStorage(locks,raw),save=new CafeSaveCandidate(storage,locks,()=>at);
  const r=await save.serve({expectedRevision:0,presentation:'slices'});assert.equal(r.status,'migration-required');assert.equal(r.state,null);assert.equal(storage.values.get(CAFE_SAVE_KEY),raw);assert.equal(storage.writes,0);
  assert.equal((await save.load()).status,'ready');assert.equal(storage.writes,1);
});

test('no lock, refused lock or rejected lock never reads or writes uncoordinated storage; exact retries remain available',async()=>{
  for(const kind of ['missing','denied','rejected']){
    const f=fixture();if(kind==='denied')f.locks.denied=true;if(kind==='rejected')f.locks.reject=true;
    const save=kind==='missing'?new CafeSaveCandidate(f.storage,undefined,()=>at):f.save;
    const r=await save.serve(intent(cafeFixture()));assert.equal(r.status,kind==='denied'?'busy':'lock-unavailable');assert.equal(r.teapotAwarded,false);assert.equal(r.canRetry,true);
    assert.equal(f.storage.reads,0);assert.equal(f.storage.writes,0);
    if(kind!=='missing'){f.locks.denied=false;f.locks.reject=false;assert.equal((await save.retry()).status,'saved');assert.equal(f.storage.writes,1);}
  }
});

test('two windows reload under one writer lock; stale requests and lost confirmations never spend again after the cooldown',async()=>{
  const f=fixture(),other=new CafeSaveCandidate(f.storage,f.locks,()=>f.now);await f.save.load();await other.load();const original=intent(f.save.snapshot()!);
  const [one,two]=await Promise.all([f.save.serve(original),other.serve(original)]);assert.equal(one.status,'saved');assert.ok(['busy','stale'].includes(two.status));
  f.now+=8*H;const next=two.status==='busy'?await other.retry():two;assert.equal(next.status,'stale');assert.equal(next.current,true);assert.equal(next.teapotAwarded,false);assert.equal(f.storage.writes,1);
  const afterCrash=new CafeSaveCandidate(f.storage,f.locks,()=>f.now);
  const replay=await afterCrash.serve(original);assert.equal(replay.status,'stale');assert.equal(replay.state!.cafe.totalServes,1);assert.equal(f.storage.writes,1);
});

test('failed intent cannot be retargeted or rebased by caller mutation, a new action, or a third-window commit',async()=>{
  const f=fixture();await f.save.load();f.storage.failures=1;const request=intent(f.save.snapshot()!);
  assert.equal((await f.save.serve(request)).status,'save-failed');request.expectedRevision=99;
  assert.equal((await f.save.serve({expectedRevision:0,presentation:'formal'})).status,'busy');
  const other=new CafeSaveCandidate(f.storage,f.locks,()=>at);assert.equal((await other.serve({expectedRevision:0,presentation:'soup'})).status,'saved');
  f.now+=8*H;const retry=await f.save.retry();assert.equal(retry.status,'stale');assert.equal(retry.state!.cafe.totalServes,1);assert.equal(f.storage.writes,1);assert.equal(f.save.canRetry(),false);
});

test('read and clock failures keep last-confirmed snapshots detached and retry the same expected revision',async()=>{
  const f=fixture();await f.save.load();const baseline=f.save.snapshot()!;f.storage.readFailure=true;
  const failed=await f.save.serve(intent(baseline));assert.equal(failed.status,'storage-unavailable');assert.equal(failed.current,false);assert.deepEqual(failed.state,baseline);
  failed.state!.garden.produce.radish=0;assert.deepEqual(f.save.snapshot(),baseline);f.storage.readFailure=false;assert.equal((await f.save.retry()).status,'saved');
  const g=fixture();let broken=true;const save=new CafeSaveCandidate(g.storage,g.locks,()=>{if(broken)throw new Error('Injected clock error');return at;});
  await save.load();assert.equal((await save.serve(intent(save.snapshot()!))).status,'clock-unavailable');assert.equal(g.storage.writes,0);broken=false;assert.equal((await save.retry()).status,'saved');assert.equal(g.storage.writes,1);
});

test('invalid, cooldown, exhausted and complete requests make no write and do not create independent public state',async()=>{
  const f=fixture();await f.save.load();for(const raw of [null,{}, {expectedRevision:0,presentation:'free'}, {expectedRevision:0,presentation:'slices',now:at}])assert.equal((await f.save.serve(raw)).status,'invalid');
  assert.equal(f.storage.writes,0);assert.equal((await f.save.serve(intent(f.save.snapshot()!))).status,'saved');const raw=f.storage.values.get(CAFE_SAVE_KEY);
  assert.equal((await f.save.serve(intent(f.save.snapshot()!))).status,'blocked');assert.equal(f.storage.values.get(CAFE_SAVE_KEY),raw);assert.equal(f.storage.writes,1);
  let complete=cafeFixture();for(let i=0;i<12;i++){const r=serveLocalCafeCandidate(complete,intent(complete),at+i*4*H);assert.ok(r.ok);complete=r.state;}
  const g=fixture(complete);g.now=at+100*H;await g.save.load();assert.equal((await g.save.serve(intent(complete))).status,'blocked');assert.equal(g.storage.writes,0);assert.equal(g.save.snapshot()!.cafe.lastServeAt,at+44*H);
  assert.deepEqual([...f.storage.values.keys()],[CAFE_SAVE_KEY]);assert.deepEqual([...g.storage.values.keys()],[CAFE_SAVE_KEY]);
  const empty=fixture(cafeFixture(0));await empty.save.load();assert.equal((await empty.save.serve(intent(empty.save.snapshot()!))).status,'blocked');assert.equal(empty.storage.writes,0);
});

test('pending load retry re-reads another window’s successful migration and tasting instead of overwriting them',async()=>{
  const locks=new Locks(),old=createWorkshop(at);old.garden.produce.radish=1;old.garden.harvested.radish=1;old.garden.planted=1;old.garden.practice=1;old.garden.firstRadishUsed=true;
  const storage=new MemoryStorage(locks,JSON.stringify(old));storage.failures=1;
  const a=new CafeSaveCandidate(storage,locks,()=>at),b=new CafeSaveCandidate(storage,locks,()=>at);
  assert.equal((await a.load()).status,'save-failed');assert.equal((await b.load()).status,'ready');assert.equal((await b.serve({expectedRevision:0,presentation:'slices'})).status,'saved');const bytes=storage.values.get(CAFE_SAVE_KEY);
  const r=await a.retry();assert.equal(r.status,'ready');assert.equal(r.state!.cafe.totalServes,1);assert.equal(storage.writes,2);assert.equal(storage.values.get(CAFE_SAVE_KEY),bytes);
});

test('same-instance pending acquisition is guarded and cancellation cannot release an active operation',async()=>{
  const locks=new Locks(),storage=new MemoryStorage(locks);let proceed!:()=>void;
  const gate=new Promise<void>(resolve=>proceed=resolve);
  const delayed:CafeWriterLocks={async request(name,options,callback){await gate;return locks.request(name,options,callback);}};
  const save=new CafeSaveCandidate(storage,delayed,()=>at),active=save.serve(intent(cafeFixture()));
  assert.equal(save.isBusy(),true);assert.equal(save.canRetry(),false);assert.equal(save.discardRetry(),false);assert.equal(storage.reads,0);
  assert.equal((await save.retry()).canRetry,false);assert.equal((await save.serve({bad:'request'})).canRetry,false);assert.equal((await save.serve({expectedRevision:0,presentation:'formal'})).canRetry,false);
  proceed();assert.equal((await active).status,'saved');assert.equal(storage.writes,1);assert.equal(save.isBusy(),false);
  storage.failures=1;const later=new CafeSaveCandidate(storage,locks,()=>at+4*H);await later.load();assert.equal((await later.serve(intent(later.snapshot()!))).status,'save-failed');assert.equal(later.discardRetry(),true);assert.equal((await later.retry()).status,'no-pending');assert.equal(storage.writes,1);
});

test('storage adapter matches current key and lock contracts while remaining outside live imports',()=>{
  const live=readFileSync('src/ui/workshop.ts','utf8');assert.ok(live.includes("WORKSHOP_SAVE_KEY='"+CAFE_SAVE_KEY+"'"));assert.ok(live.includes("LEGACY_SAVE_KEY='"+CAFE_LEGACY_KEY+"'"));assert.ok(live.includes("locks.request('"+CAFE_WRITER_LOCK+"'"));
  for(const file of ['src/ui/workshop.ts','src/main.ts','server/store.ts','server/http.ts'])assert.doesNotMatch(readFileSync(file,'utf8'),/cafe-save-candidate|CafeSaveCandidate/);
});

// Compile-time native compatibility; not called by Node tests.
function acceptsNativePorts(storage:Storage,locks:LockManager){return new CafeSaveCandidate(storage,locks,Date.now);}
void acceptsNativePorts;
