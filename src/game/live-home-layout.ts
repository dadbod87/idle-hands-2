/** Shared-home layout only. Rental workshop slots and personal save format stay fixed. */
import {z} from 'zod';
import {PLACEMENT_SLOTS,PROP_IDS,PROPS,OFFLINE_CAP_MS,isCurrentWorkshop,settleWorkshop,type WorkshopState,type PropId} from './live-workshop.ts';
export const WORKROOM_SLOTS=[{id:'workroom-north',label:'Workroom · north nook',x:19,y:7},{id:'workroom-south',label:'Workroom · south nook',x:19,y:11}] as const;
export const HOME_SLOTS=[...PLACEMENT_SLOTS,...WORKROOM_SLOTS] as const;
export type HomeSlotId=typeof HOME_SLOTS[number]['id'];
const prop=z.enum(PROP_IDS).nullable();
const originalMap=z.object(Object.fromEntries(PLACEMENT_SLOTS.map(s=>[s.id,prop])) as Record<keyof WorkshopState['placements'],typeof prop>).strict();
export const workroomSchema=z.object({'workroom-north':prop,'workroom-south':prop}).strict();
export const homeLayoutSchema=z.object({level:z.union([z.literal(1),z.literal(2)]),placements:originalMap,workroomPlacements:workroomSchema}).strict().superRefine((v,ctx)=>{if(v.level===1&&Object.values(v.workroomPlacements).some(p=>p!==null))ctx.addIssue({code:'custom',message:'Starter homes do not have workroom placements.'});});
export type HomeLayout=z.infer<typeof homeLayoutSchema>;
export type WorkroomPlacements=z.infer<typeof workroomSchema>;
export const emptyWorkroom=():WorkroomPlacements=>({'workroom-north':null,'workroom-south':null});
export function isCurrentHomeLayout(value:unknown):value is HomeLayout{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;return homeLayoutSchema.safeParse({level:v.level,placements:v.placements,workroomPlacements:v.workroomPlacements}).success;
}
export const homeSlots=(level:number)=>level===2?HOME_SLOTS:PLACEMENT_SLOTS;
export const homeDisplay=(layout:HomeLayout):Partial<Record<HomeSlotId,PropId|null>>=>layout.level===2?{...layout.placements,...layout.workroomPlacements}:{...layout.placements};
export const homeAllocation=(layout:HomeLayout,prop:string)=>Object.values(layout.placements).filter(p=>p===prop).length+Object.values(layout.workroomPlacements).filter(p=>p===prop).length;
export const homeAllocationValid=(state:WorkshopState,layout:HomeLayout)=>PROP_IDS.every(p=>homeAllocation(layout,p)+Object.values(state.placements).filter(v=>v===p).length<=state.owned[p]);
const slot=z.enum(HOME_SLOTS.map(s=>s.id) as [HomeSlotId,...HomeSlotId[]]);
const actionSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),expectedRevision:z.number().int().min(0).max(1_000_000),action:z.enum(['place','remove']),slot,prop:z.enum(PROP_IDS).optional(),fromSlot:slot.optional()}).strict();
export type HomeArrangement=z.infer<typeof actionSchema>;
export function applyHomeArrangement(input:WorkshopState,layout:HomeLayout,raw:unknown,now:number){
 const fail=(message:string)=>({ok:false,state:input,layout,message,replayed:false});
 if(!isCurrentWorkshop(input)||!homeLayoutSchema.safeParse(layout).success)return fail('Home layout could not be confirmed. Nothing was moved.');
 const parsed=actionSchema.safeParse(raw);if(!parsed.success)return fail('Invalid home arrangement. Nothing was moved.');
 if(!Number.isSafeInteger(now)||now<input.observedAt||now>Number.MAX_SAFE_INTEGER-OFFLINE_CAP_MS)return fail('The server clock moved backwards. Nothing was moved.');
 if(!homeAllocationValid(input,layout))return fail('Furniture allocation could not be confirmed. Nothing was moved.');
 const a=parsed.data,receipt=input.receipts.find(r=>r.id===a.id);if(receipt)return{ok:true,state:input,layout,message:receipt.message,replayed:true};
 if(a.expectedRevision!==input.revision||input.revision>=1_000_000)return fail('Your home changed. Review it before arranging again.');
 const allowed=homeSlots(layout.level).map(s=>s.id as string);if(!allowed.includes(a.slot)||a.fromSlot&&!allowed.includes(a.fromSlot))return fail('Expand your home before using a workroom nook.');
 const placements={...layout.placements,...layout.workroomPlacements};let message:string;
 if(a.action==='place'){
  if(!a.prop)return fail('Choose an owned furnishing to place.');
  if(placements[a.slot])return fail('That nook is occupied. Choose an empty nook or remove its furniture first.');
  if(a.fromSlot&&placements[a.fromSlot]!==a.prop)return fail('The furniture to move is no longer there.');
  const used=homeAllocation(layout,a.prop)+Object.values(input.placements).filter(v=>v===a.prop).length;
  if(!a.fromSlot&&used>=input.owned[a.prop])return fail('You do not own an unplaced copy of this furnishing.');
  if(input.stats.placed>=1_000_000)return fail('The prototype placement counter is full. Nothing was moved.');
  if(a.fromSlot)placements[a.fromSlot]=null;placements[a.slot]=a.prop;message=PROPS[a.prop].name+(a.fromSlot?' moved.':' placed.')+' No materials spent.';
 }else{
  const current=placements[a.slot];if(!current)return fail('That nook is already empty.');
  message=PROPS[current].name+' returned to your bag. No materials spent.';placements[a.slot]=null;
 }
 const next=structuredClone(settleWorkshop(input,now)),nextLayout:HomeLayout={level:layout.level,placements:Object.fromEntries(PLACEMENT_SLOTS.map(s=>[s.id,placements[s.id]])) as HomeLayout['placements'],workroomPlacements:Object.fromEntries(WORKROOM_SLOTS.map(s=>[s.id,placements[s.id]])) as WorkroomPlacements};
 if(a.action==='place')next.stats.placed++;
 next.revision++;next.observedAt=now;next.lastMessage=message;next.receipts=[...next.receipts,{id:a.id,revision:next.revision,message}].slice(-64);
 if(!isCurrentWorkshop(next)||!homeLayoutSchema.safeParse(nextLayout).success)return fail('This arrangement would create invalid progress. Nothing was moved.');
 return{ok:true,state:next,layout:nextLayout,message,replayed:false};
}
