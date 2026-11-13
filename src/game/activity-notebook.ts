import type {WorkshopState as CurrentWorkshopState} from './live-workshop.ts';
type WorkshopState=LegacyWorkshopState|CurrentWorkshopState;
import {ITEM_LIMIT,RECIPES,type WorkshopState as LegacyWorkshopState} from './workshop.ts';
import {GARDEN_RULES} from './garden.ts';
export type ActivityId='bench'|'rack'|'garden';
export type ActivityNote={id:ActivityId;title:string;phase:'idle'|'running'|'ready'|'blocked';summary:string;detail:string;readyAt:number|null};
/** Read-only presentation. No settlement, rewards, reservations or authoritative eligibility. */
export function activityNotes(state:WorkshopState,now:number):ActivityNote[]{
 if(!Number.isSafeInteger(now)||now<0)throw new Error('Invalid notebook observation time.');
 now=Math.max(now,state.observedAt);
 const job=state.job,bench:ActivityNote={id:'bench',title:'Work bench',phase:'idle',summary:'Bench available',detail:'Choose a recipe. One job at a time; opening the bench spends nothing.',readyAt:null};
 if(job){const name=RECIPES[job.recipe].name,full=job.recipe==='planter'?state.owned.planter>=ITEM_LIMIT:state.bridgeKits>=ITEM_LIMIT;bench.readyAt=job.readyAt;
  if(job.readyAt>now){bench.phase='running';bench.summary=name+' in progress';bench.detail='Finishes by its real-time deadline. The finished job waits for you.';}
  else{bench.phase=full?'blocked':'ready';bench.summary=name+(full?' ready · storage full':' ready to collect');bench.detail=full?'Output stays safely on the bench. Open it to review storage; nothing is discarded.':'Open the bench to collect explicitly. This notebook never collects for you.';}
 }else if(state.inventory.scrap<RECIPES.planter.cost.scrap||state.inventory.timber<RECIPES.planter.cost.timber||state.inventory.supplies<RECIPES.planter.cost.supplies)bench.detail='Check recipes and your held materials. Depots recover on their own real-time schedule.';
 const c=state.carpentry,rack:ActivityNote={id:'rack',title:'Pine finishing rack',phase:'idle',summary:'Rack available',detail:c.lessonAt===null?'Meet Nella for the free saw lesson, then explore pine work.':'An easel uses 4 pine and 1 marigold. Its job is separate from your work bench.',readyAt:null};
 if(c.job){rack.readyAt=c.job.readyAt;const full=c.produced>=99;rack.phase=c.job.readyAt>now?'running':full?'blocked':'ready';rack.summary=rack.phase==='running'?'Easel in progress':full?'Easel ready · storage full':'Easel ready to collect';rack.detail=rack.phase==='running'?'Its own real-time deadline. Your other activities remain available.':'Open the finishing rack to review and collect. No automatic repeating job.';}
 const g=state.garden,ready={radish:0,marigold:0},growing=g.beds.filter(b=>b&&b.readyAt>now),empty=g.beds.filter(b=>!b).length;
 for(const b of g.beds)if(b&&b.readyAt<=now)ready[b.crop]++;
 const ripe=ready.radish+ready.marigold,collectable=Math.min(ready.radish,Math.max(0,GARDEN_RULES.stack-g.produce.radish))+Math.min(ready.marigold,Math.max(0,GARDEN_RULES.stack-g.produce.marigold)),blocked=ripe-collectable;
 const garden:ActivityNote={id:'garden',title:'Your allotment',phase:ripe?(collectable?'ready':'blocked'):growing.length?'running':'idle',summary:ripe?`${ripe} crop${ripe===1?'':'s'} ready${blocked?' · '+blocked+' need room':''}`:growing.length?`${growing.length} bed${growing.length===1?'':'s'} growing`:'Beds available',detail:ripe?`${collectable} can fit in produce storage now. ${blocked?'Use held produce with Marlow, Nella or a recipe; ripe crops stay in their beds.':'Harvest explicitly at your allotment. No crops are collected here.'}`:`${empty} empty bed${empty===1?'':'s'}. ${empty?'Preview planting or choose an outdoor errand.':'Growing does not prevent other town activities.'}`,readyAt:growing.length?Math.min(...growing.map(b=>b!.readyAt)):null};
 return[bench,rack,garden];
}
