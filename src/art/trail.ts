/** IH2-053 original presentation geometry, never passage/reward authority. */
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
