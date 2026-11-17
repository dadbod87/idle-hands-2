import type{PoolClient}from'pg';import{randomUUID}from'node:crypto';
import{outingSchema,createOuting,applyOuting,outingIntentSchema,OUTING_STOPS,type OutingStation}from'../src/game/outing.ts';
export async function privateOuting(client:PoolClient,id:string){const row=(await client.query('select state from ih2.outings where player_id=$1',[id])).rows[0];return row?outingSchema.parse(row.state):createOuting();}
/** Caller holds the owning player lock. Private outcome and existing UUID receipt share its transaction. */
export async function outingAction(client:PoolClient,id:string,raw:unknown,now:number,position:{room:string;position:{x:number;y:number}}){
 const intent=outingIntentSchema.parse(raw),state=await privateOuting(client,id);
 const station=position.room==='square'?OUTING_STOPS.find(s=>Math.hypot(s.point.x-position.position.x,s.point.y-position.position.y)<=1.4):undefined;
 if(!station)return{ok:false,state,message:'Walk to the woodland work stop before acting.'};
 const result=applyOuting(state,intent,now,station.id as OutingStation,intent.action==='start'?randomUUID():undefined);
 if(result.ok)await client.query('insert into ih2.outings(player_id,state) values($1,$2) on conflict(player_id) do update set state=excluded.state',[id,result.state]);return result;
}
