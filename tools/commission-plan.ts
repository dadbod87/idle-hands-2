import {CARPENTRY_RULES} from '../src/game/carpentry.ts';
import {CROP_DEFS,GARDEN_RULES} from '../src/game/garden.ts';

/** IH2-069 analytical candidate only. Never serialize this into a player save.
 * Actual constants inform the model; proposed spending has its OWN ledgers.
 * No commands, HTTP, database, human durations or server-authority proof. */
export const HOUR=3_600_000;
export const HORIZON=42*24*HOUR;
export const COMMISSION_OPTIONS=[
 {id:'route-card-only',pine:0,radish:0,marigold:0,waitMs:0,physical:false},
 {id:'pine-and-lunch',pine:2,radish:1,marigold:0,waitMs:0,physical:true},
 {id:'flower-fee',pine:4,radish:0,marigold:1,waitMs:0,physical:true},
 {id:'another-wait',pine:2,radish:1,marigold:0,waitMs:6*HOUR,physical:true}
] as const;
export type OptionId=typeof COMMISSION_OPTIONS[number]['id'];
export type ScheduleId='hourly-with-teaching'|'daily-with-teaching'|'every-three-days'|'missed-first-week';
export type StartId='fresh'|'empty-pine-pool'|'easel-already-finishing'|'full-produce-and-pine';
export type Policy='box-first'|'reserve-next-easel';
export function quoteImpact(stock:{pine:number;radish:number;marigold:number},optionId:OptionId='pine-and-lunch'){
 const cost=COMMISSION_OPTIONS.find(o=>o.id===optionId)!;
 const eligible=(s:typeof stock)=>({easel:s.pine>=4&&s.marigold>=1,hamper:s.pine>=CARPENTRY_RULES.hamperPine&&s.radish>=CARPENTRY_RULES.hamperRadishes&&s.marigold>=1,welcomeRequest:s.radish>=1&&s.marigold>=1});
 const before=eligible(stock),affordable=cost.physical&&stock.pine>=cost.pine&&stock.radish>=cost.radish&&stock.marigold>=cost.marigold;
 const after=affordable?{pine:stock.pine-cost.pine,radish:stock.radish-cost.radish,marigold:stock.marigold-cost.marigold}:null;
 const afterEligibility=after?eligible(after):before;
 return{stock:{...stock},option:optionId,affordable,after,beforeEligibility:before,afterEligibility,displacedGoals:(Object.keys(before) as Array<keyof typeof before>).filter(k=>before[k]&&!afterEligibility[k]),limits:'Input sufficiency only; actual cooldown, location, tool, jobs and player choice remain separate. Preview spends nothing.'};
}
type Crop='radish'|'marigold';
type Bed={crop:Crop;readyAt:number};
export type ModelState={
 at:number;seed:Record<Crop,number>;produce:Record<Crop,number>;harvested:Record<Crop,number>;
 beds:Array<Bed|null>;planted:number;firstRadishUsed:boolean;
 pool:number;poolAt:number;pine:number;pineGathered:number;
 easelsStarted:number;easelsClaimed:number;easelDue:number|null;easelStartTimes:number[];
 boxPaidAt:number|null;boxDue:number|null;boxClaimedAt:number|null;boxOwned:0|1;
 spent:{pineBox:number;radishBox:number;flowerBox:number};
 routeCardAt:number|null;ordinaryJob:{startedAt:0;readyAt:number};
};
export function visits(schedule:ScheduleId,end=HORIZON):number[]{
 const values=[0];
 if(schedule==='hourly-with-teaching'||schedule==='daily-with-teaching')values.push(GARDEN_RULES.firstRadishMs);
 const step=schedule==='hourly-with-teaching'?HOUR:schedule==='every-three-days'?72*HOUR:24*HOUR;
 const first=schedule==='missed-first-week'?7*24*HOUR:step;
 for(let at=first;at<=end;at+=step)values.push(at);
 return [...new Set(values.filter(t=>t<=end))].sort((a,b)=>a-b);
}
export function initialState(kind:StartId):ModelState{
 const full=kind==='full-produce-and-pine',running=kind==='easel-already-finishing';
 return{at:0,seed:{radish:full?0:2,marigold:full?0:1},produce:{radish:full?12:0,marigold:full?12:0},
  harvested:{radish:full?12:0,marigold:full?12:running?1:0},
  beds:full?[{crop:'radish',readyAt:0},{crop:'radish',readyAt:0},{crop:'marigold',readyAt:0}]:[null,null,null],
  planted:full?27:running?1:0,firstRadishUsed:full,
  pool:kind==='empty-pine-pool'||running?0:6,poolAt:0,pine:full?24:running?2:0,pineGathered:full?24:running?6:0,
  easelsStarted:running?1:0,easelsClaimed:0,easelDue:running?CARPENTRY_RULES.easelMs:null,easelStartTimes:running?[0]:[],
  boxPaidAt:null,boxDue:null,boxClaimedAt:null,boxOwned:0,spent:{pineBox:0,radishBox:0,flowerBox:0},
  routeCardAt:null,ordinaryJob:{startedAt:0,readyAt:12*HOUR}};
}
function gather(s:ModelState,now:number){
 const earned=Math.floor((now-s.poolAt)/CARPENTRY_RULES.pineMs);
 if(s.pool===CARPENTRY_RULES.pineCap)s.poolAt=now;
 else if(earned>0){s.pool=Math.min(CARPENTRY_RULES.pineCap,s.pool+earned);s.poolAt=s.pool===CARPENTRY_RULES.pineCap?now:s.poolAt+earned*CARPENTRY_RULES.pineMs;}
 const take=Math.min(s.pool,CARPENTRY_RULES.carriedCap-s.pine);s.pool-=take;s.pine+=take;s.pineGathered+=take;
}
function harvestAndPlant(s:ModelState,now:number){
 for(let i=0;i<3;i++){
  const bed=s.beds[i];if(bed&&bed.readyAt<=now&&s.produce[bed.crop]<GARDEN_RULES.stack){
   s.produce[bed.crop]++;s.harvested[bed.crop]++;s.seed[bed.crop]++;s.beds[i]=null;
  }
 }
 // Keep the existing two-radish/one-flower split; no new seed entitlement.
 for(let i=0;i<3;i++)if(!s.beds[i]){
  const crop:Crop=i===2?'marigold':'radish';if(s.seed[crop]===0)continue;
  const grow=crop==='radish'&&!s.firstRadishUsed?GARDEN_RULES.firstRadishMs:CROP_DEFS[crop].durationMs;
  s.seed[crop]--;s.beds[i]={crop,readyAt:now+grow};s.planted++;if(crop==='radish')s.firstRadishUsed=true;
 }
}
export function assertConservation(s:ModelState){
 const issue=(text:string)=>{throw Error('Commission model: '+text);};
 if(s.pine<0||s.pine>24||s.pool<0||s.pool>6)issue('pine bounds');
 if(s.pineGathered!==s.pine+4*s.easelsStarted+s.spent.pineBox)issue('pine ledger');
 if(s.harvested.radish!==s.produce.radish+s.spent.radishBox||s.harvested.marigold!==s.produce.marigold+s.easelsStarted+s.spent.flowerBox)issue('produce ledger');
 if(s.planted!==s.harvested.radish+s.harvested.marigold+s.beds.filter(Boolean).length)issue('plant history');
 for(const crop of ['radish','marigold'] as const){
  if(s.seed[crop]+s.beds.filter(b=>b?.crop===crop).length!==CROP_DEFS[crop].seedQuota)issue('seed entitlement');
  if(s.produce[crop]<0||s.produce[crop]>12)issue('produce bounds');
 }
 if(s.easelsStarted!==s.easelsClaimed+(s.easelDue===null?0:1))issue('easel count');
 if(s.boxOwned!==0&&s.boxOwned!==1||s.boxOwned===1&&(s.boxPaidAt===null||s.boxClaimedAt===null)||s.boxPaidAt===null&&s.boxDue!==null)issue('unique box');
 if(s.ordinaryJob.startedAt!==0||s.ordinaryJob.readyAt!==12*HOUR)issue('ordinary job changed');
}
export type Cohort={option:OptionId;schedule:ScheduleId;start:StartId;policy:Policy;end?:number};
export function runCommissionModel(input:Cohort){
 const option=COMMISSION_OPTIONS.find(o=>o.id===input.option)!;if(!option)throw Error('Unknown candidate');
 const s=initialState(input.start);
 const targetStart=s.easelsStarted+1,events:Array<{at:number;kind:string}>=[];
 for(const now of visits(input.schedule,input.end??HORIZON)){
  s.at=now;
  // Known-answer abstract chapter at the first visit, not a human-time claim.
  if(s.routeCardAt===null){s.routeCardAt=now;events.push({at:now,kind:'free-route-card'});}
  gather(s,now);if(s.easelDue!==null&&s.easelDue<=now){s.easelsClaimed++;s.easelDue=null;}
  harvestAndPlant(s,now);
  const reserve=input.policy==='reserve-next-easel'&&s.easelsStarted<targetStart;
  // A pine-only price may be paid before a flower grows if it retains the four
  // pine needed by that goal. Requiring an already-grown unspent flower here
  // would manufacture an unrelated delay in the proposed no-flower option.
  const preservesWoodAndFlower=!reserve||s.pine-option.pine>=4&&(option.marigold===0||s.produce.marigold-option.marigold>=1);
  if(option.physical&&s.boxPaidAt===null&&s.routeCardAt!==null&&s.pine>=option.pine&&s.produce.radish>=option.radish&&s.produce.marigold>=option.marigold&&preservesWoodAndFlower){
   s.pine-=option.pine;s.produce.radish-=option.radish;s.produce.marigold-=option.marigold;
   s.spent.pineBox=option.pine;s.spent.radishBox=option.radish;s.spent.flowerBox=option.marigold;
   s.boxPaidAt=now;s.boxDue=now+option.waitMs;events.push({at:now,kind:'box-paid'});
  }
  if(s.boxDue!==null&&s.boxDue<=now&&s.boxOwned===0){s.boxOwned=1;s.boxClaimedAt=now;events.push({at:now,kind:'box-claimed'});}
  if(s.easelDue===null&&s.easelsStarted<99&&s.pine>=4&&s.produce.marigold>=1){
   s.pine-=4;s.produce.marigold--;s.easelsStarted++;s.easelStartTimes.push(now);s.easelDue=now+CARPENTRY_RULES.easelMs;
  }
  harvestAndPlant(s,now);assertConservation(s);
 }
 return{...input,end:input.end??HORIZON,routeCardAt:s.routeCardAt,boxPaidAt:s.boxPaidAt,boxReadyAt:s.boxDue,boxClaimedAt:s.boxClaimedAt,boxOwned:s.boxOwned,
  nextEaselStartAt:s.easelStartTimes[targetStart-1]??null,firstEaselStartAt:s.easelStartTimes[0]??null,
  easelsStarted:s.easelsStarted,easelsClaimed:s.easelsClaimed,remainingPine:s.pine,remainingProduce:{...s.produce},
  seedEntitlementRetained:true,oldJobUnchanged:true,events,state:s};
}
export function simulateCommissions(){
 const schedules:ScheduleId[]=['hourly-with-teaching','daily-with-teaching','every-three-days','missed-first-week'];
 const starts:StartId[]=['fresh','empty-pine-pool','easel-already-finishing','full-produce-and-pine'];
 const policies:Policy[]=['box-first','reserve-next-easel'];
 return COMMISSION_OPTIONS.flatMap(option=>schedules.flatMap(schedule=>starts.flatMap(start=>policies.map(policy=>runCommissionModel({option:option.id,schedule,start,policy})))));
}
