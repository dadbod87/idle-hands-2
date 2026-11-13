/** Registered café-era rules. Legacy reducers remain frozen compatibility inputs;
 * this boundary never projects a new save into an old reducer or restores sinks. */
import * as legacy from './workshop.ts';
import {cafeWorkshopSchema,migrateCafeCandidate,type CafeWorkshopCandidate} from './cafe-candidate.ts';
import {applyCafeOrdinaryCommand,settleCafeWorkshopCandidate,cafeOrdinaryCommandSchema} from './cafe-commands-candidate.ts';
import {z} from 'zod';
export * from './workshop.ts';
export const PROP_IDS=[...legacy.PROP_IDS,'teapot'] as const;
export type PropId=typeof PROP_IDS[number];
export const PROPS={...legacy.PROPS,teapot:{name:'Brave teapot',art:'home-teapot-world'}};
export type WorkshopState=CafeWorkshopCandidate;
export type WorkshopCommand=z.infer<typeof cafeOrdinaryCommandSchema>;
export const isCurrentWorkshop=(raw:unknown):raw is WorkshopState=>cafeWorkshopSchema.safeParse(raw).success;
export function createWorkshop(now:number):WorkshopState{const r=migrateCafeCandidate(legacy.createWorkshop(now));if(!r.ok)throw new Error(r.reason);return r.state;}
export function loadWorkshop(raw:unknown,now:number){const r=migrateCafeCandidate(raw);return r.ok?{state:settleCafeWorkshopCandidate(r.state,now),recovered:false}:{state:createWorkshop(now),recovered:true};}
export const settleWorkshop=settleCafeWorkshopCandidate;
export const applyWorkshop=applyCafeOrdinaryCommand;
// These legacy helpers read compatible unchanged fields only, never validate,
// settle, mutate or erase a root. They are not command adapters.
export const questStep=(s:WorkshopState)=>legacy.questStep(s as unknown as legacy.WorkshopState);
export const recipeDuration=(s:WorkshopState,id:legacy.RecipeId)=>legacy.recipeDuration(s as unknown as legacy.WorkshopState,id);
