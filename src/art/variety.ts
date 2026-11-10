import {FACINGS,type Facing} from './kit.ts';
export const RESIDENT_IDS=['aster','bea','casey','devon'] as const;
export type ResidentId=typeof RESIDENT_IDS[number];
export const TREE_KINDS=['oak','birch','fruit'] as const;
export const BUILDING_KINDS=['workshop','cafe'] as const;
export function residentArt(id:string):ResidentId{return RESIDENT_IDS.includes(id as ResidentId)?id as ResidentId:'devon';}
export function residentFrame(facing:Facing,frame:number){return FACINGS.indexOf(facing)*7+Math.max(0,Math.min(6,Math.floor(frame)));}
// These transforms are view-only. No domain, timer settlement or transport calls belong here.
export function ambientPose(milliseconds:number,enabled:boolean,phase=0){
 if(!enabled)return {rotation:0,steamAlpha:0,steamY:0,gesture:0};
 const t=milliseconds/1000;
 return {rotation:Math.sin(t*.55+phase)*.009,steamAlpha:.12+.07*Math.sin(t*.8),steamY:-4-4*Math.sin(t*.4),gesture:Math.sin(t*.7+phase)*.45};
}
