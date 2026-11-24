import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyWorkshop,createWorkshop,isCurrentWorkshop,RECIPES,RESOURCE_IDS,settleWorkshop,type WorkshopCommand} from '../src/game/live-workshop.ts';
import {BRIDGE_BUILD_MS,MAINTENANCE_COST,MAINTENANCE_MS,PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../src/game/town-rules.ts';
import {contributeGlasshouse,glasshouseView,GLASSHOUSE_TASKS,newGlasshouse,reviewGlasshouse,type GlasshouseTask} from '../src/game/glasshouse.ts';

const HOUR=3_600_000,DAY=24*HOUR,START=Date.UTC(2026,10,25);
const schedules=[
 {name:'once daily',hours:[0]},
 {name:'morning and evening',hours:[0,12]},
 {name:'frequent short visits',hours:[0,4,8,12,16,20]},
] as const;

type Command = WorkshopCommand extends infer T
 ? T extends WorkshopCommand ? Omit<T,'id'|'expectedRevision'> : never : never;

function simulate({name,hours}:typeof schedules[number],residents:number,weekAway:boolean,volunteer:boolean){
 let clock=START,commands=0,bridgeWork=0,bridgeFundedAt:number|null=null,project=newGlasshouse();
 const people=Array.from({length:residents},(_,i)=>({
  id:'resident-'+(i+1),workshop:createWorkshop(START),maintenance:false,firstPlant:null as number|null,
  firstEasel:null as number|null,homeBudget:null as number|null,upgradeBudget:null as number|null,
  waitingWithCropOrEasel:0,visits:0,away:0,trails:0,paidPine:0,
 }));
 function apply(person:typeof people[number],action:Command){
  const result=applyWorkshop(person.workshop,{...action,id:'pacing-'+(++commands),expectedRevision:person.workshop.revision},clock);
  assert.ok(result.ok,result.message);
  person.workshop=result.state;
 }
 function bridgeCredit(){
  bridgeWork++;
  if(bridgeWork===3)bridgeFundedAt=clock;
 }
 function job(person:typeof people[number],task:GlasshouseTask){
  const actor={resident:person.id,atGlasshouse:true,pine:person.workshop.carpentry.pine.carried,trailStamps:person.trails};
  const id='5479e301-61de-48c6-a183-'+String(commands+1).padStart(12,'0');
  const quote=reviewGlasshouse(project,actor,task,clock,id);
  assert.ok(quote.ok);
  const result=contributeGlasshouse(project,actor,id,quote.review,clock);
  assert.ok(result.ok);
  project=result.project;
  if(result.debit){
   const wood=person.workshop.carpentry;
   wood.glasshousePine=result.debit.pine;
   wood.pine.carried-=result.debit.pine;
   wood.pine.spent+=result.debit.pine;
   person.paidPine+=result.debit.pine;
  }
 }
 for(let day=0;day<42;day++)for(const hour of hours)for(const [i,person] of people.entries()){
  // Ten minutes between model co-op arrivals leaves distinct confirmed visits.
  clock=START+day*DAY+hour*HOUR+i*10*60_000;
  if(weekAway&&i===0&&day>=1&&day<8){person.away++;continue;}
  person.visits++;
  person.workshop=settleWorkshop(person.workshop,clock);
  const entry=person.workshop;
  const jobWaiting=!!entry.job&&entry.job.readyAt>clock;
  let alternative=false;
  if(entry.job&&entry.job.readyAt<=clock)apply(person,{kind:'claim'});
  for(const resource of RESOURCE_IDS)if(person.workshop.inventory[resource]<14&&person.workshop.nodes[resource].stock)
   apply(person,{kind:'gather',resource});
  if(!person.workshop.stats.planterPlacedAfterCraft){
   apply(person,{kind:'craft',recipe:'planter'});
   clock=person.workshop.job!.readyAt;
   apply(person,{kind:'claim'});
   apply(person,{kind:'place',prop:'planter',slot:'north-west'});
  }
  if(!person.maintenance&&bridgeWork<3){
   // Same one-time fee and explicit completion as the shared lesson; no kit minted.
   for(const resource of RESOURCE_IDS){
    assert.ok(person.workshop.inventory[resource]>=MAINTENANCE_COST[resource]);
    person.workshop.inventory[resource]-=MAINTENANCE_COST[resource];
   }
   clock+=MAINTENANCE_MS;
   person.maintenance=true;
   bridgeCredit();
  }
  if(bridgeWork<3&&person.workshop.bridgeKits){
   person.workshop.bridgeKits--;
   bridgeCredit();
  }
  if(!person.workshop.carpentry.saw.owned){
   apply(person,{kind:'carpentry',carpentryAction:{action:'learn-saw'}});
   apply(person,{kind:'carpentry',carpentryAction:{action:'equip-saw',equipped:true}});
   alternative=true;
  }
  if(person.workshop.carpentry.pine.available&&person.workshop.carpentry.pine.carried<18)
   apply(person,{kind:'carpentry',carpentryAction:{action:'gather-pine',station:'crooked'}});
  if(bridgeFundedAt!==null&&clock>=bridgeFundedAt+BRIDGE_BUILD_MS){
   if(person.trails<3){person.trails=3;alternative=true;}
   if(volunteer){
    for(const [index,task] of GLASSHOUSE_TASKS.entries()){
     if(!project.work[task]&&(residents===1||i===index)){
      job(person,task);
      alternative=true;
     }
    }
    if(glasshouseView(project,clock)?.phase==='open'&&person.firstPlant===null){person.firstPlant=clock;alternative=true;}
   }
  }
  const bed=person.workshop.garden.beds[0];
  if(bed&&bed.readyAt<=clock&&person.workshop.garden.produce.marigold<8){
   apply(person,{kind:'garden',gardenAction:{action:'harvest',bed:0}});alternative=true;
  }
  if(!person.workshop.garden.beds[0]){
   apply(person,{kind:'garden',gardenAction:{action:'plant',bed:0,crop:'marigold'}});alternative=true;
  }
  const easel=person.workshop.carpentry.job;
  if(easel&&easel.readyAt<=clock){
   apply(person,{kind:'carpentry',carpentryAction:{action:'claim-easel'}});
   person.firstEasel??=clock;
   alternative=true;
  }
  if(!person.workshop.carpentry.job&&person.workshop.carpentry.produced<6&&person.workshop.carpentry.pine.carried>=4&&person.workshop.garden.produce.marigold){
   apply(person,{kind:'carpentry',carpentryAction:{action:'start-easel'}});alternative=true;
  }
  if(!person.workshop.job&&person.workshop.bridgeKits<PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS&&RESOURCE_IDS.every(resource=>person.workshop.inventory[resource]>=RECIPES['bridge-kit'].cost[resource]))
   apply(person,{kind:'craft',recipe:'bridge-kit'});
  if(person.workshop.bridgeKits>=PLOT_CLAIM_KITS)person.homeBudget??=clock;
  if(person.workshop.bridgeKits>=PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS)person.upgradeBudget??=clock;
  if(jobWaiting&&alternative)person.waitingWithCropOrEasel++;
  assert.ok(isCurrentWorkshop(person.workshop));
 }
 const hoursFromStart=(time:number|null)=>time===null?null:Number(((time-START)/HOUR).toFixed(2));
 return {schedule:name,residents,weekAway,volunteer,bridgeFundsAtHours:hoursFromStart(bridgeFundedAt),
  glasshouseOpensAtHours:hoursFromStart(project.opensAt),projectDeadline:project.opensAt,
  people:people.map(person=>({
   firstPlantAtHours:hoursFromStart(person.firstPlant),firstEaselAtHours:hoursFromStart(person.firstEasel),
   starterBudgetAtHours:hoursFromStart(person.homeBudget),upgradeBudgetAtHours:hoursFromStart(person.upgradeBudget),
   visits:person.visits,skippedVisits:person.away,ordinaryWaitVisitsWithOtherWork:person.waitingWithCropOrEasel,
   heldKits:person.workshop.bridgeKits,heldEasels:person.workshop.carpentry.produced,pineContributed:person.paidPine,
  })),
 };
}

const report=schedules.flatMap(schedule=>[1,3].flatMap(residents=>[false,true].map(weekAway=>{
 const actual=simulate(schedule,residents,weekAway,true),comparison=simulate(schedule,residents,weekAway,false);
 assert.equal(actual.people.reduce((sum,p)=>sum+p.pineContributed,0),2);
 for(const [i,person] of actual.people.entries()){
  assert.equal(person.starterBudgetAtHours,comparison.people[i].starterBudgetAtHours);
  assert.equal(person.upgradeBudgetAtHours,comparison.people[i].upgradeBudgetAtHours);
  assert.ok(person.firstPlantAtHours!==null&&person.firstPlantAtHours>=actual.glasshouseOpensAtHours!);
 }
 return {...actual,easelDelayHours:actual.people.map((p,i)=>p.firstEaselAtHours!-comparison.people[i].firstEaselAtHours!)};
})));
const tracked=['tools/simulate-glasshouse-pacing.ts','src/game/live-workshop.ts','src/game/workshop.ts','src/game/glasshouse.ts','src/game/garden.ts','src/game/carpentry.ts','src/game/town-rules.ts'];
console.log(JSON.stringify({
 classification:'Deterministic gameplay model, not live player playtime, retention or hosted/database acceptance.',
 assumptions:[
  'A fresh 42-day town with 1 or 3 scripted residents; the primary resident alone may miss days 2 through 8. A planned visit is an opportunity, not a requirement.',
  'Workshop, carpentry, garden, and Glasshouse contribution commands run actual pure rules. The bridge fee and three-credit gate copy the current server constants. Each trail visit assumes instant travel, known answers and all three notes.',
  'The simulation spends real modeled wood and materials but holds collected kits for conditional affordability after bridge donations. It neither buys nor simulates house construction or leases.',
  'Only the first observed opening visit counts the plant. Conditions such as real walk times, stock max by other activity, consumed handoff time, distractions and new residents are omitted.',
 ],
 sources:Object.fromEntries(tracked.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
 report,
},null,2));
