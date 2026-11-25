import {HOPPER_FEET,PRACTICE_BELL} from './pumpworks-room.ts';
import type {Point} from './world.ts';

export const HOPPER_MOVEMENT={
 awareness:4.8,windupRange:2.25,reach:1.8,impactRadius:.87,splashRadius:2.55,lowHealth:4,
 patrolSeconds:9.6,chaseSpeed:1.75,windupSeconds:1.18,chargeSeconds:.28,restSeconds:1.18,
 strikeCooldown:.46,braceSeconds:1.45,braceCooldown:2.2,
} as const;
type Phase='idle'|'chase'|'windup'|'charge'|'recover';
export type FieldImpactKind='strike'|'counter'|'damage'|'blocked'|'bell'|'shell'|'heal';
export type FieldImpact={kind:FieldImpactKind;point:Point;until:number};
export const FIELD_IMPACT_MS=450;
export type HopperMotion={
 feet:Point;phase:Phase;pattern:'lunge'|'splash';elapsed:number;aim:Point|null;origin:Point|null;
 contact:boolean;counterUsed:boolean;guard:number;braceCooldown:number;strikeCooldown:number;
};
export type HopperStep={motion:HopperMotion;impact:'braced'|'hit'|'splash'|null};

export const freshHopper=():HopperMotion=>({
 feet:HOPPER_FEET,phase:'idle',pattern:'lunge',elapsed:0,aim:null,origin:null,
 contact:false,counterUsed:false,guard:0,braceCooldown:0,strikeCooldown:0,
});

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const inside=(p:Point)=>p.x>=12.75&&p.x<=19.15&&p.y>=4.35&&p.y<=12.6;
const bounded=(p:Point):Point=>({x:clamp(p.x,12.75,19.15),y:clamp(p.y,4.35,12.6)});
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

export const hopperLeash=inside;
export const inPracticeReach=(player:Point)=>distance(player,PRACTICE_BELL)<=HOPPER_MOVEMENT.reach;
export const hopperNotices=(player:Point,hopperFeet:Point=HOPPER_FEET)=>
 inside(player)&&distance(player,hopperFeet)<=HOPPER_MOVEMENT.awareness;

export function patrolHopper(state:HopperMotion,seconds:number):HopperMotion{
 const idle=state.phase==='idle'?state:freshHopper();
 const elapsed=(idle.elapsed+clamp(seconds,0,.15))%HOPPER_MOVEMENT.patrolSeconds;
 const angle=elapsed/HOPPER_MOVEMENT.patrolSeconds*Math.PI*2;
 return {...idle,elapsed,feet:{
  x:HOPPER_FEET.x+.7*Math.sin(angle),
  y:HOPPER_FEET.y+.4*(1-Math.cos(angle)),
 }};
}

function segmentDistance(p:Point,a:Point,b:Point){
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const along=length>0?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1):0;
 return distance(p,mix(a,b,along));
}
function setPhase(state:HopperMotion,phase:Phase,more:Partial<HopperMotion>={}):HopperMotion{
 return {...state,phase,elapsed:0,...more};
}

export function stepHopper(state:HopperMotion,player:Point,seconds:number,enemyHealth=9):HopperStep{
 const dt=clamp(seconds,0,.065),rules=HOPPER_MOVEMENT;
 const active={...state,
  elapsed:state.elapsed+dt,guard:Math.max(0,state.guard-dt),
  braceCooldown:Math.max(0,state.braceCooldown-dt),strikeCooldown:Math.max(0,state.strikeCooldown-dt),
 };
 const result=(motion:HopperMotion,impact:HopperStep['impact']=null)=>({motion,impact});
 if(!inside(player))return result(freshHopper());
 switch(active.phase){
  case 'idle':return result(setPhase(active,'chase'));
  case 'chase':{
   const remaining=distance(active.feet,player);
   if(remaining<=rules.windupRange){
    const pattern=enemyHealth<=rules.lowHealth&&active.pattern!=='splash'?'splash':'lunge';
    const aim=pattern==='splash'?active.feet:bounded(player);
    return result(setPhase(active,'windup',{pattern,aim,origin:active.feet,contact:false}));
   }
   return result({...active,feet:mix(active.feet,player,Math.min(1,dt*rules.chaseSpeed/remaining))});
  }
  case 'windup':
   return result(active.elapsed>=rules.windupSeconds?setPhase(active,'charge'):active);
  case 'charge':{
   const next=mix(active.origin!,active.aim!,Math.min(1,active.elapsed/rules.chargeSeconds));
   const splash=active.pattern==='splash';
   const meets=splash?distance(player,next)<=rules.splashRadius:segmentDistance(player,active.feet,next)<=rules.impactRadius;
   const landed=!active.contact&&meets;
   const nextState={...active,feet:next,contact:active.contact||landed};
   return result(active.elapsed>=rules.chargeSeconds?setPhase(nextState,'recover',{aim:null,origin:null,counterUsed:false}):nextState,
    landed?(active.guard>0?'braced':splash?'splash':'hit'):null);
  }
  case 'recover':return result(active.elapsed>=rules.restSeconds?setPhase(active,'chase'):active);
 }
}

export const hopperOpen=(state:HopperMotion)=>state.phase==='recover'&&!state.counterUsed;

export function swingAtHopper(state:HopperMotion,player:Point,wielding:boolean){
 if(state.phase==='idle'||state.strikeCooldown>0||!inside(player)||!wielding)return null;
 const withinReach=distance(player,state.feet)<=HOPPER_MOVEMENT.reach;
 const deflected=withinReach&&(state.phase==='windup'||state.phase==='charge');
 const counter=withinReach&&hopperOpen(state);
 const motion={...state,counterUsed:counter||state.counterUsed,strikeCooldown:HOPPER_MOVEMENT.strikeCooldown};
 const hit=withinReach&&!deflected?(counter?'counter' as const:'strike' as const):null;
 return {motion,hit,deflected};
}
export function braceForHopper(state:HopperMotion,player:Point):HopperMotion|null{
 if(state.phase==='idle'||state.braceCooldown>0||!inside(player))return null;
 return {...state,guard:HOPPER_MOVEMENT.braceSeconds,braceCooldown:HOPPER_MOVEMENT.braceCooldown};
}
