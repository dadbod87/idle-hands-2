export * from './garden.ts';
import {cafeGardenRules} from './cafe-commands-candidate.ts';
import type {WorkshopState} from './live-workshop.ts';
export type GardenState=WorkshopState['garden'];
export const {settleGarden,consumeGarden,applyGarden,nextGardenDeadline}=cafeGardenRules;
