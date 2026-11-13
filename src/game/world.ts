import{BLOCK_SIZE,PARCELS,TOWN_GATE,RESIDENTIAL_GATE,HOME_SITE_PREFIX,NEIGHBORHOOD_TREES}from'./neighborhood.ts';
import {SURVEY_IDS,SURVEYS} from './fieldwork.ts';
import {TOWN_PEOPLE} from './town-people.ts';
export type Room = 'square' | 'workshop' | 'home' | 'home-expanded' | 'trail' | 'garden' | 'neighborhood';
export type Point = { x: number; y: number };
export type Stop = { id: string; name: string; point: Point; text: string; transition?: Room; arrival?: Point; doorArea?: [number, number, number, number] };
export type World = { width: number; height: number; blocked: [number, number, number, number][]; stops: Stop[] };
export const TILE = 32;
export const TRAIL_LANDMARK_IDS=['trailhead','old-sign','lookout'] as const;
export const worlds: Record<Room, World> = {
  neighborhood:{...BLOCK_SIZE,blocked:[...PARCELS.map(p=>[p.building.x,p.building.y,p.building.width,p.building.height]as[number,number,number,number]),...NEIGHBORHOOD_TREES.map(([x,y])=>[x-.35,y-.75,.7,.75]as[number,number,number,number])],stops:[{id:'neighborhood-directory',name:'Street directory',point:{x:29.5,y:4.5},doorArea:[28.75,2.5,1.5,2.5],text:'Choose another neighborhood at the directory.'},{id:'neighborhood-exit',name:'Town square',point:{...TOWN_GATE},transition:'square',arrival:{...RESIDENTIAL_GATE},doorArea:[30.25,.5,2.5,2.5],text:'Back to the town square. The neighbors will still be here.'},...PARCELS.map(p=>({id:HOME_SITE_PREFIX+p.slot,name:p.number+' '+p.street,point:{...p.front},doorArea:[p.door.x,p.door.y,p.door.width,p.door.height] as [number,number,number,number],text:'An addressed home site. Earned homes belong to their residents.'}))]},
  square: {
    width: 48, height: 48,
    blocked: [[17, 16, 6, 6], [28, 16, 6, 6], [27, 30, 8, 5], [17, 26, 2, 2], [34, 26, 2, 2], [14, 17, 2, 2], [37, 19, 2, 2], [13, 30, 2, 2], [37, 33, 2, 2], [0, 10, 48, 2]],
    stops: [
      {id:'residential-gate',name:'Homes & neighbors',point:{...RESIDENTIAL_GATE},doorArea:[40.5,29.5,3,3],text:'A street for every neighbor. Visit the residential neighborhood.'},
      { id: 'scrap', name: 'Scrap depot', point: {x:21,y:30}, doorArea:[20.5,27.5,2,2], text: 'Rescued metal. Someone has already filed it under miscellaneous.' },
      { id: 'timber', name: 'Timber depot', point: {x:23,y:30}, doorArea:[22.5,27.5,2,2], text: 'Locally sourced. The source was a badly assembled shelf.' },
      { id: 'supplies', name: 'Supply depot', point: {x:25,y:30}, doorArea:[24.5,27.5,2,2], text: 'The essentials. In a box marked non-essential.' },
      { id: 'workshop', name: 'Workshop', point: { x: 20, y: 22 }, transition: 'workshop', arrival: { x: 9, y: 11 }, doorArea: [19.25, 20, 1.5, 2.25], text: 'Your workshop. The desk is temporary. The paperwork is structural.' },
      { id: 'cafe', name: 'The Almost Open Café', point: { x: 30, y: 22 }, doorArea:[30.25,20,1.5,2.25], text: 'The opening date is pencilled in. The pencil has requested an extension.' },
      {id:'home-front',name:'Housing Registry entrance',point:{x:30,y:35.5},doorArea:[29.25,34.75,1.5,2],text:'An earned home. Knock once; the paperwork stays outside.'},
      { id: 'plot', name: 'Housing Registry', point: { x: 30, y: 29 }, text: 'Room to put down roots. The full game will let you acquire a plot, upgrade a house and make it yours. No plots are sold in this pilot.' },
      ...SURVEY_IDS.map(id=>({id:'survey-'+id,name:SURVEYS[id].name+' · sketch study',point:{...SURVEYS[id].point},doorArea:[...SURVEYS[id].doorArea] as [number,number,number,number],text:SURVEYS[id].hint})),
      ...TOWN_PEOPLE.map(person=>({id:person.id,name:person.name+' · '+person.role.split(' · ')[0],point:person.point,doorArea:person.doorArea,text:'Talk to '+person.name+'.'})),
      {id:'trail-gate',name:'Inkwood trail',point:{x:25.5,y:12.25},transition:'trail',arrival:{x:9,y:22},doorArea:[24.5,9.5,3,3.6],text:'The first restored trail. Access follows the bridge inspection, not optimistic calendar math.'},
      { id: 'bridge', name: 'Bridge committee', point: { x: 24, y: 13 }, text: 'A future shared project: everyone contributes, everyone gets a new place to explore. Today the committee is only inspecting the concept of a bridge.' }
      ,{id:'allotment',name:'Your rented allotment',point:{x:17,y:36},transition:'garden',arrival:{x:9,y:14},doorArea:[15.75,33.75,2.5,2.5],text:'Three beds. No house or workshop slot required. The committee has approved having roots.'}
      ,{id:'garden-registry',name:'Garden display registry',point:{x:20,y:36},doorArea:[19.25,34,1.5,2],text:'Chosen public markers and the town welcome bed. Private garden stock stays private.'}
      ,{id:'garden-field',name:'Field clippings',point:{x:12,y:37},doorArea:[10.75,35.5,2.5,2],text:'Gather two replenishing clippings and make a marker by hand. No workshop materials.'}
      ,{id:'stake-forked',name:'Forked stake',point:{x:11,y:26},doorArea:[10.25,24.5,1.5,2],text:'An urgent matter of almost-straight stakes. Inspect the usable end.'}
      ,{id:'stake-striped',name:'Marked stake',point:{x:18,y:39},doorArea:[17.25,37.5,1.5,2],text:'This stripe has been approved for lining things up.'}
      ,{id:'carpentry-desk',name:'Nella · pine workshop & noticeboard',point:{x:5,y:35},doorArea:[4.25,31,6.5,5.5],text:'A free hand-saw lesson, practical hampers and a noticeboard with notably few notices.'}
      ,{id:'pine-crooked',name:'Crooked pine deadfall',point:{x:6,y:26},doorArea:[4.75,21.75,3.5,5],text:'Prepare fallen pine with your bound saw. All three points share one personal renewable supply.'}
      ,{id:'pine-forked',name:'Forked pine deadfall',point:{x:7,y:41},doorArea:[5.75,37.25,3.5,4.5],text:'Two trunks. One supply entitlement. The tree has declined to form a subsidiary.'}
      ,{id:'pine-sheltered',name:'Sheltered pine deadfall',point:{x:40,y:41},doorArea:[38.75,36.25,3.5,5.5],text:'Fallen branches, not a license to demolish the forest. Your supply is personal.'}
      ,{id:'stake-notched',name:'Notched stake',point:{x:35,y:39},doorArea:[34.25,37.5,1.5,2],text:'A crosspiece goes here. Probably. Inspect it to be sure.'}
    ]
  },
  trail: {
    width:18,height:26,blocked:[[1,1,3,5],[13,1,4,5],[1,7,2,10],[15,8,2,10],[1,20,4,4],[13,20,4,4],[7,1,4,3],[8,7,2,2]],
    stops:[{id:'trail-exit',name:'Town square',point:{x:9,y:24},transition:'square',arrival:{x:25.5,y:12.6},doorArea:[8,23,3,2],text:'Back over the restored bridge.'},{id:'trailhead',name:'Inspection stump',point:{x:6,y:18},doorArea:[5.25,16.5,1.5,2],text:'A fully qualified stump. It has seniority.'},{id:'old-sign',name:'Retired wayfinding post',point:{x:12,y:12},doorArea:[11.25,10.5,1.5,2],text:'The arrows disagree. The post has been promoted.'},{id:'lookout',name:'Municipal birdwatching sign',point:{x:4,y:8},doorArea:[3.25,6.5,1.5,2],text:'Population unverified. Committee expanding.'}]
  },
  garden:{width:18,height:18,blocked:[[4,8,3,3],[8,8,3,3],[12,8,3,3]],stops:[
   {id:'garden-beds',name:'Your garden beds',point:{x:9,y:13},doorArea:[4,7.5,11,4.75],text:'Plant, inspect or harvest your three beds. Ready plants wait safely.'},
   {id:'garden-desk',name:'Allotment attendant',point:{x:5,y:14},doorArea:[4,12.5,2.5,2],text:'Starter seeds and one urgent matter of almost-straight stakes.'},
   {id:'garden-exit',name:'Town square',point:{x:9,y:16},transition:'square',arrival:{x:17,y:36.3},doorArea:[7.75,15,2.5,2],text:'Back to town. Your plants can manage without supervision.'}
  ]},
  home: {
    width: 18, height: 16, blocked: [[2,2,4,3]],
    stops: [{id:'home-door',name:'Town square',point:{x:9,y:13},transition:'square',arrival:{x:30,y:35.5},doorArea:[8,13,3,2],text:'Your own threshold. The committee cannot claim credit for the curtains.'}]
  },
  'home-expanded': {
    width: 24, height: 16, blocked: [[2,2,4,3]],
    stops: [{id:'home-door',name:'Town square',point:{x:9,y:13},transition:'square',arrival:{x:30,y:35.5},doorArea:[8,13,3,2],text:'Back to the square. The extra room is still yours when you return.'}]
  },
  workshop: {
    width: 18, height: 16,
    blocked: [[3, 3, 5, 2], [11, 3, 4, 3], [3, 8, 2, 2]],
    stops: [
      { id: 'bench', name: 'Work bench', point: { x: 5, y: 5 }, doorArea:[3,3,5,3], text: 'Make useful things. Submit questionable paperwork.' },
      {id:'finishing-rack',name:'Pine finishing rack',point:{x:12,y:6.5},doorArea:[10.75,3,3.5,3.75],text:'Garden study easels finish here on their own twelve-hour timer. The ordinary bench stays available.'},
      { id: 'door', name: 'Town square', point: { x: 9, y: 13 }, transition: 'square', arrival: { x: 19.5, y: 22.3 }, doorArea: [8, 13, 3, 2], text: 'Back to the square. Meetings are outdoors now. There was an incident with a flip chart.' }
    ]
  }
};
export function walkable(room: Room, p: Point): boolean {
  const w = worlds[room];
  return Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 1 && p.y >= 1 && p.x < w.width - 1 && p.y < w.height - 1 && !w.blocked.some(([x, y, width, height]) => p.x >= x && p.y >= y && p.x < x + width && p.y < y + height);
}
export function pathTo(room: Room, from: Point, to: Point): Point[] {
  if (!walkable(room, to) || !walkable(room, from)) return [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [from], parents = new Map<string, Point | null>([[key(from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(to)) {
      const result: Point[] = [];
      let current: Point | null = p;
      while (current && key(current) !== key(from)) { result.unshift(current); current = parents.get(key(current)) ?? null; }
      return result;
    }
    for (const delta of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]) {
      const n = { x: p.x + delta.x, y: p.y + delta.y };
      if (walkable(room, n) && !parents.has(key(n))) { parents.set(key(n), p); queue.push(n); }
    }
  }
  return [];
}

// Positions are continuous foot centres expressed relative to tile centres.
export const FOOT_RADIUS = .24;
export function canStand(room: Room, p: Point): boolean {
  const w = worlds[room], cx = p.x + .5, cy = p.y + .5, r = FOOT_RADIUS;
  return Number.isFinite(cx) && Number.isFinite(cy) && cx - r >= 1 && cy - r >= 1 && cx + r <= w.width - 1 && cy + r <= w.height - 1 &&
    !w.blocked.some(([x, y, width, height]) => cx + r > x && cx - r < x + width && cy + r > y && cy - r < y + height);
}
export function clearSegment(room: Room, from: Point, to: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / .1));
  for (let i = 0; i <= steps; i++) if (!canStand(room, { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps })) return false;
  return true;
}
export function routeTo(room: Room, from: Point, to: Point): Point[] {
  if (!canStand(room, from) || !canStand(room, to)) return [];
  if (clearSegment(room, from, to)) return [{ ...to }];
  const start = { x: Math.round(from.x), y: Math.round(from.y) }, end = { x: Math.round(to.x), y: Math.round(to.y) };
  const grid = pathTo(room, start, end);
  if (!grid.length && (start.x !== end.x || start.y !== end.y)) return [];
  const candidates = [start, ...grid, to], result: Point[] = [];
  let current = from, index = 0;
  while (index < candidates.length) {
    let next = candidates.length - 1;
    while (next >= index && !clearSegment(room, current, candidates[next])) next--;
    if (next < index) return [];
    current = candidates[next]; result.push({ ...current }); index = next + 1;
  }
  return result;
}
