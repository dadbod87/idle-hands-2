/** Shared Ledgerwick address/geometry model. It neither allocates plots nor authorizes entry. */
export const BLOCK_SIZE={width:64,height:64}as const;
export const STREETS=['Clover Court','Copper Row','Birch Bend','Larkspur Lane']as const;
export type LayoutPoint={x:number;y:number};
export const TOWN_GATE={x:31.5,y:2.5};
export const PARCELS=STREETS.flatMap((street,row)=>Array.from({length:6},(_,column)=>{
 const left=5+column*9,top=6+row*13,front={x:left+4,y:top+8.5};
 return{slot:row*6+column+1,street,number:column+1,lot:{x:left,y:top,width:8,height:10},foot:{x:left+4,y:top+8},front,building:{x:left+.75,y:top+.5,width:6.5,height:7.5},door:{x:left+3.25,y:top+7.5,width:1.5,height:2}};
}));
/** Database identity, not sort order or owner name, determines the stable address.
 * Decimal strings avoid rounding future bigint IDs. Additional blocks are unlimited. */
export function addressForPlot(plotId:string){
 if(!/^[1-9][0-9]{0,17}$/.test(plotId))throw new Error('Invalid positive plot identity.');
 const value=BigInt(plotId)-1n,slot=Number(value%24n)+1,block=(value/24n+1n).toString(),parcel=PARCELS[slot-1];
 return{block,slot,street:parcel.street,number:parcel.number,label:`${parcel.number} ${parcel.street} · neighborhood ${block}`};
}
export function plotAtAddress(block:string,slot:number){
 if(!/^[1-9][0-9]{0,17}$/.test(block)||!Number.isInteger(slot)||slot<1||slot>24)throw new Error('Invalid neighborhood address.');
 const id=((BigInt(block)-1n)*24n+BigInt(slot)).toString();addressForPlot(id);return id;
}
export function candidateCanStand(p:LayoutPoint){return p.x>=.3&&p.y>=.3&&p.x<=63.7&&p.y<=63.7&&!PARCELS.some(({building:b})=>p.x>=b.x-.25&&p.x<=b.x+b.width+.25&&p.y>=b.y-.25&&p.y<=b.y+b.height+.25);}
/** Explicit broad public lane; no route passes through a house or another lot. */
export function routeToParcel(slot:number){const p=PARCELS[slot-1];if(!p)throw new Error('Unknown parcel.');return[TOWN_GATE,{x:31.5,y:p.front.y+1},{x:p.front.x,y:p.front.y+1},p.front];}
export function routeLength(points:LayoutPoint[]){return points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);}

/** A fresh front-door value; callers cannot move the authored parcel or another home. */
export function frontForPlot(plotId:string){const address=addressForPlot(plotId);return{districtId:address.block,position:{...PARCELS[address.slot-1].front}};}
/** Public district availability only; server proximity/identity still authorizes travel. */
export function districtExists(districtId:string,plots:ReadonlyArray<{id:string}>){
 if(!/^[1-9][0-9]{0,17}$/.test(districtId))return false;
 if(districtId==='1')return true;
 return plots.some(plot=>addressForPlot(plot.id).block===districtId);
}
export const RESIDENTIAL_GATE={x:42,y:32}as const;
export const HOME_SITE_PREFIX='home-site-';
export function positionContextValid(value:{room:string;homePlotId?:string;districtId?:string}){
 const home=value.room==='home'||value.room==='home-expanded',positive=(x:string|undefined)=>!!x&&/^[1-9][0-9]{0,17}$/.test(x);
 if(home)return positive(value.homePlotId)&&(value.districtId===undefined||positive(value.districtId)&&addressForPlot(value.homePlotId!).block===value.districtId);
 return value.homePlotId===undefined&&(value.room==='neighborhood'?positive(value.districtId):value.districtId===undefined);
}
export function exitForHome(value:{homePlotId?:string;districtId?:string}){
 if(value.districtId===undefined)return{room:'square' as const,districtId:undefined,position:{x:30,y:35.5}};
 if(!value.homePlotId||!positionContextValid({room:'home',...value}))throw new Error('Invalid home doorway origin.');
 return{room:'neighborhood' as const,...frontForPlot(value.homePlotId)};
}

export const NEIGHBORHOOD_TREES=[[2,5,'oak'],[61,6,'birch'],[2,19,'fruit'],[61,32,'oak'],[2,44,'birch'],[8,60,'fruit'],[20,60,'oak'],[54,61,'birch']]as const;
