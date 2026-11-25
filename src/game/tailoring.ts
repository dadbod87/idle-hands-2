import {beginFinishing,finishingOrderSchema,finishingReady,tradeRank} from './trade-practice.ts';
import {z} from 'zod';
import {FIELD_KERCHIEFS,KERCHIEF_DYES,KERCHIEF_TIES,type FieldKerchief,type KerchiefFit} from './field-appearance.ts';
import type {Stop} from './world.ts';

export const TAILOR_COST=1;
export const EDGING_COST=1;
export const TAILOR_MS=10*60*1000;
export const SEWING_TABLE={
 id:'sewing-table',name:'Sewing table',point:{x:15.2,y:10.35},doorArea:[14.1,8.7,2.4,1.65],
 text:'Make a trail kerchief while the main bench works.',
} satisfies Stop;
const time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const tailoringSchema=z.object({
 startedAt:time,readyAt:time,collectedAt:time.nullable(),worn:z.enum(FIELD_KERCHIEFS),dye:z.enum(FIELD_KERCHIEFS).optional(),tie:z.enum(KERCHIEF_TIES).optional(),
 edging:finishingOrderSchema.optional(),goldEdge:z.literal(true).optional(),
}).strict().refine(row=>row.readyAt===row.startedAt+TAILOR_MS
 &&(row.collectedAt===null?row.worn==='none'&&savedKerchiefDye(row)==='none':row.collectedAt>=row.readyAt)
 &&(row.tie!=='wrap'||savedKerchiefDye(row)!=='none')
 &&(row.worn==='none'||row.worn===savedKerchiefDye(row))
 &&(!row.edging||row.collectedAt!==null&&row.edging.startedAt>=row.collectedAt)
 &&(!row.goldEdge||row.edging?.collectedAt!=null));
export type Tailoring=z.infer<typeof tailoringSchema>;
export function savedKerchiefDye(order:{worn:FieldKerchief;dye?:FieldKerchief}){
 return order.dye??order.worn;
}
export type TailoringAction={kind:'start'}|{kind:'collect'}|{kind:'start-edging'}|{kind:'collect-edging'}|{kind:'wear';color:FieldKerchief}
 |({kind:'style';goldEdge?:boolean}&Omit<KerchiefFit,'tie'>&Partial<Pick<KerchiefFit,'tie'>>);
export const tailoringActionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('start')}).strict(),
 z.object({kind:z.literal('collect')}).strict(),
 z.object({kind:z.literal('start-edging')}).strict(),
 z.object({kind:z.literal('collect-edging')}).strict(),
 z.object({kind:z.literal('wear'),color:z.enum(FIELD_KERCHIEFS)}).strict(),
 z.object({kind:z.literal('style'),dye:z.enum(KERCHIEF_DYES),wear:z.boolean(),tie:z.enum(KERCHIEF_TIES).optional(),goldEdge:z.boolean().optional()}).strict(),
]);

type Decision={ok:true;state:Tailoring;cost:number;message:string}|{ok:false;message:string};
export function tailor(current:Tailoring|null,action:TailoringAction,atTable:boolean,supplies:number,now:number):Decision{
 const refuse=(message:string):Decision=>({ok:false,message});
 if(!time.safeParse(now).success||current&&now<Math.max(current.startedAt,current.collectedAt??0,current.edging?.startedAt??0,current.edging?.collectedAt??0))return refuse('The sewing clock has changed. Try again.');
 if(action.kind!=='wear'&&action.kind!=='style'&&!atTable)return refuse('Walk to the sewing table first.');
 switch(action.kind){
  case 'start':
   if(current)return refuse('You already have a kerchief in this order.');
   if(now>Number.MAX_SAFE_INTEGER-TAILOR_MS)return refuse('The sewing clock is out of range.');
   if(supplies<TAILOR_COST)return refuse('Bring '+TAILOR_COST+' Supplies.');
   return {ok:true,state:{startedAt:now,readyAt:now+TAILOR_MS,collectedAt:null,worn:'none',dye:'none',tie:'knot'},cost:TAILOR_COST,
    message:'Kerchief started.'};
  case 'collect':
   if(!current||current.collectedAt!==null||now<current.readyAt)return refuse('There is no finished kerchief to collect.');
   return {ok:true,state:{...current,collectedAt:now},cost:0,message:'Trail kerchief collected. Tailoring rank 1. Pick a color to wear.'};
  case 'start-edging': {
   if(!current||current.collectedAt===null)return refuse('Make and collect a trail kerchief first.');
   if(current.edging)return refuse('You already have a gold edging order.');
   if(supplies<EDGING_COST)return refuse('Bring '+EDGING_COST+' Supplies.');
   const edging=beginFinishing(now);
   if(!edging)return refuse('The sewing clock is out of range.');
   return {ok:true,state:{...current,edging},cost:EDGING_COST,message:'Gold edging started.'};
  }
  case 'collect-edging':
   if(!current?.edging||!finishingReady(current.edging,now))return refuse('There is no finished gold edging to collect.');
   return {ok:true,state:{...current,edging:{...current.edging,collectedAt:now}},cost:0,
    message:'Gold edging unlocked. Tailoring rank 2.'};
  case 'wear':
  case 'style': {
   if(!current||current.collectedAt===null)return refuse('Make and collect a trail kerchief first.');
   const before=savedKerchiefDye(current);
   const dye=action.kind==='style'?action.dye:action.color==='none'?before:action.color;
   const worn=action.kind==='style'?(action.wear?dye:'none'):action.color;
   const previousTie=current.tie??'knot';
   const tie=(action.kind==='style'?action.tie:undefined)??previousTie;
   const goldEdge=(action.kind==='style'?action.goldEdge:undefined)??!!current.goldEdge;
   if(goldEdge&&current.edging?.collectedAt==null)return refuse('Finish the gold edging order first.');
   if(current.worn===worn&&before===dye&&tie===previousTie&&goldEdge===!!current.goldEdge)return refuse('This look is already saved.');
   return {ok:true,state:{...current,worn,dye,tie,goldEdge:goldEdge?true:undefined},cost:0,
    message:worn==='none'?'Kerchief packed. Its dye stays with it.':'Kerchief worn. Nearby residents can see it.'};
  }
 }
}

export function tailoringRank(order:Tailoring|null|undefined){
 return tradeRank(order?.collectedAt!=null,order?.edging?.collectedAt!=null);
}
export function sewingJob(order:Tailoring|null|undefined){
 if(!order)return null;
 if(order.collectedAt===null)return {kind:'kerchief' as const,startedAt:order.startedAt,readyAt:order.readyAt};
 return order.edging?.collectedAt===null?{kind:'gold-edging' as const,startedAt:order.edging.startedAt,readyAt:order.edging.readyAt}:null;
}
export function sewingReady(order:Tailoring|null|undefined,now:number){
 const job=sewingJob(order);
 return !!job&&now>=job.readyAt;
}
