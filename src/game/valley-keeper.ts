import {facingFor,walkFrame} from '../art/kit.ts';
import type {Point} from './world.ts';

export const ORCHARD_KEEPER_NAME='Mabel · Orchard keeper';
const stations=[
 {x:24.25,y:13.75,wait:4100},
 {x:19,y:15.65,wait:0},
 {x:17.55,y:18.75,wait:3200},
 {x:18.1,y:21.3,wait:2800},
 {x:19.5,y:18.5,wait:0},
 {x:22.3,y:15.8,wait:2300},
] as const;

export const KEEPER_WALKS=stations.map((from,index)=>{
 const to=stations[(index+1)%stations.length];
 const distance=Math.hypot(to.x-from.x,to.y-from.y);
 return {from,to,distance,walkMs:distance*1150};
});
const circuit=KEEPER_WALKS.reduce((total,{from,walkMs})=>total+from.wait+walkMs,0);
export function orchardKeeperPose(milliseconds:number,motion:boolean){
 let t=motion&&Number.isFinite(milliseconds)?Math.max(0,milliseconds)%circuit:0;
 for(const {from,to,distance,walkMs} of KEEPER_WALKS){
  const span=from.wait+walkMs;
  if(t<span){
   const step=Math.max(0,(t-from.wait)/walkMs);
   const point:Point={x:from.x+(to.x-from.x)*step,y:from.y+(to.y-from.y)*step};
   return {point,facing:step>0?facingFor(to.x-from.x,to.y-from.y,'south'):'south',
    frame:walkFrame(step*distance,step>0,!motion)};
  }
  t-=span;
 }
 return {point:{x:stations[0].x,y:stations[0].y},facing:'south' as const,frame:0};
}
