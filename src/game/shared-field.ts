import {z} from 'zod';
import {VEST_FINISHES} from './field-appearance.ts';
import type {BowDraw,BowTrace,RodSweep,StaffPulse} from './field-weapons.ts';
import type {FieldImpact,HopperMotion} from './pumpworks-chase.ts';
import type {PumpworksState} from './pumpworks.ts';
import type {Point} from './world.ts';

const id=z.uuid();
const stationAction=z.union([
 z.enum(['issue','borrow-bow','borrow-staff','borrow-vest','equip','pack','equip-bow','pack-bow',
  'equip-staff','pack-staff','equip-vest','pack-vest','oatcake','rest','rematch','wake','recover','report']),
 z.object({armor:z.enum(['padded','riveted']),finish:z.enum(VEST_FINISHES)}).strict(),
]);
const actionBase={id,revision:z.number().int().min(0).max(100000)};
export const sharedFieldInputSchema=z.discriminatedUnion('kind',[
 z.object({...actionBase,kind:z.literal('station'),action:stationAction}).strict(),
 z.object({...actionBase,kind:z.literal('combat'),encounter:id,turn:z.number().int().min(1).max(1_000_000),
  action:z.enum(['attack','brace','eat'])}).strict(),
]);
export type SharedFieldInput=z.infer<typeof sharedFieldInputSchema>;
export type SharedFieldAction=Extract<SharedFieldInput,{kind:'station'}>['action'];
export type SharedFieldView={
 playerId:string; serverInstance:string; sequence:number; serverAt:number;
 inRoom:boolean; state:PumpworksState; encounter:string|null; nextTurn:number;
 hopper:HopperMotion; draw:BowDraw|null; impact:FieldImpact|null;
 shot:BowTrace|null; sweep:RodSweep|null; pulse:StaffPulse|null;
 returnTo:Point|null; practiceReadyAt:number; message:string;
};
export type SharedFieldReply={ok:boolean;replayed?:true;message:string;view:SharedFieldView};
