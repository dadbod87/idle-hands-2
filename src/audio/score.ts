import type { Point, Room } from '../game/world.ts';

export const SCORE_RATE = 22050;
export const SCORE_FRAMES = { town: 569230, woodland: 667915, home: 649049, orchard: 480060, lodging: 593460 } as const;
export type PlaceScore = keyof typeof SCORE_FRAMES;
export const SCORE_NAMES: Record<PlaceScore, string> = {
  town: 'Business as unusual',
  woodland: 'The trees have seniority',
  home: 'Furniture, finally',
  orchard: 'Little brass labels',
  lodging: 'The second blanket',
};

export function scoreForRoom(room: Room): PlaceScore {
  if (room === 'lodging') return 'lodging';
  if (room === 'trail' || room === 'glasshouse') return 'woodland';
  if (room === 'home' || room === 'home-expanded') return 'home';
  return 'town';
}

export function scoreForLocation(room:Room,position?:Point,previous?:PlaceScore):PlaceScore {
 if(room==='square'&&position){
  const padding=previous==='orchard'?3:0;
  if(position.x>=93-padding&&position.x<=110+padding&&position.y>=32-padding&&position.y<=54+padding)return 'orchard';
 }
 return scoreForRoom(room);
}

export function isPlaceScore(value: unknown): value is PlaceScore {
  return typeof value === 'string' && Object.hasOwn(SCORE_FRAMES, value);
}
