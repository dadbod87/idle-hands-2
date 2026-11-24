import { readRiverSurvey, RIVER_SPOT_IDS, RIVER_SURVEY_KEY, type RiverSpot, type RiverSurvey } from './river-survey.ts';

export const RIVER_PRINT_KEY = 'ih2:river-print:v1';
export const RIVER_FIND_ART: Record<RiverSpot, string> = {
  reeds: 'pondweed',
  bridge: 'wet-boot',
  riffle: 'perch',
};

export function selectedRiverPrint(raw: string | null, survey: RiverSurvey | null): RiverSpot | null {
  return RIVER_SPOT_IDS.find(spot => spot === raw && survey?.recorded.includes(spot)) ?? null;
}

/** A standalone, cosmetic browser preference. The survey and Workshop saves are read-only here. */
export function setRiverPrint(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, spot: RiverSpot | null): boolean {
  try {
    if (spot !== null) {
      const survey = readRiverSurvey(storage.getItem(RIVER_SURVEY_KEY));
      if (selectedRiverPrint(spot, survey) !== spot) return false;
    }
    try {
      if (spot === null) storage.removeItem(RIVER_PRINT_KEY);
      else storage.setItem(RIVER_PRINT_KEY, spot);
    } catch {
      // Some browser storage implementations report failure after applying it.
    }
    return storage.getItem(RIVER_PRINT_KEY) === spot;
  } catch {
    return false;
  }
}
