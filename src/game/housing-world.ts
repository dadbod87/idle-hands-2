import{worlds,type World}from'./world.ts';
import{addressForPlot,PARCELS,NEIGHBORHOOD_TREES}from'./neighborhood.ts';
import{contractPlan}from'../design/housing-contract.ts';
/** A per-room value, never a mutable global collision table. Foot coordinates use tile-centres. */
export function housingWorld(plots:readonly{id:string;planId?:string|null}[],districtId:string):World{
 const blocked:World['blocked']=PARCELS.map(parcel=>{const plot=plots.find(p=>{const a=addressForPlot(p.id);return a.block===districtId&&a.slot===parcel.slot;});if(!plot?.planId)return[parcel.building.x,parcel.building.y,parcel.building.width,parcel.building.height];const p=contractPlan(plot.planId);return[parcel.foot.x-p.width/2,parcel.foot.y-p.height,p.width,p.height];});
 return{...worlds.neighborhood,blocked:[...blocked,...NEIGHBORHOOD_TREES.map(([x,y])=>[x-.35,y-.75,.7,.75]as[number,number,number,number])]};
}
