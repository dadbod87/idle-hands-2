import type {Point,Stop,World} from './world.ts';

export const MOSSBANK_ENTRY={x:5.1,y:27.4} as const satisfies Point;
export const MOSSBANK_FRONT={x:112.6,y:58.2} as const satisfies Point;
export const MOSSBANK_ROAD={
 id:'mossbank-road',name:'Road to Mossbank',point:MOSSBANK_FRONT,
 transition:'mossbank',arrival:MOSSBANK_ENTRY,doorArea:[111.75,56.25,2.8,2.55],
 text:'A safe forestry road past the east orchard. Follow it to the sawmill.',
} satisfies Stop;

export const MOSSBANK_INKWOOD_FRONT={x:12.3,y:7.4} as const satisfies Point;
export const INKWOOD_MOSSBANK_ROAD={
 id:'inkwood-mossbank-road',name:'Road to Mossbank',point:MOSSBANK_INKWOOD_FRONT,
 transition:'mossbank',arrival:MOSSBANK_ENTRY,doorArea:[11.45,6.15,2.45,2.45],
 text:'A safe forestry road onward from Inkwood. Follow it to the sawmill.',
} satisfies Stop;

export const MOSSBANK_TREES=[
 {x:3,y:18,kind:'pine'},{x:6.2,y:14.1,kind:'oak'},{x:3.8,y:8.3,kind:'birch'},
 {x:11.3,y:8.8,kind:'pine'},{x:10.2,y:17,kind:'pine'},{x:5.5,y:31.3,kind:'birch'},
 {x:12.5,y:31.4,kind:'oak'},{x:19.2,y:30.7,kind:'pine'},{x:18.6,y:4.9,kind:'oak'},
 {x:22.3,y:7.75,kind:'oak'},{x:21,y:8.8,kind:'birch'},{x:33.2,y:5.4,kind:'birch'},
 {x:39.6,y:6.7,kind:'pine'},{x:43,y:10.2,kind:'pine'},{x:37.7,y:12.1,kind:'oak'},
 {x:33.9,y:17.3,kind:'oak'},{x:44.9,y:24.7,kind:'birch'},{x:43.3,y:28.4,kind:'oak'},
 {x:39.1,y:30.9,kind:'pine'},{x:31.4,y:28.4,kind:'pine'},
] as const;

export const MOSSBANK_STOPS=[
 {id:'mossbank-return',name:'Ledgerwick road',point:{x:2.8,y:27.4},transition:'square',arrival:MOSSBANK_FRONT,
  doorArea:[1.1,26,2.45,3.8],text:'Follow the forestry road back to the orchard.'},
 {id:'mossbank-mill',name:'Wren · sawmill',point:{x:15.2,y:22.8},doorArea:[11.7,18,6.8,5.45],
  text:'Wren sorts timber by grain. The requisition sheet sorts by who complained last.'},
 {id:'mossbank-windrow',name:'Alder windrow',point:{x:19.6,y:12.7},doorArea:[18.5,10.1,2.9,3.2],
  text:'The alder crowns lean east. Every storm adds a little more to the curve.'},
 {id:'mossbank-flume',name:'Flume landing',point:{x:38.1,y:24.1},doorArea:[36.7,21.5,3.5,3.1],
  text:'The painted high-water marker is one rung above the dry shelf.'},
 {id:'mossbank-nursery',name:'Sapling beds',point:{x:34.7,y:11.6},doorArea:[32.8,8.3,4.55,3.7],
  text:'Wren has labeled every sapling. The rabbits are submitting corrections.'},
] satisfies Stop[];

const sharedReturn:Stop={
 ...MOSSBANK_STOPS[0],name:'Inkwood road',transition:'trail',arrival:MOSSBANK_INKWOOD_FRONT,
 text:'Back to Inkwood. The restored bridge leads home from the trail.',
};

export const MOSSBANK_ROOM:World={
 width:48,height:35,
 blocked:[
  [11.5,16.5,7.1,5.3],[32.2,7.5,6.3,2.2],[18.6,10.7,2.8,1.3],
  [25,0,4.5,14.25],[25,17.5,4.5,5.2],[25,26.05,4.5,9],
  [36.7,21.5,3.2,1.6],
  ...MOSSBANK_TREES.map(({x,y})=>[x+.15,y-.09,.7,.65] as [number,number,number,number]),
 ],
 stops:[sharedReturn,...MOSSBANK_STOPS.slice(1)],
};
