import catalog from '../../public/art/carpentry/catalog.json' with {type:'json'};
import {FACINGS,type Facing} from './kit.ts';
export const CARPENTRY_ASSETS=catalog.assets.map(a=>a.id);
export const CARPENTRY_ACTIONS=['saw','finish','deliver']as const;
export type CarpentryAnimation=typeof CARPENTRY_ACTIONS[number];
export function carpentryArt(id:string){const meta=catalog.assets.find(a=>a.id===id);if(!meta)throw new Error('Missing original carpentry art: '+id);return meta;}
export function carpentryActionFrame(facing:Facing,action:CarpentryAnimation,elapsed:number,reduced:boolean){return FACINGS.indexOf(facing)*9+CARPENTRY_ACTIONS.indexOf(action)*3+(reduced?0:Math.min(2,Math.max(0,Math.floor(elapsed/240))));}
