import { NATURALIST_KEEPSAKE } from './home-keepsake.ts';
import { TILE, worlds, canStand, clearSegment, routeTo, type Room, type Point, type Stop,type World } from './world.ts';
import { LODGING_BEDSIDE, LODGING_FRONT, LODGING_ROOM, squareWithLodging } from './lodging.ts';

export type SavedPosition = { version: 1; room: Room; position: Point };
const spawn: Record<Room, Point> = { lodging:LODGING_BEDSIDE, neighborhood:{x:31.5,y:2.5}, square: { x: 24, y: 25 }, workshop: { x: 9, y: 11 }, home: {x:9,y:11}, 'home-expanded': {x:9,y:11},trail:{x:9,y:22},garden:{x:9,y:14} };
const frame=NATURALIST_KEEPSAKE.frame;
const keepsakeStop:Stop={
 id:'home-keepsake',name:NATURALIST_KEEPSAKE.name,text:NATURALIST_KEEPSAKE.story,
 point:{x:frame.x/TILE-.5,y:(frame.y+42)/TILE-.5},
 doorArea:[(frame.x-frame.width/2)/TILE,(frame.y-frame.height/2)/TILE,frame.width/TILE,(frame.height+13)/TILE],
};
const displayedHomeStops={
 home:[...worlds.home.stops,keepsakeStop],
 'home-expanded':[...worlds['home-expanded'].stops,keepsakeStop],
};
export const WALK_SPEED = 5; // World tiles per second; the actor is never snapped to them.
export class Session {
  geometry?:World;
  room: Room = 'square';
  position: Point = { ...spawn.square };
  path: Point[] = [];
  locked = false;
  private moving = false;
  private pendingStop: string | null = null;
  private squareStops: readonly Stop[] = worlds.square.stops;
  private readonly squareLayout?: World;
  readonly recoveredLodgingFootprint: boolean = false;
  private extraSquareStops?:readonly Stop[];
  get hasLodging(): boolean { return !!this.squareLayout; }
  private roomGeometry(room: Room = this.room): World | undefined {
    if (room==='square') return this.squareLayout;
    if (room==='lodging'&&this.hasLodging) return LODGING_ROOM;
    if (room==='neighborhood') return this.geometry;
  }
  private hasHomeKeepsake = false;
  setHomeKeepsake(shown:boolean){
    this.hasHomeKeepsake=shown;
    if(!shown&&this.pendingStop===keepsakeStop.id)this.stop();
  }
  get stops(): readonly Stop[] {
    if(this.room==='square')return this.squareStops;
    if(this.hasHomeKeepsake&&(this.room==='home'||this.room==='home-expanded'))return displayedHomeStops[this.room];
    return worlds[this.room].stops;
  }
  setSquareStops(extra?:readonly Stop[]){
    if(this.extraSquareStops===extra)return;
    this.extraSquareStops=extra;
    const base=this.squareLayout?.stops??worlds.square.stops;
    this.squareStops=extra?.length?[...base,...extra]:base;
  }
  constructor(saved?: unknown, extraSquareStops?: readonly Stop[], localLodging = false) {
    if(localLodging){
      this.squareLayout=squareWithLodging(worlds.square);
      this.squareStops=this.squareLayout.stops;
    }
    this.setSquareStops(extraSquareStops);
    if (!saved || typeof saved !== 'object') return;
    const s = saved as Partial<SavedPosition>;
    if (s.version !== 1 || !s.position) return;
    if (s.room === 'square' || s.room === 'workshop' || s.room === 'garden' || (localLodging && s.room === 'lodging')) {
      if (canStand(s.room, s.position, this.roomGeometry(s.room))) {
        this.room = s.room; this.position = { ...s.position };
      } else if (localLodging && s.room === 'square' && canStand(s.room, s.position)) {
        this.position = { ...LODGING_FRONT };
        this.recoveredLodgingFootprint = true;
      }
    }
  }
  stop(): void { this.path = []; this.moving = false; this.pendingStop = null; }
  lock(value: boolean): void { this.locked = value; this.stop(); }
  walk(to: Point): boolean {
    if (this.locked) return false;
    this.stop(); this.path = routeTo(this.room, this.position, to,this.roomGeometry());
    return this.path.length > 0;
  }
  point(to: Point): boolean {
    if (this.locked) return false;
    const target = this.stops.find(stop => {
      if (!stop.doorArea) return false;
      const [x, y, width, height] = stop.doorArea;
      return to.x + .5 >= x && to.x + .5 <= x + width && to.y + .5 >= y && to.y + .5 <= y + height;
    });
    return target?this.approach(target.id):this.walk(to);
  }
  approach(stopId:string):boolean{
    const target=this.stops.find(stop=>stop.id===stopId);
    if(!target||this.locked)return false;
    const accepted=this.walk(target.point);if(accepted)this.pendingStop=target.id;return accepted;
  }
  private canInspect(stop:Stop):boolean {
    if (Math.hypot(this.position.x-stop.point.x,this.position.y-stop.point.y)>1.25) return false;
    const needsClearSight=this.extraSquareStops?.includes(stop)||stop.id==='lodging-door';
    return !needsClearSight||clearSegment(this.room,this.position,stop.point,this.roomGeometry());
  }
  takeArrival(): Stop | undefined {
    if (this.locked || !this.pendingStop) return;
    const target = this.stops.find(stop => stop.id === this.pendingStop);
    if (!target || !this.canInspect(target)) return;
    this.stop();
    return target;
  }
  private move(dx: number, dy: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .1));
    for (let i = 0; i < steps; i++) {
      const both = { x: this.position.x + dx / steps, y: this.position.y + dy / steps };
      if (canStand(this.room, both,this.roomGeometry())) { this.position = both; continue; }
      const xOnly = { x: both.x, y: this.position.y };
      if (canStand(this.room, xOnly,this.roomGeometry())) this.position = xOnly;
      const yOnly = { x: this.position.x, y: both.y };
      if (canStand(this.room, yOnly,this.roomGeometry())) this.position = yOnly;
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
  nearby(): Stop | undefined { return this.stops.find(stop=>this.canInspect(stop)); }
  enter(room: Room, arrival: Point = spawn[room]): void {
    if (room==='lodging' && !this.hasLodging) throw new Error('The boarding house belongs to browser practice.');
    if (!canStand(room, arrival,this.roomGeometry(room))) throw new Error('Transition arrival must be collision-safe.');
    this.stop(); this.room = room; this.position = { ...arrival };
  }
  save(): SavedPosition { return { version: 1, room: this.room, position: { ...this.position } }; }
  snapshot() { return { ...this.save(), locked: this.locked, walking: this.moving || this.path.length > 0, nearby: this.nearby()?.id ?? null }; }
}
