import type {Pool} from 'pg';
import {FieldStore} from '../server/field-store.ts';
import {TownStore} from '../server/live-store.ts';
import {SEWING_TABLE,TAILOR_MS} from '../src/game/tailoring.ts';
import {PUMPWORKS_DOOR} from '../src/game/pumpworks-room.ts';
import {FORGE_ORDER_MS} from '../src/game/forge-order.ts';
import {FINISHING_MS} from '../src/game/trade-practice.ts';
import {worlds} from '../src/game/world.ts';

export const TRADE_BROWSER_RESIDENTS=[{id:'trade-willow',name:'Willow'},{id:'trade-linen',name:'Linen'}] as const;

/** Called only after the browser harness verifies and migrates an isolated database. */
export async function prepareTradeBrowserFixture(pool:Pool,store:TownStore,now:number) {
 const [owner,guest]=TRADE_BROWSER_RESIDENTS;
 const first=now-2*3600_000;
 const prior=new TownStore(pool,{now:()=>first});
 const initial=await prior.ensurePlayer(owner.id,owner.name);
 await prior.ensurePlayer(guest.id,guest.name);
 const work={...initial.workshop,inventory:{...initial.workshop.inventory,supplies:2}};
 await pool.query('update ih2.players set workshop=$2 where id=$1',[owner.id,work]);
 const atTable={room:'workshop',position:SEWING_TABLE.point} as const;
 const sew=async (kind:'start'|'collect'|'start-edging',at:number,revision:number)=>{
  const pointInTime=new TownStore(pool,{now:()=>at});
  const result=await pointInTime.execute(owner.id,{id:'qa-'+kind,kind:'tailoring',expectedRevision:revision,action:{kind}},atTable);
  if(!result.ok)throw new Error(result.message);
 };
 await sew('start',first,0);
 await sew('collect',first+TAILOR_MS,1);
 await sew('start-edging',now-FINISHING_MS-60_000,2);
 const field=new FieldStore(pool);
 let record=await field.read(owner.id);
 for(const [action,station,at] of [
  ['issue','locker',first],['start-forge','forge',first],['collect-forge','forge',first+FORGE_ORDER_MS],
  ['start-stamp','forge',now-FINISHING_MS-60_000],
 ] as const){
  const step=await field.apply(owner.id,record,action,station,at);
  if(!step.ok)throw new Error(step.message);
  record=step.record;
 }
 const point=worlds.square.stops.find(stop=>stop.id==='workshop')!.point;
 await store.savePosition(owner.id,{room:'square',position:point});
 await store.savePosition(guest.id,{room:'square',position:PUMPWORKS_DOOR.point});
}
