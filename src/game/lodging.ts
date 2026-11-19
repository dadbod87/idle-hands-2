import type { Point, Stop, World } from './world.ts';

export const LODGING_FRONT = { x: 10.5, y: 21.7 } as const satisfies Point;
export const LODGING_FOOTPRINT = [8, 16, 5.5, 5] as const;
export const LODGING_BEDSIDE = { x: 6.4, y: 6.3 } as const satisfies Point;

export const LODGING_DOOR = {
  id: 'lodging-door',
  name: 'Ledgerwick Boarding House',
  point: LODGING_FRONT,
  transition: 'lodging',
  arrival: LODGING_BEDSIDE,
  doorArea: [10.25, 19.45, 1.55, 2.65],
  text: 'A room for your first morning. Please ignore the award for adequate blankets.',
} satisfies Stop;

export const LODGING_ROOM: World = {
  width: 16,
  height: 13,
  blocked: [[3, 3, 4, 2], [9.75, 2.5, 2.25, 2], [13, 3, 1.4, 3.75]],
  stops: [
    { id: 'lodging-note', name: 'A note by the bed', point: LODGING_BEDSIDE,
      doorArea: [5.2, 4.75, 2.45, 2.25],
      text: 'Breakfast is under review. Marlow at the clerk’s desk has your first job.' },
    { id: 'lodging-exit', name: 'Town square', point: { x: 10.1, y: 11 },
      transition: 'square', arrival: LODGING_FRONT, doorArea: [9.15, 11, 3, 1.75],
      text: 'Step outside the boarding house. The square is just east of the front door.' },
  ],
};

export function squareWithLodging(square: World): World {
  return {
    ...square,
    blocked: [...square.blocked, [...LODGING_FOOTPRINT]],
    stops: [...square.stops, LODGING_DOOR],
  };
}
