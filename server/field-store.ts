import type {Pool} from 'pg';
import {z} from 'zod';
import {applyPumpworks,freshPumpworks,pumpworksRecordSchema,type PumpworksAction,type PumpworksPlace,type PumpworksState} from '../src/game/pumpworks.ts';
import {PUMPWORKS_SAFE_BENCH} from '../src/game/pumpworks-room.ts';

const receiptSchema=z.object({id:z.uuid(),request:z.string().max(350),message:z.string().max(500)}).strict();
export type FieldReceipt=z.infer<typeof receiptSchema>;
export type FieldRecord={state:PumpworksState;receipts:FieldReceipt[];saved:boolean};

// A confirmed result and its receipt occupy the same row. Ordinary town inventory
// and workshop revisions are independent of field contact.
export class FieldStore {
 private pool:Pool;
 constructor(pool:Pool){this.pool=pool;}

 async read(id:string):Promise<FieldRecord>{
  const {rows}=await this.pool.query('select state, receipts from ih2.field_outings where player_id=$1',[id]);
  if(!rows[0])return {state:freshPumpworks(),receipts:[],saved:false};
  return {state:pumpworksRecordSchema.parse(rows[0].state),receipts:z.array(receiptSchema).max(24).parse(rows[0].receipts),saved:true};
 }

 async apply(id:string,current:FieldRecord,action:PumpworksAction,place:PumpworksPlace,now:number,receipt?:Omit<FieldReceipt,'message'>){
  const applied=applyPumpworks(current.state,action,place,now);
  if(!applied.ok)return applied;
  const {state,message}=applied;
  const receipts=receipt?[...current.receipts,{...receipt,message}].slice(-24):current.receipts;
  const encoded=JSON.stringify(pumpworksRecordSchema.parse(state));
  const save=current.saved
   ?'update ih2.field_outings set state=$2,receipts=$3 where player_id=$1 and (state->>\'revision\')::int=$4'
   :'insert into ih2.field_outings(player_id,state,receipts) values($1,$2,$3) on conflict do nothing';
  const values=[id,encoded,JSON.stringify(receipts),...(current.saved?[current.state.revision]:[])];
  if(applied.returnToBed){
   const db=await this.pool.connect();
   try{
    await db.query('begin');
    if(!(await db.query(save,values)).rowCount)throw new FieldWriteConflict();
    if(!(await db.query("update ih2.players set position=$2,updated_at=now() where id=$1 and position->>'room'='pumpworks'",
      [id,{room:'pumpworks',position:PUMPWORKS_SAFE_BENCH}])).rowCount)throw new FieldWriteConflict();
    await db.query('commit');
   }catch(error){await db.query('rollback');throw error;}finally{db.release();}
  }else if(!(await this.pool.query(save,values)).rowCount)throw new FieldWriteConflict();
  return {...applied,record:{state,receipts,saved:true}};
 }
}

export class FieldWriteConflict extends Error {
 constructor(){super('The field record changed. Reload the confirmed outing.');}
}
