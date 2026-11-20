import {GARDEN_ASSETS,gardenArt} from './garden.ts';
import type {ResidentId} from './variety.ts';
import type {Room} from '../game/world.ts';

const SQUARE_KINDS = new Set(['entrance','registry','field','errand','welcome']);
const GARDEN_KINDS = new Set(['bed','crop','ground','attendant']);

export function gardenWorldAssets(room:Room,resident:ResidentId):string[]{
  if(room==='neighborhood')return ['garden-registry'];
  if(room==='square')return GARDEN_ASSETS.filter(key=>SQUARE_KINDS.has(gardenArt(key).kind));
  if(room==='garden')return GARDEN_ASSETS.filter(key=>
    GARDEN_KINDS.has(gardenArt(key).kind)||key==='garden-actions-'+resident);
  return [];
}
