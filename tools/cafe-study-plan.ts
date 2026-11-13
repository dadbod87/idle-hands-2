/** Analytical design only. No game-save shape, authority, inventory grants or runtime imports. */
import assert from 'node:assert/strict';
import {CROP_DEFS,GARDEN_RULES} from '../src/game/garden.ts';
import {CARPENTRY_RULES} from '../src/game/carpentry.ts';

export const MINUTE=60_000, DAY=1440;
export type Hypothesis={radishes:1|2;preparation:0|2;cooldown:0|240|480};
export const STUDY_DEFAULT:Hypothesis={radishes:1,preparation:0,cooldown:240};
export const PUBLIC_TARGET=12, PERSONAL_TARGET=3, OPENING_DELAY=240;
export type Schedule='daily'|'twice'|'active'|'missed-week';
export type Priority='pip-first'|'cafe-first';
type Crop='radish'|'marigold';
type Resident={
 seeds:Record<Crop,number>;beds:Array<{crop:Crop;readyAt:number}|null>;firstRadish:boolean;
 produce:Record<Crop,number>;harvested:Record<Crop,number>;planted:number;
 pine:{pool:number;lastAt:number;held:number;gathered:number;used:number};
 pipAt:number|null;easel:{readyAt:number}|null;easelStarts:number;easels:number;firstEaselAt:number|null;
 meal:{readyAt:number}|null;mealStarts:number;visits:number;nextAt:number;firstServeAt:number|null;teapotAt:number|null;
 visitBudgetMinutes:number;maxHeld:number;maxUnclaimedMeals:number;
};
export type Town={credits:number;fundedAt:number|null;readyAt:number|null;observedOpenAt:number|null};
export function createDesignResident():Resident{
 return{seeds:{radish:2,marigold:1},beds:[null,null,null],firstRadish:false,produce:{radish:0,marigold:0},harvested:{radish:0,marigold:0},planted:0,pine:{pool:6,lastAt:0,held:0,gathered:0,used:0},pipAt:null,easel:null,easelStarts:0,easels:0,firstEaselAt:null,meal:null,mealStarts:0,visits:0,nextAt:0,firstServeAt:null,teapotAt:null,visitBudgetMinutes:0,maxHeld:0,maxUnclaimedMeals:0};
}
export const createDesignTown=():Town=>({credits:0,fundedAt:null,readyAt:null,observedOpenAt:null});
function validate(h:Hypothesis){assert.ok([1,2].includes(h.radishes));assert.ok([0,2].includes(h.preparation));assert.ok([0,240,480].includes(h.cooldown));}
export function accounting(s:Resident,h:Hypothesis){
 const active=s.beds.filter(b=>b!==null);
 return{
  seeds: s.seeds.radish+active.filter(b=>b.crop==='radish').length===2&&s.seeds.marigold+active.filter(b=>b.crop==='marigold').length===1,
  radishes:s.harvested.radish===s.produce.radish+h.radishes*s.mealStarts+(s.pipAt===null?0:1),
  flowers:s.harvested.marigold===s.produce.marigold+s.easelStarts,
  pine:s.pine.gathered===s.pine.held+s.pine.used&&s.pine.used===4*s.easelStarts+(s.pipAt===null?0:2),
  meals:s.mealStarts===s.visits+(s.meal?1:0),easels:s.easelStarts===s.easels+(s.easel?1:0),
  plants:s.planted===s.harvested.radish+s.harvested.marigold+active.length,
  capacity:s.produce.radish<=12&&s.produce.marigold<=12&&s.pine.held<=24&&s.pine.pool<=6,
 };
}
/** Paid preparation is a hypothesis; only the study model uses it. A false result spends nothing. */
export function prepare(s:Resident,t:Town,h:Hypothesis,now:number):boolean{
 validate(h);assert.ok(Number.isSafeInteger(now)&&now>=0);
 if(s.meal||now<s.nextAt||s.produce.radish<h.radishes||s.visits>=PERSONAL_TARGET&&t.credits>=PUBLIC_TARGET)return false;
 s.produce.radish-=h.radishes;s.mealStarts++;s.meal={readyAt:now+h.preparation};s.maxUnclaimedMeals=Math.max(s.maxUnclaimedMeals,h.preparation===0?0:1);
 if(h.preparation===0)assert.equal(serve(s,t,h,now),true);
 return true;
}
/** No UUID/network proof: this only exercises conservation and capped design outcomes. */
export function serve(s:Resident,t:Town,h:Hypothesis,now:number):boolean{
 validate(h);assert.ok(Number.isSafeInteger(now)&&now>=0);
 if(!s.meal||s.meal.readyAt>now)return false;
 s.meal=null;s.visits++;s.nextAt=now+h.cooldown;s.firstServeAt??=now;
 if(s.visits===PERSONAL_TARGET)s.teapotAt=now;
 if(t.credits<PUBLIC_TARGET){t.credits++;if(t.credits===PUBLIC_TARGET){assert.equal(t.fundedAt,null);t.fundedAt=now;t.readyAt=now+OPENING_DELAY;}}
 return true;
}
function pineSettlement(s:Resident,now:number){
 const p=s.pine,period=CARPENTRY_RULES.pineMs/MINUTE;
 if(p.pool===6)p.lastAt=now;
 else{const earned=Math.floor((now-p.lastAt)/period);if(earned){p.pool=Math.min(6,p.pool+earned);p.lastAt=p.pool===6?now:p.lastAt+earned*period;}}
}
function action(s:Resident,t:Town,h:Hypothesis,now:number,priority:Priority,enabled:boolean){
 pineSettlement(s,now);
 if(s.meal&&serve(s,t,h,now))return;
 const ready=s.beds.findIndex(b=>b!==null&&b.readyAt<=now&&s.produce[b.crop]<GARDEN_RULES.stack);
 if(ready>=0){const crop=s.beds[ready]!.crop;s.beds[ready]=null;s.produce[crop]++;s.harvested[crop]++;s.seeds[crop]++;return;}
 if(s.easel&&s.easel.readyAt<=now){s.easel=null;s.easels++;s.firstEaselAt??=now;return;}
 // All cohorts deliberately protect the existing flower/easel goal. Café never spends flowers.
 if(!s.easel&&s.produce.marigold&&s.pine.held>=4){s.produce.marigold--;s.pine.held-=4;s.pine.used+=4;s.easelStarts++;s.easel={readyAt:now+CARPENTRY_RULES.easelMs/MINUTE};return;}
 const pip=()=>{if(s.pipAt!==null||s.produce.radish<1||s.pine.held<2)return false;s.produce.radish--;s.pine.held-=2;s.pine.used+=2;s.pipAt=now;return true;};
 const cafe=()=>{
  if(!enabled||s.visits>=PERSONAL_TARGET&&t.credits>=PUBLIC_TARGET)return false;
  if(priority==='pip-first'&&s.pipAt===null)return false;
  return prepare(s,t,h,now);
 };
 if(priority==='pip-first'?(pip()||cafe()):(cafe()||pip()))return;
 const empty=s.beds.indexOf(null);
 if(empty>=0){const crop:Crop|undefined=s.seeds.radish?'radish':s.seeds.marigold?'marigold':undefined;if(crop){s.seeds[crop]--;s.planted++;const duration=crop==='radish'&&!s.firstRadish?GARDEN_RULES.firstRadishMs:CROP_DEFS[crop].durationMs;if(crop==='radish')s.firstRadish=true;s.beds[empty]={crop,readyAt:now+duration/MINUTE};return;}}
 if(s.pine.pool&&s.pine.held<24){const n=Math.min(s.pine.pool,24-s.pine.held);s.pine.pool-=n;s.pine.held+=n;s.pine.gathered+=n;}
}
function visitMinutes(schedule:Schedule,days:number,offset:number):number[]{
 const times=new Set<number>();for(let n=0;n<20;n++)times.add(n+offset);
 for(let d=0;d<days;d++){
  if(schedule==='missed-week'&&d>=7&&d<14)continue;
  const starts=schedule==='active'?Array.from({length:24},(_,i)=>i*30):schedule==='twice'?[0,600]:[0];
  for(const start of starts)for(let n=0;n<5;n++)times.add(d*DAY+start+n+offset);
 }
 return[...times].filter(n=>n<days*DAY).sort((a,b)=>a-b);
}
export function simulateCafe(h:Hypothesis,schedule:Schedule,people:number,priority:Priority,days=28,enabled=true,actionBudget:1|4=1){
 validate(h);assert.ok([1,4].includes(actionBudget));assert.ok(['daily','twice','active','missed-week'].includes(schedule));assert.ok(['pip-first','cafe-first'].includes(priority));assert.ok(Number.isInteger(people)&&people>=1&&people<=12);assert.ok(Number.isInteger(days)&&days>0&&days<=42);
 const residents=Array.from({length:people},createDesignResident),town=createDesignTown(),events=new Map<number,number[]>();
 for(let i=0;i<people;i++)for(const now of visitMinutes(schedule,days,i)){const ids=events.get(now)??[];ids.push(i);events.set(now,ids);}
 for(const now of[...events.keys()].sort((a,b)=>a-b)){
  if(town.readyAt!==null&&now>=town.readyAt)town.observedOpenAt??=now;
  for(const i of events.get(now)!){const s=residents[i]!;for(let slot=0;slot<actionBudget;slot++)action(s,town,h,now,priority,enabled);s.visitBudgetMinutes++;s.maxHeld=Math.max(s.maxHeld,s.produce.radish,s.produce.marigold);const ledger=accounting(s,h);assert.ok(Object.values(ledger).every(Boolean),JSON.stringify(ledger));assert.ok(town.credits<=PUBLIC_TARGET);}
 }
 return{hypothesis:h,schedule,people,priority,days,serviceEnabled:enabled,actionBudget,town,residents:residents.map(s=>({firstServeAt:s.firstServeAt,teapotAt:s.teapotAt,pipAt:s.pipAt,firstEaselAt:s.firstEaselAt,visits:s.visits,mealStarts:s.mealStarts,pendingMeal:s.meal,harvested:s.harvested,held:s.produce,seeds:s.seeds,beds:s.beds,pine:s.pine,easels:s.easels,visitBudgetMinutes:s.visitBudgetMinutes,maxHeld:s.maxHeld,maxUnclaimedMeals:s.maxUnclaimedMeals,ledger:accounting(s,h)}))};
}
export function cafeExperiment(){
 assert.deepEqual({radish:CROP_DEFS.radish.durationMs/MINUTE,flower:CROP_DEFS.marigold.durationMs/MINUTE,first:GARDEN_RULES.firstRadishMs/MINUTE,quotas:[CROP_DEFS.radish.seedQuota,CROP_DEFS.marigold.seedQuota],beds:GARDEN_RULES.beds,stack:GARDEN_RULES.stack,easel:CARPENTRY_RULES.easelMs/MINUTE,pine:CARPENTRY_RULES.pineMs/MINUTE},{radish:30,flower:240,first:5,quotas:[2,1],beds:3,stack:12,easel:720,pine:240},'Review café assumptions if actual source rules change.');
 const controls=[];for(const schedule of['daily','twice','active','missed-week']as const)for(const people of[1,4,12])for(const actionBudget of[1,4]as const){const c=simulateCafe(STUDY_DEFAULT,schedule,people,'pip-first',28,false,actionBudget);controls.push({schedule,people,actionBudget,serviceEnabled:false,firstPipAt:c.residents[0]!.pipAt,firstEaselAt:c.residents[0]!.firstEaselAt,easels:c.residents[0]!.easels,allConserve:c.residents.every(s=>Object.values(s.ledger).every(Boolean))});}
 const cases=[];for(const schedule of['daily','twice','active','missed-week']as const)for(const people of[1,4,12])for(const radishes of[1,2]as const)for(const preparation of[0,2]as const)for(const cooldown of[0,240,480]as const)for(const priority of['pip-first','cafe-first']as const)for(const actionBudget of[1,4]as const){
  const c=simulateCafe({radishes,preparation,cooldown},schedule,people,priority,28,true,actionBudget);
  cases.push({hypothesis:c.hypothesis,schedule,people,priority,actionBudget,town:c.town,firstServeAt:c.residents[0]!.firstServeAt,firstTeapotAt:c.residents[0]!.teapotAt,firstPipAt:c.residents[0]!.pipAt,firstEaselAt:c.residents[0]!.firstEaselAt,totalServes:c.residents.reduce((n,s)=>n+s.visits,0),totalRadishesUsed:c.residents.reduce((n,s)=>n+s.mealStarts*radishes,0),allConserve:c.residents.every(s=>Object.values(s.ledger).every(Boolean)),maxUnclaimedMeals:Math.max(...c.residents.map(s=>s.maxUnclaimedMeals))});
 }
 return{classification:'CANDIDATE_ANALYTICAL_ONLY',gameSaveCompatible:false,acceptedRuntime:'IH2-090 / f0a294af86d4b637f060c8f40a6d7f061d9cad15',unit:'integer real minutes, not town cosmetic time',assumptions:['Post free introductions/saw lesson and recipe knowledge; no carried produce or pine is granted. First garden planting remains unused. Not full fresh onboarding.','Initial20minute visit, then five-minute windows; daily, twice10h apart, active every30min for12h/day, or daily with days8–14 absent. Residents start one minute apart.','Sensitivity budgets of one or four abstract commands per minute. Travel, reading, server latency and actual skill are not calibrated; either budget may be optimistic or pessimistic. Synthetic time-budget effects are not active playtime or enjoyment.','Existing seeds, ready waits, stack bounds, pine refill and12heasel retained; all cohorts protect easel flower first. Pip-first and café-first differ deliberately. Hampers/mixed requests, ordinary bench and housing are not simulated. Café uses no ordinary materials/kits.','Candidate teapot has no general bag capacity conflict; entitlement is once-only. Full future allocation/placement/migration/UUID/concurrent authorization needs actual runtime tests, not this model.','New preparation refuses without spending after both3personal serves and12public credits. Already-paid pending counterexample tastings still count personally, exposing the unnecessary two-step race. No food inventory, stat buff, currency or automatic repeat.'],sourceInputs:{radishMinutes:CROP_DEFS.radish.durationMs/MINUTE,firstRadishMinutes:GARDEN_RULES.firstRadishMs/MINUTE,flowerMinutes:CROP_DEFS.marigold.durationMs/MINUTE,seeds:[2,1],beds:3,producePerFamily:12,easelMinutes:CARPENTRY_RULES.easelMs/MINUTE,pineRefillMinutes:CARPENTRY_RULES.pineMs/MINUTE},studyDefault:STUDY_DEFAULT,publicTarget:PUBLIC_TARGET,personalTarget:PERSONAL_TARGET,openingDelayMinutes:OPENING_DELAY,controls,cases};
}
