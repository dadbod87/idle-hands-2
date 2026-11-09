export type Room = 'square' | 'workshop';
export type Point = { x: number; y: number };
export type Stop = { id: string; name: string; point: Point; text: string; transition?: Room };
export type World = { width: number; height: number; blocked: [number, number, number, number][]; stops: Stop[] };
export const TILE = 32;
export const worlds: Record<Room, World> = {
  square: {
    width: 48, height: 48,
    blocked: [[17, 16, 6, 6], [28, 16, 6, 6], [27, 30, 8, 5], [17, 26, 2, 2], [34, 26, 2, 2], [14, 17, 2, 2], [37, 19, 2, 2], [13, 30, 2, 2], [37, 33, 2, 2], [0, 10, 48, 2]],
    stops: [
      { id: 'workshop', name: 'Workshop', point: { x: 20, y: 22 }, transition: 'workshop', text: 'Your workshop. The desk is temporary. The paperwork is structural.' },
      { id: 'cafe', name: 'The Almost Open Café', point: { x: 30, y: 22 }, text: 'The opening date is pencilled in. The pencil has requested an extension.' },
      { id: 'plot', name: 'Future house plots', point: { x: 30, y: 29 }, text: 'Room to put down roots. The full game will let you acquire a plot, upgrade a house and make it yours. No plots are sold in this pilot.' },
      { id: 'bridge', name: 'Bridge committee', point: { x: 24, y: 13 }, text: 'A future shared project: everyone contributes, everyone gets a new place to explore. Today the committee is only inspecting the concept of a bridge.' }
    ]
  },
  workshop: {
    width: 18, height: 16,
    blocked: [[3, 3, 5, 2], [11, 3, 4, 3], [3, 8, 2, 2]],
    stops: [
      { id: 'bench', name: 'Work bench', point: { x: 5, y: 5 }, text: 'Future home of useful work, slow production and several very confident mistakes. Crafting arrives in a later milestone.' },
      { id: 'door', name: 'Town square', point: { x: 9, y: 13 }, transition: 'square', text: 'Back to the square. Meetings are outdoors now. There was an incident with a flip chart.' }
    ]
  }
};
export function walkable(room: Room, p: Point): boolean {
  const w = worlds[room];
  return Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 1 && p.y >= 1 && p.x < w.width - 1 && p.y < w.height - 1 && !w.blocked.some(([x, y, width, height]) => p.x >= x && p.y >= y && p.x < x + width && p.y < y + height);
}
export function pathTo(room: Room, from: Point, to: Point): Point[] {
  if (!walkable(room, to) || !walkable(room, from)) return [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [from], parents = new Map<string, Point | null>([[key(from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(to)) {
      const result: Point[] = [];
      let current: Point | null = p;
      while (current && key(current) !== key(from)) { result.unshift(current); current = parents.get(key(current)) ?? null; }
      return result;
    }
    for (const delta of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]) {
      const n = { x: p.x + delta.x, y: p.y + delta.y };
      if (walkable(room, n) && !parents.has(key(n))) { parents.set(key(n), p); queue.push(n); }
    }
  }
  return [];
}
