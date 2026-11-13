/** Read-only crafting presentation. Commands, ownership and clocks remain authoritative. */
import{RECIPES,RESOURCE_IDS,ITEM_LIMIT,recipeDuration,type WorkshopState,type RecipeId}from'./workshop.ts';
export type RecipeView={id:RecipeId;name:string;quantity:1;pocket:'Furniture'|'Materials';durationMs:number;cost:typeof RECIPES[RecipeId]['cost'];missing:string[];reason:string|null};
export function recipeView(state:WorkshopState,id:RecipeId):RecipeView{
 const r=RECIPES[id],missing=RESOURCE_IDS.flatMap(key=>state.inventory[key]<r.cost[key]?[`${r.cost[key]-state.inventory[key]} ${key}`]:[]),full=(id==='planter'?state.owned.planter:state.bridgeKits)>=ITEM_LIMIT;
 const reason=state.job?'The bench is busy. Collect its work before starting another recipe.':id==='bridge-kit'&&!state.stats.planterPlacedAfterCraft?'Place your first planter to unlock this recipe.':missing.length?'Need '+missing.join(' + ')+'.':full?(id==='planter'?'You already own 99 planters. Choose another recipe.':'Kit storage is full. Use or contribute kits before starting.'):id==='bridge-kit'&&state.stats.bridgeJobsStarted>=1_000_000?'This work bench has reached its job limit.':null;
 return{id,name:r.name,quantity:1,pocket:id==='planter'?'Furniture':'Materials',durationMs:recipeDuration(state,id),cost:r.cost,missing,reason};
}
export function benchWork(state:WorkshopState,now:number){
 const job=state.job;if(!job)return{phase:'idle' as const,title:'Bench is free',detail:'Choose a recipe below.',readyAt:null,canClaim:false};
 const recipe=RECIPES[job.recipe],where=job.recipe==='planter'?'Furniture':'Materials',remaining=Math.max(0,job.readyAt-Math.max(now,state.observedAt));
 if(remaining>0)return{phase:'running' as const,title:'1 '+recipe.name,detail:`Collect into Bag · ${where} when finished.`,readyAt:job.readyAt,canClaim:false};
 const full=(job.recipe==='planter'?state.owned.planter:state.bridgeKits)>=ITEM_LIMIT||job.recipe==='planter'&&state.stats.plantersCrafted>=1_000_000,counter=state.stats.crafted>=1_000_000||state.skills.making>=1_000_000;
 return{phase:full||counter?'blocked' as const:'ready' as const,title:'1 '+recipe.name,detail:full?'Output storage is full. Your finished work waits safely.':counter?'The prototype skill counter is full. Your finished work waits safely.':`Ready to collect into Bag · ${where}.`,readyAt:job.readyAt,canClaim:!full&&!counter};
}

export function craftDuration(ms:number){
 if(!Number.isSafeInteger(ms)||ms<0)throw new Error('Invalid recipe duration.');
 if(ms<60_000)return Math.ceil(ms/1000)+' seconds';
 if(ms%3600_000===0){const hours=ms/3600_000;return hours+' real hour'+(hours===1?'':'s');}
 const minutes=Math.ceil(ms/60_000);return(minutes>=60?Math.floor(minutes/60)+'h ':'')+(minutes%60||0)+'m real time';
}
