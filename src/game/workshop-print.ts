import { readRiverSurvey, RIVER_SPOT_IDS, RIVER_SPOTS, RIVER_SURVEY_KEY, type RiverSpot, type RiverSurvey } from './river-survey.ts';
import type { Stop } from './world.ts';

// Preserve preferences created before the stand could display other fieldwork.
export const WORKSHOP_PRINT_KEY = 'ih2:river-print:v1';
export type WorkshopPrint = RiverSpot | 'marigold';
export const WORKSHOP_PRINTS: Record<WorkshopPrint, {name:string; art:string; story:string}> = {
  reeds: {name:RIVER_SPOTS.reeds.find,art:'/art/river/pondweed.svg',story:RIVER_SPOTS.reeds.note},
  bridge: {name:RIVER_SPOTS.bridge.find,art:'/art/river/wet-boot.svg',story:RIVER_SPOTS.bridge.note},
  riffle: {name:RIVER_SPOTS.riffle.find,art:'/art/river/perch.svg',story:RIVER_SPOTS.riffle.note},
  marigold: {name:'A marigold on leave',art:'/art/garden/pressed-marigold.svg',story:'Recorded after your first harvest. It is still out of office.'},
};
export const WORKSHOP_PRINT_STAND = {x:12.35,y:10.1} as const;
export const WORKSHOP_PRINT_STOP: Stop = {
  id:'workshop-print',name:'Workshop print',text:'Look more closely at your chosen print.',
  point:{x:11.85,y:11.55},
  doorArea:[WORKSHOP_PRINT_STAND.x-1.4,WORKSHOP_PRINT_STAND.y-1.1,2.8,2.6],
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
