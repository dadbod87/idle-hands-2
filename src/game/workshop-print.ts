import { readRiverSurvey, RIVER_SPOT_IDS, RIVER_SPOTS, RIVER_SURVEY_KEY, type RiverSpot, type RiverSurvey } from './river-survey.ts';

// Preserve preferences created before the stand could display other fieldwork.
export const WORKSHOP_PRINT_KEY = 'ih2:river-print:v1';
export type WorkshopPrint = RiverSpot | 'marigold';
export const WORKSHOP_PRINTS: Record<WorkshopPrint, {name:string; art:string}> = {
  reeds: {name:RIVER_SPOTS.reeds.find,art:'/art/river/pondweed.svg'},
  bridge: {name:RIVER_SPOTS.bridge.find,art:'/art/river/wet-boot.svg'},
  riffle: {name:RIVER_SPOTS.riffle.find,art:'/art/river/perch.svg'},
  marigold: {name:'A marigold on leave',art:'/art/garden/pressed-marigold.svg'},
};

export function selectedWorkshopPrint(raw: string | null, survey: RiverSurvey | null, firstMarigold: boolean): WorkshopPrint | null {
  if (raw === 'marigold') return firstMarigold ? raw : null;
  return RIVER_SPOT_IDS.find(spot => spot === raw && survey?.recorded.includes(spot)) ?? null;
}

/** A cosmetic browser preference. The survey and Workshop saves stay untouched. */
export function setWorkshopPrint(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, print: WorkshopPrint | null, firstMarigold: boolean): boolean {
  try {
    if (print === 'marigold' && !firstMarigold) return false;
    if (print !== null && print !== 'marigold') {
      const survey = readRiverSurvey(storage.getItem(RIVER_SURVEY_KEY));
      if (selectedWorkshopPrint(print, survey, firstMarigold) !== print) return false;
    }
    try {
      if (print === null) storage.removeItem(WORKSHOP_PRINT_KEY);
      else storage.setItem(WORKSHOP_PRINT_KEY, print);
    } catch {
      // Some browser storage implementations report failure after applying it.
    }
    return storage.getItem(WORKSHOP_PRINT_KEY) === print;
  } catch {
    return false;
  }
}
