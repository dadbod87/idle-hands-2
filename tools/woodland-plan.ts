import {CROP_DEFS,GARDEN_RULES,GARDEN_DAY,type CropId} from '../src/game/garden.ts';

/** Non-executable design experiment. Never import into client/server economy. */
export const WOOD_PLAN={pineCap:24,nodeCap:6,nodeRefillMs:4*3600000,easelPine:4,easelFlowers:1,easelMs:12*3600000,easelGoal:6,orderPine:1,orderRadishes:2,orderFlowers:1,installationMs:24*3600000} as const;
export type WoodPolicy='legacy-first'|'reserve-goal';
export function simulateWoodland(days:7|42,visitsPerDay:1|3|12,policy:WoodPolicy,orderHours:4|12,absence=false){
 let now=0,node=6,nodeAt=0,pine=0,collected=0,orders=0,frames=0,job:number|null=null,orderAt=0,productive=0,quiet=0,skipped=0,held=0,requests=0,requestAt=0,firstRadish=false;
 const seeds={radish:CROP_DEFS.radish.seedQuota,marigold:CROP_DEFS.marigold.seedQuota},produce={radish:0,marigold:0},harvested={radish:0,marigold:0},spent={radish:0,marigold:0};
 const beds:Array<{crop:CropId;readyAt:number}|null>=[null,null,null];
 const frameClaims:number[]=[],orderTimes:number[]=[],requestTimes:number[]=[];
 // Independent candidate ledger: actualGarden v1 cannot represent new ingredient sinks.
 // Reuse current crop deadlines/quotas/capacity, never manufacture a valid runtime save.
 const plant=()=>{let n=0;for(let bed=0;bed<3;bed++)if(!beds[bed]){const crop=seeds.marigold?'marigold':seeds.radish?'radish':null;if(crop){const ms=crop==='radish'&&!firstRadish?GARDEN_RULES.firstRadishMs:CROP_DEFS[crop].durationMs;if(crop==='radish')firstRadish=true;seeds[crop]--;beds[bed]={crop,readyAt:now+ms};n++;}}return n;};
 const harvest=()=>{let n=0;for(let bed=0;bed<3;bed++){const b=beds[bed];if(b&&b.readyAt<=now&&produce[b.crop]<GARDEN_RULES.stack){produce[b.crop]++;harvested[b.crop]++;seeds[b.crop]++;beds[bed]=null;n++;}}return n;};
 const consume=(radish:number,marigold:number)=>{produce.radish-=radish;produce.marigold-=marigold;spent.radish+=radish;spent.marigold+=marigold;};
 const refill=()=>{if(node===WOOD_PLAN.nodeCap){nodeAt=now;return;}const ticks=Math.floor((now-nodeAt)/WOOD_PLAN.nodeRefillMs);if(ticks){node=Math.min(WOOD_PLAN.nodeCap,node+ticks);nodeAt=node===WOOD_PLAN.nodeCap?now:nodeAt+ticks*WOOD_PLAN.nodeRefillMs;}};
 const request=(reserve:number)=>{if(produce.radish&&produce.marigold>reserve&&requestAt<=now&&(policy==='legacy-first'||requests<6)){consume(1,1);requests++;requestAt=now+GARDEN_RULES.requestMs;requestTimes.push(now);return 1;}return 0;};
 plant();
 for(let visit=0;visit<=days*visitsPerDay;visit++){
  now=Math.floor(visit*GARDEN_DAY/visitsPerDay);
  // One disclosed seven-day absence in the42day cohort. No elapsed grants beyond caps.
  if(absence&&now>=14*GARDEN_DAY&&now<21*GARDEN_DAY){skipped++;continue;}
  let n=0;refill();
  if(job!==null&&job<=now){job=null;frames++;frameClaims.push(now);n++;}
  n+=harvest();const take=Math.min(node,WOOD_PLAN.pineCap-pine);node-=take;pine+=take;collected+=take;if(take)n++;
  if(policy==='legacy-first')n+=request(0);
  if(frames<WOOD_PLAN.easelGoal&&job===null&&pine>=WOOD_PLAN.easelPine&&produce.marigold>=WOOD_PLAN.easelFlowers){pine-=WOOD_PLAN.easelPine;consume(0,WOOD_PLAN.easelFlowers);job=now+WOOD_PLAN.easelMs;n++;}
  const reserveWood=policy==='reserve-goal'&&frames<WOOD_PLAN.easelGoal?WOOD_PLAN.easelPine:0;
  const reserveFlowers=policy==='reserve-goal'&&frames<WOOD_PLAN.easelGoal?WOOD_PLAN.easelFlowers:0;
  if(policy==='reserve-goal')n+=request(reserveFlowers);
  if(now>=orderAt&&pine>=WOOD_PLAN.orderPine+reserveWood&&produce.radish>=WOOD_PLAN.orderRadishes&&produce.marigold>=WOOD_PLAN.orderFlowers+reserveFlowers){pine-=WOOD_PLAN.orderPine;consume(WOOD_PLAN.orderRadishes,WOOD_PLAN.orderFlowers);orders++;orderTimes.push(now);orderAt=now+orderHours*3600000;n++;}
  n+=harvest();n+=plant();
  if(n)productive++;else quiet++;
  if(beds.some(b=>b&&b.readyAt<=now&&produce[b.crop]>=12))held++;
  if(pine<0||pine>24||node<0||node>6)throw Error('Candidate wood capacity violated');
  if(collected!==pine+(frames+(job!==null?1:0))*WOOD_PLAN.easelPine+orders*WOOD_PLAN.orderPine)throw Error('Candidate pine conservation failed');
  for(const crop of ['radish','marigold'] as const){if(harvested[crop]!==produce[crop]+spent[crop]||produce[crop]<0||produce[crop]>12||seeds[crop]+beds.filter(b=>b?.crop===crop).length!==CROP_DEFS[crop].seedQuota)throw Error('Candidate crop conservation failed');}
 }
 return{days,visitsPerDay,policy,orderHours,absence,dayZeroIncluded:true,productiveVisits:productive,quietVisits:quiet,skippedVisits:skipped,visitsWithHeldCrop:held,pine,collected,frames,queued:job!==null,orders,practice:frames*3+orders,produce,harvested,spent,requests,frameClaims,orderTimes,requestTimes,firstFrameDay:frameClaims.length?frameClaims[0]/GARDEN_DAY:null,sixthFrameDay:frameClaims.length>=6?frameClaims[5]/GARDEN_DAY:null};
}
export function noticeboardOpening(visitsPerDay:1|3|12,helpers:1|2|6,otherJoinDay:0|2){
 const run=simulateWoodland(42,visitsPerDay,'reserve-goal',4);
 const records=Array.from({length:helpers},(_,helper)=>run.frameClaims.map(at=>({helper,at:at+(helper===0?0:otherJoinDay)*GARDEN_DAY}))).flat().sort((a,b)=>a.at-b.at||a.helper-b.helper);
 const accepted=records.slice(0,6),fundedAt=accepted.length===6?accepted[5].at:null;
 return{visitsPerDay,helpers,otherJoinDay,fundedDay:fundedAt===null?null:fundedAt/GARDEN_DAY,openedDay:fundedAt===null?null:(fundedAt+WOOD_PLAN.installationMs)/GARDEN_DAY,accepted,privateFramesKept:true,uniqueHelperThreshold:false,scope:'Synchronized deterministic schedules, all participants opt in to recording their completed crafts; no real concurrency or server proof.'};
}
