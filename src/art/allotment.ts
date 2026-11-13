import {worlds,TILE} from '../game/world.ts';

export const ALLOTMENT_LAYERS=['study-bed-footprint-1','study-bed-footprint-2','study-bed-footprint-3','study-meadow-detail'] as const;
const room=worlds.garden;
// Actor positions are relative to tile centers; rectangle edges are already
// world-grid edges. Match the real canStand/Session.point geometry, not a second half tile.
export const ALLOTMENT_BED_FEET=room.blocked.map(([x,y,width,height])=>({x:(x+width/2)*TILE,y:(y+height)*TILE}));
const rectangles=[...room.blocked,...room.stops.filter(s=>s.id!=='garden-beds').map(s=>s.doorArea!)];
const left=Math.min(...rectangles.map(r=>r[0]*TILE)),top=Math.min(...rectangles.map(r=>r[1]*TILE));
const right=Math.max(...rectangles.map(r=>(r[0]+r[2])*TILE)),bottom=Math.max(...rectangles.map(r=>(r[1]+r[3])*TILE));
const entry=worlds.square.stops.find(s=>s.id==='allotment')!.arrival!;
/** Render-only actor follow. Only room entry and real viewport resize choose zoom. */
export function allotmentCamera(width:number,height:number){
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw new Error('Positive allotment viewport required.');
 const zoom=Math.max(.75,Math.min(1,width/(right-left+24),height/(bottom-top+24))),visibleWidth=width/zoom,visibleHeight=height/zoom;
 const worldWidth=room.width*TILE,worldHeight=room.height*TILE;
 return{zoom,followX:(entry.x+.5)*TILE-(left+right)/2,followY:(entry.y+.5)*TILE-(top+bottom)/2,bounds:{x:-Math.max(0,(visibleWidth-worldWidth)/2),y:-Math.max(0,(visibleHeight-worldHeight)/2),width:Math.max(visibleWidth,worldWidth),height:Math.max(visibleHeight,worldHeight)}};
}
