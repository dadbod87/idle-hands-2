/** Pure production-threshold experiment, never a player grant or SQL purchase. */
import {applyWorkshop,createWorkshop,RESOURCE_IDS,RECIPES,type WorkshopCommand} from '../src/game/live-workshop.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../src/game/town-rules.ts';
const H=3600_000,epoch=Date.UTC(2026,10,16,18);
export function simulateHousingPace(options:{name:string;visitHours:number;missedWeek?:boolean;weeklyDecor?:boolean}){
 if(![12,24].includes(options.visitHours))throw Error('Study supports declared12h/24h return schedules only.');
 let now=epoch,state=createWorkshop(now),sequence=0,commands=0,visits=0,pauseDone=false;const thresholds:Array<{kits:number;elapsedHours:number}>=[];
 const act=(command:Omit<WorkshopCommand,'id'|'expectedRevision'>)=>{const r=applyWorkshop(state,{...command,id:'housing-model-'+(++sequence),expectedRevision:state.revision},now);if(!r.ok)throw Error(r.message);state=r.state;commands++;};
 const inputs=(recipe:'planter'|'bridge-kit')=>{for(const resource of RESOURCE_IDS)if(state.inventory[resource]<RECIPES[recipe].cost[resource])act({kind:'gather',resource} as Omit<WorkshopCommand,'id'|'expectedRevision'>);};
 for(const resource of RESOURCE_IDS)act({kind:'gather',resource} as Omit<WorkshopCommand,'id'|'expectedRevision'>);
 act({kind:'craft',recipe:'planter'} as Omit<WorkshopCommand,'id'|'expectedRevision'>);now=state.job!.readyAt;act({kind:'claim'} as Omit<WorkshopCommand,'id'|'expectedRevision'>);act({kind:'place',prop:'planter',slot:'north-west'} as Omit<WorkshopCommand,'id'|'expectedRevision'>);
 const anchor=now,goal=PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS;
 while(state.bridgeKits<goal&&visits<150){
  visits++;
  if(state.job&&now>=state.job.readyAt)act({kind:'claim'} as Omit<WorkshopCommand,'id'|'expectedRevision'>);
  for(const kits of[PLOT_CLAIM_KITS,goal])if(state.bridgeKits>=kits&&!thresholds.some(t=>t.kits===kits))thresholds.push({kits,elapsedHours:(now-anchor)/H});
  if(state.bridgeKits>=goal)break;
  if(!state.job){const recipe=options.weeklyDecor&&visits%14===0?'planter':'bridge-kit';inputs(recipe);act({kind:'craft',recipe} as Omit<WorkshopCommand,'id'|'expectedRevision'>);}
  now+=options.visitHours*H+60_000;
  if(options.missedWeek&&!pauseDone&&visits===8){now+=7*24*H;pauseDone=true;}
 }
 if(state.bridgeKits!==goal||thresholds.length!==2)throw Error('Production threshold was not reached.');
 return{name:options.name,visitHours:options.visitHours,missedWeek:!!options.missedWeek,weeklyDecor:!!options.weeklyDecor,visits,commands,thresholds,earnedKits:state.bridgeKits,ownedPlanters:state.owned.planter,keptFirstPlanter:state.placements['north-west']==='planter',root:state.version,garden:state.garden.version,classification:'Simulated current pure commands/clock, not SQL purchase, observed player pace or real-time browser progression.'};
}
export function housingPacingStudy(){return[
 simulateHousingPace({name:'Return after readiness, about twice daily',visitHours:12}),
 simulateHousingPace({name:'One visit daily',visitHours:24}),
 simulateHousingPace({name:'Readiness returns with one missed week',visitHours:12,missedWeek:true}),
 simulateHousingPace({name:'Readiness returns plus a weekly planter',visitHours:12,weeklyDecor:true})
];}
