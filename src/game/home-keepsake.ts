import { SURVEY_IDS, type SurveyId } from './fieldwork.ts';

export const NATURALIST_KEEPSAKE = {
 id: 'naturalist',
 name: 'Neighborhood Naturalist',
 art: '/art/fieldwork/naturalist-keepsake.svg',
 frame: { x: 386, y: 226, width: 80, height: 56 },
 story: 'Three tree studies approved by two shrubs and a committee.',
} as const;

export type HomeKeepsake = typeof NATURALIST_KEEPSAKE.id;

export function earnedNaturalist(sketches: readonly SurveyId[]) {
 return SURVEY_IDS.every(id => sketches.includes(id));
}
