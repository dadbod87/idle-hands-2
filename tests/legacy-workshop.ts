import type {WorkshopState} from '../src/game/workshop.ts';
/** Disclosed pre-071 shape, with explicit old versions and no future fields. */
export function preCommissionWorkshop(state:WorkshopState):any{
 const old:any=structuredClone(state);old.version=1;delete old.commission;delete old.owned.letterbox;
 old.garden.version=2;delete old.garden.consumed.commission;old.carpentry.version=1;delete old.carpentry.commissionPine;
 return old;
}
