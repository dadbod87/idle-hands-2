import {z} from 'zod';
import {consumeGarden,gardenSchema,GARDEN_HOUR,GARDEN_DAY,GARDEN_TIME_MAX,type GardenState} from './garden.ts';

// Pure candidate rules, not an authority boundary. The caller must persist the
// returned garden, carpentry, output and civic intent in one UUID transaction.
export const PINE_STATIONS=['crooked','forked','sheltered'] as const;
export const CARPENTRY_RULES={pineCap:6,pineMs:4*GARDEN_HOUR,carriedCap:24,easelPine:4,easelMs:12*GARDEN_HOUR,easelCap:99,hamperPine:1,hamperRadishes:2,hamperMs:4*GARDEN_HOUR,noticeCredits:6,noticeMs:GARDEN_DAY,counterMax:1_000_000} as const;
const count=z.number().int().min(0).max(CARPENTRY_RULES.counterMax);
const clock=z.number().int().min(0).max(GARDEN_TIME_MAX);
const deadline=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const carpentrySchema=z.object({
 version:z.literal(1),observedAt:clock,lessonAt:clock.nullable(),
 saw:z.object({owned:z.boolean(),equipped:z.boolean()}).strict(),
 pine:z.object({available:count.max(6),lastAt:clock,carried:count.max(24),gathered:count,spent:count}).strict(),
 job:z.object({startedAt:clock,readyAt:deadline}).strict().nullable(),
 started:count.max(99),produced:count.max(99),recorded:count.max(99),sixthRecordAt:clock.nullable(),
 hampers:count,nextHamperAt:deadline.nullable(),practice:count,keepEaselGoal:z.boolean()
}).strict().superRefine((s,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if(s.lessonAt===null&&(s.saw.owned||s.saw.equipped||s.pine.gathered>0||s.started>0))issue('The practical lesson has not been completed.');
 if(s.lessonAt!==null&&s.lessonAt>s.observedAt||s.saw.equipped&&!s.saw.owned)issue('Invalid protected tool entitlement.');
 if(s.pine.lastAt>s.observedAt||s.pine.gathered!==s.pine.carried+s.pine.spent||s.pine.spent!==4*s.started+s.hampers)issue('Pine does not conserve gathered and used wood.');
 if(s.started!==s.produced+(s.job?1:0)||s.recorded>s.produced)issue('Craft records must refer to completed, kept easels.');
 if(s.job&&(s.job.startedAt>s.observedAt||s.lessonAt===null||s.job.startedAt<s.lessonAt||s.job.readyAt-s.job.startedAt!==CARPENTRY_RULES.easelMs))issue('Invalid finishing deadline.');
 if(s.recorded<6?s.sixthRecordAt!==null:s.sixthRecordAt===null||s.sixthRecordAt>s.observedAt||s.lessonAt===null||s.sixthRecordAt<s.lessonAt)issue('Invalid personal sixth-record history.');
 if(s.hampers===0?s.nextHamperAt!==null:s.nextHamperAt===null||s.lessonAt===null||s.nextHamperAt-CARPENTRY_RULES.hamperMs<s.lessonAt||s.nextHamperAt-CARPENTRY_RULES.hamperMs>s.observedAt)issue('Invalid delivery cooldown.');
 if(s.practice!==3*s.produced+s.hampers)issue('Carpentry practice does not match completed work.');
});
export type CarpentryState=z.infer<typeof carpentrySchema>;
export function createCarpentry(now:number):CarpentryState{
 clock.parse(now);
 return {version:1,observedAt:now,lessonAt:null,saw:{owned:false,equipped:false},pine:{available:6,lastAt:now,carried:0,gathered:0,spent:0},job:null,started:0,produced:0,recorded:0,sixthRecordAt:null,hampers:0,nextHamperAt:null,practice:0,keepEaselGoal:true};
}
export function settleCarpentry(input:CarpentryState,now:number):CarpentryState{
 carpentrySchema.parse(input);clock.parse(now);if(now<input.observedAt)throw new Error('Carpentry time moved backwards.');
 const s=structuredClone(input);s.observedAt=now;
 const p=s.pine,earned=Math.floor((now-p.lastAt)/CARPENTRY_RULES.pineMs);
 if(p.available===CARPENTRY_RULES.pineCap)p.lastAt=now;
 else if(earned>0){p.available=Math.min(CARPENTRY_RULES.pineCap,p.available+earned);p.lastAt=p.available===CARPENTRY_RULES.pineCap?now:p.lastAt+earned*CARPENTRY_RULES.pineMs;}
 return s;
}
export const carpentryActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('learn-saw')}).strict(),
 z.object({action:z.literal('recover-saw')}).strict(),
 z.object({action:z.literal('equip-saw'),equipped:z.boolean()}).strict(),
 z.object({action:z.literal('gather-pine'),station:z.enum(PINE_STATIONS)}).strict(),
 z.object({action:z.literal('start-easel')}).strict(),
 z.object({action:z.literal('claim-easel')}).strict(),
 z.object({action:z.literal('deliver-hamper')}).strict(),
 z.object({action:z.literal('record-easel')}).strict(),
 z.object({action:z.literal('set-easel-goal'),enabled:z.boolean()}).strict()
]);
export type CarpentryAction=z.infer<typeof carpentryActionSchema>;
export function carpentryActionLocations(a:CarpentryAction):Array<{room:'square'|'workshop';stopId:string}>{
 if(a.action==='gather-pine')return[{room:'square',stopId:'pine-'+a.station}];
 if(a.action==='start-easel'||a.action==='claim-easel')return[{room:'workshop',stopId:'finishing-rack'}];
 return[{room:'square',stopId:'carpentry-desk'}];
}
export function carpentryLedgerMatches(s:CarpentryState,g:GardenState):boolean{
 return g.consumed.easels.radish===0&&g.consumed.easels.marigold===s.started&&g.consumed.hampers.radish===2*s.hampers&&g.consumed.hampers.marigold===s.hampers;
}
export type CarpentryResult={ok:boolean;state:CarpentryState;garden:GardenState;message:string;awardEasel:boolean;recordIntent:boolean};
export function applyCarpentry(input:CarpentryState,garden:GardenState,raw:unknown,now:number):CarpentryResult{
 const fail=(message:string):CarpentryResult=>({ok:false,state:input,garden,message,awardEasel:false,recordIntent:false});
 if(!carpentrySchema.safeParse(input).success||!gardenSchema.safeParse(garden).success||!carpentryLedgerMatches(input,garden))return fail('The saved crafting ledger could not be confirmed. Nothing changed.');
 if(!clock.safeParse(now).success||now<input.observedAt||now<garden.observedAt)return fail('The crafting clock could not be confirmed. Nothing changed.');
 const parsed=carpentryActionSchema.safeParse(raw);if(!parsed.success)return fail('That carpentry request is not valid. Nothing changed.');
 const a=parsed.data,s=settleCarpentry(input,now);let g=garden,message='',awardEasel=false,recordIntent=false;
 if(a.action==='learn-saw'){
  if(s.lessonAt!==null)return fail('Your practical lesson is already recorded. A missing bound saw can be recovered for free.');
  s.lessonAt=now;s.saw.owned=true;message='Bound hand saw received. Equip it explicitly to prepare fallen pine. Certified to divide one problem into two smaller problems.';
 }else if(a.action==='recover-saw'){
  if(s.lessonAt===null)return fail('Complete the free practical lesson before recovering a saw.');
  if(s.saw.owned)return fail('Your bound saw is already accounted for. There is no spare saleable copy.');
  s.saw.owned=true;s.saw.equipped=false;message='Missing bound saw replaced for free. Equip it when you are ready.';
 }else if(a.action==='equip-saw'){
  if(!s.saw.owned)return fail('Receive or recover your bound saw first.');
  if(s.saw.equipped===a.equipped)return fail('That equipment choice is already saved.');
  s.saw.equipped=a.equipped;message=a.equipped?'Hand saw equipped. Fallen pine can now be prepared; no output multiplier.':'Hand saw put away. Your tool and materials remain yours.';
 }else if(a.action==='gather-pine'){
  if(!s.saw.equipped)return fail('Equip your bound hand saw before preparing fallen pine.');
  const quantity=Math.min(s.pine.available,CARPENTRY_RULES.carriedCap-s.pine.carried);
  if(!quantity)return fail(s.pine.carried===CARPENTRY_RULES.carriedCap?'Pine storage is full (24). Use some at the finishing rack or in a hamper.':'Your personal pine pool is recovering: one bundle every four real hours, up to six. All three points share this supply.');
  s.pine.available-=quantity;s.pine.carried+=quantity;s.pine.gathered+=quantity;
  message=`Prepared ${quantity} pine. ${s.pine.carried}/24 carried. The three deadfall points share one personal supply; other residents keep theirs.`;
 }else if(a.action==='start-easel'){
  if(!s.saw.equipped)return fail('Equip your bound saw before starting the easel.');
  if(s.job)return fail('The finishing rack already has a job. Its easel waits safely for collection.');
  if(s.produced>=CARPENTRY_RULES.easelCap)return fail('Easel storage is full (99). No ingredients were spent.');
  if(s.pine.carried<4)return fail('This easel needs four pine bundles and one marigold.');
  const spent=consumeGarden(garden,'easels',now);if(!spent)return fail('Keep one harvested marigold for this easel. Seeds and growing plants cannot be spent.');
  g=spent;s.pine.carried-=4;s.pine.spent+=4;s.started++;s.job={startedAt:now,readyAt:now+CARPENTRY_RULES.easelMs};
  message='Garden study easel started: 4 pine + 1 marigold spent. Twelve real hours at its own rack; your ordinary bench stays available.';
 }else if(a.action==='claim-easel'){
  if(!s.job)return fail('There is no easel to collect.');
  if(s.job.readyAt>now)return fail('The easel is still finishing. Its original deadline is unchanged.');
  if(s.produced>=CARPENTRY_RULES.easelCap)return fail('Easel storage is full (99). Your finished job is kept.');
  s.job=null;s.produced++;s.practice+=3;awardEasel=true;
  message='Collected a Garden study easel. +3 carpentry practice. Keep it, place it, or separately record its craft for the noticeboard without giving it away.';
 }else if(a.action==='deliver-hamper'){
  if(s.nextHamperAt!==null&&s.nextHamperAt>now)return fail('The groundskeeper hamper is on its four-hour cooldown. Nothing was spent.');
  if(s.pine.carried<1)return fail('The hamper needs 1 pine, 2 radishes and 1 marigold.');
  const spent=consumeGarden(garden,'hampers',now);if(!spent)return fail('The hamper needs 1 pine, 2 radishes and 1 marigold. Seeds and plants are kept.');
  g=spent;s.pine.carried--;s.pine.spent++;s.hampers++;s.practice++;s.nextHamperAt=now+CARPENTRY_RULES.hamperMs;
  message='Hamper delivered: 1 pine, 2 radishes and 1 marigold spent. +1 private carpentry practice. Locally sourced. Extensively documented.';
 }else if(a.action==='record-easel'){
  if(s.recorded>=s.produced)return fail('No unrecorded completed easel is available. Each craft can be recorded once, and its item stays yours.');
  s.recorded++;if(s.recorded===6)s.sixthRecordAt=now;recordIntent=true;
  message='Craft recorded. You keep your easel. The town service confirms whether this adds a noticeboard credit.';
 }else{
  if(s.keepEaselGoal===a.enabled)return fail('That planning choice is already saved.');
  s.keepEaselGoal=a.enabled;message=a.enabled?'Easel goal shown: plan to keep 4 pine and 1 marigold. This is an aid, not an inventory lock.':'Easel goal hidden. Nothing was spent or reserved.';
 }
 if(!carpentrySchema.safeParse(s).success||!carpentryLedgerMatches(s,g))return fail('This request would exceed a prototype limit. Nothing changed.');
 return {ok:true,state:s,garden:g,message,awardEasel,recordIntent};
}
export function nextCarpentryDeadline(input:CarpentryState,now:number):number|null{
 const s=settleCarpentry(input,now),times:number[]=[];
 if(s.job&&s.job.readyAt>now)times.push(s.job.readyAt);
 if(s.nextHamperAt!==null&&s.nextHamperAt>now)times.push(s.nextHamperAt);
 if(s.pine.available<6)times.push(s.pine.lastAt+CARPENTRY_RULES.pineMs);
 return times.length?Math.min(...times):null;
}
export function easelGoal(input:CarpentryState,garden:GardenState):{active:boolean;pineNeeded:number;flowersNeeded:number;spendingLastFlower:boolean}{
 return {active:input.keepEaselGoal,pineNeeded:Math.max(0,4-input.pine.carried),flowersNeeded:Math.max(0,1-garden.produce.marigold),spendingLastFlower:input.keepEaselGoal&&garden.produce.marigold===1};
}

// Anonymous public project value. A store must lock/update its singleton in the
// same transaction as recordIntent; this pure function does not grant a credit.
export const noticeboardSchema=z.object({credits:count.max(6),phase:z.enum(['collecting','installing','open']),startedAt:clock.nullable(),readyAt:deadline.nullable(),openedAt:deadline.nullable()}).strict().superRefine((s,ctx)=>{
 const valid=s.credits<6?s.phase==='collecting'&&s.startedAt===null&&s.readyAt===null&&s.openedAt===null:s.startedAt!==null&&s.readyAt!==null&&s.readyAt-s.startedAt===CARPENTRY_RULES.noticeMs&&(s.phase==='installing'&&s.openedAt===null||s.phase==='open'&&s.openedAt===s.readyAt);
 if(!valid)ctx.addIssue({code:'custom',message:'Invalid noticeboard phase or fixed installation deadline.'});
});
export type NoticeboardState=z.infer<typeof noticeboardSchema>;
export function createNoticeboard():NoticeboardState{return {credits:0,phase:'collecting',startedAt:null,readyAt:null,openedAt:null};}
export function settleNoticeboard(input:NoticeboardState,now:number):NoticeboardState{
 noticeboardSchema.parse(input);clock.parse(now);
 if(input.startedAt!==null&&now<input.startedAt||input.openedAt!==null&&now<input.openedAt)throw new Error('Noticeboard time moved backwards.');
 return input.phase==='installing'&&input.readyAt!<=now?{...input,phase:'open',openedAt:input.readyAt}:input;
}
export function recordNoticeboard(input:NoticeboardState,now:number):{state:NoticeboardState;credited:boolean}{
 const s=settleNoticeboard(input,now);if(s.credits===6)return {state:s,credited:false};
 const credits=s.credits+1;
 return {state:credits===6?{credits,phase:'installing',startedAt:now,readyAt:now+CARPENTRY_RULES.noticeMs,openedAt:null}:{...s,credits},credited:true};
}
