const easelGoal=(s:CarpentryState,g:GardenState)=>legacyEaselGoal(s,g as LegacyGardenState);
import type {GardenState as CurrentGardenState} from './live-garden.ts';
type GardenState=LegacyGardenState|CurrentGardenState;
/** Read-only pine-workshop presentation; existing commands and clocks own progress. */
import{CARPENTRY_RULES,easelGoal as legacyEaselGoal,type CarpentryState,type CarpentryAction}from'./carpentry.ts';
import type{GardenState as LegacyGardenState}from'./garden.ts';
import{PROPS}from'./workshop.ts';
export type PineStep={kind:'action';action:CarpentryAction;title:string;detail:string}|{kind:'go';room:'square'|'garden'|'workshop';stop:string;label:string;title:string;detail:string}|{kind:'more';label:string;title:string;detail:string};
function sawStep(s:CarpentryState):PineStep|null{
 if(s.lessonAt===null)return{kind:'action',action:{action:'learn-saw'},title:'Start with a hand saw',detail:'One bound hand saw. Free lesson with Nella; equip it when you are ready.'};
 if(!s.saw.owned)return{kind:'action',action:{action:'recover-saw'},title:'Recover your hand saw',detail:'Your lesson is kept. Nella replaces a missing bound saw for free.'};
 if(!s.saw.equipped)return{kind:'action',action:{action:'equip-saw',equipped:true},title:'Equip your hand saw',detail:'Your saw is in your belongings. Equip it before preparing pine or starting an easel.'};
 return null;
}
export function easelRecipe(s:CarpentryState,g:GardenState,now:number){
 const goal=easelGoal(s,g),tool=sawStep(s),reason=s.job?'Collect the rack’s current work before starting another easel.':s.produced>=CARPENTRY_RULES.easelCap?'The 99-easel limit has been reached.':tool?tool.title+' first.':goal.pineNeeded?'Need '+goal.pineNeeded+' more pine bundle'+(goal.pineNeeded===1?'':'s')+'.':goal.flowersNeeded?'Need 1 harvested marigold. Growing plants and seeds stay in the garden.':null;
 return{name:PROPS.easel.name,quantity:1 as const,pocket:'Furniture' as const,destination:'Bag · Furniture',durationMs:CARPENTRY_RULES.easelMs,practiceOnClaim:3,ingredients:[{id:'pine' as const,name:'Pine bundles',have:s.pine.carried,required:CARPENTRY_RULES.easelPine,missing:goal.pineNeeded},{id:'marigold' as const,name:'Cut marigolds',have:g.produce.marigold,required:1,missing:goal.flowersNeeded}],reason,ready:!reason,remainingMs:s.job?Math.max(0,s.job.readyAt-now):0};
}
export function nextPineStep(s:CarpentryState,g:GardenState,now:number):PineStep{
 if(s.job&&s.job.readyAt<=now)return{kind:'go',room:'workshop',stop:'finishing-rack',label:'Visit rack',title:'Your easel is ready',detail:'Collect it explicitly at the finishing rack. It stays there safely until you do.'};
 if(s.recorded<s.produced)return{kind:'action',action:{action:'record-easel'},title:'Record your kept craft',detail:'Your easel stays yours. Nella records one completed craft at a time.'};
 const tool=sawStep(s);if(tool)return tool;
 if(s.job)return{kind:'go',room:'workshop',stop:'finishing-rack',label:'Check rack',title:'An easel is finishing',detail:'Its own timer keeps going. Your ordinary workbench, crops and deliveries remain available.'};
 if(s.produced>=CARPENTRY_RULES.easelCap)return{kind:'more',label:'Other work with Nella',title:'Your saw is ready',detail:'Explore deliveries, craft records and equipment below.'};
 const goal=easelGoal(s,g);
 if(goal.pineNeeded)return{kind:'go',room:'square',stop:'pine-crooked',label:'Find pine',title:s.pine.available?'Prepare fallen pine':'Your pine supply is recovering',detail:s.pine.available?'Use your equipped saw at a deadfall. Need '+goal.pineNeeded+' more bundles for an easel.':'Check your personal supply at a deadfall. Crops and ordinary work can continue meanwhile.'};
 if(goal.flowersNeeded)return{kind:'go',room:'garden',stop:'garden-beds',label:'Find marigold beds',title:'Grow a marigold',detail:'An easel uses 1 harvested marigold. Your pine stays kept while the flower grows.'};
 return{kind:'go',room:'workshop',stop:'finishing-rack',label:'Visit rack',title:'Ready to review an easel',detail:'Take 4 pine and 1 harvested marigold to the finishing rack. Review the cost before starting.'};
}
export function easelWork(s:CarpentryState,now:number){
 if(!s.job)return{phase:'idle' as const,title:'Rack is free',detail:'Choose an easel below.',readyAt:null,canClaim:false};
 const remaining=Math.max(0,s.job.readyAt-now),full=s.produced>=CARPENTRY_RULES.easelCap||s.practice+3>CARPENTRY_RULES.counterMax;
 return{phase:remaining>0?'running' as const:full?'blocked' as const:'ready' as const,title:'1 '+PROPS.easel.name,detail:remaining>0?'Collect into Bag · Furniture when finished.':full?'A craft counter is full. Your finished easel is kept at the rack.':'Ready to collect into Bag · Furniture. +3 carpentry practice.',readyAt:s.job.readyAt,canClaim:remaining===0&&!full};
}
export function carpentryConfirmation(a:CarpentryAction,s:CarpentryState,g:GardenState){
 switch(a.action){
  case'learn-saw':return'Receive hand saw · free';
  case'recover-saw':return'Recover hand saw · free';
  case'equip-saw':return a.equipped?'Equip hand saw':'Put saw away';
  case'gather-pine':return'Prepare '+Math.min(s.pine.available,CARPENTRY_RULES.carriedCap-s.pine.carried)+' pine';
  case'start-easel':return'Start easel · 12 hours';
  case'claim-easel':return'Collect finished easel';
  case'deliver-hamper':return easelGoal(s,g).spendingLastFlower?'Confirm delivery · spend goal flower':'Deliver produce hamper';
  case'record-easel':return'Record craft · keep easel';
  case'set-easel-goal':return a.enabled?'Show easel goal':'Hide easel goal';
 }
}
