import assert from 'node:assert/strict';
import {test} from 'node:test';
import {realpathSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,migrate} from '../server/db.ts';
import {TownStore} from '../server/live-store.ts';
import {tailoringFromRow} from '../server/tailoring.ts';
import {EDGING_COST,SEWING_TABLE,TAILOR_MS,tailoringRank,type TailoringAction} from '../src/game/tailoring.ts';

import {FINISHING_MS} from '../src/game/trade-practice.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
const disposable=process.env.IH2_GLASSHOUSE_TEMP_DATA;
if(target){
 const url=new URL(target);
 const ci=url.port==='5432'&&process.env.CI==='true'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
 const local=url.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
 const native=url.port==='56371'&&disposable&&/^\/(?:private\/)?tmp\/ih2-new-db\.[a-zA-Z0-9]+\/data$/.test(disposable);
 assert.ok(url.hostname==='127.0.0.1'&&url.pathname==='/ih2_test'&&!url.search&&!url.hash&&(ci||local||native));
}

test('Connected sewing keeps one paid order, preserves a busy bench, then settles one gold edging order and saves the outfit privately',{skip:!target,timeout:20000},async()=>{
 const pool=database(target);
 let now=Date.UTC(2026,10,25,18);
 const suffix=randomUUID().slice(0,8),owner='sewer-'+suffix,guest='guest-'+suffix;
 const store=new TownStore(pool,{now:()=>now});
 const table={room:'workshop',position:SEWING_TABLE.point} as const;
 const street={room:'square',position:{x:24,y:25}} as const;
 const request=(id:string,action:TailoringAction,expectedRevision:number)=>({id,kind:'tailoring',action,expectedRevision});
 try{
  if(disposable&&new URL(target!).port==='56371'){
   const result=await pool.query("select current_setting('data_directory') as directory, current_database() as name");
   assert.equal(result.rows[0].name,'ih2_test');
   assert.equal(realpathSync(result.rows[0].directory),realpathSync(disposable));
  }
  await migrate(pool);
  const original=await store.ensurePlayer(owner,'Fictional tailor');
  await store.ensurePlayer(guest,'Fictional neighbor');
  const busy={recipe:'bridge-kit',startedAt:now,readyAt:now+12*3600_000};
  const state={...original.workshop,job:busy,inventory:{...original.workshop.inventory,supplies:2}};
  await pool.query('update ih2.players set workshop=$2 where id=$1',[owner,state]);
  assert.equal((await store.execute(owner,request('offsite',{kind:'start'},0),street)).ok,false);
  const originalStart=request('sew-first',{kind:'start'},0);
  const concurrent=await Promise.all([
   store.execute(owner,originalStart,table),
   store.execute(owner,request('sew-second',{kind:'start'},0),table),
  ]);
  assert.equal(concurrent.filter(reply=>reply.ok).length,1);
  const accepted=concurrent.find(reply=>reply.ok)!;
  const exact=concurrent[0].ok?originalStart:request('sew-second',{kind:'start'},0);
  assert.equal((await store.execute(owner,exact,table)).replayed,true);
  assert.equal(accepted.snapshot.workshop.inventory.supplies,1);
  assert.deepEqual(accepted.snapshot.workshop.job,busy);
  assert.equal(accepted.snapshot.tailoring?.readyAt,now+TAILOR_MS);
  assert.equal((await store.snapshot(guest)).tailoring,null);
  const early=await store.execute(owner,request('collect-early',{kind:'collect'},accepted.revision),table);
  assert.equal(early.ok,false);
  now+=TAILOR_MS;
  const collect=request('collect-exact',{kind:'collect'},accepted.revision);
  assert.equal((await store.execute(owner,request('collect-offsite',{kind:'collect'},accepted.revision),street)).ok,false);
  const collected=await store.execute(owner,collect,table);
  assert.equal(collected.ok,true);
  assert.equal((await store.execute(owner,collect,table)).replayed,true);
  assert.equal(collected.snapshot.tailoring?.collectedAt,now);
  const wear=await store.execute(owner,request('wear-cloth',{kind:'wear',color:'indigo'},collected.revision),street);
  assert.equal(wear.ok,true);
  assert.equal(wear.snapshot.tailoring?.worn,'indigo');
  assert.deepEqual(wear.snapshot.workshop.job,busy);
  const pack=request('pack-cloth',{kind:'style',dye:'indigo',wear:false,tie:'wrap'},wear.revision);
  const packed=await store.execute(owner,pack,street);
  assert.equal(packed.ok,true);
  assert.equal((await store.execute(owner,pack,street)).replayed,true);
  assert.equal(packed.snapshot.tailoring?.worn,'none');
  assert.equal(packed.snapshot.tailoring?.dye,'indigo');
  assert.equal(packed.snapshot.tailoring?.tie,'wrap');
  assert.equal((await store.snapshot(guest)).tailoring,null);
  assert.equal(tailoringRank(packed.snapshot.tailoring),1);
  // Rehearse the forward migration over an existing, dyed legacy garment.
  const legacy=await pool.connect();
  try{
   await legacy.query('begin');
   await legacy.query(`alter table ih2.tailored_kerchiefs drop constraint tailored_gold_edging_lifecycle,
    drop column edging_started_at,drop column edging_ready_at,drop column edging_collected_at,drop column gold_edge`);
   await legacy.query(await readFile(new URL('../supabase/migrations/20261125202042_tailored_gold_edging.sql',import.meta.url),'utf8'));
   const after=(await legacy.query('select * from ih2.tailored_kerchiefs where player_id=$1',[owner])).rows[0];
   assert.equal(after.gold_edge,false);
   assert.deepEqual(tailoringFromRow(after),packed.snapshot.tailoring);
  }finally{await legacy.query('rollback');legacy.release();}
  const goldStyle={kind:'style',dye:'indigo',wear:true,tie:'wrap',goldEdge:true} as const;
  assert.equal((await store.execute(owner,request('locked-edge',goldStyle,packed.revision),street)).ok,false);
  const edgeStart=request('edge-start',{kind:'start-edging'},packed.revision);
  assert.equal((await store.execute(owner,request('edge-offsite',{kind:'start-edging'},packed.revision),street)).ok,false);
  await pool.query(`create function ih2.test_gold_edging_receipt_failure() returns trigger language plpgsql as
   $$begin raise exception 'isolated gold edging receipt failure';end$$;
   create trigger test_gold_edging_receipt_failure before insert on ih2.command_receipts
   for each row when (new.command_id='edge-start') execute function ih2.test_gold_edging_receipt_failure()`);
  try{
   await assert.rejects(store.execute(owner,edgeStart,table),/isolated gold edging receipt failure/);
   const after=await store.snapshot(owner);
   assert.equal(after.workshop.inventory.supplies,1);
   assert.equal(after.tailoring?.edging,undefined);
  }finally{await pool.query('drop function ih2.test_gold_edging_receipt_failure() cascade');}
  const edge=await store.execute(owner,edgeStart,table);
  assert.equal(edge.ok,true);
  assert.equal((await store.execute(owner,edgeStart,table)).replayed,true);
  assert.equal(edge.snapshot.workshop.inventory.supplies,1-EDGING_COST);
  assert.equal(edge.snapshot.tailoring?.edging?.readyAt,now+FINISHING_MS);
  assert.deepEqual(edge.snapshot.workshop.job,busy);
  assert.equal(tailoringRank(edge.snapshot.tailoring),1);
  assert.equal((await store.execute(owner,request('second-edge',{kind:'start-edging'},edge.revision),table)).ok,false);
  await assert.rejects(pool.query('update ih2.tailored_kerchiefs set gold_edge=true where player_id=$1',[owner]),
   {code:'23514',constraint:'tailored_gold_edging_lifecycle'});
  now+=FINISHING_MS-1;
  const edgeCollect=request('edge-collect',{kind:'collect-edging'},edge.revision);
  assert.equal((await store.execute(owner,request('edge-early',{kind:'collect-edging'},edge.revision),table)).ok,false);
  now++;
  assert.equal((await store.execute(owner,request('edge-collect-away',{kind:'collect-edging'},edge.revision),street)).ok,false);
  const edged=await store.execute(owner,edgeCollect,table);
  assert.equal(edged.ok,true);
  assert.equal((await store.execute(owner,edgeCollect,table)).replayed,true);
  assert.equal(tailoringRank(edged.snapshot.tailoring),2);
  const style=await store.execute(owner,request('gold-style',goldStyle,edged.revision),street);
  assert.equal(style.ok,true);
  assert.equal(style.snapshot.tailoring?.goldEdge,true);
  assert.equal(style.snapshot.tailoring?.tie,'wrap');
  const putAway=await store.execute(owner,request('pack-edged',{kind:'wear',color:'none'},style.revision),street);
  assert.equal(putAway.snapshot.tailoring?.goldEdge,true);
  const remove=await store.execute(owner,request('remove-edge',{...goldStyle,wear:false,goldEdge:false},putAway.revision),street);
  assert.equal(remove.ok,true);
  assert.equal(remove.snapshot.tailoring?.goldEdge,undefined);
  assert.equal(tailoringRank(remove.snapshot.tailoring),2);
  assert.equal((await store.snapshot(guest)).tailoring,null);
  const restarted=await new TownStore(pool,{now:()=>now}).snapshot(owner);
  assert.deepEqual(restarted.tailoring,remove.snapshot.tailoring);
  assert.deepEqual(restarted.workshop.job,busy);
  assert.equal(restarted.workshop.inventory.supplies,0);
  const sql=await pool.query('select count(*)::int as count from ih2.tailored_kerchiefs where player_id=$1',[owner]);
  assert.equal(sql.rows[0].count,1);
 }finally{await pool.end();}
});
