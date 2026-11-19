import {z} from 'zod';
import {SNACK_CAP,sharedGiftPantrySchema,sharedPantrySchema,type GiftPantry,type OrchardPantry} from './orchard.ts';

export const SNACK_OFFER_MS = 24 * 60 * 60_000;

type SnackTransfer = 'offer'|'accept'|'reclaim';
type TransferResult = {ok:true; state:GiftPantry} | {ok:false; message:string};

/** A locked offer settles beside this pantry write. reservedSlot comes from the durable outgoing hold. */
export function transferSnack(state: OrchardPantry, kind: SnackTransfer, now: number, reservedSlot: boolean): TransferResult {
 if (!sharedPantrySchema.safeParse(state).success || !Number.isSafeInteger(now) || now < state.observedAt) {
  return {ok:false,message:'Your snack pouch could not be confirmed.'};
 }
 const gifts = state.version === 2 ? {...state.gifts} : {offered:0,received:0,returned:0};
 const next: GiftPantry = {...state,version:2,observedAt:now,gifts};
 switch (kind) {
  case 'offer':
   if (reservedSlot) return {ok:false,message:'Take back your other snack parcel first.'};
   if (state.snacks === 0) return {ok:false,message:'Bring one packed snack to the shelf.'};
   next.snacks--;
   gifts.offered++;
   break;
  case 'accept':
   if (state.snacks + Number(reservedSlot) >= SNACK_CAP) {
    return {ok:false,message:'Make room in your snack pouch first. The parcel can wait.'};
   }
   next.snacks++;
   gifts.received++;
   break;
  case 'reclaim':
   if (!reservedSlot || state.snacks >= SNACK_CAP) return {ok:false,message:'This held snack could not be returned.'};
   next.snacks++;
   gifts.returned++;
   break;
 }
 return sharedGiftPantrySchema.safeParse(next).success ? {ok:true,state:next} :
  {ok:false,message:'Your snack pouch reached its ledger limit. Everything stays where it was.'};
}

const residentId=z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const parcelId=z.uuid();
const time=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const snackActionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('leave'),recipientId:residentId}).strict(),
 z.object({kind:z.literal('accept'),parcelId}).strict(),
 z.object({kind:z.literal('decline'),parcelId}).strict(),
 z.object({kind:z.literal('reclaim'),parcelId}).strict(),
 z.object({kind:z.literal('taste')}).strict(),
]);
export type SnackAction=z.infer<typeof snackActionSchema>;
const parcelSchema=z.object({
 id:parcelId,name:z.string().min(1).max(40),placedAt:time,expiresAt:time,
 state:z.enum(['waiting','declined','accepted','returned']),
}).strict().refine(parcel=>parcel.expiresAt-parcel.placedAt===SNACK_OFFER_MS);
export const snackShelfSchema=z.object({
 outgoing:parcelSchema.nullable(),incoming:parcelSchema.array().max(8),
 neighbors:z.object({id:residentId,name:z.string().min(1).max(40)}).strict().array().max(32),
 serverTime:time,revision:z.number().int().min(0).max(1_000_000),
}).strict().refine(shelf=>
 (shelf.outgoing===null || shelf.outgoing.state==='waiting'||shelf.outgoing.state==='declined') &&
 shelf.incoming.every(parcel=>parcel.state==='waiting'&&parcel.expiresAt>shelf.serverTime));
export type SnackParcel=z.infer<typeof parcelSchema>;
export type SnackShelf=z.infer<typeof snackShelfSchema>;
