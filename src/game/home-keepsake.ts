import { SURVEY_IDS, type SurveyId } from './fieldwork.ts';

export const NATURALIST_KEEPSAKE = {
 id: 'naturalist',
 name: 'Neighborhood Naturalist',
 art: '/art/fieldwork/naturalist-keepsake.svg',
 alt: 'Neighborhood Naturalist certificate with two leaves and a gold seal',
 frame: { x: 386, y: 226, width: 80, height: 56 },
 story: 'Three tree studies approved by two shrubs and a committee.',
} as const;

export const WOODLAND_KEEPSAKE = {
 id: 'woodland-certificate',
 name: 'Qualified to point left',
 art: '/art/outing/field-certificate.svg',
 alt: 'Woodland field certificate with a wooden waymarker',
 story: 'Awarded for two different woodland repairs. The arrow now reports to you.',
} as const;

export const ALDER_KEEPSAKE={
 id:'alder-swatch',
 name:'Wren’s alder swatch',
 art:'/art/mossbank/alder-swatch.svg',
 alt:'A honey-brown alder sample with visible grain',
 story:'Honey-brown alder from the Mossbank sawmill. The grain follows the windrow; the label follows office policy.',
} as const;
export const HOME_KEEPSAKES = {
 naturalist: NATURALIST_KEEPSAKE,
 'woodland-certificate': WOODLAND_KEEPSAKE,
 'alder-swatch':ALDER_KEEPSAKE,
} as const;
export const HOME_KEEPSAKE_IDS = ['naturalist','woodland-certificate','alder-swatch'] as const;
export type HomeKeepsake = typeof HOME_KEEPSAKE_IDS[number];
export type HomeKeepsakeProjection = {
 keepsake?: typeof NATURALIST_KEEPSAKE.id;
 wallDisplay?: typeof WOODLAND_KEEPSAKE.id | typeof ALDER_KEEPSAKE.id;
};
export function displayedHomeKeepsake(plot?:HomeKeepsakeProjection):HomeKeepsake|null{
 return plot?.wallDisplay??plot?.keepsake??null;
}

export function earnedNaturalist(sketches: readonly SurveyId[]) {
 return SURVEY_IDS.every(id => sketches.includes(id));
}
