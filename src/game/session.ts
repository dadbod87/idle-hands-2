import { worlds, canStand, routeTo, type Room, type Point, type Stop } from './world.ts';
export type SavedPosition = { version: 1; room: Room; position: Point };
const spawn: Record<Room, Point> = { square: { x: 24, y: 25 }, workshop: { x: 9, y: 11 }, home: {x:9,y:11}, 'home-expanded': {x:9,y:11},trail:{x:9,y:22},garden:{x:9,y:14} };
export const WALK_SPEED = 5; // World tiles per second; the actor is never snapped to them.
export class Session {
  room: Room = 'square';
  position: Point = { ...spawn.square };
  path: Point[] = [];
  locked = false;
  private moving = false;
  private pendingStop: string | null = null;
  constructor(saved?: unknown) {
    if (!saved || typeof saved !== 'object') return;
    const s = saved as Partial<SavedPosition>;
    if (s.version === 1 && (s.room === 'square' || s.room === 'workshop'||s.room==='garden') && s.position && canStand(s.room, s.position)) {
      this.room = s.room; this.position = { ...s.position };
    }
  }
  stop(): void { this.path = []; this.moving = false; this.pendingStop = null; }
  lock(value: boolean): void { this.locked = value; this.stop(); }
  walk(to: Point): boolean {
    if (this.locked) return false;
    this.stop(); this.path = routeTo(this.room, this.position, to);
    return this.path.length > 0;
  }
  point(to: Point): boolean {
    if (this.locked) return false;
    const target = worlds[this.room].stops.find(stop => {
      if (!stop.doorArea) return false;
      const [x, y, width, height] = stop.doorArea;
      return to.x + .5 >= x && to.x + .5 <= x + width && to.y + .5 >= y && to.y + .5 <= y + height;
    });
    return target?this.approach(target.id):this.walk(to);
  }
  approach(stopId:string):boolean{
    const target=worlds[this.room].stops.find(stop=>stop.id===stopId);
    if(!target||this.locked)return false;
    const accepted=this.walk(target.point);if(accepted)this.pendingStop=target.id;return accepted;
  }
  takeArrival(): Stop | undefined {
    if (this.locked || !this.pendingStop) return;
    const target = worlds[this.room].stops.find(stop => stop.id === this.pendingStop);
    if (!target || Math.hypot(this.position.x - target.point.x, this.position.y - target.point.y) > 1.25) return;
    this.stop();
    return target;
  }
  private move(dx: number, dy: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .1));
    for (let i = 0; i < steps; i++) {
      const both = { x: this.position.x + dx / steps, y: this.position.y + dy / steps };
      if (canStand(this.room, both)) { this.position = both; continue; }
      const xOnly = { x: both.x, y: this.position.y };
      if (canStand(this.room, xOnly)) this.position = xOnly;
      const yOnly = { x: this.position.x, y: both.y };
      if (canStand(this.room, yOnly)) this.position = yOnly;
    }
  }
  tick(delta: number, direction?: Point): void {
    this.moving = false;
    if (this.locked) return;
    const amount = Math.min(Math.max(delta, 0), 50) / 1000 * WALK_SPEED;
    const before = { ...this.position };
    if (direction && (direction.x || direction.y)) {
      this.path = []; this.pendingStop = null;
      const length = Math.hypot(direction.x, direction.y);
      this.move(direction.x / length * amount, direction.y / length * amount);
    } else {
      let remaining = amount;
      // A microscopic tail at a corner is not a blocked next leg. Keep its route queued.
      while (this.path.length && remaining > .00001) {
        const target = this.path[0], dx = target.x - this.position.x, dy = target.y - this.position.y, distance = Math.hypot(dx, dy);
        if (distance < .00001) { this.path.shift(); continue; }
        const step = Math.min(distance, remaining), prior = { ...this.position };
        this.move(dx / distance * step, dy / distance * step); remaining -= step;
        if (Math.hypot(this.position.x - target.x, this.position.y - target.y) < .00001) { this.position = { ...target }; this.path.shift(); }
        else if (Math.hypot(this.position.x - prior.x, this.position.y - prior.y) < .00001) { this.path = []; break; }
      }
    }
    this.moving = Math.hypot(this.position.x - before.x, this.position.y - before.y) > .00001;
  }
  nearby(): Stop | undefined { return worlds[this.room].stops.find(s => Math.hypot(this.position.x - s.point.x, this.position.y - s.point.y) <= 1.25); }
  enter(room: Room, arrival: Point = spawn[room]): void {
    if (!canStand(room, arrival)) throw new Error('Transition arrival must be collision-safe.');
    this.stop(); this.room = room; this.position = { ...arrival };
  }
  save(): SavedPosition { return { version: 1, room: this.room, position: { ...this.position } }; }
  snapshot() { return { ...this.save(), locked: this.locked, walking: this.moving || this.path.length > 0, nearby: this.nearby()?.id ?? null }; }
}
