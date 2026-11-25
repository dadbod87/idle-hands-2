import type {Point,World} from '../../src/game/world.ts';

type Floor='upper'|'lower';
type Rect=World['blocked'][number];
type Space={name:string;bounds:Rect;kind:'safe'|'work'|'water'|'danger'};
type Marker={id:string;name:string;point:Point;kind:'door'|'chest'|'foe'|'boss'};
type Level={world:World;spaces:Space[];passages:Rect[];markers:Marker[]};

function level(width:number,height:number,spaces:Space[],passages:Rect[],markers:Marker[]):Level{
 const floors=[...spaces.map(space=>space.bounds),...passages];
 const blocked:Rect[]=[];
 for(let y=0;y<height;y++){
  let wall=-1;
  for(let x=0;x<=width;x++){
   const solid=x<width&&!floors.some(([left,top,w,h])=>x>=left&&x<left+w&&y>=top&&y<top+h);
   if(solid&&wall<0)wall=x;
   if(!solid&&wall>=0){blocked.push([wall,y,x-wall,1]);wall=-1;}
  }
 }
 return {world:{width,height,blocked,stops:[]},spaces,passages,markers};
}

export const START={x:8.4,y:26.6};
export const LOWER_START={x:17.2,y:28};
export const LANDING_RETURN={x:13,y:28};

export const DUNGEON:Record<Floor,Level>={
 upper:level(58,34,[
  {name:'Lamplit landing',bounds:[4,20,13,11],kind:'safe'},
  {name:'Valve gallery',bounds:[5,4,22,10],kind:'work'},
  {name:'Stores',bounds:[24,22,13,8],kind:'work'},
  {name:'Flooded archive',bounds:[39,18,13,11],kind:'water'},
  {name:'Sluice bend',bounds:[43,5,11,10],kind:'water'},
 ],[[9,12,6,10],[15,24,12,4],[35,24,7,4],[45,13,4,8],[25,8,20,4]],[
  {id:'exit',name:'Willow meadow',point:{x:6,y:28},kind:'door'},
  {id:'lift-top',name:'Freight lift',point:{x:14,y:28},kind:'door'},
  {id:'mite',name:'Filter mite',point:{x:18,y:8},kind:'foe'},
  {id:'store-chest',name:'Tool chest',point:{x:33,y:28},kind:'chest'},
  {id:'crawler',name:'Valve crawler',point:{x:51,y:27},kind:'foe'},
  {id:'stairs-down',name:'Stairs down',point:{x:49,y:8},kind:'door'},
 ]),
 lower:level(58,38,[
  {name:'Lower walking bridge',bounds:[6,21,19,13],kind:'safe'},
  {name:'Spillway',bounds:[10,8,15,15],kind:'water'},
  {name:'Silt kiln',bounds:[34,23,17,11],kind:'work'},
  {name:'Collector chamber',bounds:[33,5,20,15],kind:'danger'},
 ],[[16,20,5,6],[22,25,14,5],[22,12,14,5]],[
  {id:'stairs-up',name:'Stairs up',point:{x:18,y:29},kind:'door'},
  {id:'lift-bottom',name:'Freight lift',point:{x:8,y:27},kind:'door'},
  {id:'kiln-mites',name:'Two filter mites',point:{x:41,y:26},kind:'foe'},
  {id:'kiln-chest',name:'Kiln chest',point:{x:47,y:30},kind:'chest'},
  {id:'collector',name:'The Collector',point:{x:44,y:11},kind:'boss'},
 ]),
};
export type {Floor,Marker};
