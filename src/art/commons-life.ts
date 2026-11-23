/** View-only world coordinates. No collision, progression or game-clock state. */
import {COMMONS_PATHS,COMMONS_PONDS,COMMONS_TREES,TOWN_ARRIVAL} from '../game/town-expansion.ts';
export type ViewPoint={x:number;y:number};
const TAU=Math.PI*2;
export const COMMONS_MEADOWS=[
 {x:58,y:22,rx:7,ry:5,color:0x9eaf87},
 {x:88,y:19,rx:9,ry:4,color:0xa4b58c},
 {x:101,y:40,rx:11,ry:10,color:0xb6bd8e},
 {x:117,y:61,rx:7,ry:9,color:0xa1b28b},
 {x:60,y:72,rx:8,ry:4,color:0xa2b298},
 {x:93,y:70,rx:8,ry:6,color:0xb6bc8b},
 {x:102,y:87,rx:10,ry:5,color:0xb4bf91},
 {x:12,y:65,rx:8,ry:12,color:0x9cac8e},
 {x:36,y:88,rx:12,ry:5,color:0xa6b592}
] as const;
export function brushContour(x:number,y:number,rx:number,ry:number,seed:number):ViewPoint[]{
 return Array.from({length:36},(_,i)=>{const a=i/36*TAU,r=1+.06*Math.sin(a*3+seed)+.045*Math.cos(a*5-seed);return{x:x+Math.cos(a)*rx*r,y:y+Math.sin(a)*ry*r};});
}
/** Small rounded edge marks soften long bands without changing the clear lane. */
export function commonsEdgeMarks(){
 const marks:Array<{x:number;y:number;rx:number;ry:number;kind:'verge'|'bank'}>=[];
 for(const [x,y,w,h]of COMMONS_PATHS){
  const horizontal=w>h,length=horizontal?w:h;
  for(let i=0;i<length;i+=1.7)for(const side of [-1,1]){
   const px=horizontal?x+i:x+(side===-1?-.1:w+.1),py=horizontal?y+(side===-1?-.1:h+.1):y+i;
   if(px<48&&py<48)continue;
   marks.push({x:px,y:py,rx:horizontal?.7:.28,ry:horizontal?.28:.7,kind:'verge'});
  }
 }
 for(const [x,y,w,h]of COMMONS_PONDS)for(let i=0;i<26;i++){
  const a=i/26*TAU;marks.push({x:x+w/2+Math.cos(a)*(w/2+.25),y:y+h/2+Math.sin(a)*(h/2+.25),rx:.5,ry:.33,kind:'bank'});
 }
 return marks;
}
export const COMMONS_UNDERSTORY=COMMONS_TREES.map((p,i)=>({x:p.x,y:p.y,rx:1.7+(i%3)*.25,ry:.65+(i%2)*.2,seed:i,color:p.kind==='fruit'?0xa6ae7e:p.kind==='birch'?0xa9b996:0x9ba984}));
export const COMMONS_WINGS=[{x:55,y:24},{x:78,y:24},{x:95,y:42},{x:73,y:54},{x:62,y:71},{x:101,y:75}] as const;
export function commonsWingPose(ms:number,enabled:boolean){
 const t=enabled?Math.max(0,ms)/1000:0;
 return COMMONS_WINGS.map((p,i)=>({x:p.x*32+Math.sin(t*.42+i)*20,y:p.y*32+Math.cos(t*.55+i*2)*11,wing:enabled?2+Math.abs(Math.sin(t*6+i))*3:0}));
}
/** Keep actual water visible at phone arrival, with the actor safely inside the
 * playfield. Smooth proximity falloff avoids a fixed camera jump or new zoom. */
export function commonsFrame(p:ViewPoint,width:number,height:number){
 const weight=Math.max(0,Math.min(1,(6-Math.hypot(p.x-69,p.y-68))/4));
 const pondY=width<1000&&height<520?Math.min(64,Math.max(0,height/2-24))*weight:0;
 // On short landscape, frame the arrival and the depots together. This
 // eases out as the resident leaves the square's starting area.
 const arrivalWeight=Math.max(0,Math.min(1,(5-Math.hypot(p.x-TOWN_ARRIVAL.x,p.y-TOWN_ARRIVAL.y))/3));
 const arrivalY=width>=580?Math.min(33,Math.max(0,(260-height)/2))*arrivalWeight:0;
 return{x:width<600?Math.min(128,Math.max(0,width/2-48))*weight:0,y:pondY-arrivalY,weight};
}

/** Hand-cut shoreline, strictly inside its existing physical water rectangle. */
export function commonsShoreContour(x:number,y:number,width:number,height:number,inset=0):ViewPoint[]{
 const left=x+inset,top=y+inset,w=width-inset*2,h=height-inset*2,points:ViewPoint[]=[];
 for(let side=0;side<4;side++)for(let i=0;i<12;i++){const t=i/11,edge=2+(1+Math.sin(i*1.7+side*.9))*3;
  points.push(side===0?{x:left+18+t*(w-36),y:top+edge}:side===1?{x:left+w-edge,y:top+18+t*(h-36)}:side===2?{x:left+w-18-t*(w-36),y:top+h-edge}:{x:left+edge,y:top+h-18-t*(h-36)});
 }
 return points;
}

/** Pond board clears the arriving actor; narrow two-line text fits phone framing.
 * Hit areas use the normal validated approach, never a remote interaction. */
export function commonsSignLayout(id:string,name:string,point:ViewPoint){
 const x=(point.x+.5)*32,y=(point.y-1)*32,pond=id==='commons-pond',width=pond?88:112,height=pond?40:30,top=y-(pond?100:26);
 return{id,title:pond?'Founders’\npond':name,x,baseY:y+36,board:{x:x-width/2,y:top,width,height},hit:{x:x-width/2,y:top-Math.max(0,44-height)/2,width,height:Math.max(44,height)}};
}
export type CommonsSign=ReturnType<typeof commonsSignLayout>;
