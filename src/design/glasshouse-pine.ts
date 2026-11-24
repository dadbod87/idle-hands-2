import { z } from 'zod';
import { carpentrySchema, createCarpentryRules, settleCarpentry, type CarpentryState } from '../game/carpentry.ts';
import { cafeGardenRules } from '../game/cafe-commands-candidate.ts';
import { contributeGlasshouse, GLASSHOUSE_RULES, type GlasshouseActor } from './glasshouse-restoration.ts';

const accountShape = z.object({
 ...carpentrySchema.shape,
 version: z.literal(3),
 glasshousePine: z.union([z.literal(0), z.literal(GLASSHOUSE_RULES.pine)]),
}).strict();
type AccountData = z.infer<typeof accountShape>;

/** Existing rules see the resident's real carried pine. Offsetting only the
 * two historical totals lets the old recipe ledger keep its exact equation. */
function ordinaryLedger({glasshousePine, ...account}: AccountData): CarpentryState {
 return {...account,version:2,pine:{
  ...account.pine,
  gathered:account.pine.gathered-glasshousePine,
  spent:account.pine.spent-glasshousePine,
 }};
}

const fullAccount = accountShape.superRefine((account, ctx) => {
 if (!carpentrySchema.safeParse(ordinaryLedger(account)).success) {
  ctx.addIssue({code:'custom',message:'Glasshouse pine must reconcile alongside the original crafting ledger.'});
 }
});
export type GlasshousePineAccount = z.infer<typeof fullAccount>;

export function migrateGlasshousePine(raw: unknown): GlasshousePineAccount | null {
 const current=fullAccount.safeParse(raw);
 if(current.success)return current.data;
 const old=carpentrySchema.safeParse(raw);
 return old.success?{...old.data,version:3,glasshousePine:0}:null;
}

function withGlasshouseHistory(ordinary: CarpentryState, glasshousePine: AccountData['glasshousePine']): GlasshousePineAccount {
 return {...ordinary,version:3,glasshousePine,pine:{
  ...ordinary.pine,
  gathered:ordinary.pine.gathered+glasshousePine,
  spent:ordinary.pine.spent+glasshousePine,
 }};
}

const {applyCarpentry} = createCarpentryRules(cafeGardenRules);
export function applyGlasshouseCarpentry(account: GlasshousePineAccount, garden: Parameters<typeof applyCarpentry>[1], action: unknown, now: number) {
 if(!fullAccount.safeParse(account).success)return null;
 const result=applyCarpentry(ordinaryLedger(account),garden,action,now);
 const next=withGlasshouseHistory(result.state,account.glasshousePine), checked=fullAccount.safeParse(next);
 return checked.success?{...result,state:checked.data}:null;
}

/** Produce both writes for a future transaction. Caller must hold the
 * project/actor locks and persist with the exact command receipt atomically. */
export function postGlasshouseWork(project: unknown, raw: unknown, actor: Omit<GlasshouseActor,'pine'>, reviewId: string, storedReview: unknown, now: number) {
 const checked=fullAccount.safeParse(raw);
 if(!checked.success)return {ok:false,reason:'ledger'} as const;
 const account=checked.data;
 if(now<account.observedAt)return {ok:false,reason:'clock'} as const;
 const accepted=contributeGlasshouse(project,{...actor,pine:account.pine.carried},reviewId,storedReview,now);
 if(!accepted.ok)return accepted;
 if(!accepted.debit)return {...accepted,account};
 if(account.glasshousePine!==0)return {ok:false,reason:'ledger'} as const;
 const settled=settleCarpentry(ordinaryLedger(account),now);
 const debited=fullAccount.safeParse({
  ...settled,version:3,glasshousePine:accepted.debit.pine,
  pine:{...settled.pine,carried:settled.pine.carried-accepted.debit.pine,spent:settled.pine.spent+accepted.debit.pine},
 });
 return debited.success?{...accepted,account:debited.data}:{ok:false,reason:'ledger'} as const;
}
