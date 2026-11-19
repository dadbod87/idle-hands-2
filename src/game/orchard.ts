import {z} from 'zod';
import type {Stop} from './world.ts';

const HOUR = 60 * 60_000;
export const APPLE_REGROW_MS = 8 * HOUR;
export const PACK_SNACK_MS = HOUR / 2;
export const APPLE_CAP = 6;
export const SNACK_CAP = 3;
export const APPLES_PER_SNACK = 2;

export const ORCHARD_BRANCHES = [
 {id: 'low-branch', name: 'Low branch', x: 95.8, y: 50},
 {id: 'two-forks', name: 'Forked branch', x: 97.4, y: 36},
 {id: 'over-the-path', name: 'Over-the-path branch', x: 104.8, y: 38.6},
] as const;
export type BranchId = (typeof ORCHARD_BRANCHES)[number]['id'];
const BRANCH_IDS = ORCHARD_BRANCHES.map(branch => branch.id);
const BRANCH_PREFIX = 'orchard-branch-';
export const ORCHARD_STOPS: Stop[] = ORCHARD_BRANCHES.map(branch => ({
 id: BRANCH_PREFIX + branch.id,
 name: branch.name,
 point: {x: branch.x, y: branch.y + .6},
 doorArea: [branch.x - 1.35, branch.y - 3.25, 3.5, 5.45],
 text: 'One apple when the branch is ripe.',
}));

export function orchardBranchFromStop(stopId: string): BranchId | undefined {
 if (stopId.startsWith(BRANCH_PREFIX)) return BRANCH_IDS.find(id => id === stopId.slice(BRANCH_PREFIX.length));
}

const maximum = Number.MAX_SAFE_INTEGER - APPLE_REGROW_MS;
const timestamp = z.number().int().min(0).max(maximum);
const total = z.number().int().min(0).max(1_000_000);
const pantryFields = {
 observedAt: timestamp,
 picked: total,
 packed: total,
 tasted: total,
 apples: total.max(APPLE_CAP),
 snacks: total.max(SNACK_CAP),
 ripeAt: z.object(Object.fromEntries(BRANCH_IDS.map(id => [id,timestamp])) as Record<BranchId,typeof timestamp>).strict(),
 parcel: z.object({startedAt: timestamp, readyAt: timestamp}).strict().nullable(),
};

function validHarvest(state:z.infer<z.ZodObject<typeof pantryFields>>) {
 const inPreparation = Number(state.parcel !== null);
 return state.picked === state.apples + APPLES_PER_SNACK * (state.packed + inPreparation) &&
  Object.values(state.ripeAt).every(at => at <= state.observedAt + APPLE_REGROW_MS) &&
  (state.parcel === null ||
   state.parcel.startedAt <= state.observedAt && state.parcel.readyAt - state.parcel.startedAt === PACK_SNACK_MS);
}

// Browser practice retains its original strict v1 record.
export const orchardStateSchema = z.object({version:z.literal(1),...pantryFields}).strict().refine(state =>
 validHarvest(state) && state.packed === state.snacks + state.tasted);
export const sharedGiftPantrySchema = z.object({
 version:z.literal(2),
 ...pantryFields,
 gifts:z.object({offered:total,received:total,returned:total}).strict(),
}).strict().refine(state =>
 validHarvest(state) && state.gifts.returned <= state.gifts.offered &&
 state.packed + state.gifts.received + state.gifts.returned === state.snacks + state.tasted + state.gifts.offered);
export const sharedPantrySchema = z.union([orchardStateSchema,sharedGiftPantrySchema]);
export type Orchard = z.infer<typeof orchardStateSchema>;
export type OrchardPantry = z.infer<typeof sharedPantrySchema>;
export type GiftPantry = z.infer<typeof sharedGiftPantrySchema>;
export const newOrchard = (): Orchard => ({
 version:1, observedAt:0, picked:0, packed:0, tasted:0, apples:0, snacks:0,
 ripeAt:{'low-branch':0,'two-forks':0,'over-the-path':0}, parcel:null,
});

export const orchardActionSchema = z.discriminatedUnion('kind',[
 z.object({kind:z.literal('pick'),branch:z.enum(BRANCH_IDS)}).strict(),
 z.object({kind:z.literal('pack')}).strict(),
 z.object({kind:z.literal('collect')}).strict(),
 z.object({kind:z.literal('taste')}).strict(),
]);
export type OrchardAction = z.infer<typeof orchardActionSchema>;
type Result<T> = {ok:true; state:T; message:string} | {ok:false; message:string};

export function orchardAction<T extends OrchardPantry>(state: T, raw: OrchardAction, now: number, reservedSlot = false): Result<T> {
 const checked = orchardActionSchema.safeParse(raw);
 if (!checked.success || !sharedPantrySchema.safeParse(state).success) return {ok:false,message:'The orchard record could not be confirmed.'};
 if (!timestamp.safeParse(now).success || now < state.observedAt || now + APPLE_REGROW_MS > maximum) {
  return {ok:false,message:'The browser clock needs to catch up. Your orchard is unchanged.'};
 }
 const action = checked.data;
 const next = {...state, observedAt:now};
 let message: string;
 switch(action.kind){
 case 'pick':
  if (state.ripeAt[action.branch] > now) return {ok:false,message:'This branch still needs time to ripen.'};
  if (state.apples >= APPLE_CAP) return {ok:false,message:'Your apple basket is full. Pack a snack first.'};
  next.ripeAt = {...state.ripeAt,[action.branch]:now+APPLE_REGROW_MS};
  next.apples++;
  next.picked++;
  message = 'One apple in your basket. It passed inspection.';
  break;
 case 'pack':
  if (state.parcel) return {ok:false,message:'Collect your first parcel before packing another.'};
  if (state.apples < APPLES_PER_SNACK) return {ok:false,message:'Bring two apples to pack one snack.'};
  if (state.snacks + Number(reservedSlot) >= SNACK_CAP) return {ok:false,message:'Your snack pouch is full.'};
  next.apples -= APPLES_PER_SNACK;
  next.parcel = {startedAt:now,readyAt:now+PACK_SNACK_MS};
  message = 'Snack packing started. The parcel will wait for collection.';
  break;
 case 'collect':
  if (!state.parcel || state.parcel.readyAt > now) return {ok:false,message:'There is no finished parcel to collect yet.'};
  if (state.snacks + Number(reservedSlot) >= SNACK_CAP) return {ok:false,message:'Your snack pouch is full. The parcel will wait.'};
  next.parcel = null;
  next.snacks++;
  next.packed++;
  message = 'Packed snack collected. The parcel has more folds than the brief.';
  break;
 case 'taste':
  if (!state.snacks) return {ok:false,message:'There is no finished snack in your pouch.'};
  next.snacks--;
  next.tasted++;
  message = 'Tasted an orchard snack. A crisp result with very little paperwork.';
  break;
 }
 return sharedPantrySchema.safeParse(next).success ? {ok:true,state:next,message} :
  {ok:false,message:'The orchard record reached its limit. Nothing was changed.'};
}

export const BROWSER_ORCHARD_KEY = 'ih2:orchard:v1';
type StoragePort = Pick<Storage,'getItem'|'setItem'>;
export type OrchardRead = {status:'ready';raw:string|null;state:OrchardPantry} | {status:'unreadable'|'unavailable'};
export function readOrchard(storage: StoragePort): OrchardRead {
 let raw: string | null;
 try { raw=storage.getItem(BROWSER_ORCHARD_KEY); }
 catch { return {status:'unavailable'}; }
 if (raw === null) return {status:'ready',raw,state:newOrchard()};
 if (raw.length <= 1500) {
  try {
   const parsed=orchardStateSchema.safeParse(JSON.parse(raw));
   if (parsed.success) return {status:'ready',raw,state:parsed.data};
  } catch { /* Keep the unreadable record for possible recovery. */ }
 }
 return {status:'unreadable'};
}

/** Hold the exclusive browser orchard lock across this compare and write. */
export function writeOrchard(storage:StoragePort, expectedRaw:string|null, action:OrchardAction, now:number) {
 const current=readOrchard(storage);
 if (current.status!=='ready') return {status:current.status} as const;
 if (current.raw!==expectedRaw) return {status:'changed'} as const;
 const result=orchardAction(current.state,action,now);
 if (!result.ok) return {status:'refused',message:result.message} as const;
 const raw=JSON.stringify(result.state);
 try { storage.setItem(BROWSER_ORCHARD_KEY,raw); }
 catch { return {status:'save-failed'} as const; }
 return {status:'saved',raw,state:result.state,message:result.message} as const;
}
