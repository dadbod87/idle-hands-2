import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {database,migrate} from '../server/db.ts';
import {TownStore,type TownSnapshot} from '../server/live-store.ts';
import {BRIDGE_BUILD_MS} from '../src/game/town-rules.ts';
import {worlds} from '../src/game/world.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
if(target){
  let u:URL;try{u=new URL(target);}catch{throw Error('Opening tests require a valid isolated fixture URL.');}
  const container=process.env.IH2_PG_CONTAINER??'';
  const local=u.port==='55434'&&container==='idle-hands-2-cafe-candidate-pg';
  const ci=process.env.CI==='true'&&u.port==='5432'&&/^[a-f0-9]{12,64}$/.test(container);
  if(!['postgres:','postgresql:'].includes(u.protocol)||!['127.0.0.1','localhost'].includes(u.hostname)||
    u.pathname!=='/ih2_test'||u.search||u.hash||(!local&&!ci)){
    throw Error('Opening tests require the explicit disposable ih2_test; protected55432 is refused.');
  }
}
const samples:Array<Record<string,unknown>>=[];
function record(value:Record<string,unknown>){
  samples.push(value);mkdirSync('test-results/server',{recursive:true});
  writeFileSync('test-results/server/current-settlement.json',JSON.stringify({
    method:'Current live TownStore public methods and real isolated PostgreSQL. Synthetic historical funded projects and application clock; no runtime/migration changes, HTTP interception or normal saved data. One real trigger injects a final opening failure.',samples,
  },null,2)+'\n');
}
async function fixture(work:(f:Awaited<ReturnType<typeof setup>>)=>Promise<void>){
  const f=await setup();try{await work(f);}finally{await f.pool.end();}
}
async function setup(){
  const pool=database(target);let clock=Date.UTC(2026,10,18,12);
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);
  const store=new TownStore(pool,{now:()=>clock});await store.ensurePlayer('aster','Aster');await store.ensurePlayer('bea','Bea');
  const ready=clock+24*3600_000,funded=ready-4*3600_000;
  // Valid historical shared projects, without bypassing the café's monotone-credit trigger.
  await pool.query("update ih2.bridge set contributed=target,phase='building',started_at=$1,ready_at=$2 where id=1",[ready-BRIDGE_BUILD_MS,ready]);
  await pool.query("update ih2.noticeboard set credits=6,phase='installing',started_at=$1,ready_at=$2 where id=1",[ready-24*3600_000,ready]);
  for(let i=0;i<11;i++)await pool.query('update ih2.cafe_project set credits=credits+1,observed_at=$1 where id=1',[funded]);
  await pool.query('update ih2.cafe_project set credits=credits+1,observed_at=$1,funded_at=$1,ready_at=$2 where id=1',[funded,ready]);
  clock=ready-1;
  async function raw(){
    const names=(await pool.query("select tablename from pg_tables where schemaname='ih2' order by tablename")).rows.map(r=>String(r.tablename));
    assert.equal(names.length,17);assert.ok(names.every(n=>/^[a-z_]+$/.test(n)));
    const pairs=names.flatMap(n=>["'"+n+"'",`(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from ih2."${n}" t)`]);
    pairs.push("'$migrations'","(select jsonb_agg(to_jsonb(m) order by version) from ih2_meta.migrations m)");
    const value=(await pool.query('select jsonb_build_object('+pairs.join(',')+') value')).rows[0].value as Record<string,any[]>;
    assert.equal(value.$migrations.length,10);return value;
  }
  const personal=(value:Record<string,any[]>)=>Object.fromEntries(Object.entries(value).filter(([n])=>!['bridge','noticeboard','cafe_project','project_events'].includes(n)));
  const fresh=()=>new TownStore(pool,{now:()=>clock});
  return{pool,store,ready,raw,personal,fresh,setClock:(n:number)=>{clock=n;}};
}
function opened(s:TownSnapshot,ready:number){
  assert.equal(s.bridge.phase,'open');assert.equal(s.bridge.openedAt,ready);assert.equal(s.bridge.readyAt,ready);
  assert.equal(s.noticeboard.phase,'open');assert.equal(s.noticeboard.openedAt,ready);assert.equal(s.noticeboard.readyAt,ready);
  assert.equal(s.cafe.phase,'open');assert.equal(s.cafe.readyAt,ready);
  assert.equal(s.projectJournal.length,1);assert.equal(s.projectJournal[0].effectiveAt,ready);
}

test('current settlement: all three projects open at the exact deadline once across concurrent stores',{skip:!target,timeout:20000},async()=>{
  await fixture(async f=>{
    const before=await f.raw();const early=await f.store.snapshot('aster');
    assert.equal(early.bridge.phase,'building');assert.equal(early.noticeboard.phase,'installing');assert.equal(early.cafe.phase,'opening');
    assert.deepEqual(await f.raw(),before);
    f.setClock(f.ready);const other=f.fresh();
    const views=await Promise.all(Array.from({length:12},(_,i)=>(i%2?other:f.store).snapshot(i%3?'aster':'bea')));
    for(const view of views)opened(view,f.ready);
    const after=await f.raw();assert.deepEqual(f.personal(after),f.personal(before));
    assert.equal(after.project_events.length,1);assert.equal(Number(after.cafe_project[0].opened_at),f.ready);
    record({case:'exact-deadline-concurrency',snapshots:12,independentStores:2,noEarlyOpening:true,allThreeOpenedAtReady:true,oneHistoryEvent:true,allPersonalTablesAnd9MetadataExact:true});
  });
});

test('current settlement: final café write failure rolls back every opening and retries once',{skip:!target,timeout:20000},async()=>{
  await fixture(async f=>{
    f.setClock(f.ready);const before=await f.raw();
    await f.pool.query("create function ih2.test_final_open_failure() returns trigger language plpgsql as $$begin raise exception 'isolated final opening failure';end$$;create trigger test_final_open_failure before update on ih2.cafe_project for each row when (old.opened_at is null and new.opened_at is not null) execute function ih2.test_final_open_failure()");
    try{await assert.rejects(()=>f.store.snapshot('aster'),/isolated final opening failure/);assert.deepEqual(await f.raw(),before);}
    finally{await f.pool.query('drop function ih2.test_final_open_failure() cascade');}
    opened(await f.store.snapshot('aster'),f.ready);const after=await f.raw();
    opened(await f.fresh().snapshot('bea'),f.ready);assert.deepEqual(await f.raw(),after);
    assert.deepEqual(f.personal(after),f.personal(before));assert.equal(after.project_events.length,1);
    record({case:'final-write-rollback',injectedRealPostgresTrigger:true,all17TablesAnd9MetadataExactAfterFailure:true,retryOpensAllThreeOnce:true,noPartialOpeningOrHistory:true});
  });
});

test('current settlement: ordinary command keeps café opening separate and replay does not pay twice',{skip:!target,timeout:20000},async()=>{
  await fixture(async f=>{
    const before=await f.raw();f.setClock(f.ready);
    const command={id:randomUUID(),expectedRevision:0,kind:'gather',resource:'scrap'};
    const position={room:'square' as const,position:worlds.square.stops.find(s=>s.id==='scrap')!.point};
    const result=await f.store.execute('aster',command,position);assert.ok(result.ok,result.message);assert.equal(result.replayed,false);
    const saved=await f.raw();assert.equal(saved.bridge[0].phase,'open');assert.equal(saved.noticeboard[0].phase,'open');
    assert.equal(saved.cafe_project[0].opened_at,null);assert.deepEqual(saved.cafe_project,before.cafe_project);
    const replay=await f.store.execute('aster',command,position);assert.ok(replay.ok&&replay.replayed);assert.deepEqual(await f.raw(),saved);
    assert.equal(saved.command_receipts.length,1);assert.equal(result.snapshot.workshop.revision,1);
    assert.equal(result.snapshot.workshop.inventory.scrap,6);assert.equal(replay.snapshot.workshop.inventory.scrap,6);
    opened(await f.store.snapshot('aster'),f.ready);const after=await f.raw();
    assert.deepEqual(f.personal(after),f.personal(saved));assert.equal(Number(after.cafe_project[0].opened_at),f.ready);
    record({case:'command-separation-and-replay',ordinaryGatherEarnsScrap:6,oneReceipt:true,replayDoesNotPayTwice:true,commandKeepsCafeUnopened:true,snapshotThenOpensCafe:true,unrelatedStateExact:true});
  });
});

test('current settlement: late and backward observations never retime latched openings or stored progress',{skip:!target,timeout:20000},async()=>{
  await fixture(async f=>{
    f.setClock(f.ready+123);opened(await f.store.snapshot('aster'),f.ready);const before=await f.raw();
    assert.equal(Number(before.cafe_project[0].opened_at),f.ready);
    for(const at of [f.ready+30*24*3600_000,f.ready-1,f.ready+456]){
      f.setClock(at);opened(await f.fresh().snapshot('bea'),f.ready);assert.deepEqual(await f.raw(),before);
    }
    record({case:'latched-opening-observations',lateOpeningUsesReadyNotRequestTime:true,freshStores:3,backwardObservationDoesNotCloseOrRetime:true,all17TablesAnd9MetadataExact:true,oneHistoryEvent:true});
  });
});
