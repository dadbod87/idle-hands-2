import { ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
import { residentFrame } from '../art/variety.ts';
import { WALK_SPEED } from './session.ts';
import type { Point } from './world.ts';

// Confirmed positions arrive on a 200ms broadcast. Bridge only one normal step.
const MAX_STEP = WALK_SPEED * .25;

/** Presentation of confirmed peer positions. Never predicts beyond the last position. */
export class ResidentMotion {
  readonly position: Point;
  facing: Facing = 'south';
  private origin: Point;
  private target: Point;
  private started = 0;
  private duration = 0;
  private stride = 0;

  constructor(point: Point) {
    this.position = {...point};
    this.origin = this.target = point;
  }

  get walking() { return this.duration > 0; }
  get frame() { return residentFrame(this.facing,walkFrame(this.stride,this.walking,false)); }

  sample(point: Point, now: number, animate: boolean, clear: (from:Point,to:Point)=>boolean) {
    this.advance(now);
    if(point.x!==this.target.x||point.y!==this.target.y){
      const dx=point.x-this.position.x,dy=point.y-this.position.y;
      const distance=Math.hypot(dx,dy);
      this.facing=facingFor(dx,dy,this.facing);
      this.origin={...this.position};this.target=point;this.started=now;
      this.duration=animate&&distance>0&&distance<=MAX_STEP&&clear(this.origin,point)?distance/WALK_SPEED*1000:0;
    }
    if(!animate||!this.duration){
      this.position.x=point.x;this.position.y=point.y;this.duration=0;
    }
  }

  private advance(now:number){
    if(!this.duration)return;
    const progress=Math.min(1,Math.max(0,(now-this.started)/this.duration));
    const x=this.origin.x+(this.target.x-this.origin.x)*progress;
    const y=this.origin.y+(this.target.y-this.origin.y)*progress;
    this.stride+=Math.hypot(x-this.position.x,y-this.position.y)*ART.tile;
    this.position.x=x;this.position.y=y;
    if(progress===1)this.duration=0;
  }
}
