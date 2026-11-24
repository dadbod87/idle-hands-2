import type { Point, Stop, World } from '../game/world.ts';

// Candidate room only. No Room ID, save, portal or live map registers it.
export const GLASSHOUSE_ENTRY: Point = {x:9,y:12};
export const GLASSHOUSE_ROOM: World = {
 width:18,height:15,
 blocked:[
  [1,1,16,1],
  [2,4,5,2.25],[11,4,5,2.25],
  [2,8.8,4,1.9],[12,8.8,4,1.9],
 ],
 stops:[
  {id:'keeper',name:'Nursery keeper',point:{x:9,y:6},text:'Walk the warm aisle. Choose a keepsake if this is your first visit.'},
  {id:'fern-table',name:'Fern bench',point:{x:5,y:7},text:'The committee fern has already formed two more leaves.'},
  {id:'sundew-table',name:'Sundew bench',point:{x:13,y:7},text:'Very patient sundew. Meetings are its natural habitat.'},
  {id:'seed-station',name:'Seed drawers',point:{x:4,y:11.4},text:'The dry drawers keep nursery labels. Your garden seeds stay where you left them.'},
  {id:'window-ledge',name:'Pottery ledge',point:{x:14,y:11.4},text:'Unclaimed pots. No approval required to admire them.'},
  {id:'glasshouse-exit',name:'Inkwood trail',point:{x:9,y:13.25},text:'Back to the glasshouse threshold.'},
 ] satisfies Stop[],
};
