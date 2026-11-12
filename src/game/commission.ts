import {z} from 'zod';
import {consumeGarden,gardenSchema,GARDEN_TIME_MAX,type GardenState} from './garden.ts';
import {carpentrySchema,type CarpentryState} from './carpentry.ts';

/** Private, bounded NPC correspondence. No player mail, inventory grants or clock jobs. */
export const RECIPIENT_IDS=['clerk','caretaker','carpentry-desk'] as const;
export type RecipientId=typeof RECIPIENT_IDS[number];
export const MOTIFS=['leaf','sun','moth'] as const;
export type LetterboxMotif=typeof MOTIFS[number];
export const MOTIF_NAMES={leaf:'Leaf route',sun:'Sun route',moth:'Night post'} as const;
export const RECIPIENTS={
 clerk:{name:'Marlow',short:'marlow',role:'Town clerk',parcel:'A permit for a form',reply:'A permit for a form. At last, a form with a future.'},
 caretaker:{name:'Jun',short:'jun',role:'Grounds caretaker',parcel:'Progress report on grass',reply:'The grass is growing. Management has asked it to be more specific.'},
 'carpentry-desk':{name:'Nella',short:'nella',role:'Carpentry teacher',parcel:'A tree’s application for annual leave',reply:'Annual leave for a tree. I have approved the branching arrangement.'}
} as const;
const clock=z.number().int().min(0).max(GARDEN_TIME_MAX);
export const commissionSchema=z.object({
 version:z.literal(1),quest:z.literal('pip-post-v1'),acceptedAt:clock.nullable(),paused:z.boolean(),
 order:z.array(z.enum(RECIPIENT_IDS)).max(3),completedAt:clock.nullable(),madeCount:z.number().int().min(0).max(1),
 motif:z.enum(MOTIFS),published:z.boolean()
}).strict().superRefine((s,ctx)=>{
 const invalid=new Set(s.order).size!==s.order.length||s.acceptedAt===null&&(s.order.length>0||s.paused||s.completedAt!==null)||
 s.completedAt!==null&&(s.order.length!==3||s.acceptedAt===null||s.completedAt<s.acceptedAt||s.paused)||
 s.madeCount>0&&s.completedAt===null||s.published&&s.madeCount!==1||s.madeCount===0&&s.motif!=='leaf';
 if(invalid)ctx.addIssue({code:'custom',message:'The route, plan and single physical letterbox do not agree.'});
});
export type CommissionState=z.infer<typeof commissionSchema>;
export function createCommission():CommissionState{return{version:1,quest:'pip-post-v1',acceptedAt:null,paused:false,order:[],completedAt:null,madeCount:0,motif:'leaf',published:false};}
export const commissionActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('accept')}).strict(),
 z.object({action:z.literal('pause'),paused:z.boolean()}).strict(),
 z.object({action:z.literal('handover'),parcel:z.enum(RECIPIENT_IDS),recipient:z.enum(RECIPIENT_IDS)}).strict(),
 z.object({action:z.literal('complete')}).strict(),
 z.object({action:z.literal('make'),motif:z.enum(MOTIFS)}).strict(),
 z.object({action:z.literal('style'),motif:z.enum(MOTIFS)}).strict(),
 z.object({action:z.literal('publish'),enabled:z.boolean()}).strict()
]);
export type CommissionAction=z.infer<typeof commissionActionSchema>;
export function commissionLocation(a:CommissionAction):{room:'square';stopId:string}{return{room:'square',stopId:a.action==='handover'?a.recipient:'courier'};}
export function commissionLedgerMatches(c:CommissionState,p:CarpentryState,g:GardenState):boolean{
 return p.commissionPine===2*c.madeCount&&g.consumed.commission.radish===c.madeCount&&g.consumed.commission.marigold===0;
}
export function routeCaption(order:readonly RecipientId[]):string{
 const captions:Record<string,string>={
 'clerk,caretaker,carpentry-desk':'Forms first. Grass second. Nella has classified this as a workable route.',
 'clerk,carpentry-desk,caretaker':'Paperwork, woodwork, groundswork. A surprisingly employable afternoon.',
 'caretaker,clerk,carpentry-desk':'The grass received its report before the clerk. Jun is framing this.',
 'caretaker,carpentry-desk,clerk':'Nature first. Forms last. Marlow has opened a separate file.',
 'carpentry-desk,clerk,caretaker':'Nella approved the branching arrangement. The route took this literally.',
 'carpentry-desk,caretaker,clerk':'Work first. Forms last. Marlow has requested a meeting.'
 };return captions[order.join(',')]??'Your route is still being written.';
}
export type CommissionResult={ok:boolean;state:CommissionState;carpentry:CarpentryState;garden:GardenState;message:string};
export function applyCommission(input:CommissionState,carpentry:CarpentryState,garden:GardenState,raw:unknown,now:number):CommissionResult{
 const fail=(message:string):CommissionResult=>({ok:false,state:input,carpentry,garden,message});
 if(!commissionSchema.safeParse(input).success||!carpentrySchema.safeParse(carpentry).success||!gardenSchema.safeParse(garden).success||!commissionLedgerMatches(input,carpentry,garden))return fail('The commission ledger could not be confirmed. Nothing changed.');
 if(!clock.safeParse(now).success||now<carpentry.observedAt||now<garden.observedAt||input.acceptedAt!==null&&now<input.acceptedAt||input.completedAt!==null&&now<input.completedAt)return fail('The confirmed clock moved backwards. Your route is kept.');
 const parsed=commissionActionSchema.safeParse(raw);if(!parsed.success)return fail('That post request is not valid. Nothing changed.');
 const a=parsed.data,c=structuredClone(input);let p=carpentry,g=garden,message='';
 if(a.action==='accept'){
  if(c.acceptedAt!==null)return fail('Your original parcels and receipts are already kept. Resume the same route.');
  c.acceptedAt=now;message='Three addressed parcels accepted. No bag space, payment or deadline. The route is circular. For once, this is intentional.';
 }else if(a.action==='pause'){
  if(c.acceptedAt===null||c.completedAt!==null||c.paused===a.paused)return fail('There is no change to make to this route.');
  c.paused=a.paused;message=a.paused?'Route paused. The same parcels and receipts stay kept; nothing expires.':'Same route resumed. No replacement parcels or duplicate receipts were issued.';
 }else if(a.action==='handover'){
  if(c.acceptedAt===null||c.completedAt!==null)return fail('Accept Pip’s route before delivering an outstanding parcel.');
  if(c.paused)return fail('Resume your kept route with Pip before handing over a parcel.');
  if(c.order.includes(a.parcel))return fail('That parcel already has its receipt. No duplicate was issued.');
  if(a.parcel!==a.recipient)return fail(RECIPIENTS[a.recipient].name+' returns the same parcel for '+RECIPIENTS[a.parcel].name+'. Nothing is lost.');
  c.order.push(a.parcel);message=RECIPIENTS[a.parcel].reply+' Receipt kept.';
 }else if(a.action==='complete'){
  if(c.acceptedAt===null||c.paused||c.order.length!==3||c.completedAt!==null)return fail('Bring all three unique receipts to Pip on your active route.');
  c.completedAt=now;message='Route card and letterbox plan saved. Everything arrived. The town is choosing to regard this as a precedent. A physical letterbox is optional and made separately.';
 }else if(a.action==='make'){
  if(c.completedAt===null)return fail('Complete the free route for the letterbox plan first.');
  if(c.madeCount!==0)return fail('Your one letterbox is already owned. Move it or change its motif for free.');
  if(carpentry.pine.carried<2||garden.produce.radish<1)return fail('Need 2 carried pine + 1 harvested radish. Seeds and growing crops are kept. Nothing was spent.');
  const debit=consumeGarden(garden,'commission',now);if(!debit)return fail('The harvested radish could not be confirmed. Nothing was spent.');
  g=debit;p=structuredClone(carpentry);p.observedAt=now;p.pine.carried-=2;p.pine.spent+=2;p.commissionPine+=2;
  c.madeCount=1;c.motif=a.motif;message='Made one Unreasonably Official Letterbox: 2 pine + 1 radish spent once. No new timer or production bonus. Motif changes and moving this same item are free.';
 }else if(a.action==='style'){
  if(c.madeCount!==1)return fail('Make your one physical letterbox before changing its motif.');
  if(c.motif===a.motif)return fail('That motif is already saved. Nothing was spent.');
  c.motif=a.motif;message='Letterbox motif changed for free. Same owned item, same placements.';
 }else{
  if(c.madeCount!==1)return fail('Make the physical letterbox before publishing its style sample.');
  if(c.published===a.enabled)return fail('That publication choice is already saved.');
  c.published=a.enabled;message=a.enabled?'Your name and chosen motif are shown at Pip’s sample register. Private deliveries and stock stay private; no extra item was created.':'Style sample removed. Your letterbox, motif and placement stay yours.';
 }
 if(!commissionSchema.safeParse(c).success||!carpentrySchema.safeParse(p).success||!gardenSchema.safeParse(g).success||!commissionLedgerMatches(c,p,g))return fail('This request would create invalid commission progress. Nothing changed.');
 return{ok:true,state:c,carpentry:p,garden:g,message};
}
