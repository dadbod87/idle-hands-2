import type {Point, World} from './world.ts';

export const GLASSHOUSE_ENTRY:Point={x:9,y:12};
export const GLASSHOUSE_FRONT:Point={x:14.5,y:6.7};

export const GLASSHOUSE_ROOM:World={
 width:18,height:15,
 blocked:[
  [1,1,16,1],
  [2,4,5,2.25],[11,4,5,2.25],
  [2,8.8,4,1.9],[12,8.8,4,1.9],
 ],
 stops:[
  {id:'glasshouse-keeper',name:'Nursery keeper',point:{x:9,y:5.9},doorArea:[8,3.6,2.5,2.3],
   text:'“The roof keeps out the rain. The minutes from the opening meeting are still damp.”'},
  {id:'glasshouse-fern',name:'Fern bench',point:{x:5,y:7},doorArea:[2,4,5,2.25],
   text:'The committee fern has already formed two more leaves.'},
  {id:'glasshouse-sundew',name:'Sundew bench',point:{x:13,y:7},doorArea:[11,4,5,2.25],
   text:'Very patient sundew. Meetings are its natural habitat.'},
  {id:'glasshouse-seeds',name:'Seed drawers',point:{x:4,y:11.4},doorArea:[2,8.8,4,1.9],
   text:'Every drawer has a label. Two contain the same label.'},
  {id:'glasshouse-pots',name:'Pottery ledge',point:{x:14,y:11.4},doorArea:[12,8.8,4,1.9],
   text:'Unclaimed pots. No approval required to admire them.'},
  {id:'glasshouse-exit',name:'Inkwood trail',point:{x:9,y:13.25},doorArea:[7.75,13.5,3,1.5],
   transition:'trail',arrival:GLASSHOUSE_FRONT,text:'Back to the Glasshouse front step.'},
 ],
};
