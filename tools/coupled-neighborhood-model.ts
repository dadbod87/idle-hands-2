import assert from 'node:assert/strict';
import {createWorkshop,applyWorkshop,settleWorkshop,isCurrentWorkshop,RESOURCE_IDS,RECIPES,STORAGE_LIMIT,REGEN_MS,type WorkshopState,type WorkshopCommand} from '../src/game/workshop.ts';
import {settleGarden,GARDEN_DAY as DAY,GARDEN_HOUR as HOUR} from '../src/game/garden.ts';
import {settleCarpentry,CARPENTRY_RULES} from '../src/game/carpentry.ts';
import {RECIPIENT_IDS} from '../src/game/commission.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../src/game/town-rules.ts';

export const SCHEDULES={daily:{hours:[9],minutes:10},regular:{hours:[9,21],minutes:15},active:{hours:[8,12,20,23],minutes:30},frequent:{hours:[0,2,4,6,8,10,12,14,16,18,20,22],minutes:5}} as const;
export type Schedule=keyof typeof SCHEDULES;
export type Policy='civic-first'|'easel-first'|'request-aware';
export type BoxChoice='card-only'|'box-first'|'after-first-kept';
export type Options={schedule:Schedule;policy:Policy;box:BoxChoice;days:number;absence?:boolean;startAt?:number};
export const POLICY_NOTES={
 'civic-first':'Every eligible daily mixed request, then every eligible4hhamper, then a kept easel up to six. No reserved ingredients; this may indefinitely postpone the first easel.',
 'easel-first':'Start up to six easels before requests/hampers. Reserve4pine/1flower while fewer than six easels have STARTED, including while one is finishing. Requests stop voluntarily after six.',
 'request-aware':'Prioritize an owed eligible mixed request when requests<easelsStarted, but keep crafting if that request is blocked. Both goals stop at six. Hampers use surplus after reserving4pine/1flower until both goals are met.'
} as const;

/** State is passively settled at now. Only declared visit windows can consume events. */
export function nextCoupledEvent(state:WorkshopState,now:number,finish:number):number|null{
 const nodeTimes=RESOURCE_IDS.filter(r=>state.inventory[r]<18&&state.nodes[r].stock<6&&RESOURCE_IDS.reduce((n,k)=>n+state.inventory[k],0)<STORAGE_LIMIT).map(r=>state.nodes[r].lastAt+REGEN_MS);
 const pineTime=state.carpentry.saw.equipped&&state.carpentry.pine.available<CARPENTRY_RULES.pineCap&&state.carpentry.pine.carried<CARPENTRY_RULES.carriedCap?state.carpentry.pine.lastAt+CARPENTRY_RULES.pineMs:undefined;
 const deadlines=[...nodeTimes,pineTime,state.garden.nextRequestAt??undefined,state.carpentry.nextHamperAt??undefined,state.job?.readyAt,state.carpentry.job?.readyAt,...state.garden.beds.filter(b=>b&&state.garden.produce[b.crop]<12).map(b=>b!.readyAt)].filter((t):t is number=>t!==undefined&&t>now&&t<=finish);
 return deadlines.length?Math.min(...deadlines):null;
}

export function runCoupledNeighborhood(options:Options){
 assert.ok(Object.hasOwn(SCHEDULES,options.schedule));assert.ok(Object.hasOwn(POLICY_NOTES,options.policy));
 assert.ok(['card-only','box-first','after-first-kept'].includes(options.box));assert.ok(Number.isInteger(options.days)&&options.days>=1&&options.days<=42);
 const anchor=options.startAt??0;assert.ok(Number.isSafeInteger(anchor)&&anchor>=0);
 const schedule=SCHEDULES[options.schedule],firstArrival=anchor+schedule.hours[0]*HOUR;
 let state=createWorkshop(anchor),now=anchor,sequence=0,validated=0,visits=0,skippedVisits=0,quietVisits=0,insideWaitMs=0;
 const gathered={scrap:0,timber:0,supplies:0},spent={scrap:0,timber:0,supplies:0};
 const counts:Record<string,number>={},milestones:Record<string,number|null>={firstPlanter:null,firstKit:null,houseBudget:null,upgradedHouseBudget:null,box:null,firstEaselStart:null,firstKeptEasel:null,sixKeptRecords:null,firstRequest:null,sixRequests:null,firstHamper:null};
 const kitClaims:number[]=[],easelClaims:number[]=[],requestTimes:number[]=[],hamperTimes:number[]=[],visitedDays:number[]=[],visitRows:Array<{at:number;commands:number;verbs:string[];waitMs:number}>=[];
 let verbs=new Set<string>();
 const mark=(key:string,condition:boolean)=>{if(condition&&milestones[key]===null)milestones[key]=now;};
 function validate(){
  assert.equal(isCurrentWorkshop(state),true,'Strict current root and child ledgers');validated++;
  for(const resource of RESOURCE_IDS)assert.equal(state.inventory[resource],gathered[resource]-spent[resource]);
  assert.equal(state.bridgeKits+(state.job?.recipe==='bridge-kit'?1:0),state.stats.bridgeJobsStarted);
  assert.equal(state.stats.crafted,state.stats.plantersCrafted+state.bridgeKits);
  assert.equal(state.owned.planter,state.stats.plantersCrafted);assert.equal(state.owned.easel,state.carpentry.produced);
  assert.equal(state.carpentry.commissionPine,2*state.commission.madeCount);assert.equal(state.garden.consumed.commission.radish,state.commission.madeCount);
  assert.equal(state.owned.letterbox,state.commission.madeCount);assert.equal(state.revision,sequence);
  assert.ok(RESOURCE_IDS.reduce((n,r)=>n+state.inventory[r],0)<=STORAGE_LIMIT);
 }
 function advance(time:number){
  assert.ok(time>=now);now=time;
  state={...settleWorkshop(state,now),observedAt:now,garden:settleGarden(state.garden,now),carpentry:settleCarpentry(state.carpentry,now)};validate();
 }
 function send(action:Record<string,unknown>,verb?:string){
  const before=state,result=applyWorkshop(state,{...action,id:'coupled-'+(++sequence),expectedRevision:state.revision} as WorkshopCommand,now);
  assert.equal(result.ok,true,result.message);assert.equal(result.replayed,false);state=result.state;
  const kind=String(action.kind),sub=(action.gardenAction??action.carpentryAction??action.commissionAction)as{action?:string}|undefined,key=kind+(sub?':'+sub.action:'');counts[key]=(counts[key]??0)+1;
  if(kind==='gather'){const resource=action.resource as typeof RESOURCE_IDS[number];gathered[resource]+=state.inventory[resource]-before.inventory[resource];}
  if(kind==='craft')for(const resource of RESOURCE_IDS)spent[resource]+=before.inventory[resource]-state.inventory[resource];
  if(kind==='claim'&&before.job?.recipe==='bridge-kit')kitClaims.push(now);
  if(state.carpentry.produced>before.carpentry.produced)easelClaims.push(now);
  if(state.garden.requests>before.garden.requests)requestTimes.push(now);
  if(state.carpentry.hampers>before.carpentry.hampers)hamperTimes.push(now);
  if(!['craft','claim'].includes(kind))assert.deepEqual(state.job,before.job,'Independent action preserves ordinary job');
  if(verb)verbs.add(verb);validate();
  mark('firstPlanter',state.stats.plantersCrafted>0);mark('firstKit',state.bridgeKits>0);
  mark('houseBudget',state.bridgeKits>=PLOT_CLAIM_KITS);mark('upgradedHouseBudget',state.bridgeKits>=PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS);
  mark('box',state.commission.madeCount===1);mark('firstEaselStart',state.carpentry.started>0);mark('firstKeptEasel',state.carpentry.produced>0);mark('sixKeptRecords',state.carpentry.recorded>=6);
  mark('firstRequest',state.garden.requests>0);mark('sixRequests',state.garden.requests>=6);mark('firstHamper',state.carpentry.hampers>0);
 }
 const garden=(gardenAction:Record<string,unknown>,verb?:string)=>send({kind:'garden',gardenAction},verb);
 const pine=(carpentryAction:Record<string,unknown>,verb?:string)=>send({kind:'carpentry',carpentryAction},verb);
 const post=(commissionAction:Record<string,unknown>,verb?:string)=>send({kind:'commission',commissionAction},verb);
 const canAfford=(recipe:keyof typeof RECIPES)=>RESOURCE_IDS.every(r=>state.inventory[r]>=RECIPES[recipe].cost[r]);
 function harvest(){for(let bed=0;bed<3;bed++){const crop=state.garden.beds[bed];if(crop&&crop.readyAt<=now&&state.garden.produce[crop.crop]<12)garden({action:'harvest',bed},'harvest');}}
 function plant(){for(let bed=0;bed<3;bed++)if(!state.garden.beds[bed]){const crop=state.garden.seeds.marigold?'marigold':state.garden.seeds.radish?'radish':null;if(crop)garden({action:'plant',bed,crop},'plant');}}
 function box(){if(options.box!=='card-only'&&!state.commission.madeCount&&(options.box==='box-first'||state.carpentry.produced>=1)&&state.carpentry.pine.carried>=2&&state.garden.produce.radish>=1)post({action:'make',motif:'moth'},'make-letterbox');}
 function easel(){if(state.carpentry.started<6&&!state.carpentry.job&&state.carpentry.pine.carried>=4&&state.garden.produce.marigold)pine({action:'start-easel'},'start-easel');}
 function request(reserveFlower:number,limit:number){if(state.garden.requests<limit&&state.garden.produce.radish>0&&state.garden.produce.marigold>reserveFlower&&(state.garden.nextRequestAt===null||state.garden.nextRequestAt<=now))garden({action:'submit-request'},'mixed-request');}
 function hamper(reservePine:number,reserveFlower:number){if(state.carpentry.pine.carried>=1+reservePine&&state.garden.produce.radish>=2&&state.garden.produce.marigold>=1+reserveFlower&&(state.carpentry.nextHamperAt===null||state.carpentry.nextHamperAt<=now))pine({action:'deliver-hamper'},'hamper-help');}
 function gatherPine(){if(state.carpentry.pine.available>0&&state.carpentry.pine.carried<24)pine({action:'gather-pine',station:'crooked'},'prepare-pine');}
 function gatherOrdinary(){for(const resource of RESOURCE_IDS)if(state.inventory[resource]<18&&state.nodes[resource].stock>0&&RESOURCE_IDS.reduce((n,r)=>n+state.inventory[r],0)<STORAGE_LIMIT)send({kind:'gather',resource},'prepare-materials');}
 function process(){
  if(state.job&&state.job.readyAt<=now)send({kind:'claim'},'claim-work');
  if(state.carpentry.job&&state.carpentry.job.readyAt<=now)pine({action:'claim-easel'},'claim-work');
  while(state.carpentry.recorded<state.carpentry.produced)pine({action:'record-easel'},'record-kept-craft');
  harvest();
  // Literal all-available gathers, in this order, with18per-kind target and personal60-total bag cap.
  gatherOrdinary();
  if(!state.stats.plantersCrafted&&!state.job&&canAfford('planter'))send({kind:'craft',recipe:'planter'},'start-work');
  if(state.stats.plantersCrafted&&!state.stats.planterPlacedAfterCraft)send({kind:'place',prop:'planter',slot:'north-west'},'place');
  if(state.stats.planterPlacedAfterCraft&&!state.job&&canAfford('bridge-kit'))send({kind:'craft',recipe:'bridge-kit'},'start-work');
  gatherOrdinary();
  gatherPine();
  box();
  if(options.policy==='civic-first'){request(0,Infinity);hamper(0,0);easel();}
  else if(options.policy==='easel-first'){easel();const reserve=state.carpentry.started<6;request(reserve?1:0,6);hamper(reserve?4:0,reserve?1:0);}
  else{
   if(state.garden.requests<Math.min(state.carpentry.started,6)){request(0,6);easel();}else{easel();request(state.carpentry.started>state.garden.requests?0:1,6);}
   const reserve=state.carpentry.started<6||state.garden.requests<6;hamper(reserve?4:0,reserve?1:0);
  }
  box();gatherPine();harvest();plant();
 }
 const nextReady=(finish:number)=>nextCoupledEvent(state,now,finish);

 for(let day=0;day<options.days;day++)for(const hour of schedule.hours){
  if(options.absence&&day>=14&&day<21){skippedVisits++;continue;}
  const start=anchor+day*DAY+hour*HOUR,finish=start+schedule.minutes*60000;advance(start);visits++;visitedDays.push(day);verbs=new Set();const before=sequence,waitBefore=insideWaitMs;
  if(state.carpentry.lessonAt===null){pine({action:'learn-saw'});pine({action:'equip-saw',equipped:true});post({action:'accept'});for(const parcel of RECIPIENT_IDS)post({action:'handover',parcel,recipient:parcel});post({action:'complete'});}
  for(let event=0;event<20;event++){
   process();const time=nextReady(finish);if(time===null)break;assert.ok(event<19,'Bounded within-visit event loop');insideWaitMs+=time-now;advance(time);
  }
  if(sequence===before)quietVisits++;visitRows.push({at:start,commands:sequence-before,verbs:[...verbs].sort(),waitMs:insideWaitMs-waitBefore});
 }
 const times=Object.fromEntries(Object.entries(milestones).map(([k,v])=>[k,v===null?null:Number(((v-firstArrival)/DAY).toFixed(6))]));
 return {finalState:structuredClone(state),options,policy:POLICY_NOTES[options.policy],firstArrival,visits,skippedVisits,visitedDays,commands:sequence,validatedStates:validated,quietVisits,insideWaitMs,counts,milestoneDaysFromFirstVisit:times,rawMilestones:milestones,kitClaims,easelClaims,requestTimes,hamperTimes,visitRows,final:{ordinaryKits:state.bridgeKits,ordinaryStarted:state.stats.bridgeJobsStarted,ordinaryInventory:state.inventory,ordinaryGathered:gathered,ordinarySpent:spent,ordinaryJob:state.job,pine:state.carpentry.pine,easelsStarted:state.carpentry.started,easelsKept:state.carpentry.produced,recorded:state.carpentry.recorded,hampers:state.carpentry.hampers,requests:state.garden.requests,box:state.owned.letterbox,produce:state.garden.produce,harvested:state.garden.harvested,consumed:state.garden.consumed,firstJobUnchangedByIndependentActions:true},invariants:true};
}
