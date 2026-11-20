import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool, PoolClient } from 'pg';
import { TownStore, type TownPosition, type TownSnapshot } from '../server/live-store.ts';
import type { SnapshotRows } from '../server/snapshot-rows.ts';
import { createWorkshop } from '../src/game/live-workshop.ts';
import { emptyWorkroom } from '../src/game/live-home-layout.ts';
import { emptyYard } from '../src/design/housing-contract.ts';

test('empty home records keep their exact shape and carry no transport capability', async () => {
 const now=Date.UTC(2026,10,20,8),id='local-review';
 const workshop=createWorkshop(now);
 const inside:TownPosition={room:'home',homePlotId:'1',position:{x:9,y:11}};
 const outside:TownPosition={room:'square',position:{x:30,y:35.5}};
 const home:SnapshotRows['plots'][number]={
  id:'1',owner_id:id,name:'Rowan',level:1,placements:workshop.placements,
  workroom_placements:emptyWorkroom(),plan_id:null,yard:emptyYard(),
  housing_revision:0,pennant_owned:false,letterbox_motif:null,keepsake:null,
 };
 const row:SnapshotRows={
  player:{id,name:'Rowan',workshop,position:inside,quest_content_version:1,orchard:null},
  plots:[home],
  bridge:{contributed:0,target:3,phase:'collecting',grandfathered:false,started_at:null,
   ready_at:null,opened_at:null,welcome_credits:0,notice_credits:0,notice_phase:'collecting',
   notice_started:null,notice_ready:null,notice_opened:null},
  display_rows:[],awards:[],lesson:null,stamps:[],project_events:[],scores:[],
  cafe:{credits:0,observed_at:now,funded_at:null,ready_at:null,opened_at:null},
  housing_sites:[],housing:{build:null,quote:null,nextPlotId:'2'},outing:null,
 };
 let queries=0;
 const client={query:async (sql:string)=>{
  assert.match(sql,/coherent-town-snapshot/);
  queries++;
  return {rows:[row]};
 }} as unknown as PoolClient;
 const store=new TownStore({} as Pool,{now:()=>now}) as unknown as {
  readSnapshot(client:PoolClient,id:string,now:number,confirmed?:()=>TownPosition):Promise<TownSnapshot>;
 };
 const read=(confirmed?:()=>TownPosition)=>store.readSnapshot(client,id,now,confirmed);
 const emptyOutside=await read(()=>outside),emptyInside=await read();
 assert.deepEqual(emptyInside,{...emptyOutside,position:inside});
 assert.deepEqual(Object.keys(emptyInside).sort(),[
  'bridge','cafe','commissionTown','gardenTown','housing','housingSites','lesson','lessonQuote',
  'name','noticeboard','orchard','outing','playerId','plot','plots','position','projectJournal',
  'quest','scores','seasonKey','serverTime','trail','workshop',
 ].sort());
 assert.ok(emptyInside.plot);
 assert.equal(Object.hasOwn(emptyInside.plot,'keepsake'),false);

 home.keepsake='naturalist';
 assert.deepEqual(await read(()=>outside),emptyOutside);
 const displayed=await read();
 assert.deepEqual(displayed.plot,{...emptyInside.plot,keepsake:'naturalist'});
 assert.deepEqual(displayed.plots,[displayed.plot]);
 assert.equal(queries,4);
});
