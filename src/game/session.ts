import { worlds, walkable, pathTo, type Room, type Point, type Stop } from './world.ts';
export type SavedPosition = { version: 1; room: Room; position: Point };
const spawn: Record<Room, Point> = { square: { x: 24, y: 25 }, workshop: { x: 9, y: 11 } };
export class Session {
  room: Room = 'square';
  position: Point = { ...spawn.square };
  path: Point[] = [];
  locked = false;
  private target: Point | null = null;
  private tile: Point = { ...spawn.square };
  constructor(saved?: unknown) {
    if (!saved || typeof saved !== 'object') return;
    const s = saved as Partial<SavedPosition>;
    if (s.version === 1 && (s.room === 'square' || s.room === 'workshop') && s.position && walkable(s.room, s.position)) {
      this.room = s.room; this.position = { ...s.position }; this.tile = { ...s.position };
    }
  }
  stop(): void { this.path = []; this.target = null; this.position = { ...this.tile }; }
  lock(value: boolean): void { this.locked = value; this.stop(); }
  walk(to: Point): boolean {
    if (this.locked) return false;
    this.stop();
    const route = pathTo(this.room, this.tile, to);
    this.path = route;
    return route.length > 0 || (to.x === this.tile.x && to.y === this.tile.y);
  }
  tick(delta: number, direction?: Point): void {
    if (this.locked) return;
    if (!this.target) {
      if (direction && (direction.x || direction.y)) {
        this.path = [];
        const to = { x: this.tile.x + Math.sign(direction.x), y: this.tile.y + Math.sign(direction.y) };
        if (Math.abs(direction.x) + Math.abs(direction.y) === 1 && walkable(this.room, to)) this.target = to;
      } else this.target = this.path.shift() ?? null;
    }
    if (!this.target) return;
    const dx = this.target.x - this.position.x, dy = this.target.y - this.position.y;
    const distance = Math.hypot(dx, dy), amount = Math.min(Math.max(delta, 0), 50) / 1000 * 7;
    if (amount >= distance) {
      this.tile = { ...this.target }; this.position = { ...this.tile }; this.target = null;
    } else { this.position.x += dx / distance * amount; this.position.y += dy / distance * amount; }
  }
  nearby(): Stop | undefined {
    return worlds[this.room].stops.find(s => Math.hypot(this.position.x - s.point.x, this.position.y - s.point.y) <= 1.25);
  }
  enter(room: Room): void {
    this.stop(); this.room = room; this.tile = { ...spawn[room] }; this.position = { ...this.tile };
  }
  save(): SavedPosition { return { version: 1, room: this.room, position: { ...this.tile } }; }
  snapshot() { return { ...this.save(), position: { ...this.position }, locked: this.locked, walking: !!this.target || this.path.length > 0, nearby: this.nearby()?.id ?? null }; }
}
