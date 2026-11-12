import {PROP_IDS,PROPS,type PropId,type WorkshopState} from './workshop.ts';
import {MARKER_IDS,MARKER_DEFS} from './garden.ts';

export const BAG_GROUPS=['furniture','materials','garden'] as const;
export type BagGroup=typeof BAG_GROUPS[number];
export type BagStack={id:string;group:BagGroup;name:string;icon:string;quantity:number|null;detail:string};
const furnitureNames=Object.fromEntries(PROP_IDS.map(id=>[id,PROPS[id].name]))as Record<PropId,string>;
/** Read-only carried counts, never settlement or an alternative ownership ledger. */
export function bagStacks(state:WorkshopState,elsewhere:Partial<Record<PropId,number>>={}):BagStack[]{
 const stacks:BagStack[]=PROP_IDS.map(id=>{
  const workshop=Object.values(state.placements).filter(prop=>prop===id).length,home=elsewhere[id]??0,owned=state.owned[id];
  const valid=Number.isSafeInteger(home)&&home>=0&&workshop+home<=owned;
  return{id,group:'furniture',name:furnitureNames[id],icon:id==='letterbox'?'/art/commission/letterbox-'+state.commission.motif+'-closed.svg':'/art/homes/home-'+id+'-icon.svg',quantity:valid?owned-workshop-home:null,detail:valid?`${owned} owned\n${workshop+home} placed`:'Placement count unconfirmed'};
 });
 for(const id of ['scrap','timber','supplies'] as const)stacks.push({id,group:'materials',name:id==='scrap'?'Scrap':id==='timber'?'Timber':'Supplies',icon:'/art/homes/home-'+id+'-icon.svg',quantity:state.inventory[id],detail:'Carried material'});
 stacks.push({id:'pine',group:'materials',name:'Pine bundles',icon:'/art/carpentry/pine-bundle-icon.svg',quantity:state.carpentry.pine.carried,detail:'Carried wood'},
 {id:'bridge-kit',group:'materials',name:'Bridge repair kits',icon:'/art/homes/home-crate-icon.svg',quantity:state.bridgeKits,detail:'Kept kits · projects & homes'});
 for(const crop of ['radish','marigold'] as const){const name=crop==='radish'?'Radish':'Marigold';stacks.push({id:crop+'-seed',group:'garden',name:name+' seeds',icon:'/art/garden/garden-'+crop+'-seed.svg',quantity:state.garden.seeds[crop],detail:'Seeds ready to plant'},
 {id:crop+'-produce',group:'garden',name:crop==='radish'?'Harvested radishes':'Cut marigolds',icon:'/art/garden/garden-'+crop+'-produce.svg',quantity:state.garden.produce[crop],detail:'Harvested & kept'});}
 stacks.push({id:'saw',group:'garden',name:'Bound hand saw',icon:'/art/carpentry/bound-saw-icon.svg',quantity:state.carpentry.saw.owned?1:0,detail:state.carpentry.saw.equipped?'Equipped · kept tool':'Protected tool'});
 for(const id of MARKER_IDS)stacks.push({id:'marker-'+id,group:'garden',name:MARKER_DEFS[id].name,icon:'/art/garden/garden-marker-'+id+'.svg',quantity:state.garden.markers.includes(id)?1:0,detail:state.garden.selectedMarker===id?'On display · kept marker':'Garden marker'});
 return stacks;
}
