import catalog from '../../public/art/garden/catalog.json' with {type:'json'};
import {FACINGS,type Facing} from './kit.ts';
export const GARDEN_ASSETS=catalog.assets.map(a=>a.id);
export const GARDEN_ACTIONS=['sow','inspect','harvest'] as const;
export type GardenAnimation=typeof GARDEN_ACTIONS[number];
export const GARDEN_BEDS=[{x:5.5*32,y:11*32},{x:9.5*32,y:11*32},{x:13.5*32,y:11*32}] as const;
export function gardenArt(id:string){const meta=catalog.assets.find(a=>a.id===id);if(!meta)throw new Error('Missing original garden art: '+id);return meta;}
export function gardenActionFrame(facing:Facing,action:GardenAnimation,elapsed:number,reduced:boolean){return FACINGS.indexOf(facing)*6+GARDEN_ACTIONS.indexOf(action)*2+(reduced?0:Math.min(1,Math.max(0,Math.floor(elapsed/100))));}
