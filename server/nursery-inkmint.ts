import type {PoolClient} from 'pg';
import {z} from 'zod';
import {GLASSHOUSE_RULES,glasshouseView} from '../src/game/glasshouse.ts';
import {inkmintActionSchema,inkmintSchema,inkmintStep} from '../src/game/nursery-inkmint.ts';

const commandSchema=z.object({
 kind:z.literal('glasshouse-inkmint'),
 id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),
 expectedRevision:z.number().int().min(0).max(1_000_000),
 action:inkmintActionSchema,
}).strict();
type Access={tray:boolean;pottery:boolean;ownSill:boolean;shown:boolean};
type Decision={ok:false;message:string}|{ok:true;message:string;publicChanged:boolean};
const refusal=(message:string):Decision=>({ok:false,message});

/** TownStore locks the resident and commits the finish with the command receipt. */
export async function writeInkmint(client:PoolClient,resident:string,raw:unknown,access:Access,now:number):Promise<Decision>{
 const command=commandSchema.safeParse(raw);
 if(!command.success)return refusal('That Inkmint request is invalid.');
 const {action}=command.data;
 const atSill=action==='apply'||action==='remove';
 if(atSill&&!access.ownSill)return refusal('Only the owner at their windowsill can change the pot.');
 if(action==='mix'&&!access.pottery)return refusal('Visit the pottery ledge to make the stripe.');
 if((action==='plant'||action==='collect')&&!access.tray)return refusal('Visit the Glasshouse seed drawers to tend the tray.');
 if(!atSill){
  const project=(await client.query('select state from ih2.glasshouse_project where id=1')).rows[0]?.state;
  if(glasshouseView(project,now)?.phase!=='open')return refusal('The Glasshouse has not opened yet.');
 }
 const row=(await client.query(
  'select inkmint_phase,inkmint_ready_at from ih2.glasshouse_plants where player_id=$1 and project_revision=$2',
  [resident,GLASSHOUSE_RULES.revision],
 )).rows[0];
 if(!row)return refusal('Choose a keepsake plant from the nursery keeper first.');
 const saved=inkmintSchema.safeParse({phase:row.inkmint_phase,readyAt:row.inkmint_ready_at===null?null:Number(row.inkmint_ready_at)});
 if(!saved.success)return refusal('The Inkmint record could not be confirmed.');
 const next=inkmintStep(saved.data,action,now);
 if(typeof next==='string')return refusal(next);
 await client.query(
  'update ih2.glasshouse_plants set inkmint_phase=$3,inkmint_ready_at=$4 where player_id=$1 and project_revision=$2',
  [resident,GLASSHOUSE_RULES.revision,next.state.phase,next.state.readyAt],
 );
 return {ok:true,message:next.message,publicChanged:atSill&&access.shown};
}
