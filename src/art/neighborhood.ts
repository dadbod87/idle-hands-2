/** Original street/registry/site art, with geometry separate from server authority. */
import catalog from '../../public/art/neighborhood/catalog.json'with{type:'json'};
export const NEIGHBORHOOD_ASSETS=catalog.assets;
export function neighborhoodArt(id:string){const item=catalog.assets.find(a=>a.id===id);if(!item)throw new Error('Missing neighborhood art: '+id);return item;}
