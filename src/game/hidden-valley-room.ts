import type {Point,Stop,World} from './world.ts';

export const VALLEY_ENTRY={x:5.3,y:35.5} as const satisfies Point;
export const MOSSBANK_VALLEY_FRONT={x:44.65,y:15.4} as const satisfies Point;
export const MOSSBANK_VALLEY_ROAD={
 id:'mossbank-hidden-valley',name:'Hidden Valley road',point:MOSSBANK_VALLEY_FRONT,
 transition:'hidden-valley',arrival:VALLEY_ENTRY,doorArea:[44.15,13.65,2.9,2.5],
 text:'Follow the ridgeline to the terraced orchard.',
} satisfies Stop;

export const VALLEY_TREES=[
 [4,26,'pine'],[7,23,'birch'],[11,20,'pine'],[14,18,'oak'],[7,15,'pine'],[4,9,'birch'],
 [16,8,'pine'],[19,6,'birch'],[27,7,'oak'],[31,11,'birch'],[33,8,'pine'],
 [7,39,'oak'],[13,39,'birch'],[20,39,'oak'],[27,38,'pine'],
 [20,17,'fruit'],[24,18,'fruit'],[28,16,'fruit'],[30,19,'fruit'],[21,22,'fruit'],
 [24,22,'fruit'],[28,22,'fruit'],[32,23,'fruit'],[35,24,'birch'],
 [45,34,'oak'],[51,37,'birch'],[56,35,'fruit'],[60,31,'pine'],[59,23,'birch'],
 [55,17,'fruit'],[48,12,'oak'],[56,10,'birch'],[61,12,'pine'],[48,8,'birch'],
 [45,5,'pine'],[57,40,'pine'],[33,35,'oak'],
] as const;

export const VALLEY_STOPS=[
 {id:'valley-mossbank-road',name:'Mossbank road',point:{x:2.45,y:35.5},
  transition:'mossbank',arrival:MOSSBANK_VALLEY_FRONT,doorArea:[.9,34.15,2.6,2.7],
  text:'Follow the ridge back down to Mossbank.'},
 {id:'valley-overlook',name:'Terrace overlook',point:{x:14.5,y:26.15},doorArea:[12.8,23.7,3.3,2.5],
  text:'The path drops away to the cider court. Someone put a bench right where the committee wanted another sign.'},
 {id:'valley-grafting-house',name:'Grafting house',point:{x:24.8,y:13.2},doorArea:[21.1,8.7,6.45,4.05],
  text:'One living tree, three varieties of apple. The paperwork is a separate species.'},
 {id:'valley-cider-court',name:'Cider court',point:{x:27.2,y:30.3},doorArea:[23.3,25,6.7,4.9],
  text:'An old cider press and a broad meeting green. The press has a fine handle and no current permit.'},
 {id:'valley-terrace-lane',name:'Terrace lane',point:{x:51.15,y:26.3},doorArea:[50,24.3,3.25,1.9],
  text:'Three different roofs mark the uphill walk. The gardens rise one terrace at a time.'},
] satisfies Stop[];

export const HIDDEN_VALLEY_ROOM:World={
 width:64,height:44,
 blocked:[
  [38,0,4.5,16.1],[38,20.3,4.5,7.2],[38,31.95,4.5,12.05],
  [20.8,8.25,6.8,4.15],[23.2,24.05,7.05,5.3],
  [46.3,16.1,5.5,4.0],[53.65,18.15,5.8,4.05],[54.45,25.5,4.8,4.4],
  [11.75,23.65,4.9,.6],[10.75,21.75,3.0,1.0],[16.8,22.15,2.45,1.0],
  ...VALLEY_TREES.map(([x,y])=>[x+.15,y-.09,.7,.65] as [number,number,number,number]),
 ],
 stops:VALLEY_STOPS,
};
