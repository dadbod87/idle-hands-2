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
