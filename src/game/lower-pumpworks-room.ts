import type {Point,Stop,World} from './world.ts';

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

export const LOWER_ROOMS = ['pumpworks-depths', 'pumpworks-sluice'] as const;
export type LowerRoom = typeof LOWER_ROOMS[number];
export const isLowerRoom = (room: string): room is LowerRoom =>
  room === 'pumpworks-depths' || room === 'pumpworks-sluice';
export const floorFor = (room: LowerRoom): Floor => room === 'pumpworks-depths' ? 'upper' : 'lower';
export const levelFor = (room: LowerRoom) => DUNGEON[floorFor(room)];
export const lowerMarker = (room: LowerRoom, id: string) =>
  levelFor(room).markers.find(marker => marker.id === id);

export const DEPTHS_HATCH: Stop = {
  id: 'depths-hatch', name: 'Lower Pumpworks', point: {x: 5.9, y: 14.1},
  doorArea: [5.1, 12.8, 2.15, 1.25],
  transition: 'pumpworks-depths', arrival: START,
  text: 'Bring a field weapon. A dry passage leads to the old Stores and the lower sluice.',
};

export const LIFT_BOTTOM_NAME = 'Freight lift';
export const LIFT_TOP_ID = 'depths-lift-top';
export const LIFT_BOTTOM_ID = 'depths-lift-bottom';

function landmark(room: LowerRoom, id: string, options: Omit<Stop, 'point' | 'name'> & {name?: string}): Stop {
  const marker = lowerMarker(room, id)!;
  return {...options, name: options.name ?? marker.name, point: marker.point};
}

const upper = LOWER_ROOMS[0], lower = LOWER_ROOMS[1];
export const LOWER_WORLDS: Record<LowerRoom, World> = {
  [upper]: {...DUNGEON.upper.world, stops: [
    {id:'depths-gallery',name:'Valve gallery',point:{x:12.1,y:10.6},text:'Filter mites react to movement. Dodge their lunge and strike while they recover.'},
    landmark(upper, 'exit', {
      id: 'depths-exit', name: 'Upper Pumpworks', transition: 'pumpworks', arrival: {x:5.25,y:14.65},
      text: 'Back to the survey locker and Willow meadow.',
    }),
    landmark(upper, 'lift-top', {
      id: LIFT_TOP_ID, transition: lower, arrival: {x:9.55,y:27.5},
      text: 'A return lift with a latch on the lower level.',
    }),
    landmark(upper, 'store-chest', {
      id: 'depths-tool-chest', text: 'The Stores chest. Its inventory has been filed under miscellaneous.',
    }),
    landmark(upper, 'stairs-down', {
      id: 'depths-stairs-down', name: 'Lower sluice', transition: lower, arrival: LOWER_START,
      text: 'Descend toward the spillway and kiln.',
    }),
  ]},
  [lower]: {...DUNGEON.lower.world, stops: [
    landmark(lower, 'stairs-up', {
      id: 'depths-stairs-up', name: 'Upper works', transition: upper, arrival: {x:48.6,y:9.7},
      text: 'The stairs return to Sluice bend.',
    }),
    landmark(lower, 'lift-bottom', {
      id: LIFT_BOTTOM_ID, transition: upper, arrival: LANDING_RETURN,
      text: 'Unlatch the lift from below and ride it back to the landing.',
    }),
  ]},
};
export function lowerTransitionLabel(stop: Stop): string | undefined {
  switch (stop.id) {
    case 'depths-hatch': return 'Enter Lower Pumpworks';
    case 'depths-exit': return 'Return to Upper Pumpworks';
    case 'depths-stairs-down': return 'Descend to the lower sluice';
    case 'depths-stairs-up': return 'Climb to the upper works';
    case LIFT_BOTTOM_ID: return 'Ride the freight lift up';
    case LIFT_TOP_ID: return 'Ride the freight lift down';
    default: return undefined;
  }
}
export const isFieldRoute = (room: string) => room === 'pumpworks' || isLowerRoom(room);
