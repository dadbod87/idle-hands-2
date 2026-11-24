import { z } from 'zod';
import { glasshouseTour, glasshouseView, reviewGlasshouse, GLASSHOUSE_PLANTS, GLASSHOUSE_RULES, GLASSHOUSE_TASKS, type Glasshouse, type GlasshouseActor, type GlasshouseReview } from './glasshouse-restoration.ts';
import { postGlasshouseWork, type GlasshousePineAccount } from './glasshouse-pine.ts';

// Unregistered candidate port. The future SQL implementation owns locking,
// authenticated movement, rollbacks, request size limits and durability.
type Member = Omit<GlasshouseActor,'pine'> & {account: GlasshousePineAccount};
export type GlasshouseDecision =
 | {ok:true; publicProject: NonNullable<ReturnType<typeof glasshouseView>>; pineHeld: number}
 | {ok:false; reason:string};
export type GlasshouseAward = NonNullable<ReturnType<typeof glasshouseTour>>;
type TourDecision = {ok:true; plant:GlasshouseAward['plant']} | {ok:false; reason:string};
export type GlasshouseReceipt =
 | {kind:'work'; reviewId:string; decision:GlasshouseDecision}
 | {kind:'tour'; plant:GlasshouseAward['plant']; decision:TourDecision};

export type GlasshouseTransaction = {
 lockMember: (resident:string)=>Promise<Member|undefined>;
 lockProject: ()=>Promise<Glasshouse>;
 findReview: (resident:string,id:string)=>Promise<GlasshouseReview|undefined>;
 findReceipt: (resident:string,id:string)=>Promise<GlasshouseReceipt|undefined>;
 findAward: (resident:string,revision:number)=>Promise<GlasshouseAward|undefined>;
 saveReview: (review:GlasshouseReview)=>Promise<void>;
 saveMember: (resident:string,account:GlasshousePineAccount)=>Promise<void>;
 saveProject: (project:Glasshouse)=>Promise<void>;
 saveReceipt: (resident:string,id:string,receipt:GlasshouseReceipt)=>Promise<void>;
 saveAward: (award:GlasshouseAward)=>Promise<void>;
};
export type GlasshouseStore = {transact:<T>(fn:(tx:GlasshouseTransaction)=>Promise<T>)=>Promise<T>};

const workRequest = z.object({commandId:z.uuid(),reviewId:z.uuid()}).strict();
const tourRequest = z.object({commandId:z.uuid(),plant:z.enum(GLASSHOUSE_PLANTS)}).strict();
const taskSchema = z.enum(GLASSHOUSE_TASKS);
const reject = (reason:string)=>({ok:false,reason} as const);

export function glasshouseActions(store: GlasshouseStore, currentTime:()=>number, issueId:()=>string) {
 return {
  async review(resident:string, task:unknown){
   const parsed=taskSchema.safeParse(task);
   if(!parsed.success)return reject('request');
   return store.transact(async tx=>{
    // Match the existing actor-before-project lock order.
    const member=await tx.lockMember(resident);
    if(member?.resident!==resident)return reject('resident');
    const project=await tx.lockProject();
    const prepared=reviewGlasshouse(project,{...member,pine:member.account.pine.carried},parsed.data,currentTime(),issueId());
    if(prepared.ok)await tx.saveReview(prepared.review);
    return prepared;
   });
  },

  async confirm(resident:string, body:unknown):Promise<GlasshouseDecision & {replayed?:boolean}>{
   const parsed=workRequest.safeParse(body);
   if(!parsed.success)return reject('request');
   const {commandId,reviewId}=parsed.data;
   return store.transact(async tx=>{
    const member=await tx.lockMember(resident);
    if(member?.resident!==resident)return reject('resident');
    const previous=await tx.findReceipt(resident,commandId);
    if(previous)return previous.kind==='work'&&previous.reviewId===reviewId?{...previous.decision,replayed:true}:reject('used-command-id');
    const project=await tx.lockProject();
    const review=await tx.findReview(resident,reviewId);
    const now=currentTime();
    const result=postGlasshouseWork(project,member.account,member,reviewId,review,now);
    let decision:GlasshouseDecision;
    if(result.ok){
     const publicProject=glasshouseView(result.project,now);
     if(!publicProject)throw new Error('A valid project outcome could not be projected.');
     if(result.debit)await tx.saveMember(resident,result.account);
     await tx.saveProject(result.project);
     decision={ok:true,publicProject,pineHeld:result.account.pine.carried};
    }else decision=result;
    await tx.saveReceipt(resident,commandId,{kind:'work',reviewId,decision});
    return decision;
   });
  },

  async keepPlant(resident:string, body:unknown):Promise<TourDecision & {replayed?:boolean}>{
   const parsed=tourRequest.safeParse(body);
   if(!parsed.success)return reject('request');
   const {commandId,plant}=parsed.data;
   return store.transact(async tx=>{
    const member=await tx.lockMember(resident);
    if(member?.resident!==resident)return reject('resident');
    const previous=await tx.findReceipt(resident,commandId);
    if(previous)return previous.kind==='tour'&&previous.plant===plant?{...previous.decision,replayed:true}:reject('used-command-id');
    const project=await tx.lockProject();
    const alreadyKept=await tx.findAward(resident,GLASSHOUSE_RULES.revision);
    const award=glasshouseTour(project,{...member,pine:member.account.pine.carried},!!alreadyKept,plant,currentTime());
    if(award)await tx.saveAward(award);
    const decision:TourDecision=award?{ok:true,plant:award.plant}:reject(alreadyKept?'already-kept':'tour-unavailable');
    await tx.saveReceipt(resident,commandId,{kind:'tour',plant,decision});
    return decision;
   });
  },
 };
}
