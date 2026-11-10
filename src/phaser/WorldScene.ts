import Phaser from 'phaser';
import { Session } from '../game/session.ts';
import { TILE, worlds } from '../game/world.ts';
import { PLACEMENT_SLOTS, type WorkshopState } from '../game/workshop.ts';
import { ORIGINAL_STATIC, FACINGS, ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
export class WorldScene extends Phaser.Scene {
  actor!: Phaser.GameObjects.Image;
  bridgeRestored=false;
  residents:Array<{id:string;name:string;room:string;position:{x:number;y:number}}>=[];
  private residentViews=new Map<string,{image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>();
  private bridgeView?:Phaser.GameObjects.Image;
  decorations?:()=>WorkshopState['placements'];
  private decorationViews:Phaser.GameObjects.GameObject[]=[];
  private decorationKey='';
  refreshDecorations(){this.decorationKey='';}
  private facing: Facing = 'south';
  private travelled = 0;
  private frame = 0;
  private occluders: {image:Phaser.GameObjects.Image;x:number;y:number;width:number;height:number}[] = [];
  private keys = new Set<string>();
  private room = '';
  private lastFrame = 0;
  frameSamples: number[] = [];
  onFrame?: () => void;
  onWalkFailure?:()=>void;
  constructor(public session: Session) { super('world'); }
  preload() {
    for (const key of ORIGINAL_STATIC) this.load.svg(key, `/art/original/${key}.svg`);
    for (const facing of FACINGS) for (let frame=0;frame<7;frame++) this.load.svg(`employee-${facing}-${frame}`, `/art/original/employee-${facing}-${frame}.svg`);
  }
  create() {
    this.room = this.session.room;
    this.decorationKey=''; this.decorationViews=[];this.residentViews=new Map();this.bridgeView=undefined;
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
      for(const [id,x,color] of [['Scrap',21,0x788b8c],['Timber',23,0xbb8861],['Supplies',25,0xb8ae76]] as const){
        this.add.rectangle((x+.5)*TILE,28.5*TILE,56,48,color).setStrokeStyle(3,0x343c36).setDepth(29*TILE);
        this.add.text((x+.5)*TILE,28.1*TILE,id,{fontFamily:'Georgia',fontSize:11,color:'#202f28',backgroundColor:'#f8f1df',padding:{x:3,y:3}}).setOrigin(.5).setDepth(30*TILE);
      }
      image('home-plot',27*TILE-8,30*TILE-8,35*TILE);
      this.bridgeView=image(this.bridgeRestored?'bridge-restored':'bridge-neglected',23*TILE,9.55*TILE,12.7*TILE);
      label(24.5,13.7,'!  Bridge committee');
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
      if(!this.session.locked&&!this.session.point(to))this.onWalkFailure?.();
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
    if(this.room==='workshop'&&this.decorations){
      const placements=this.decorations(),key=JSON.stringify(placements);
      if(key!==this.decorationKey){
        this.decorationKey=key;for(const view of this.decorationViews)view.destroy();this.decorationViews=[];
        for(const slot of PLACEMENT_SLOTS){const prop=placements[slot.id];if(!prop)continue;const x=(slot.x+.5)*TILE,y=(slot.y+.5)*TILE;
          const g=this.add.graphics().setDepth(prop==='rug'?-2:y);g.lineStyle(2,0x343c36);
          if(prop==='rug'){g.fillStyle(0xa47570).fillRoundedRect(x-30,y-20,60,40,3).strokeRoundedRect(x-30,y-20,60,40,3);g.lineStyle(2,0xeed6a6).strokeRect(x-22,y-13,44,26);}
          if(prop==='planter'){g.fillStyle(0xc98f66).fillRect(x-12,y-15,24,18).strokeRect(x-12,y-15,24,18);g.lineStyle(3,0x445c40).lineBetween(x,y-15,x,y-42);g.fillStyle(0x78935c).fillEllipse(x-8,y-31,20,12).fillEllipse(x+8,y-40,19,12);}
          if(prop==='stool'){g.lineBetween(x-12,y-13,x-14,y+5).lineBetween(x+12,y-13,x+14,y+5);g.fillStyle(0xbe9e68).fillEllipse(x,y-17,34,18).strokeEllipse(x,y-17,34,18);}
          if(prop==='lamp'){g.fillStyle(0x687b76).fillEllipse(x,y,28,10);g.lineBetween(x,y,x,y-36);g.fillStyle(0xe8cd80).fillTriangle(x,y-58,x-20,y-32,x+20,y-32).strokeTriangle(x,y-58,x-20,y-32,x+20,y-32);}
          if(prop==='crate'){g.fillStyle(0xb29465).fillRect(x-22,y-30,44,32).strokeRect(x-22,y-30,44,32);g.lineBetween(x-20,y-27,x+20,y).lineBetween(x+20,y-27,x-20,y);}
          if(prop==='shelf'){g.fillStyle(0xa68259).fillRect(x-27,y-54,54,56).strokeRect(x-27,y-54,54,56);g.lineBetween(x-26,y-26,x+26,y-26);g.fillStyle(0x687d79).fillRect(x-20,y-47,10,19);g.fillStyle(0xcaa865).fillRect(x-7,y-45,13,17);}
          this.decorationViews.push(g);
        }
      }
    }
    if(this.bridgeView)this.bridgeView.setTexture(this.bridgeRestored?'bridge-restored':'bridge-neglected');
    const peers=this.residents.filter(r=>r.room===this.room&&Number.isFinite(r.position.x)&&Number.isFinite(r.position.y));
    for(const[id,view]of this.residentViews)if(!peers.some(p=>p.id===id)){view.image.destroy();view.label.destroy();this.residentViews.delete(id);}
    for(const peer of peers){let view=this.residentViews.get(peer.id);if(!view){view={image:this.add.image(0,0,'employee-south-0').setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale),label:this.add.text(0,0,peer.name,{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#f8f1df',padding:{x:4,y:3}}).setOrigin(.5,1)};this.residentViews.set(peer.id,view);}const px=(peer.position.x+.5)*TILE,py=(peer.position.y+.5)*TILE;view.image.setPosition(px,py).setDepth(py);view.label.setPosition(px,py-63).setDepth(py+1);}
    this.onFrame?.();
  }
}
