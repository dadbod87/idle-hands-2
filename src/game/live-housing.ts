/** Strict shared housing projection; neither a second save nor an inventory. */
import{HOUSING_V1_PLANS}from'../design/housing-catalog-v1.ts';
import{legacyHousingAccount,housingAccountSchema,quoteSchema,emptyYard,yardAnchors,YARD_SLOTS,type HousingBuild}from'../design/housing-contract.ts';
import{isCurrentHomeLayout,type HomeLayout}from'./live-home-layout.ts';
import type{WorkshopState}from'./live-workshop.ts';
type House=HomeLayout&{id:string;planId?:string|null;yard?:ReturnType<typeof emptyYard>};
export function validPublicHouse(p:House){
 if(!isCurrentHomeLayout(p))return false;
 const plan=p.planId?HOUSING_V1_PLANS.find(a=>a.id===p.planId):null;if(p.planId&&(!plan||plan.tier!==p.level))return false;
 if(p.yard){if(Object.keys(p.yard).sort().join()!==[...YARD_SLOTS].sort().join())return false;const allowed=plan?yardAnchors(plan.id).map(a=>a.slot):['front-left','front-right'];if(YARD_SLOTS.some(s=>p.yard![s]!==null&&(!allowed.includes(s)||!['planter','letterbox'].includes(p.yard![s]!))))return false;}
 return true;
}
export function liveHousingAccount(ownerId:string,workshop:WorkshopState,plot:House|null,build:HousingBuild|null){
 if(plot&&!validPublicHouse(plot))throw Error('Stored home appearance failed validation. Nothing was replaced.');
 const a=legacyHousingAccount(ownerId,workshop,plot?{plotId:plot.id,layout:{level:plot.level,placements:plot.placements,workroomPlacements:plot.workroomPlacements}}:null);
 if(a.home&&plot){a.home.yard=plot.yard??emptyYard();if(plot.planId){a.home.planId=plot.planId;a.home.legacyExterior=null;}}
 a.build=build;return housingAccountSchema.parse(a);
}
export function validPrivateHousing(ownerId:string,workshop:WorkshopState,plot:House|null,h:unknown){
 try{if(!h||typeof h!=='object')return false;const v=h as{build:HousingBuild|null;quote:unknown;nextPlotId:string};if(Object.keys(v).sort().join()!==['build','nextPlotId','quote'].join()||!(/^[1-9][0-9]{0,17}$/).test(v.nextPlotId))return false;liveHousingAccount(ownerId,workshop,plot,v.build);if(v.quote){const q=quoteSchema.parse(v.quote);if(q.ownerId!==ownerId)return false;}return true;}catch{return false;}
}
