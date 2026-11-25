import {ALDER_KEEPSAKE} from './home-keepsake.ts';
import { readRiverSurvey, RIVER_SPOT_IDS, RIVER_SPOTS, RIVER_SURVEY_KEY, type RiverSpot, type RiverSurvey } from './river-survey.ts';
import type { Stop } from './world.ts';

// Preserve preferences created before the stand could display other fieldwork.
export const WORKSHOP_PRINT_KEY = 'ih2:river-print:v1';
export type WorkshopPrint = RiverSpot | 'marigold' | 'woodland-certificate' | 'pond' | 'mossbank-swatch';
export type WorkshopPrintRights = Readonly<{marigold:boolean;woodland:boolean;pond:boolean;alder?:boolean}>;
export const WORKSHOP_PRINTS: Record<WorkshopPrint, {name:string; art:string; story:string}> = {
  reeds: {name:RIVER_SPOTS.reeds.find,art:'/art/river/pondweed.svg',story:RIVER_SPOTS.reeds.note},
  bridge: {name:RIVER_SPOTS.bridge.find,art:'/art/river/wet-boot.svg',story:RIVER_SPOTS.bridge.note},
  riffle: {name:RIVER_SPOTS.riffle.find,art:'/art/river/perch.svg',story:RIVER_SPOTS.riffle.note},
  marigold: {name:'A marigold on leave',art:'/art/garden/pressed-marigold.svg',story:'Recorded after your first harvest. It is still out of office.'},
  pond: {name:'The pond is in session',art:'/art/pond/pond-print.svg',story:'Three shores recorded. The moorhen chaired the meeting.'},
  'mossbank-swatch': ALDER_KEEPSAKE,
  'woodland-certificate': {name:'Qualified to point left',art:'/art/outing/field-certificate.svg',story:'Awarded for two different woodland repairs. The arrow now reports to you.'},
};
export const WORKSHOP_PRINT_STAND = {x:12.35,y:10.1} as const;
export const WORKSHOP_PRINT_STOP: Stop = {
  id:'workshop-print',name:'Workshop print',text:'Look more closely at your chosen print.',
  point:{x:11.85,y:11.55},
  doorArea:[WORKSHOP_PRINT_STAND.x-1.4,WORKSHOP_PRINT_STAND.y-1.1,2.8,2.6],
};

export function earnedWorkshopPrints(survey: RiverSurvey | null, rights: WorkshopPrintRights): WorkshopPrint[] {
  const prints: WorkshopPrint[] = [...(survey?.recorded ?? [])];
  if (rights.marigold) prints.push('marigold');
  if (rights.woodland) prints.push('woodland-certificate');
  if (rights.pond) prints.push('pond');
  if (rights.alder) prints.push('mossbank-swatch');
  return prints;
}

export function selectedWorkshopPrint(raw: string | null, survey: RiverSurvey | null, rights: WorkshopPrintRights): WorkshopPrint | null {
  return earnedWorkshopPrints(survey,rights).find(print => print === raw) ?? null;
}

/** A cosmetic browser preference. The survey, outing and Workshop saves stay untouched. */
export function setWorkshopPrint(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, print: WorkshopPrint | null, rights: WorkshopPrintRights): boolean {
  try {
    if (print !== null) {
      const survey = RIVER_SPOT_IDS.some(spot => spot === print) ? readRiverSurvey(storage.getItem(RIVER_SURVEY_KEY)) : null;
      if (selectedWorkshopPrint(print, survey, rights) !== print) return false;
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
