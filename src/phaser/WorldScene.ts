import Phaser from 'phaser';
import { Session } from '../game/session.ts';
import { TILE, worlds } from '../game/world.ts';
import { ORIGINAL_STATIC, FACINGS, ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
export class WorldScene extends Phaser.Scene {
  actor!: Phaser.GameObjects.Image;
  private facing: Facing = 'south';
  private travelled = 0;
  private frame = 0;
  private occluders: {image:Phaser.GameObjects.Image;x:number;y:number;width:number;height:number}[] = [];
  private keys = new Set<string>();
  private room = '';
  private lastFrame = 0;
  frameSamples: number[] = [];
  onFrame?: () => void;
  constructor(public session: Session) { super('world'); }
  preload() {
    for (const key of ORIGINAL_STATIC) this.load.svg(key, `/art/original/${key}.svg`);
    for (const facing of FACINGS) for (let frame=0;frame<7;frame++) this.load.svg(`employee-${facing}-${frame}`, `/art/original/employee-${facing}-${frame}.svg`);
  }
  create() {
    this.room = this.session.room;
    this.occluders = [];
    this.frame = 0; this.facing = 'south'; this.travelled = 0;
    const w = worlds[this.session.room];
    const image=(key:string,x:number,y:number,depth:number)=>this.add.image(x,y,key).setOrigin(0).setDepth(depth);
    image(`ground-${this.room}`,0,0,-1000);
    const label=(x:number,y:number,value:string)=>this.add.text(x*TILE,y*TILE,value,{fontFamily:'Georgia,serif',fontSize:13,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:9,y:5}}).setOrigin(.5).setDepth(y*TILE);
    if(this.room==='square') {
      for(const [key,x] of [['workshop',17],['cafe',28]] as const){
        const building=image(key,x*TILE-8,14.5*TILE,22*TILE);
        this.occluders.push({image:building,x:x*TILE-8,y:22*TILE,width:208,height:180});
      }
      image('home-plot',27*TILE-8,30*TILE-8,35*TILE);
      image('bridge-neglected',23*TILE,9.55*TILE,12.7*TILE);
      label(24.5,13.7,'!  Bridge committee');
      label(24.5,28.3,'The town square · under new mismanagement');
      for(const [x,y] of [[17,26],[34,26],[14,17],[37,19],[13,30],[37,33]]){
        const footY=(y+2)*TILE+4,tree=this.add.image((x+1)*TILE,footY,'tree').setOrigin(.5,1).setDepth(footY);
        this.occluders.push({image:tree,x:(x+1)*TILE-46,y:footY,width:92,height:85});
      }
    } else {
      image('bench',3*TILE,3*TILE,5*TILE).setDisplaySize(5*TILE,3*TILE);
      image('shelf',11*TILE,3*TILE,6*TILE);
      image('crates',3*TILE,8*TILE,10*TILE);
      label(9,1.8,'Your workshop');
      label(9,7.6,'Great things take time.');
      label(9,8.5,'This bench is extremely optimistic.');
      this.add.rectangle(9.5*TILE,14*TILE,3*TILE,2*TILE,0x8c7757).setStrokeStyle(2,0x343c36).setDepth(0);
      label(9.5,14,'Square ↓');
    }
    this.actor=this.add.image(0,0,'employee-south-0').setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale);
    this.cameras.main.setBackgroundColor(this.room === 'square' ? '#aebc92' : '#c5b28d');
    this.cameras.main.setBounds(0, 0, w.width * TILE, w.height * TILE);
    this.cameras.main.startFollow(this.actor, true, 1, 1);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button,input,dialog')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) { this.keys.add(key); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const clear = () => { this.keys.clear(); this.session.stop(); };
    document.addEventListener('keydown', onDown); document.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const pos = this.cameras.main.getWorldPoint(p.x, p.y);
      const to = { x: pos.x / TILE - .5, y: pos.y / TILE - .5 };
      this.session.point(to);
    });
    this.events.once('shutdown', () => { document.removeEventListener('keydown', onDown); document.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); });
  }
  visualState(){return {facing:this.facing,frame:this.frame,anchor:ART.actorAnchor,scale:ART.actorScale};}
  update(time: number, delta: number) {
    if (this.room !== this.session.room) { this.scene.restart(); return; }
    const pressed = (...keys: string[]) => keys.some(key => this.keys.has(key));
    const direction = {
      x: Number(pressed('ArrowRight', 'd')) - Number(pressed('ArrowLeft', 'a')),
      y: Number(pressed('ArrowDown', 's')) - Number(pressed('ArrowUp', 'w'))
    };
    if (this.session.locked) this.keys.clear();
    const before={...this.session.position};
    this.session.tick(delta, direction);
    const dx=this.session.position.x-before.x,dy=this.session.position.y-before.y;
    const moving=Math.hypot(dx,dy)>.00001;
    if(moving)this.travelled+=Math.hypot(dx,dy)*TILE;
    this.facing=facingFor(dx,dy,this.facing);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.frame=walkFrame(this.travelled,moving,reduced);
    this.actor.setTexture(`employee-${this.facing}-${this.frame}`);
    const x=(this.session.position.x+.5)*TILE,y=(this.session.position.y+.5)*TILE;
    this.actor.setPosition(x,y).setDepth(y);
    for(const item of this.occluders){const hidden=x>item.x&&x<item.x+item.width&&y<item.y&&y>item.y-item.height;item.image.setAlpha(hidden?.55:1);}
    if (this.lastFrame && !document.hidden) { this.frameSamples.push(time - this.lastFrame); if (this.frameSamples.length > 600) this.frameSamples.shift(); }
    this.lastFrame = time;
    this.onFrame?.();
  }
}
