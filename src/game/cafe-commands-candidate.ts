import {createGardenRules} from './garden.ts';
import {createWorkshopRules,createWorkshopCommandSchema,PROP_IDS,PROPS} from './workshop.ts';
import {cafeWorkshopSchema,type CafeWorkshopCandidate} from './cafe-candidate.ts';

/** Candidate-only command context. No version conversion, missing-field defaults,
 * restored produce or hidden café ledger projection is used to run old rules. */
const candidatePropIds=[...PROP_IDS,'teapot'] as const;
export const cafeOrdinaryCommandSchema=createWorkshopCommandSchema(candidatePropIds);
export const cafeGardenRules=createGardenRules(cafeWorkshopSchema.shape.garden);
const rules=createWorkshopRules<CafeWorkshopCandidate['garden'],CafeWorkshopCandidate>({
  schema:cafeWorkshopSchema,commands:cafeOrdinaryCommandSchema,garden:cafeGardenRules,
  propIds:candidatePropIds,props:{...PROPS,teapot:{name:'Brave teapot'}}
});
export const applyCafeOrdinaryCommand=rules.applyWorkshop;
export const settleCafeWorkshopCandidate=rules.settleWorkshop;
