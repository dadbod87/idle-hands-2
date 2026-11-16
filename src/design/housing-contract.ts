/** IH2-115 isolated contract. Not imported by any live command, store or scene. */
import {z} from 'zod';
import {cafeWorkshopSchema} from '../game/cafe-candidate.ts';
import {PROP_IDS,PLACEMENT_SLOTS,type PropId} from '../game/live-workshop.ts';
import {homeLayoutSchema,emptyWorkroom,homeAllocation,type HomeLayout,HOME_SLOTS} from '../game/live-home-layout.ts';
import {addressForPlot,PARCELS,type LayoutPoint} from '../game/neighborhood.ts';
import {HOUSING_V1,HOUSING_V1_PLANS as HOUSING_PLANS,legacyExteriorV1} from './housing-catalog-v1.ts';
const PROPOSED_BUILD_MS=HOUSING_V1.buildMs,PLOT_CLAIM_KITS=HOUSING_V1.starterKits,PLOT_UPGRADE_KITS=HOUSING_V1.expansionKits;
export const HOUSING_CONTRACT_VERSION=1;
export const HOUSING_CATALOG_VERSION='housing-v1';
export const HOUSING_QUOTE_MS=HOUSING_V1.quoteMs;
/** Agent-selected candidate: one bench-day for a deliberate same-tier remodel. */
export const REMODEL_KITS=HOUSING_V1.remodelKits;
export const YARD_SLOTS=['front-left','front-right','side-left','side-right','rear'] as const;
export type YardSlot=typeof YARD_SLOTS[number];
export const YARD_PROPS=['planter','letterbox'] as const;
/** Bounded existing art at small-garden scale. Yard cosmetics never add a collider. */
export const YARD_ART={planter:{art:'home-planter-world',width:.6,height:.75,groundRadius:.22,collides:false},letterbox:{art:'letterbox-leaf-closed',width:.6,height:.84,groundRadius:.22,collides:false}} as const;
const id=z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const plotId=z.string().regex(/^[1-9][0-9]{0,17}$/);
const time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-86_400_000);
const count=z.number().int().min(0).max(1_000_000);
const prop=z.enum(PROP_IDS).nullable();
const yard=z.object({'front-left':prop,'front-right':prop,'side-left':prop,'side-right':prop,rear:prop}).strict();
export const emptyYard=()=>({'front-left':null,'front-right':null,'side-left':null,'side-right':null,rear:null}) as z.infer<typeof yard>;
const legacyIds=HOUSING_V1.legacy.map(p=>p.id);
const planId=z.string().refine(v=>HOUSING_PLANS.some(p=>p.id===v)||legacyIds.includes(v),'Unknown catalog plan.');
export function contractPlan(value:string){
 const p=HOUSING_PLANS.find(p=>p.id===value);
 if(p)return{...structuredClone(p),legacy:false};
 if(!legacyIds.includes(value))throw Error('Unknown housing plan.');
 const tier=HOUSING_V1.legacy.find(p=>p.id===value)!.tier as 1|2;
 return{id:value,family:'legacy',tier,name:'Your original home',width:6.5,height:7.5,indoorNooks:tier===2?8 as const:6 as const,yard:[{x:1.5,y:9},{x:6.5,y:9}],feature:'Your exact original facade and furnishings.',extraRoom:tier===2?'Workroom':'Main room',convenience:null,roof:'#6c8175',wall:'#d9caa6',legacy:true};
}
export function yardAnchors(plan:string){
 const p=contractPlan(plan);const slots=p.family==='pocket-cottage'?['side-left','side-right','front-left','front-right']:p.family==='garden-studio'?['front-left','front-right','rear']:['front-left','front-right'];
 return p.yard.map((point,i)=>({slot:slots[i] as YardSlot,...point}));
}
const homeSchema=z.object({plotId,planId,legacyExterior:z.string().nullable(),layout:homeLayoutSchema,yard}).strict();
const buildSchema=z.object({id:z.uuid(),quoteId:z.uuid(),plotId,target:planId,startedAt:time,readyAt:time,rightsKits:count,remodelKits:count}).strict();
const accountBase=z.object({version:z.literal(1),catalogVersion:z.literal(HOUSING_CATALOG_VERSION),ownerId:id,workshop:cafeWorkshopSchema,home:homeSchema.nullable(),build:buildSchema.nullable()}).strict();
export const housingAccountSchema=accountBase.superRefine((a,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if(a.home){
  const p=contractPlan(a.home.planId);
  if(p.tier!==a.home.layout.level)issue('Catalog and permanent indoor rights differ.');
  const legacy=p.legacy?legacyExteriorV1(a.home.plotId,a.home.layout.level):null;
  if(a.home.legacyExterior!==legacy)issue('Legacy facade identity must remain exact.');
  const allowed=yardAnchors(p.id).map(p=>p.slot);
  for(const s of YARD_SLOTS)if(a.home.yard[s]!==null&&(!allowed.includes(s)||!YARD_PROPS.includes(a.home.yard[s] as typeof YARD_PROPS[number])))issue('Unsupported yard placement.');
 }
 for(const p of PROP_IDS)if(Object.values(a.workshop.placements).filter(v=>v===p).length+(a.home?homeAllocation(a.home.layout,p)+Object.values(a.home.yard).filter(v=>v===p).length:0)>a.workshop.owned[p])issue('A furnishing cannot be allocated twice.');
 if(a.build){
  const b=a.build,target=contractPlan(b.target),tier=a.home?.layout.level??0;
  if(target.legacy||b.startedAt>a.workshop.observedAt||b.readyAt!==b.startedAt+PROPOSED_BUILD_MS||b.readyAt>Number.MAX_SAFE_INTEGER-86_400_000)issue('Construction history or fixed deadline is invalid.');
  if(a.home&&b.plotId!==a.home.plotId||target.tier<tier||a.home?.planId===b.target)issue('Construction cannot move, downgrade or rebuild the same home.');
  const rights=tier===0?PLOT_CLAIM_KITS+(target.tier===2?PLOT_UPGRADE_KITS:0):tier===1&&target.tier===2?PLOT_UPGRADE_KITS:0;
  if(b.rightsKits!==rights||b.remodelKits!==(rights===0?REMODEL_KITS:0))issue('Paid components do not match catalog rights.');
 }
});
export type HousingAccount=z.infer<typeof housingAccountSchema>;
export type HousingHome=NonNullable<HousingAccount['home']>;
export type HousingBuild=NonNullable<HousingAccount['build']>;
export function legacyHousingAccount(ownerId:string,workshop:unknown,home:null|{plotId:string;layout:HomeLayout}):HousingAccount{
 let converted:HousingHome|null=null;
 if(home){
  const layout=homeLayoutSchema.parse(home.layout),exterior=legacyExteriorV1(home.plotId,layout.level);
  converted={plotId:home.plotId,planId:'legacy-'+exterior,legacyExterior:exterior,layout:structuredClone(layout),yard:emptyYard()};
 }
 return housingAccountSchema.parse({version:1,catalogVersion:HOUSING_CATALOG_VERSION,ownerId,workshop,home:converted,build:null});
}
const requestSchema=z.object({version:z.literal(1),catalogVersion:z.literal(HOUSING_CATALOG_VERSION),target:planId,plotId,expectedRevision:count}).strict();
export const quoteSchema=z.object({version:z.literal(1),catalogVersion:z.literal(HOUSING_CATALOG_VERSION),id:z.uuid(),ownerId:id,target:planId,plotId,revision:count,issuedAt:time,expiresAt:time,rightsKits:count,remodelKits:count,totalKits:count,constructionMs:z.literal(PROPOSED_BUILD_MS),bagReturns:z.array(z.object({slot:z.enum(YARD_SLOTS),prop:z.enum(PROP_IDS)}).strict()).max(5)}).strict();
export type HousingQuote=z.infer<typeof quoteSchema>;
const clockValid=(a:HousingAccount,now:number)=>time.safeParse(now).success&&now>=a.workshop.observedAt;
export function makeHousingQuote(input:HousingAccount,raw:unknown,now:number,quoteId:string):HousingQuote{
 const a=housingAccountSchema.parse(input),r=requestSchema.parse(raw),p=contractPlan(r.target);
 if(!clockValid(a,now))throw Error('The server clock moved backwards.');
 if(a.build)throw Error('Your builders are already on a job.');
 if(r.expectedRevision!==a.workshop.revision)throw Error('Your belongings changed. Review a fresh quote.');
 if(a.home&&r.plotId!==a.home.plotId)throw Error('Your address stays yours. Choose a plan for this parcel.');
 if(p.legacy||a.home?.planId===p.id||p.tier<(a.home?.layout.level??0))throw Error('Choose a different plan that keeps your earned space.');
 const current=a.home?.layout.level??0,rightsKits=current===0?PLOT_CLAIM_KITS+(p.tier===2?PLOT_UPGRADE_KITS:0):current===1&&p.tier===2?PLOT_UPGRADE_KITS:0;
 const remodelKits=rightsKits===0?REMODEL_KITS:0,allowed=yardAnchors(p.id).map(p=>p.slot);
 const bagReturns=a.home?YARD_SLOTS.filter(s=>a.home!.yard[s]&&!allowed.includes(s)).map(slot=>({slot,prop:a.home!.yard[slot]!})):[];
 return quoteSchema.parse({version:1,catalogVersion:HOUSING_CATALOG_VERSION,id:quoteId,ownerId:a.ownerId,target:p.id,plotId:r.plotId,revision:a.workshop.revision,issuedAt:now,expiresAt:now+HOUSING_QUOTE_MS,rightsKits,remodelKits,totalKits:rightsKits+remodelKits,constructionMs:PROPOSED_BUILD_MS,bagReturns});
}
function revised(a:HousingAccount,now:number,message:string){const n=structuredClone(a);n.workshop.revision++;n.workshop.observedAt=now;n.workshop.lastMessage=message;return n;}
export type HousingOutcome={ok:boolean;account:HousingAccount;message:string;bagReturns:HousingQuote['bagReturns']};
const refusal=(account:HousingAccount,message:string):HousingOutcome=>({ok:false,account,message,bagReturns:[]});
export function startHousingBuild(input:HousingAccount,raw:unknown,now:number,buildId:string):HousingOutcome{
 const a=housingAccountSchema.parse(input),q=quoteSchema.parse(raw);
 if(!clockValid(a,now)||now<q.issuedAt||now>=q.expiresAt)return refusal(input,'This quote expired. Review a fresh price; nothing was spent.');
 if(q.ownerId!==a.ownerId||a.build||q.revision!==a.workshop.revision||a.workshop.revision>=1_000_000)return refusal(input,'Your home or belongings changed. Review a fresh quote.');
 const current=makeHousingQuote(a,{version:1,catalogVersion:HOUSING_CATALOG_VERSION,target:q.target,plotId:q.plotId,expectedRevision:q.revision},q.issuedAt,q.id);
 if(JSON.stringify(q)!==JSON.stringify(current))return refusal(input,'The reviewed quote could not be confirmed. Nothing was spent.');
 if(a.workshop.bridgeKits<q.totalKits)return refusal(input,`You need ${q.totalKits-a.workshop.bridgeKits} more bridge kits. Keep previewing for free.`);
 const message='Builders booked. '+(a.home?'Your current home':'Your rental')+' and belongings stay usable. No attendance window.';
 const next=revised(a,now,message);next.workshop.bridgeKits-=q.totalKits;
 next.build={id:buildId,quoteId:q.id,plotId:q.plotId,target:q.target,startedAt:now,readyAt:now+q.constructionMs,rightsKits:q.rightsKits,remodelKits:q.remodelKits};
 return{ok:true,account:housingAccountSchema.parse(next),message,bagReturns:[]};
}
export function housingFootprintFor(plot:string,plan:string){const p=contractPlan(plan),parcel=PARCELS[addressForPlot(plot).slot-1];return{x:parcel.foot.x-p.width/2,y:parcel.foot.y-p.height,width:p.width,height:p.height,door:{...parcel.foot},front:{...parcel.front}};}
export type Occupant={districtId:string;point:LayoutPoint};
export function housingBlocks(plot:string,plan:string,point:LayoutPoint){const b=housingFootprintFor(plot,plan);return point.x>=b.x-.24&&point.x<=b.x+b.width+.24&&point.y>=b.y-.24&&point.y<=b.y+b.height+.24;}
const occupantSchema=z.array(z.object({districtId:plotId,point:z.object({x:z.number().finite().min(0).max(64),y:z.number().finite().min(0).max(64)}).strict()}).strict()).max(10000);
export function finishHousingBuild(input:HousingAccount,now:number,occupants:readonly Occupant[]=[]):HousingOutcome{
 const a=housingAccountSchema.parse(input),b=a.build;
 if(!occupantSchema.safeParse(occupants).success)return refusal(input,'Occupant positions could not be confirmed. Your current home stays open.');
 if(!b||!clockValid(a,now)||a.workshop.revision>=1_000_000)return refusal(input,'No construction can be completed right now.');
 if(now<b.readyAt)return refusal(input,'The crew is still working. Your current home remains open.');
 if(occupants.some(o=>o.districtId===addressForPlot(b.plotId).block&&housingBlocks(b.plotId,b.target,o.point)))return refusal(input,'Someone is beside the new walls. The crew will wait; your current home stays open.');
 const next=revised(a,now,'Your home is ready. '+(a.home?'Same address. ':'Your first address is yours. ')+'The committee is considering a ribbon.'),p=contractPlan(b.target),allowed=yardAnchors(p.id).map(p=>p.slot),returns:HousingQuote['bagReturns']=[];
 const layout=a.home?structuredClone(a.home.layout):{level:p.tier,placements:Object.fromEntries(PLACEMENT_SLOTS.map(s=>[s.id,null])) as HomeLayout['placements'],workroomPlacements:emptyWorkroom()};layout.level=p.tier;
 const items=a.home?structuredClone(a.home.yard):emptyYard();for(const s of YARD_SLOTS)if(items[s]&&!allowed.includes(s)){returns.push({slot:s,prop:items[s]!});items[s]=null;}
 next.home={plotId:b.plotId,planId:b.target,legacyExterior:null,layout,yard:items};next.build=null;
 return{ok:true,account:housingAccountSchema.parse(next),message:next.workshop.lastMessage,bagReturns:returns};
}
export type AllocationSlot={area:'rental'|'indoor'|'yard';slot:string};
const allocationSlotSchema=z.object({area:z.enum(['rental','indoor','yard']),slot:z.string().max(32)}).strict();
export const arrangeHousingSchema=z.object({version:z.literal(1),catalogVersion:z.literal(HOUSING_CATALOG_VERSION),expectedRevision:count,action:z.enum(['place','remove']),to:allocationSlotSchema,prop:z.enum(PROP_IDS).optional(),from:allocationSlotSchema.optional()}).strict();
function getMap(a:HousingAccount,s:AllocationSlot):Record<string,PropId|null>{
 if(s.area==='rental'&&PLACEMENT_SLOTS.some(p=>p.id===s.slot))return a.workshop.placements;
 if(!a.home)throw Error('Earn a home before using its nooks or yard.');
 if(s.area==='yard'&&yardAnchors(a.home.planId).some(p=>p.slot===s.slot))return a.home.yard;
 if(s.area==='indoor'&&HOME_SLOTS.some(p=>p.id===s.slot)&&(!s.slot.startsWith('workroom')||a.home.layout.level===2))return s.slot.startsWith('workroom')?a.home.layout.workroomPlacements:a.home.layout.placements;
 throw Error('That decorating position is not part of your current home.');
}
export function allocatedCopies(a:HousingAccount,p:PropId){return Object.values(a.workshop.placements).filter(v=>v===p).length+(a.home?homeAllocation(a.home.layout,p)+Object.values(a.home.yard).filter(v=>v===p).length:0);}
/** One ledger for rental, all indoor nooks and yard. Ownership is never reminted. */
export function arrangeHousing(input:HousingAccount,raw:unknown,now:number):HousingOutcome{
 const a=housingAccountSchema.parse(input),r=arrangeHousingSchema.parse(raw);
 if(!clockValid(a,now)||r.expectedRevision!==a.workshop.revision||a.workshop.revision>=1_000_000)return refusal(input,'Your belongings changed. Review them before arranging again.');
 const next=structuredClone(a);let message:string;
 if(r.action==='place'&&next.workshop.stats.placed>=1_000_000)return refusal(input,'The placement counter is full. Nothing was moved.');
 try{
  const to=getMap(next,r.to);
  if(r.action==='remove'){
   if(r.from||r.prop||!to[r.to.slot])return refusal(input,'Choose a placed item to return to your bag.');
   to[r.to.slot]=null;message='Returned to your bag. Nothing spent.';
  }else{
   if(!r.prop||to[r.to.slot]||r.to.area==='yard'&&!YARD_PROPS.includes(r.prop as typeof YARD_PROPS[number]))return refusal(input,'Choose an empty position and an appropriate owned furnishing.');
   if(r.from){const from=getMap(next,r.from);if(from[r.from.slot]!==r.prop)return refusal(input,'That item is no longer there.');from[r.from.slot]=null;}
   else if(allocatedCopies(a,r.prop)>=a.workshop.owned[r.prop])return refusal(input,'All owned copies are already placed. Move one or return it to the bag.');
   to[r.to.slot]=r.prop;next.workshop.stats.placed++;if(r.prop==='planter'&&next.workshop.stats.plantersCrafted>0&&(r.to.area==='rental'||r.to.area==='yard'))next.workshop.stats.planterPlacedAfterCraft=true;message='Placed. No materials spent.';
  }
 }catch(e){return refusal(input,(e as Error).message);}
 const result=revised(next,now,message);return{ok:true,account:housingAccountSchema.parse(result),message,bagReturns:[]};
}
/** Public appearance only. Never spread a private workshop/quote/build receipt. */
export function publicHousing(a:HousingAccount,now:number,appearance:{pennantOwned:boolean}={pennantOwned:false}){
 housingAccountSchema.parse(a);z.object({pennantOwned:z.boolean()}).strict().parse(appearance);const plot=a.home?.plotId??a.build?.plotId;if(!plot)return null;
 const boxVisible=!!a.home&&(homeAllocation(a.home.layout,'letterbox')+Object.values(a.home.yard).filter(p=>p==='letterbox').length)>0;
 return{ownerId:a.ownerId,plotId:plot,address:addressForPlot(plot),planId:a.home?.planId??null,legacyExterior:a.home?.legacyExterior??null,level:a.home?.layout.level??0,pennantOwned:!!a.home&&appearance.pennantOwned,letterboxMotif:boxVisible?a.workshop.commission.motif:null,indoor:a.home?structuredClone(a.home.layout):null,yard:a.home?structuredClone(a.home.yard):emptyYard(),construction:a.build?(now>=a.build.readyAt?'ready':'building'):null};
}

/** Wide-screen surround is decorative only; persistent block/parcel coordinates stay fixed. */
export function residentialFrame(viewWidth:number,viewHeight:number,zoom:number){
 if(![viewWidth,viewHeight,zoom].every(Number.isFinite)||viewWidth<=0||viewHeight<=0||zoom<=0)throw Error('Invalid viewport.');
 const width=Math.max(2048,viewWidth/zoom+128),height=Math.max(2048,viewHeight/zoom+128);
 return{x:(2048-width)/2,y:(2048-height)/2,width,height,walkable:{x:0,y:0,width:2048,height:2048},classification:'Candidate decorative verges only; no new lots or movement boundary.'};
}
/** Candidate doorway intent only; real integration must retain server proximity,
 * presence locks and per-room privacy. Construction never sends occupants elsewhere. */
export function housingVisit(a:HousingAccount,visitorId:string){
 housingAccountSchema.parse(a);id.parse(visitorId);if(!a.home)return null;
 const address=addressForPlot(a.home.plotId),parcel=PARCELS[address.slot-1];
 return{entry:{room:a.home.layout.level===2?'home-expanded':'home',homePlotId:a.home.plotId,districtId:address.block,position:{x:9,y:11}},exit:{room:'neighborhood',districtId:address.block,position:{...parcel.front}},mayArrange:visitorId===a.ownerId,mayHarvestPrivateGarden:visitorId===a.ownerId,classification:'Candidate visit intent; server identity/proximity still required.'};
}
