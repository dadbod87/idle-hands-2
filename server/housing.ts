import{liveHousingAccount}from'../src/game/live-housing.ts';
/** Live transaction adapter: current player/plot are the only writable inventory. */
import type{PoolClient}from'pg';
import{randomUUID}from'node:crypto';
import{z}from'zod';
import{housingAccountSchema,legacyHousingAccount,emptyYard,makeHousingQuote,startHousingBuild,finishHousingBuild,arrangeHousing,arrangeHousingSchema,HOUSING_CATALOG_VERSION,type HousingAccount,type Occupant}from'../src/design/housing-contract.ts';
import type{WorkshopState}from'../src/game/live-workshop.ts';
import type{HomeLayout}from'../src/game/live-home-layout.ts';
export type LivePlot={id:string;level:1|2;placements:HomeLayout['placements'];workroom_placements:HomeLayout['workroomPlacements'];plan_id:string|null;yard:Record<string,string|null>};
const base={id:z.uuid(),expectedRevision:z.number().int().min(0).max(1_000_000)};
export const housingCommandSchema=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('housing-quote'),target:z.string().max(80),plotId:z.string().regex(/^[1-9][0-9]{0,17}$/)}).strict(),
 z.object({...base,kind:z.literal('housing-confirm'),quoteId:z.uuid()}).strict(),
 z.object({...base,kind:z.literal('housing-finish')}).strict(),
 z.object({...base,kind:z.literal('housing-arrange'),arrangement:arrangeHousingSchema}).strict()
]);
export async function housingAccount(c:PoolClient,id:string,state:WorkshopState,plot:LivePlot|null):Promise<HousingAccount>{
 const build=(await c.query('select build from ih2.housing_builds where owner_id=$1 and completed_at is null',[id])).rows[0]?.build??null;
 return liveHousingAccount(id,state,plot?{id:plot.id,level:plot.level,placements:plot.placements,workroomPlacements:plot.workroom_placements,planId:plot.plan_id,yard:plot.yard as ReturnType<typeof emptyYard>}:null,build);
}
export async function privateHousing(c:PoolClient,id:string){
 const build=(await c.query('select build from ih2.housing_builds where owner_id=$1 and completed_at is null',[id])).rows[0]?.build??null;
 const quote=(await c.query('select quote from ih2.housing_quotes where owner_id=$1 order by ordinal desc limit 1',[id])).rows[0]?.quote??null;
 const next=(await c.query('select (greatest(coalesce((select max(id) from ih2.plots),0),coalesce((select max(plot_id) from ih2.housing_builds),0))+1)::text as id')).rows[0].id;
 return{build,quote,nextPlotId:next};
}
export async function housingAction(c:PoolClient,id:string,state:WorkshopState,plot:LivePlot|null,raw:unknown,now:number,occupants:readonly Occupant[]){
 const cmd=housingCommandSchema.parse(raw),a=await housingAccount(c,id,state,plot),fail=(message:string)=>({ok:false,state,message,publicChanged:false});
 if(cmd.kind==='housing-quote'){
  const q=makeHousingQuote(a,{version:1,catalogVersion:HOUSING_CATALOG_VERSION,target:cmd.target,plotId:cmd.plotId,expectedRevision:cmd.expectedRevision},now,randomUUID());
  await c.query('insert into ih2.housing_quotes(id,owner_id,quote) values($1,$2,$3)',[q.id,id,q]);return{ok:true,state,message:'Review the complete price. Nothing has been spent.',publicChanged:false};
 }
 let outcome;
 if(cmd.kind==='housing-confirm'){
  const q=(await c.query('select quote from ih2.housing_quotes where id=$1 and owner_id=$2',[cmd.quoteId,id])).rows[0]?.quote;
  if(!q)return fail('This quote is not yours. Review a fresh price.');
  await c.query('select pg_advisory_xact_lock(116,$1::integer)',[Number(BigInt(q.plotId)%2147483647n)]);
  const occupied=(await c.query('select owner_id from ih2.plots where id=$1 union all select owner_id from ih2.housing_builds where plot_id=$1 and completed_at is null',[q.plotId])).rows;
  if(occupied.some(p=>p.owner_id!==id))return fail('Another neighbor reserved that address. Review a fresh plan; nothing was spent.');
  outcome=startHousingBuild(a,q,now,randomUUID());
  if(outcome.ok)await c.query('insert into ih2.housing_builds(id,owner_id,plot_id,build) values($1,$2,$3,$4)',[outcome.account.build!.id,id,q.plotId,outcome.account.build]);
 }else if(cmd.kind==='housing-finish'){
  outcome=finishHousingBuild(a,now,occupants);
  if(outcome.ok){const h=outcome.account.home!;await c.query(`insert into ih2.plots(id,owner_id,level,placements,workroom_placements,plan_id,yard,housing_revision) overriding system value values($1,$2,$3,$4,$5,$6,$7,1) on conflict(owner_id) do update set level=excluded.level,placements=excluded.placements,workroom_placements=excluded.workroom_placements,plan_id=excluded.plan_id,yard=excluded.yard,housing_revision=ih2.plots.housing_revision+1`,[h.plotId,id,h.layout.level,h.layout.placements,h.layout.workroomPlacements,h.planId,h.yard]);await c.query('update ih2.housing_builds set completed_at=$2 where id=$1 and completed_at is null',[a.build!.id,now]);}
 }else{
  if(cmd.arrangement.expectedRevision!==cmd.expectedRevision)return fail('Your belongings changed. Review the arrangement.');
  outcome=arrangeHousing(a,cmd.arrangement,now);
  if(outcome.ok&&outcome.account.home){const h=outcome.account.home;await c.query('update ih2.plots set placements=$2,workroom_placements=$3,yard=$4 where owner_id=$1',[id,h.layout.placements,h.layout.workroomPlacements,h.yard]);}
 }
 return{ok:outcome.ok,state:outcome.account.workshop,message:outcome.message,publicChanged:outcome.ok};
}
