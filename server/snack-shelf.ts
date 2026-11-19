import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {newOrchard,orchardAction,type OrchardPantry} from '../src/game/orchard.ts';
import {SNACK_OFFER_MS,snackActionSchema,transferSnack,type SnackAction,type SnackParcel,type SnackShelf} from '../src/game/snack-shelf.ts';
import {clearSegment,worlds} from '../src/game/world.ts';
import type {TownPosition} from './live-store.ts';

const residentId = z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
export const snackCommandSchema = z.object({
 id:residentId,expectedPlayerId:residentId,expectedRevision:z.number().int().min(0).max(1_000_000),
 kind:z.literal('snack-parcel'),action:snackActionSchema,
}).strict();
type HeldParcel = {id:string;placed_at:string;expires_at:string;resolved_at:string|null;state:SnackParcel['state']};
type Result = {ok:true;message:string;pantry?:OrchardPantry}|{ok:false;message:string};
const location = worlds.square.stops.find(stop=>stop.id==='cafe')!.point;

export function atParcelShelf(position:TownPosition) {
 return position.room === 'square' && Math.hypot(position.position.x-location.x,position.position.y-location.y)<=1.4 &&
  clearSegment('square',position.position,location);
}

export async function lockSnackParcel(db:PoolClient, actorId:string, action:Extract<SnackAction,{parcelId:string}>) {
 const column=action.kind==='reclaim'?'sender_id':'recipient_id';
 const rows=await db.query<HeldParcel>(
  'select id, placed_at, expires_at, resolved_at, state from ih2.snack_parcels where id=$1 and '+column+'=$2 for update',
  [action.parcelId,actorId]);
 return rows.rows[0]??null;
}

export async function snackSlotHeld(db:PoolClient, actorId:string) {
 const rows=await db.query(
  "select id from ih2.snack_parcels where sender_id=$1 and state in ('waiting','declined')",
  [actorId]);
 return rows.rowCount===1;
}

/** Actor and any named recipient for a leave are already locked by the store. */
export async function writeSnackParcel(db:PoolClient, actorId:string, action:SnackAction,
 pantry:OrchardPantry|'unavailable'|null, parcel:HeldParcel|null, recipientExists:boolean, now:number):Promise<Result> {
 if(pantry==='unavailable')return {ok:false,message:'Your pantry could not be read. Its existing record is kept.'};
 const current=pantry??newOrchard();
 if(action.kind==='taste'){
  const result=orchardAction(current,{kind:'taste'},now);
  return result.ok?{ok:true,message:result.message,pantry:result.state}:result;
 }
 if(action.kind==='leave') {
  if(!recipientExists||action.recipientId===actorId)return {ok:false,message:'Choose a neighbor who has entered the town.'};
  const transfer=transferSnack(current,'offer',now,await snackSlotHeld(db,actorId));
  if(!transfer.ok)return transfer;
  await db.query(
   'insert into ih2.snack_parcels(id,sender_id,recipient_id,placed_at,expires_at) values($1,$2,$3,$4,$5)',
   [randomUUID(),actorId,action.recipientId,now,now+SNACK_OFFER_MS]);
  return {ok:true,message:'Snack left at the shelf. The committee saved someone lunch.',pantry:transfer.state};
 }
 if(!parcel||now<Number(parcel.resolved_at??parcel.placed_at))return {ok:false,message:'This parcel is unavailable.'};
 if(action.kind==='reclaim') {
  if(parcel.state!=='waiting'&&parcel.state!=='declined')return {ok:false,message:'This parcel is unavailable.'};
  const transfer=transferSnack(current,'reclaim',now,true);
  if(!transfer.ok)return transfer;
  await db.query("update ih2.snack_parcels set state='returned',resolved_at=$2 where id=$1",[parcel.id,now]);
  return {ok:true,message:'Snack returned to your pouch.',pantry:transfer.state};
 }
 if(parcel.state!=='waiting'||now>=Number(parcel.expires_at))return {ok:false,message:'This parcel is unavailable.'};
 if(action.kind==='decline'){
  await db.query("update ih2.snack_parcels set state='declined',resolved_at=$2 where id=$1",[parcel.id,now]);
  return {ok:true,message:'Parcel declined. The sender can take the snack back.'};
 }
 const transfer=transferSnack(current,'accept',now,await snackSlotHeld(db,actorId));
 if(!transfer.ok)return transfer;
 await db.query("update ih2.snack_parcels set state='accepted',resolved_at=$2 where id=$1",[parcel.id,now]);
 return {ok:true,message:'Snack added to your pouch.',pantry:transfer.state};
}

export async function readSnackShelf(db:Pool,actorId:string,now:number,allowedNeighbors?:readonly string[]):Promise<SnackShelf> {
 const result=await db.query<Omit<SnackShelf,'serverTime'>>(
  `select (workshop->>'revision')::int as revision,
    (select jsonb_build_object('id',p.id,'name',n.name,'placedAt',p.placed_at,'expiresAt',p.expires_at,'state',p.state)
      from ih2.snack_parcels p join ih2.players n on n.id=p.recipient_id
      where p.sender_id=$1 and p.state in ('waiting','declined')) as outgoing,
    coalesce((select jsonb_agg(i.parcel order by i.placed_at,i.id) from
      (select p.placed_at,p.id,jsonb_build_object('id',p.id,'name',n.name,'placedAt',p.placed_at,'expiresAt',p.expires_at,'state',p.state) as parcel
       from ih2.snack_parcels p join ih2.players n on n.id=p.sender_id
       where p.recipient_id=$1 and p.state='waiting' and p.expires_at>$2 order by p.placed_at,p.id limit 8) i),'[]') as incoming,
    coalesce((select jsonb_agg(n order by n.name,n.id) from
      (select id,name from ih2.players where id<>$1 and ($3::text[] is null or id=any($3)) order by name,id limit 32) n),'[]') as neighbors
   from ih2.players where id=$1`,
  [actorId,now,allowedNeighbors??null]);
 if(!result.rows[0])throw new Error('Unknown practice resident.');
 return {...result.rows[0],serverTime:now};
}
