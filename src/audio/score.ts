import type { Room } from '../game/world.ts';

export const SCORE_RATE = 22050;
export const SCORE_FRAMES = { town: 569230, woodland: 667915, home: 649049 } as const;
export type PlaceScore = keyof typeof SCORE_FRAMES;
export const SCORE_NAMES: Record<PlaceScore, string> = {
  town: 'Business as unusual',
  woodland: 'The trees have seniority',
  home: 'Furniture, finally',
};

export function scoreForRoom(room: Room): PlaceScore {
  if (room === 'trail') return 'woodland';
  if (room === 'home' || room === 'home-expanded') return 'home';
  return 'town';
}

export function isPlaceScore(value: unknown): value is PlaceScore {
  return typeof value === 'string' && Object.hasOwn(SCORE_FRAMES, value);
}
