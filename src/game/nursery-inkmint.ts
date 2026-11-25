import { z } from 'zod';

export const INKMINT_GROW_MS = 24 * 60 * 60 * 1000;
export const INKMINT_FINISH = 'Inkmint stripe';
export const INKMINT_STATIONS = { tray: 'glasshouse-seeds', pottery: 'glasshouse-pots' } as const;
export const inkmintActionSchema = z.enum(['plant', 'collect', 'mix', 'apply', 'remove']);
export type InkmintAction = z.infer<typeof inkmintActionSchema>;

export const inkmintSchema = z.discriminatedUnion('phase', [
 z.object({phase:z.literal('empty'),readyAt:z.null()}).strict(),
 z.object({phase:z.literal('growing'),readyAt:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict(),
 z.object({phase:z.enum(['collected','mixed','applied']),readyAt:z.null()}).strict(),
]);
export type Inkmint = z.infer<typeof inkmintSchema>;

type Step = {state:Inkmint;message:string};
export function inkmintStep(state:Inkmint, action:InkmintAction, now:number):Step|string {
 if(!Number.isSafeInteger(now)||now<0)return 'The growing clock is unavailable.';
 switch(action){
  case 'plant':
   if(state.phase!=='empty')return 'Your tray already has an Inkmint record.';
   if(now>Number.MAX_SAFE_INTEGER-INKMINT_GROW_MS)return 'The growing clock is unavailable.';
   return {state:{phase:'growing',readyAt:now+INKMINT_GROW_MS},message:'Seed planted.'};
  case 'collect':
   if(state.phase!=='growing'||now<state.readyAt)return 'Inkmint is still growing or has already been collected.';
   return {state:{phase:'collected',readyAt:null},message:'Pigment saved.'};
  case 'mix':
   if(state.phase!=='collected')return 'Collect one Inkmint pigment before making a finish.';
   return {state:{phase:'mixed',readyAt:null},message:'Finish saved.'};
  case 'apply':
   if(state.phase!=='mixed')return 'Make the Inkmint stripe before applying it.';
   return {state:{phase:'applied',readyAt:null},message:'Inkmint stripe applied to your pot.'};
  case 'remove':
   if(state.phase!=='applied')return 'Your pot already has its original finish.';
   return {state:{phase:'mixed',readyAt:null},message:'Original pot restored. Your stripe is still available.'};
 }
}
