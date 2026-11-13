import {test} from 'node:test';
import {preCommissionWorkshop} from './legacy-workshop.ts';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {CafeTransactionCandidate,CAFE_CANDIDATE_TARGET,type CafeTransactionResult} from '../server/cafe-transaction-candidate.ts';
import {migrate,localDatabaseUrl} from '../server/db.ts';
import {TownStore} from '../server/store.ts';
import {createWorkshop,loadWorkshop} from '../src/game/workshop.ts';
import {cafeWorkshopSchema,CAFE_RULES} from '../src/game/cafe-candidate.ts';
import {GARDEN_HOUR as H} from '../src/game/garden.ts';

const baseUrl=process.env.IH2_TEST_DATABASE_URL;
const candidateUrl=process.env.IH2_CAFE_TEST_DATABASE_URL??(baseUrl?(()=>{const u=new URL(localDatabaseUrl(baseUrl));u.pathname='/ih2_cafe_test';return u.href;})():undefined);
const start=Date.UTC(2026,10,13,18),point={room:'square',position:{...CAFE_CANDIDATE_TARGET.point}};
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function legacy(stock=12){const s=createWorkshop(start);s.garden.produce.radish=stock;s.garden.harvested.radish=stock;s.garden.planted=stock;s.garden.practice=stock;s.garden.firstRadishUsed=stock>0;assert.equal(loadWorkshop(s,start).recovered,false);return s;}

test('candidate database guards reject protected/remote/override URLs and existing town pools before connecting',async()=>{
 for(const db of ['ih2_preview','ih2_neighborhood_tour','ih2_test','postgres']){
  const pool=new Pool({host:'127.0.0.1',database:db});assert.throws(()=>new CafeTransactionCandidate(pool),/dedicated/);await pool.end();
 }
 const remote=new Pool({host:'example.com',database:'ih2_cafe_test'});assert.throws(()=>new CafeTransactionCandidate(remote),/dedicated/);await remote.end();
 for(const u of ['postgres://ih2@localhost/ih2_preview','postgres://ih2@elsewhere/ih2_cafe_test','postgres://ih2@localhost/ih2_cafe_test?host=elsewhere','postgres://ih2@localhost/ih2_cafe_test#x'])assert.throws(()=>CafeTransactionCandidate.databaseUrl(u));
 assert.equal(new URL(CafeTransactionCandidate.databaseUrl('postgres://ih2@127.0.0.1/ih2_cafe_test')).pathname,'/ih2_cafe_test');
 for(const f of ['src/main.ts','src/ui/workshop.ts','server/http.ts','server/store.ts','server/index.ts'])assert.doesNotMatch(await readFile(f,'utf8'),/cafe-transaction-candidate|CafeTransactionCandidate/);
});

test('isolated PostgreSQL cafe atomic authority and recovery',{skip:!candidateUrl},async t=>{
 const url=CafeTransactionCandidate.databaseUrl(candidateUrl!);assert.equal(new URL(url).pathname,'/ih2_cafe_test');
 const adminUrl=new URL(url);adminUrl.pathname='/ih2_test';const admin=new Pool({connectionString:adminUrl.href,max:1});
 for(const name of ['ih2_cafe_test','ih2_cafe_restore'])if(!(await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount)await admin.query('create database '+name);
 await admin.end();const pool=new Pool({connectionString:url,max:12,connectionTimeoutMillis:5000,statement_timeout:7000});
 let now=start,store:CafeTransactionCandidate;
 const clocks=async()=> (await pool.query('select version,checksum from ih2_meta.migrations order by version')).rows;
 async function add(id:string,stock=12){await pool.query('insert into ih2.players(id,name,workshop,position) values($1,$1,$2,$3)',[id,legacy(stock),point]);}
 async function serve(id='aster',extra:Record<string,unknown>={}){const s=await store.snapshot(id);return store.serve(id,{id:randomUUID(),expectedRevision:s.workshop.revision,kind:'cafe-serve-candidate',presentation:'slices',...extra});}
 async function state(id='aster'){return(await pool.query('select workshop from ih2.players where id=$1',[id])).rows[0].workshop;}
 async function fingerprint(){return(await pool.query("select (select jsonb_agg(to_jsonb(p) order by id) from ih2.players p) as players,(select jsonb_agg(to_jsonb(c) order by player_id,command_id) from ih2.command_receipts c) as receipts,(select jsonb_agg(to_jsonb(p)) from ih2.cafe_candidate_project p) as project")).rows[0];}
 async function fill(){
  for(let i=0;i<6;i++)await add('helper-'+i);
  const base=now;for(let round=0;round<2;round++){now=base+round*4*H;for(let i=0;i<6;i++){const r=await serve('helper-'+i);assert.equal(r.ok,true,r.message);}}
  return(await store.snapshot('aster')).project.readyAt!;
 }
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);now=start;store=new CafeTransactionCandidate(pool,{now:()=>now});await store.install();await add('aster');await add('bea');});
 try{
  await t.test('read-only migration/projection preserves raw legacy, six checksums, jobs, seeds, receipts and does not expose other private state',async()=>{
   const old=legacy();old.inventory={scrap:3,timber:2,supplies:1};old.job={recipe:'bridge-kit',startedAt:start,readyAt:start+12*H};old.receipts=[{id:'old-ordinary',revision:0,message:'Historical ordinary command'}];
   assert.equal(loadWorkshop(old,start).recovered,false);await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',old]);
   const hashes=await clocks(),before=await fingerprint();now+=H;const s=await store.snapshot('aster');assert.equal(s.workshop.version,3);assert.deepEqual(s.workshop.job,old.job);assert.deepEqual(await fingerprint(),before);
   assert.deepEqual(Object.keys(s.public).sort(),['credits','phase','readyAt']);assert.equal('players' in s,false);assert.deepEqual(await state(),old);
   const r=await serve();assert.ok(r.ok,r.message);assert.equal((await state()).version,3);for(const k of ['job','inventory','receipts','stats','skills','sketches','carpentry','commission'])assert.deepEqual(r.snapshot.workshop[k as keyof typeof r.snapshot.workshop],old[k as keyof typeof old],k);
   assert.deepEqual(r.snapshot.workshop.garden.seeds,old.garden.seeds);assert.equal(r.snapshot.workshop.garden.harvested.radish,12);assert.equal(r.snapshot.workshop.garden.produce.radish,11);assert.equal(r.snapshot.workshop.garden.consumed.cafe.radish,1);assert.deepEqual(await clocks(),hashes);assert.equal(hashes.length,6);
  });
  await t.test('exact older tuple migrates on successful serve without resetting garden or ordinary progress',async()=>{
   const old=preCommissionWorkshop(legacy());old.inventory={scrap:2,timber:1,supplies:1};old.job={recipe:'bridge-kit',startedAt:start,readyAt:start+12*H};
   await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',old]);const r=await serve();assert.ok(r.ok,r.message);assert.equal(r.snapshot.workshop.cafe.totalServes,1);assert.equal(r.snapshot.workshop.garden.produce.radish,11);assert.deepEqual(r.snapshot.workshop.job,old.job);assert.deepEqual(r.snapshot.workshop.inventory,old.inventory);assert.equal(r.snapshot.workshop.garden.harvested.radish,12);assert.equal(r.snapshot.workshop.commission.madeCount,0);
  });
  await t.test('strict request, server identity/stored position and bounded clock reject forged costs/times/progress and preserve every private row',async()=>{
   const before=await fingerprint();for(const extra of [{playerId:'bea'},{now:start},{cost:0},{credits:12},{teapotAwarded:true},{kind:'gather'},{id:'not-a-uuid'}])assert.equal((await serve('aster',extra)).ok,false);
   assert.deepEqual(await fingerprint(),before);await assert.rejects(()=>serve('missing'),/Unknown/);
   await pool.query('update ih2.players set position=$2 where id=$1',['aster',{room:'square',position:{x:1,y:1}}]);assert.equal((await serve()).ok,false);assert.equal((await state()).garden.produce.radish,12);
   await pool.query('update ih2.players set position=$2 where id=$1',['aster',{...point,homePlotId:'1'}]);assert.equal((await serve()).ok,false);
   await pool.query('update ih2.players set position=$2 where id=$1',['aster',point]);assert.ok((await serve('bea')).ok);assert.equal((await state()).garden.produce.radish,12);assert.equal((await state('bea')).garden.produce.radish,11);
   for(const bad of [NaN,Infinity,-1,start-.5]){const invalid=new CafeTransactionCandidate(pool,{now:()=>bad});await assert.rejects(()=>invalid.snapshot('aster'));}
   now=start-1;await assert.rejects(()=>serve(),/backwards|older/);assert.equal((await state()).version,2);
  });
  await t.test('same UUID concurrent/reordered/lost reply replays exactly once; changed payload and old ordinary UUID refuse',async()=>{
   const raw={id:randomUUID(),expectedRevision:0,kind:'cafe-serve-candidate',presentation:'soup'};
   const results=await Promise.all([store.serve('aster',raw),store.serve('aster',raw)]);assert.ok(results.every(r=>r.ok));assert.equal(results.filter(r=>r.replayed).length,1);assert.equal((await state()).cafe.totalServes,1);
   const recovered=await new CafeTransactionCandidate(pool,{now:()=>now}).serve('aster',{presentation:raw.presentation,kind:raw.kind,expectedRevision:raw.expectedRevision,id:raw.id});assert.ok(recovered.replayed);assert.equal(recovered.revision,1);assert.equal(recovered.snapshot.project.credits,1);
   const before=await fingerprint();assert.equal((await store.serve('aster',{...raw,presentation:'formal'})).ok,false);assert.deepEqual(await fingerprint(),before);
   const oldId=randomUUID();await pool.query("insert into ih2.command_receipts(player_id,command_id,payload_hash,result) values('aster',$1,$2,$3)",[oldId,'a'.repeat(64),{ok:true,message:'ordinary',revision:0}]);assert.equal((await serve('aster',{id:oldId})).ok,false);
   assert.equal((await pool.query("select count(*)::int as n from ih2.command_receipts where player_id='aster'")).rows[0].n,2);
  });
  await t.test('same revision/different UUID serializes; stale and failed receipts are stable without migrating or spending',async()=>{
   const body={expectedRevision:0,kind:'cafe-serve-candidate',presentation:'slices'};
   const r=await Promise.all([store.serve('aster',{...body,id:randomUUID()}),store.serve('aster',{...body,id:randomUUID()})]);assert.equal(r.filter(x=>x.ok).length,1);assert.equal((await state()).garden.produce.radish,11);
   const fail={id:randomUUID(),expectedRevision:0,kind:'cafe-serve-candidate',presentation:'slices'};const first=await store.serve('bea',{...fail,id:randomUUID(),expectedRevision:1});assert.equal(first.ok,false);assert.equal((await state('bea')).version,2);
   const zero=legacy(0);await pool.query('update ih2.players set workshop=$2 where id=$1',['bea',zero]);const missing=await store.serve('bea',fail);assert.equal(missing.ok,false);await pool.query('update ih2.players set workshop=$2 where id=$1',['bea',legacy()]);const retry=await store.serve('bea',fail);assert.ok(retry.replayed);assert.equal(retry.ok,false);assert.equal((await state('bea')).garden.produce.radish,12);assert.equal((await state('bea')).version,2);
  });
  await t.test('exact four-hour cooldown, third tasting grants once, late personal progress remains useful after funding and no useless charge',async()=>{
   assert.ok((await serve()).ok);now=start+4*H-1;assert.equal((await serve()).ok,false);now++;assert.ok((await serve()).ok);now+=4*H;
   const third=await serve();assert.ok(third.ok);assert.ok(third.teapotAwarded);assert.equal(third.snapshot.workshop.owned.teapot,1);
   // Fill with real candidate transactions, not a fabricated shared counter.
   for(let i=0;i<3;i++){await add('fund-'+i);for(let j=0;j<3;j++){now+=4*H;assert.ok((await serve('fund-'+i)).ok);}}
   assert.equal((await store.snapshot('aster')).project.credits,12);const before=await state();const useless=await serve();assert.equal(useless.ok,false);assert.deepEqual(await state(),before);
   now=(await store.snapshot('aster')).project.readyAt!;await store.settleOpening();let late:CafeTransactionResult;for(let i=0;i<3;i++){late=await serve('bea');assert.ok(late.ok);assert.equal(late.publicChanged,false);now+=4*H;}assert.equal(late!.snapshot.workshop.owned.teapot,1);assert.equal(late!.snapshot.workshop.garden.produce.radish,9);assert.equal(late!.snapshot.project.credits,12);
   assert.equal((await serve('bea')).ok,false);assert.equal((await state('bea')).owned.teapot,1);
  });
  await t.test('simultaneous final public credit and third rewards preserve both people and one fixed deadline',async()=>{
   for(let i=0;i<5;i++){await add('race-'+i);assert.ok((await serve('race-'+i)).ok);}
   now+=4*H;for(let i=0;i<4;i++)assert.ok((await serve('race-'+i)).ok); //9
   now+=4*H;for(let i=0;i<2;i++)assert.ok((await serve('race-'+i)).ok); //11, two rewarded
   const pair=await Promise.all([serve('race-2'),serve('race-3')]);assert.ok(pair.every(r=>r.ok&&r.teapotAwarded));assert.equal(pair.filter(r=>r.publicChanged).length,1);
   const p=(await store.snapshot('aster')).project;assert.equal(p.credits,12);assert.equal(p.fundedAt,now);assert.equal(p.readyAt,now+4*H);
   for(const id of ['race-2','race-3']){const s=await state(id);assert.equal(s.cafe.totalServes,3);assert.equal(s.owned.teapot,1);assert.equal(s.garden.produce.radish,9);}
   now+=8*H;const before=await state('race-0');assert.equal((await serve('race-0')).ok,false);assert.deepEqual(await state('race-0'),before);assert.equal((await store.snapshot('aster')).project.readyAt,p.readyAt);
  });
  await t.test('two personally-complete residents race for the last credit: exactly one pays',async()=>{
   for(const id of ['aster','bea'])for(let i=0;i<3;i++){now+=4*H;assert.ok((await serve(id)).ok);}
   for(let i=0;i<5;i++){await add('last-'+i);assert.ok((await serve('last-'+i)).ok);}
   now+=4*H;const r=await Promise.all([serve('aster'),serve('bea')]);assert.equal(r.filter(x=>x.ok).length,1);assert.equal(r.filter(x=>x.teapotAwarded).length,0);
   assert.equal((await state()).garden.produce.radish+(await state('bea')).garden.produce.radish,17);assert.equal((await store.snapshot('aster')).project.credits,12);
  });
  await t.test('failure after private/project writes rolls back migration, debit, credit, reward and receipt; original request retries once',async()=>{
   const raw={id:randomUUID(),expectedRevision:0,kind:'cafe-serve-candidate',presentation:'formal'};const before=await fingerprint();
   await pool.query("create function ih2.fail_cafe_receipt() returns trigger language plpgsql as $$ begin raise exception 'isolated cafe receipt failure'; end $$;create trigger fail_cafe_receipt before insert on ih2.command_receipts for each row execute function ih2.fail_cafe_receipt()");
   await assert.rejects(()=>store.serve('aster',raw),/isolated cafe receipt/);assert.deepEqual(await fingerprint(),before);assert.equal((await state()).version,2);
   await pool.query('drop function ih2.fail_cafe_receipt() cascade');assert.ok((await store.serve('aster',raw)).ok);assert.ok((await store.serve('aster',raw)).replayed);
   now+=4*H;assert.ok((await serve()).ok);now+=4*H;const third={...raw,id:randomUUID(),expectedRevision:2};const prior=await fingerprint();
   await pool.query("create function ih2.fail_cafe_project() returns trigger language plpgsql as $$ begin raise exception 'isolated cafe project failure'; end $$;create trigger fail_cafe_project before update on ih2.cafe_candidate_project for each row execute function ih2.fail_cafe_project()");
   await assert.rejects(()=>store.serve('aster',third),/isolated cafe project/);assert.deepEqual(await fingerprint(),prior);assert.equal((await state()).owned.teapot,0);await pool.query('drop function ih2.fail_cafe_project() cascade');assert.ok((await store.serve('aster',third)).teapotAwarded);
  });
  await t.test('read-only snapshots do not open or settle jobs; explicit concurrent phase-only settlement latches exact deadline once',async()=>{
   const ready=await fill();now=ready-1;const before=await fingerprint();assert.equal((await store.snapshot('aster')).public.phase,'opening');assert.deepEqual(await fingerprint(),before);assert.equal((await store.settleOpening()).changed,false);assert.deepEqual(await fingerprint(),before);
   now=ready;const raw=await fingerprint();const read=await store.snapshot('aster');assert.equal(read.public.phase,'opening');assert.equal(read.project.openedAt,null);assert.deepEqual(await fingerprint(),raw);
   const r=await Promise.all([store.settleOpening(),store.settleOpening(),serve('aster')]);assert.equal(r.filter(x=>'changed' in x&&x.changed).length,1);assert.ok('ok' in r[2]&&r[2].ok);assert.equal((await store.snapshot('aster')).project.openedAt,ready);
   const fixed=await store.snapshot('aster');now+=30*24*H;store=new CafeTransactionCandidate(pool,{now:()=>now});const later=await store.snapshot('aster');assert.equal(later.public.phase,'open');assert.equal(later.project.openedAt,ready);assert.equal(later.project.readyAt,ready);assert.deepEqual(later.workshop,fixed.workshop);assert.equal((await store.settleOpening()).changed,false);
   now=ready-1;await assert.rejects(()=>store.settleOpening(),/backwards/);await assert.rejects(()=>store.snapshot('aster'),/backwards|older/);
  });
  await t.test('SQL rejects invalid/null/rewound/refunded lifecycle and grants no public access or elevated function',async()=>{
   for(const sql of ['credits=13','credits=12','credits=1, funded_at=1','observed_at=-1'])await assert.rejects(()=>pool.query('update ih2.cafe_candidate_project set '+sql+' where id=1'));
   const ready=await fill();now=ready;await store.settleOpening();for(const sql of ['credits=11','funded_at=funded_at+1, ready_at=ready_at+1','opened_at=null','ready_at=null','observed_at=observed_at-1'])await assert.rejects(()=>pool.query('update ih2.cafe_candidate_project set '+sql+' where id=1'));
   const row=(await pool.query("select relrowsecurity,not exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where a.grantee=0) as private from pg_class where oid='ih2.cafe_candidate_project'::regclass")).rows[0];assert.ok(row.relrowsecurity&&row.private);
   assert.equal((await pool.query("select prosecdef from pg_proc where oid='ih2.guard_cafe_candidate()'::regprocedure")).rows[0].prosecdef,false);
  });
  await t.test('corrupt/partial/unsupported roots preserve exact raw JSON, project and receipts; existing live store refuses candidate tuple',async()=>{
   const original=legacy();for(const bad of [{...original,version:99},{...original,cafe:{}},{...original,version:3},(()=>{const s=legacy();delete (s as unknown as Record<string,unknown>).sketches;return s;})()]){
    await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',bad]);const before=await fingerprint();await assert.rejects(()=>store.serve('aster',{id:randomUUID(),expectedRevision:0,kind:'cafe-serve-candidate',presentation:'slices'}),/exact supported/);assert.deepEqual(await fingerprint(),before);
   }
   await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',original]);assert.ok((await serve()).ok);assert.ok(cafeWorkshopSchema.safeParse(await state()).success);await assert.rejects(()=>new TownStore(pool,{now:()=>now}).snapshot('aster'),/validation/);
  });
  await t.test('populated candidate dump/restore retains private sink, teapot, queued job, six checksums, fixed project and UUID replay',async()=>{
   const container=process.env.IH2_CAFE_PG_CONTAINER??process.env.IH2_PG_CONTAINER??'idle-hands-2-pg';assert.match(container,/^[a-zA-Z0-9_-]+$/);
   const old=legacy();old.job={recipe:'planter',startedAt:start,readyAt:start+5000};assert.equal(loadWorkshop(old,start).recovered,false);await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',old]);
   let original:Record<string,unknown>={};for(let i=0;i<3;i++){now=start+i*4*H;original={id:randomUUID(),expectedRevision:i,kind:'cafe-serve-candidate',presentation:'slices'};assert.ok((await store.serve('aster',original)).ok);}
   const ready=await fill();now=ready;await store.settleOpening();const before=await store.snapshot('aster'),checksums=await clocks();
   const restoredUrl=new URL(url);restoredUrl.pathname='/ih2_cafe_restore';const restore=new Pool({connectionString:restoredUrl.href,max:2});
   try{
    await restore.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
    const dump=spawnSync('docker',['exec',container,'pg_dump','-U','ih2','-d','ih2_cafe_test','--schema=ih2','--schema=ih2_meta','--no-owner','--no-acl'],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(dump.status,0,dump.stderr);
    const imported=spawnSync('docker',['exec','-i',container,'psql','-v','ON_ERROR_STOP=1','-U','ih2','-d','ih2_cafe_restore'],{encoding:'utf8',input:dump.stdout,maxBuffer:8*1024*1024});assert.equal(imported.status,0,imported.stderr);
    const recovered=new CafeTransactionCandidate(restore,{now:()=>now});assert.deepEqual(await recovered.snapshot('aster'),before);const replay=await recovered.serve('aster',original);assert.ok(replay.replayed&&replay.ok&&replay.teapotAwarded);assert.equal(replay.snapshot.workshop.garden.consumed.cafe.radish,3);assert.equal(replay.snapshot.workshop.owned.teapot,1);assert.deepEqual(replay.snapshot.workshop.job,old.job);
    assert.deepEqual((await restore.query('select version,checksum from ih2_meta.migrations order by version')).rows,checksums);
    await mkdir('test-results/server',{recursive:true});await writeFile('test-results/server/cafe-candidate.json',JSON.stringify({classification:'Isolated candidate DB only; conserved synthetic harvested stock and declared server clocks; no live API/counter/auth registration or real data',database:'ih2_cafe_test',restoredDatabase:'ih2_cafe_restore',realPostgresDumpRestore:true,storeReconnect:true,sixChecksumsPreserved:checksums.length===6,queuedJobUnchanged:true,privateSinkTeapotUUIDReplayPreserved:true,fixedOpeningDeadline:ready,projectFingerprint:digest(before.project),rules:CAFE_RULES,candidateTargetGeometry:CAFE_CANDIDATE_TARGET,limits:'Target is synthetic spawn-point binding, not actual cafe counter reachability. Complete all-home teapot maps/protocol/cache/UI still later integration.'},null,2)+'\n');
   }finally{await restore.end();}
  });
 }finally{await pool.end();}
});
