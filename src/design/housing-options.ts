/** Unregistered housing design. Nothing here buys, builds or migrates a home. */
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../game/town-rules.ts';
import {PARCELS,addressForPlot} from '../game/neighborhood.ts';
import {homeLayoutSchema,type HomeLayout} from '../game/live-home-layout.ts';
import {homeExteriorForPlot} from '../art/residential.ts';
export const HOUSING_FAMILIES=['pocket-cottage','porch-house','garden-studio','workshop-lodge'] as const;
export type HousingFamily=typeof HOUSING_FAMILIES[number];
export type HousingTier=1|2;
export type HousingPlan={id:string;family:HousingFamily;tier:HousingTier;name:string;width:number;height:number;indoorNooks:6|8;yard:{x:number;y:number}[];feature:string;extraRoom:string;convenience:null|'same-garden'|'same-bench';roof:string;wall:string};
const front=[{x:1.5,y:9},{x:6.5,y:9}];
export const HOUSING_PLANS:readonly HousingPlan[]=[
 {id:'pocket-cottage-1',family:'pocket-cottage',tier:1,name:'Pocket Cottage',width:4.5,height:5.5,indoorNooks:6,yard:[{x:1.1,y:4.5},{x:6.9,y:4.5},...front],feature:'A small house. A generous garden.',extraRoom:'Main room',convenience:null,roof:'#6c8175',wall:'#d9caa6'},
 {id:'pocket-cottage-2',family:'pocket-cottage',tier:2,name:'Cottage with a Loft',width:4.5,height:7.5,indoorNooks:8,yard:[{x:1.1,y:4.5},{x:6.9,y:4.5},...front],feature:'More indoors. Still room for roses.',extraRoom:'Loft · 2 added nooks',convenience:null,roof:'#6c8175',wall:'#d9caa6'},
 {id:'porch-house-1',family:'porch-house',tier:1,name:'The Front-Porch House',width:6,height:5.5,indoorNooks:6,yard:[...front],feature:'For waving at people without leaving.',extraRoom:'Main room + covered porch',convenience:null,roof:'#a76f56',wall:'#bac4ab'},
 {id:'porch-house-2',family:'porch-house',tier:2,name:'Porch House, Upstairs',width:6,height:7.5,indoorNooks:8,yard:[...front],feature:'An upstairs retreat. The same porch.',extraRoom:'Upstairs retreat · 2 added nooks',convenience:null,roof:'#a76f56',wall:'#bac4ab'},
 {id:'garden-studio-2',family:'garden-studio',tier:2,name:'Garden Studio',width:6.5,height:6.5,indoorNooks:8,yard:[...front,{x:4,y:.7}],feature:'Sunroom space and a garden desk.',extraRoom:'Sunroom · 2 added nooks',convenience:'same-garden',roof:'#a78263',wall:'#d1c394'},
 {id:'workshop-lodge-2',family:'workshop-lodge',tier:2,name:'Workshop Lodge',width:6.5,height:7.5,indoorNooks:8,yard:[...front],feature:'A workroom for excellent intentions.',extraRoom:'Workroom · 2 added nooks',convenience:'same-bench',roof:'#526f70',wall:'#bdb7a3'}
];
export const PROPOSED_BUILD_MS=6*3600_000;
export function housingPlan(family:HousingFamily,tier:HousingTier):HousingPlan{
 const plan=HOUSING_PLANS.find(p=>p.family===family&&p.tier===tier);if(!plan)throw Error('That family has no starter plan.');return structuredClone(plan);
}
/** Price is an earned-resource proposal grounded in current12/24kit rights.
 * A family switch never charges for an already-owned tier or downgrades its nooks. */
export function housingStudyQuote(current:0|HousingTier,family:HousingFamily,requested:HousingTier=1){
 if(![0,1,2].includes(current)||![1,2].includes(requested)||!HOUSING_FAMILIES.includes(family))throw Error('Unknown housing study choice.');
 const minimum=family==='garden-studio'||family==='workshop-lodge'?2:1;
 const tier=Math.max(current,minimum,requested) as HousingTier,plan=housingPlan(family,tier);
 const kits=current===0?PLOT_CLAIM_KITS+(tier===2?PLOT_UPGRADE_KITS:0):current===1&&tier===2?PLOT_UPGRADE_KITS:0;
 return{plan,kits,totalEarnedKits:PLOT_CLAIM_KITS+(tier===2?PLOT_UPGRADE_KITS:0),constructionMs:PROPOSED_BUILD_MS,keptIndoorNooks:current===2?8:current===1?6:0,classification:'Design proposal, not an authoritative game quote.'};
}
export function housingFootprint(slot:number,plan:HousingPlan){
 const parcel=PARCELS[slot-1];if(!parcel)throw Error('Unknown persistent parcel.');
 return{x:parcel.foot.x-plan.width/2,y:parcel.foot.y-plan.height,width:plan.width,height:plan.height,door:{...parcel.foot},front:{...parcel.front}};
}
export function housingYard(slot:number,plan:HousingPlan){const p=PARCELS[slot-1];if(!p)throw Error('Unknown persistent parcel.');return plan.yard.map(a=>({x:p.lot.x+a.x,y:p.lot.y+a.y}));}
/** Snapshot-only legacy audit, NOT a registered SQL/save migration. */
export function auditLegacyHome(plotId:string,layout:HomeLayout){
 const checked=homeLayoutSchema.parse(layout),address=addressForPlot(plotId),exterior=homeExteriorForPlot(plotId,checked.level);
 return{plotId,address,legacyExterior:exterior.id,tier:checked.level,indoorNooks:checked.level===2?8:6,kept:structuredClone(checked),retroactiveKitCharge:0,forcedLayoutChange:false,classification:'Unregistered migration contract audit.'};
}
