import{PARCELS,STREETS,HOME_SITE_PREFIX,addressForPlot}from'./neighborhood.ts';
/** Stable menu grouping captured at open time. It never moves an actor or changes a goal. */
import{RECIPES,RESOURCE_IDS,type WorkshopState}from'./workshop.ts';import type{Room,Stop}from'./world.ts';
export type PlaceGroup={id:string;title:string;stops:Stop[]};
export function placesView(room:Room,stops:Stop[],state:WorkshopState,goal:{id:string;destination?:string},now:number,neighborhood?:{districtId:string;ownerPlotId?:string}){
 if(room==='neighborhood'){const a=neighborhood?.ownerPlotId?addressForPlot(neighborhood.ownerPlotId):undefined,own=a&&a.block===neighborhood?.districtId?HOME_SITE_PREFIX+a.slot:null,ids=[own,'neighborhood-directory','neighborhood-exit'],primary=ids.flatMap(id=>stops.filter(s=>s.id===id)),chosen=new Set(primary.map(s=>s.id)),groups=STREETS.map((street,row)=>({id:'street-'+row,title:street,stops:stops.filter(s=>!chosen.has(s.id)&&PARCELS.slice(row*6,row*6+6).some(p=>s.id===HOME_SITE_PREFIX+p.slot))})).filter(g=>g.stops.length);return{primary,groups,heading:'Your neighborhood'};}
 if(room!=='square'||stops.length<=6)return{primary:[...stops],groups:[]as PlaceGroup[],heading:'In this room'};
 let preferred:string[]=[];
 if(goal.id==='gather'){preferred=RESOURCE_IDS.filter(id=>state.inventory[id]<RECIPES.planter.cost[id]);}
 else if(goal.destination==='bridge')preferred=['bridge'];
 else if(goal.id==='craft'||goal.id==='place'||goal.id==='bridge'||goal.destination==='bench'||state.job&&state.job.readyAt<=now)preferred=['workshop'];
 else preferred=['allotment','carpentry-desk','courier'];
 const primary=preferred.map(id=>stops.find(s=>s.id===id)).filter((s):s is Stop=>!!s).slice(0,3),chosen=new Set(primary.map(s=>s.id));
 const groups:PlaceGroup[]=[{id:'work',title:'Work & materials',stops:[]},{id:'town',title:'Town & neighbors',stops:[]},{id:'outdoors',title:'Outdoors & exploring',stops:[]}],work=new Set(['scrap','timber','supplies','workshop','carpentry-desk']),town=new Set(['home-front','plot','clerk','courier','caretaker','cafe','bridge','garden-registry','residential-gate']);
 for(const s of stops){if(chosen.has(s.id))continue;groups[work.has(s.id)?0:town.has(s.id)?1:2].stops.push(s);}
 return{primary,groups:groups.filter(g=>g.stops.length),heading:'Useful now'};
}
