import type {PoolClient} from 'pg';
import {z} from 'zod';
import {GLASSHOUSE_RULES,glasshouseView} from '../src/game/glasshouse.ts';
import {GLASSHOUSE_PLANTS,glasshousePlantSchema} from '../src/game/glasshouse-plants.ts';

const commandSchema=z.object({
 kind:z.literal('glasshouse-keep-plant'),
 id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),
 expectedRevision:z.number().int().min(0).max(1_000_000),
 plant:glasshousePlantSchema,
}).strict();

/** Caller owns the locked resident row and same-transaction receipt. The
 * restored project is immutable, so a visit does not take the project lock. */
export async function keepGlasshousePlant(
 client:PoolClient,resident:string,raw:unknown,atKeeper:boolean,now:number,
):Promise<{ok:boolean;message:string}>{
 const parsed=commandSchema.safeParse(raw);
 if(!parsed.success)return{ok:false,message:'Choose one of the keeper’s two plants.'};
 if(!atKeeper)return{ok:false,message:'Visit the nursery keeper before choosing a plant.'};
 const project=(await client.query('select state from ih2.glasshouse_project where id=1')).rows[0]?.state;
 if(glasshouseView(project,now)?.phase!=='open')return{ok:false,message:'The Glasshouse has not opened yet.'};
 const {plant}=parsed.data;
 const saved=await client.query(
  'insert into ih2.glasshouse_plants(player_id,project_revision,plant,kept_at) values($1,$2,$3,$4) on conflict do nothing returning plant',
  [resident,GLASSHOUSE_RULES.revision,plant,now],
 );
 if(!saved.rows.length)return{ok:false,message:'You already chose a Glasshouse plant.'};
 return{ok:true,message:GLASSHOUSE_PLANTS[plant].name+' kept in your private collection.'};
}

export async function displayGlasshousePlant(
 client:PoolClient,resident:string,raw:unknown,localPlotId:string|undefined,atSill:boolean,
):Promise<{ok:boolean;message:string}>{
 const parsed=displaySchema.safeParse(raw);
 if(!parsed.success)return{ok:false,message:'That windowsill request is invalid.'};
 const action=parsed.data;
 if(action.plotId!==localPlotId||!atSill)return{ok:false,message:'Only the owner at this windowsill can change what is displayed.'};
 // TownStore locks the resident and their plot before reaching this command.
 const status=(await client.query(
  `select p.glasshouse_plant_visible as shown,v.plant from ih2.plots p left join ih2.glasshouse_plants v
     on v.player_id=p.owner_id and v.project_revision=$3 where p.id=$1 and p.owner_id=$2`,
  [action.plotId,resident,GLASSHOUSE_RULES.revision],
 )).rows[0];
 if(!status||action.display&&!glasshousePlantSchema.safeParse(status.plant).success)return{ok:false,message:'Visit the keeper to choose your plant first.'};
 if(status.shown===action.display)return{ok:false,message:action.display?'Your plant is already on the windowsill.':'Your plant is already private.'};
 await client.query('update ih2.plots set glasshouse_plant_visible=$2 where id=$1',[action.plotId,action.display]);
 return{ok:true,message:action.display?'Plant on display for visitors.':'Plant back in your private collection.'};
}

const displaySchema=z.object({
 kind:z.literal('glasshouse-display-plant'),
 id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),
 expectedRevision:z.number().int().min(0).max(1_000_000),
 plotId:z.string().regex(/^[1-9][0-9]{0,17}$/),
 display:z.boolean(),
}).strict();
