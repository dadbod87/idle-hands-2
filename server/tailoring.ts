import type {PoolClient} from 'pg';
import {z} from 'zod';
import {tailor,tailoringActionSchema,tailoringSchema} from '../src/game/tailoring.ts';

const commandSchema=z.object({
 id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),expectedRevision:z.number().int().min(0).max(1_000_000),
 kind:z.literal('tailoring'),action:tailoringActionSchema,
}).strict();
type Row={started_at:string|number;ready_at:string|number;collected_at:string|number|null;worn:unknown};
export function tailoringFromRow(row:Row|null){
 return row?tailoringSchema.parse({
  startedAt:Number(row.started_at),readyAt:Number(row.ready_at),
  collectedAt:row.collected_at===null?null:Number(row.collected_at),worn:row.worn,
 }):null;
}

/** The caller holds the player's row lock and owns the command receipt. */
export async function writeTailoring(client:PoolClient,id:string,raw:unknown,atTable:boolean,supplies:number,now:number){
 const request=commandSchema.safeParse(raw);
 if(!request.success)return {ok:false as const,message:'That sewing request is invalid.'};
 const {rows}=await client.query<Row>('select started_at,ready_at,collected_at,worn from ih2.tailored_kerchiefs where player_id=$1',[id]);
 const before=tailoringFromRow(rows[0]??null);
 const applied=tailor(before,request.data.action,atTable,supplies,now);
 if(!applied.ok)return applied;
 const {state}=applied;
 if(before===null){
  await client.query('insert into ih2.tailored_kerchiefs(player_id,started_at,ready_at) values($1,$2,$3)',[id,state.startedAt,state.readyAt]);
 }else if(before.collectedAt===null){
  await client.query('update ih2.tailored_kerchiefs set collected_at=$2 where player_id=$1',[id,state.collectedAt]);
 }else{
  await client.query('update ih2.tailored_kerchiefs set worn=$2 where player_id=$1',[id,state.worn]);
 }
 return applied;
}
