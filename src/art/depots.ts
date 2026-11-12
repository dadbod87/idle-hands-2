import catalog from '../../public/art/depots/catalog.json' with {type:'json'};
import type {ResourceId} from '../game/workshop.ts';
export const DEPOT_CATALOG=catalog;
export const DEPOT_ASSETS=catalog.assets.map(a=>a.id);
export function depotArt(resource:ResourceId){
 const asset=catalog.assets.find(a=>a.resourceId===resource);
 if(!asset)throw new Error('Missing authored depot art: '+resource);
 return asset;
}
