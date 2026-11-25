import type {Point, Stop, World} from './world.ts';

export const PUMPWORKS_ENTRY={x:4,y:14.5} as const satisfies Point;
export const PUMPWORKS_FRONT={x:36,y:69.5} as const satisfies Point;
export const PUMPWORKS_DOOR={
 id:'pumpworks-door',name:'The Pumpworks',point:PUMPWORKS_FRONT,doorArea:[34.5,65.75,4,3.75],
 transition:'pumpworks',arrival:PUMPWORKS_ENTRY,
 text:'The old flood station. A copper sign says to borrow a sounding rod before crossing the water.',
} satisfies Stop;
export const PUMPWORKS_SAFE_BENCH={x:4.7,y:5.1} as const satisfies Point;
export const PRACTICE_BELL={x:5.55,y:7.35} as const satisfies Point;
export const FORGE_STOP={
 id:'pumpworks-forge',name:'Dry-side forge',point:{x:6.3,y:5.85},doorArea:[5.3,3.2,2,2.25],
 text:'Make a riveted vest from the forge’s practice blank.',
} as const satisfies Stop;
export const HOPPER_FEET={x:16.2,y:8.3} as const;
export const PUMPWORKS_ROOM:World={
 width:26,height:18,
 blocked:[[1,1,24,1],[7.8,2,4.35,8.85],[7.8,12.85,4.35,4.15],[20,2,5,3.3],[2,4,2,1.3],[2,7,2,2],[5.35,4.45,1.9,.86]],
 stops:[
  {id:'pumpworks-exit',name:'Willow meadow',point:{x:4,y:16.1},doorArea:[2.9,16.35,3,1.3],
   transition:'square',arrival:PUMPWORKS_FRONT,text:'Back to Willow meadow.'},
  {id:'pumpworks-locker',name:'Survey locker',point:{x:4.4,y:9.2},doorArea:[2,7,2.5,2.5],
   text:'One sounding rod, one field satchel, and a very reasonable expectation that you return both.'},
  {id:'pumpworks-bell',name:'Practice bell',point:PRACTICE_BELL,
   text:'Test a swing on the dry side of the footbridge.'},
  {id:'pumpworks-bench',name:'Dry bench',point:PUMPWORKS_SAFE_BENCH,doorArea:[2,4,2.6,1.35],
   text:'A dry spot to take a breath before crossing the water.'},
  FORGE_STOP,
  {id:'pumpworks-hopper',name:'Hopper chamber',point:{x:16.2,y:9.5},
   text:'The hopper notices movement on the far side of the footbridge.'},
  {id:'pumpworks-cache',name:'Lost property shelf',point:{x:16.6,y:13.8},doorArea:[15.8,12.55,2.5,1.5],
   text:'A hook for the things the Pumpworks coughs back up.'},
  {id:'pumpworks-report',name:'Inspection desk',point:{x:21.7,y:6.8},doorArea:[20.5,5.25,2.8,1.65],
   text:'A signed survey can finally go in the Journal.'},
 ],
};
