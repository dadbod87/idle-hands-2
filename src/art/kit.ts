export const ORIGINAL_STATIC = ['ground-square','ground-workshop','workshop','cafe','tree','bench','shelf','crates','home-plot','bridge-neglected','bridge-restored'] as const;
export const FACINGS = ['south','north','east','west'] as const;
export type Facing = typeof FACINGS[number];
export const ART = Object.freeze({ tile:32, actorScale:.9, actorAnchor:{x:.5,y:.9}, pixelsPerFrame:12, frames:6, outline:2, palette:{ink:'#343c36',paper:'#f8f1df',sage:'#aebc92',teal:'#48685f',terracotta:'#b77156',gold:'#e5bf67'} });
export function facingFor(dx:number,dy:number,previous:Facing):Facing {
 if(Math.hypot(dx,dy)<.00001)return previous;
 if(Math.abs(dx)>Math.abs(dy)*1.15)return dx>0?'east':'west';
 return dy>0?'south':'north';
}
export function walkFrame(distance:number,moving:boolean,reduced:boolean):number {
 return !moving||reduced?0:1+Math.floor(distance/ART.pixelsPerFrame)%ART.frames;
}
