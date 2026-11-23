/** IH2-053 original presentation geometry, never passage/reward authority. */
import type {Room} from '../game/world.ts';
import catalog from '../../public/art/trail/catalog.json' with {type:'json'};
export const TRAIL_CATALOG=catalog;
export const TRAIL_ASSETS=catalog.assets.map(asset=>asset.id);
export const TRAIL_ART={
 ground:'trail-ground',size:{width:576,height:832},
 bridge:{collecting:'trail-bridge-collecting',building:'trail-bridge-building',ready:'trail-bridge-ready',open:'trail-bridge-open',width:96,height:112,foot:{x:48,y:112}},
 landmarks:{
  trailhead:{key:'trail-landmark-trailhead',width:96,height:112,foot:{x:48,y:104},point:{x:6,y:18}},
  'old-sign':{key:'trail-landmark-old-sign',width:96,height:112,foot:{x:48,y:104},point:{x:12,y:12}},
  lookout:{key:'trail-landmark-lookout',width:96,height:112,foot:{x:48,y:104},point:{x:4,y:8}}
 },
 pennant:{world:'trail-pennant-world',icon:'trail-pennant-icon',width:96,height:112,foot:{x:48,y:106}},
 treePlacements:catalog.treePlacements
} as const;


export function trailWorldAssets(room:Room):readonly string[]{
 if(room==='square')return [TRAIL_ART.bridge.collecting,TRAIL_ART.bridge.building,TRAIL_ART.bridge.ready,TRAIL_ART.bridge.open];
 if(room==='trail')return [TRAIL_ART.ground,...Object.values(TRAIL_ART.landmarks).map(landmark=>landmark.key)];
 if(room==='home'||room==='home-expanded')return [TRAIL_ART.pennant.world];
 return [];
}
