/** Controlled transaction scheduling, no database/network or real progress.
 * The receipt sentinel stops before projection/commit; PG cases separately
 * prove durable debit/replay behavior with real queries. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {TownStore} from '../server/live-store.ts';
import {tastingFixture} from './helpers/playable-cafe.ts';
const start=Date.UTC(2026,10,18,18),position={room:'square' as const,position:{x:30,y:22}};
async function scheduled(options:{playerClock?:number;projectClock?:number;afterProjectLock?:number}={}){
 let now=start,receipt:any,written:any,projectWrite:any,released=false,rolledBack=false;
 const state=tastingFixture(start,0,1).state;if(options.playerClock!==undefined)state.observedAt=options.playerClock;
 const stop=Error('CONTROLLED_RECEIPT_BOUNDARY');
 const client={release(){released=true;},async query(sql:string,args:unknown[]=[]){
  if(sql==='begin'||sql.startsWith('set local '))return{rows:[]};
  if(sql==='rollback'){rolledBack=true;return{rows:[]};}
  if(sql==='select * from ih2.players where id=$1 for update'){now=options.playerClock??now;return{rows:[{id:'aster',name:'Aster',workshop:state,position,quest_content_version:1}]};}
  if(sql==='select * from ih2.cafe_project where id=1 for update'){
   now=options.afterProjectLock??now;
   return{rows:[{credits:1,observed_at:options.projectClock??start,funded_at:null,ready_at:null,opened_at:null}]};
  }
  if(sql.startsWith('update ih2.cafe_project ')){projectWrite=args;return{rows:[]};}
  if(sql.startsWith('update ih2.players set workshop=')){written=args[1];return{rows:[]};}
  if(sql.startsWith('insert into ih2.command_receipts(')){receipt=args[3];throw stop;}
  if(sql.startsWith('update ih2.bridge ')||sql.startsWith('update ih2.noticeboard ')||sql.startsWith('select payload_hash,result ')||sql.startsWith('select id::text,owner_id,level,placements,workroom_placements,plan_id,yard ')||sql.startsWith('select id::text,level,placements,workroom_placements,plan_id,yard ')||sql.startsWith('select build from ih2.housing_builds '))return{rows:[]};
  throw Error('Unmodelled transaction query: '+sql);
 }};
 const store=new TownStore({connect:async()=>client}as unknown as Pool,{now:()=>now});
 await assert.rejects(()=>store.execute('aster',{id:'clock-schedule',kind:'cafe-serve',expectedRevision:0,presentation:'slices'},position),e=>e===stop);
 assert.ok(released&&rolledBack);return{receipt,written,projectWrite};
}
test('queued cafe action samples current server time after its project lock, without clamping to stored time',async()=>{
 const r=await scheduled({projectClock:start+50,afterProjectLock:start+100});
 assert.equal(r.receipt.ok,true);assert.equal(r.receipt.revision,1);assert.equal(r.written.garden.produce.radish,0);assert.equal(r.written.cafe.lastServeAt,start+100);assert.equal(r.projectWrite[1],start+100);
});
test('real backward clock during cafe lock is refused without a debit',async()=>{
 const r=await scheduled({afterProjectLock:start-1});assert.equal(r.receipt.ok,false);assert.match(r.receipt.message,/clock.*backwards/);assert.equal(r.written,undefined);assert.equal(r.projectWrite,undefined);
});
test('stored cafe time ahead of actual server clock is refused rather than manufactured into a later time',async()=>{
 const r=await scheduled({projectClock:start+200,afterProjectLock:start+100});assert.equal(r.receipt.ok,false);assert.match(r.receipt.message,/clock.*backwards/);assert.equal(r.written,undefined);assert.equal(r.projectWrite,undefined);
});
test('time is sampled after the player row is acquired so a queued transaction can read its current save',async()=>{
 const r=await scheduled({playerClock:start+100,projectClock:start+50});assert.equal(r.receipt.ok,true);assert.equal(r.written.observedAt,start+100);
});
