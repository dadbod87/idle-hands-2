import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {database,migrate} from '../server/db.ts';
import {TownStore,type TownSnapshot} from '../server/live-store.ts';
import {TownStore as HistoricalTownStore} from '../server/store.ts';
import {populateNeighborhoodFixture,earnedHomeWorkshop} from '../tools/neighborhood-home-fixture.ts';
import {acceptedSnapshot120} from './helpers/accepted-snapshot-120.ts';
import {richSnapshotFixture,PRIVATE_PEER_RUN} from './helpers/snapshot-fixture.ts';
import {createTownServer} from '../server/http.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {NEIGHBOR_ROSTER} from '../tools/neighborhood-home-fixture.ts';
import {mkdirSync,writeFileSync} from 'node:fs';

const url=process.env.IH2_TEST_DATABASE_URL;
if(url){const u=new URL(url);if(u.pathname!=='/ih2_test'||u.port==='55432')throw Error('Snapshot tests require isolated ih2_test and refuse protected55432.');}
type Reader={readSnapshot:(client:PoolClient,id:string,now:number)=>Promise<TownSnapshot>};
async function counted<T>(client:PoolClient,read:()=>Promise<T>){
 const original=client.query,query=original.bind(client) as (...args:any[])=>any;let queries=0;
 (client as any).query=(...args:any[])=>{queries++;return query(...args);};
 try{return{value:await read(),queries};}finally{client.query=original;}
}

test('coherent snapshot projection preserves the accepted reader and authoritative data',{skip:!url,timeout:120000},async t=>{
 const pool=database(url);let clock=Date.UTC(2026,10,17,18);
 const store=new TownStore(pool,{now:()=>clock}),reader=store as unknown as Reader;
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);
  const historical=new HistoricalTownStore(pool,{now:()=>clock});
  await populateNeighborhoodFixture(pool,historical,url!,clock);
  // A26th historical owner uses the same pure earning and real housing commands
  // as the existing25-home fixture. No practice or real-player data is used.
  const owner='neighbor-26',earned=earnedHomeWorkshop(36,clock),position={room:'square' as const,position:{x:30,y:29}};
  await historical.ensurePlayer(owner,'Teo · test neighbor');await pool.query('update ih2.players set workshop=$2 where id=$1',[owner,earned.state]);
  let result=await historical.execute(owner,{kind:'claim-plot',id:'snapshot-claim',expectedRevision:earned.state.revision},position);assert.ok(result.ok,result.message);
  result=await historical.execute(owner,{kind:'upgrade-plot',id:'snapshot-expand',plotId:result.snapshot.plot!.id,expectedRevision:result.revision},position);assert.ok(result.ok,result.message);
  result=await historical.execute(owner,{kind:'edit-plot',id:'snapshot-place',plotId:result.snapshot.plot!.id,action:'place',slot:'north-west',prop:'planter',expectedRevision:result.revision},position);assert.ok(result.ok,result.message);
  assert.equal(result.snapshot.plot!.id,'26');assert.equal(result.snapshot.workshop.bridgeKits,0);

  async function pair(id:string,now=clock){
   const client=await pool.connect();
   try{
    await client.query('begin isolation level repeatable read read only');
    const before=await counted(client,()=>acceptedSnapshot120(client,id,now));
    const after=await counted(client,()=>reader.readSnapshot(client,id,now));
    assert.equal(before.queries,15);assert.equal(after.queries,1);
    const {orchard,headwear,...unchanged}=after.value;
    assert.equal(orchard,null);
    assert.deepEqual(headwear,{owned:before.value.trail.pennantOwned,worn:null});
    assert.deepEqual(unchanged,before.value);return after.value;
   }finally{await client.query('rollback');client.release();}
  }
  await t.test('one read exactly preserves defaults and numeric26-home order for owner and visitor',async()=>{
   for(const id of ['town-visitor','neighbor-01',owner]){
    const snapshot=await pair(id);assert.equal(snapshot.plots.length,26);
    assert.deepEqual(snapshot.plots.map(p=>p.id),Array.from({length:26},(_,i)=>String(i+1)));
    assert.equal(snapshot.housing.nextPlotId,'27');assert.equal('housing_sites'in snapshot,false);
    assert.equal(snapshot.housing.build,null);assert.equal(snapshot.housing.quote,null);
    assert.equal('workshop'in snapshot.plots[0],false);
   }
  });
  await t.test('unknown bound identity refuses rather than returning another resident',async()=>{
   const client=await pool.connect();
   try{
    await client.query('begin isolation level repeatable read read only');
    for(const read of [()=>acceptedSnapshot120(client,"missing' OR true --",clock),()=>reader.readSnapshot(client,"missing' OR true --",clock)])await assert.rejects(read,/Unknown synthetic player/);
   }finally{await client.query('rollback');client.release();}
  });
  const rich=await richSnapshotFixture(pool,url!,clock);
  await t.test('rich private progress and public projections retain exact clocks, privacy and construction boundaries',async()=>{
   for(const id of [owner,'neighbor-02','neighbor-03','neighbor-04','town-visitor',rich.newcomer]){
    for(const now of [clock,rich.newBuild.readyAt-1,rich.newBuild.readyAt,rich.newBuild.readyAt+1]){
     const snapshot=await pair(id,now);
     assert.equal(snapshot.housing.nextPlotId,'28');
     assert.equal(snapshot.housingSites.length,2);
     assert.equal(snapshot.housingSites.find(p=>p.plotId==='27')!.phase,now<rich.newBuild.readyAt?'building':'ready');
     if(id!=='neighbor-02')assert.equal(JSON.stringify(snapshot).includes(PRIVATE_PEER_RUN),false);
     if(id!==owner)assert.equal(snapshot.housing.quote?.id===rich.quote.id,false);
     if(id===owner){
      assert.equal(snapshot.housing.quote!.id,rich.quote.id);assert.deepEqual(snapshot.outing,rich.outing);
      assert.equal(snapshot.quest.awarded.length,4);assert.equal(snapshot.trail.stamps.length,3);
      assert.equal(snapshot.plot!.pennantOwned,true);assert.equal(snapshot.lesson.redeemed,true);
      assert.equal(snapshot.workshop.job?.recipe,rich.paid.workshop.job?.recipe);
      assert.equal(snapshot.cafe.phase,'open');
     }
     assert.equal(snapshot.commissionTown.styles.some(p=>p.ownerId==='neighbor-02'),false);
     assert.equal(snapshot.commissionTown.styles.some(p=>p.ownerId==='neighbor-03'),true);
     assert.equal(snapshot.plots.find(p=>p.ownerId==='neighbor-03')!.letterboxMotif,null);
     assert.equal(snapshot.commissionTown.styles.some(p=>p.ownerId==='neighbor-04'),false);
     assert.notEqual(snapshot.plots.find(p=>p.ownerId==='neighbor-04')!.letterboxMotif,null);
    }
   }
  });
  await t.test('season filtering changes exactly at Friday16Pacific and preserves tied-score order',async()=>{
   const boundary=Date.UTC(2026,10,14,0);
   const before=await pair(owner,boundary-1),after=await pair(owner,boundary);
   assert.equal(before.seasonKey,'2026-11-06');assert.deepEqual(before.scores,[]);
   assert.equal(after.seasonKey,'2026-11-13');
   assert.deepEqual(after.scores.map(p=>[p.playerId,p.points]),[['neighbor-02',11],[owner,11],['town-visitor',7]]);
  });
  await t.test('stale room canonicalization and stored-data refusals do not replace any row',async()=>{
   const client=await pool.connect();
   const tables=(await client.query("select tablename from pg_tables where schemaname='ih2' order by tablename")).rows.map(r=>r.tablename as string);
   const capture=async()=>Promise.all(tables.map(async name=>{
    assert.match(name,/^[a-z_]+$/);
    return(await client.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from ih2.${name} t`)).rows[0].rows;
   }));
   try{
    await client.query('begin');
    const original=await capture();
    async function scenario(setup:()=>Promise<unknown>,check:(a:TownSnapshot)=>void,refusal?:RegExp){
     await client.query('savepoint projection_fixture');
     try{
      await setup();const prepared=await capture();
      for(const read of [()=>acceptedSnapshot120(client,owner,clock),()=>reader.readSnapshot(client,owner,clock)]){
       if(refusal)await assert.rejects(read,refusal);else check(await read());
      }
      assert.deepEqual(await capture(),prepared);
     }finally{await client.query('rollback to savepoint projection_fixture');}
     assert.deepEqual(await capture(),original);
    }
    await scenario(()=>client.query('update ih2.players set position=$2 where id=$1',[owner,{room:'home',homePlotId:'26',position:{x:9,y:11}}]),s=>assert.equal(s.position.room,'home-expanded'));
    await scenario(()=>client.query('update ih2.players set position=$2 where id=$1',[owner,{room:'home',homePlotId:'999',position:{x:9,y:11}}]),s=>assert.deepEqual(s.position,{room:'square',position:{x:30,y:35.5}}));
    await scenario(()=>client.query("update ih2.players set workshop='{}'::jsonb where id=$1",[owner]),()=>{},/Stored workshop failed validation/);
    await scenario(()=>client.query("update ih2.outings set state='{\"version\":1}'::jsonb where player_id=$1",[owner]),()=>{},/Invalid input/);
    await scenario(()=>client.query("update ih2.plots set plan_id='unknown-plan' where owner_id=$1",[owner]),()=>{},/Stored home layout failed validation/);
    await scenario(()=>client.query("update ih2.plots set placements=jsonb_set(placements,'{north-middle}','\"letterbox\"'::jsonb) where owner_id=$1",[owner]),()=>{},/Stored furniture allocation failed validation/);
    // Housing history permits JSON false at storage level. Preserve the accepted
    // nullish semantics: do not silently coerce a stored false quote to null.
    await scenario(()=>client.query("insert into ih2.housing_quotes(id,owner_id,quote) values('12100000-0000-4000-8000-000000000099',$1,'false'::jsonb)",[owner]),s=>assert.equal(s.housing.quote,false));
   }finally{await client.query('rollback');client.release();}
  });
  await t.test('concurrent publication and placement changes remain one coherent generation',async()=>{
   const peer='neighbor-04',writer=await pool.connect();let generations=0;
   async function publish(){
    for(let i=0;i<24;i++){
     const motif=i%2?'sun':'leaf';
     await writer.query('begin');
     try{
      await writer.query("update ih2.players set name=$2,workshop=jsonb_set(jsonb_set(workshop,'{commission,motif}',to_jsonb($3::text)),'{commission,published}','true'::jsonb) where id=$1",[peer,'Generation '+motif,motif]);
      await writer.query("update ih2.plots set placements=jsonb_set(placements,'{north-middle}','\"letterbox\"'::jsonb) where owner_id=$1",[peer]);
      await writer.query('commit');generations++;
     }catch(e){await writer.query('rollback');throw e;}
    }
   }
   // Establish a known generation before readers start; both field-equivalence
   // and the normal public snapshot transaction are exercised during writes.
   await writer.query("update ih2.players set name='Generation leaf',workshop=jsonb_set(jsonb_set(workshop,'{commission,motif}','\"leaf\"'::jsonb),'{commission,published}','true'::jsonb) where id=$1",[peer]);
   const inspect=(s:TownSnapshot)=>{
    const plot=s.plots.find(p=>p.ownerId===peer)!,style=s.commissionTown.styles.find(p=>p.ownerId===peer)!;
    assert.equal(plot.ownerName,'Generation '+plot.letterboxMotif);assert.equal(style.motif,plot.letterboxMotif);assert.equal(style.ownerName,plot.ownerName);
    assert.equal(JSON.stringify(s).includes(PRIVATE_PEER_RUN),false);
   };
   try{
    await Promise.all([publish(),(async()=>{for(let i=0;i<16;i++){inspect(await pair('town-visitor'));inspect(await store.snapshot('town-visitor'));}})()]);
    assert.equal(generations,24);
   }finally{writer.release();}
  });
  await t.test('20authenticated HTTP clients receive rich26-home snapshots within the unchanged500ms budget',async()=>{
   const app=createTownServer({pool,secret:'isolated-snapshot-batch-proof-key-121',now:()=>clock,fixtureResidents:NEIGHBOR_ROSTER,port:0});
   try{
    const base='http://127.0.0.1:'+await app.listen();
    const cookies=await Promise.all(NEIGHBOR_ROSTER.filter(p=>p.id.startsWith('neighbor-')).slice(0,20).map(async p=>{
     const r=await fetch(base+'/api/town/login',{method:'POST',headers:{'X-IH2-Schema':TOWN_SCHEMA,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({fixtureId:p.id}),signal:AbortSignal.timeout(5000)});
     assert.equal(r.status,200);await r.arrayBuffer();return r.headers.get('set-cookie')!.split(';')[0];
    }));assert.equal(cookies.length,20);
    const samples=await Promise.all(cookies.map(async cookie=>{
     const start=performance.now(),r=await fetch(base+'/api/town/snapshot',{headers:{'X-IH2-Schema':TOWN_SCHEMA,Cookie:cookie},signal:AbortSignal.timeout(5000)}),data=await r.json();
     assert.equal(r.status,200);assert.equal(data.snapshot.plots.length,26);assert.equal(data.snapshot.housingSites.length,2);
     return performance.now()-start;
    }));samples.sort((a,b)=>a-b);
    assert.ok(samples[18]<500,'Rich26-home snapshot p95 '+samples[18]+'ms must remain below500ms');
    assert.equal(app.metrics.positionCheckpoints,0);assert.equal(app.metrics.movementAccepted,0);
    mkdirSync('test-results/server',{recursive:true});writeFileSync('test-results/server/snapshot-scope.json',JSON.stringify({classification:rich.disclosure,transport:'20concurrent authenticated loopback HTTP snapshot requests; separate unchanged25-home HTTP/SSE and ordinary command gates remain required. Not cloud/WAN/physical-device capacity.',clients:20,publicHomes:26,pendingBuildings:2,snapshotP95Ms:samples[18],samplesMs:samples,positionCheckpoints:0,movementWrites:0},null,2)+'\n');
   }finally{await app.close();}
  });
 }finally{await pool.end();}
});
