import Phaser from 'phaser';
import {TownSky} from './TownSky.ts';
import {type TownClimate} from '../game/town-climate.ts';
import {TOWN_PEOPLE} from '../game/town-people.ts';
import { Session } from '../game/session.ts';
import {movementFrameSteps} from '../game/movement-frame.ts';
import { TILE, worlds } from '../game/world.ts';
import { PLACEMENT_SLOTS, type WorkshopState } from '../game/workshop.ts';
import { ORIGINAL_STATIC, ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
import catalog from '../../public/art/variety/catalog.json';
import {RESIDENT_IDS,TREE_KINDS,BUILDING_KINDS,residentArt,residentFrame,ambientPose} from '../art/variety.ts';
type ArtAsset={id:string;width:number;height:number;foot?:{x:number;y:number};occlusion?:{x:number;y:number;width:number;height:number};lightingWindows?:Array<{x:number;y:number;width:number;height:number}>};
const assets=catalog.assets as ArtAsset[];
const art=(id:string)=>{const asset=assets.find(a=>a.id===id);if(!asset)throw new Error('Missing authored art: '+id);return asset;};
export class WorldScene extends Phaser.Scene {
  actor!: Phaser.GameObjects.Image;
  bridgeRestored=false;
  residentId='devon';
  showTownfolk=true;
  skyNow:()=>number=Date.now;
  skyFixture:TownClimate|null=null;
  private sky?:TownSky;
  climateState(){return this.sky?.snapshot()??null;}
  private canopies:Array<{key:string;image:Phaser.GameObjects.Image;phase:number;baseX:number}>=[];
  private townfolk:Array<{id:string;image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  private steam?:Phaser.GameObjects.Graphics;
  private steamBaseY=0;
  private ambientMs=0;
  private ambientEnabled=false;
  private gestureOffset=0;
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
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
  private movementReset=true;
  frameSamples: number[] = [];
  onFrame?: () => void;
  onWalkFailure?:()=>void;
  constructor(public session: Session) { super('world'); }
  preload() {
    for (const key of ORIGINAL_STATIC) if(!['ground-square','workshop','cafe','tree'].includes(key))this.load.svg(key, `/art/original/${key}.svg`);
    const keys=['ground-square',...BUILDING_KINDS.map(k=>'building-'+k),...TREE_KINDS.flatMap(k=>['tree-'+k+'-trunk','tree-'+k+'-canopy']),...RESIDENT_IDS.map(k=>'resident-'+k)];
    for(const key of keys)this.load.svg('variety-'+key,`/art/variety/${key}.svg`);
  }
  create() {
    this.movementReset=true;
    this.room = this.session.room;
    this.canopies=[];this.townfolk=[];this.steam=undefined;this.ambientMs=0;
    for(const id of RESIDENT_IDS){const texture=this.textures.get('variety-resident-'+id);if(!texture.has('0'))this.textures.addSpriteSheet('',texture,{frameWidth:64,frameHeight:80});}
    this.decorationKey=''; this.decorationViews=[];this.residentViews=new Map();this.bridgeView=undefined;
    this.occluders = [];
    this.frame = 0; this.facing = 'south'; this.travelled = 0;
    const w = worlds[this.session.room];
    const litWindows:Array<{x:number;y:number;width:number;height:number}>=[];
    const image=(key:string,x:number,y:number,depth:number)=>this.add.image(x,y,key).setOrigin(0).setDepth(depth);
    image(this.room==='square'?'variety-ground-square':'ground-workshop',0,0,-1000);
    const label=(x:number,y:number,value:string)=>this.add.text(x*TILE,y*TILE,value,{fontFamily:'Georgia,serif',fontSize:13,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:9,y:5}}).setOrigin(.5).setDepth(y*TILE);
    if(this.room==='square') {
      for(const [key,x] of [['workshop',17],['cafe',28]] as const){
        const meta=art('building-'+key),foot=meta.foot!,left=x*TILE-8,top=22*TILE-foot.y;
        const building=image('variety-building-'+key,left,top,22*TILE);
        for(const box of meta.lightingWindows??[])litWindows.push({...box,x:left+box.x,y:top+box.y});
        const bounds=meta.occlusion??{x:0,y:foot.y-180,width:meta.width,height:180};
        this.occluders.push({image:building,x:left+bounds.x,y:top+bounds.y+bounds.height,width:bounds.width,height:bounds.height});
        if(key==='cafe'){this.steam=this.add.graphics().setPosition(left+162.5,top+9).setDepth(22*TILE+1);this.steamBaseY=top+9;this.steam.fillStyle(0xf8f1df).fillEllipse(0,0,13,19).fillEllipse(-5,-12,17,16).fillEllipse(2,-25,20,14);}
      }
      for(const [id,x,color] of [['Scrap',21,0x788b8c],['Timber',23,0xbb8861],['Supplies',25,0xb8ae76]] as const){
        this.add.rectangle((x+.5)*TILE,28.5*TILE,56,48,color).setStrokeStyle(3,0x343c36).setDepth(29*TILE);
        this.add.text((x+.5)*TILE,28.1*TILE,id,{fontFamily:'Georgia',fontSize:11,color:'#202f28',backgroundColor:'#f8f1df',padding:{x:3,y:3}}).setOrigin(.5).setDepth(30*TILE);
      }
      image('home-plot',27*TILE-8,30*TILE-8,35*TILE);
      this.bridgeView=image(this.bridgeRestored?'bridge-restored':'bridge-neglected',23*TILE,9.55*TILE,12.7*TILE);
      label(24.5,13.7,'!  Bridge committee');
      const plantings=[[17,26,'oak'],[34,26,'birch'],[14,17,'fruit'],[37,19,'oak'],[13,30,'birch'],[37,33,'fruit']] as const;
      for(const [index,[x,y,kind]] of plantings.entries()){
        const meta=art('tree-'+kind+'-canopy'),foot=meta.foot!,footX=(x+1)*TILE,footY=(y+2)*TILE+4;
        for(const layer of ['trunk','canopy']){const tree=this.add.image(footX,footY,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(footY+(layer==='canopy'?.1:0));
         if(layer==='canopy'){this.canopies.push({key:kind,image:tree,phase:index*1.7,baseX:footX});const bounds=meta.occlusion??{x:4,y:0,width:meta.width-8,height:foot.y};this.occluders.push({image:tree,x:footX-foot.x+bounds.x,y:footY-foot.y+bounds.y+bounds.height,width:bounds.width,height:bounds.height});}}
      }
      if(this.showTownfolk)for(const person of TOWN_PEOPLE){const py=(person.point.y+.5)*TILE,px=(person.point.x+.5)*TILE;const view=this.add.image(px,py,'variety-resident-'+person.rig,0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale).setDepth(py);const tag=this.add.text(px,py-62,person.name+' · '+person.role.split(' · ')[0],{fontFamily:'Georgia',fontSize:11,color:'#343c36',backgroundColor:'#f8f1df',padding:{x:3,y:2}}).setOrigin(.5,1).setDepth(py+1);this.townfolk.push({id:person.id,image:view,label:tag});}
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
    this.actor=this.add.image(0,0,'variety-resident-'+residentArt(this.residentId),0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale);
    this.cameras.main.setBackgroundColor(this.room === 'square' ? '#aebc92' : '#c5b28d');
    this.cameras.main.setBounds(0, 0, w.width * TILE, w.height * TILE);
    this.cameras.main.startFollow(this.actor, true, 1, 1);
    this.sky=new TownSky(this,litWindows);this.sky.update(this.skyNow(),0,this.room!=='square',!document.hidden&&!this.reducedMotion.matches,this.skyFixture);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button,input,dialog')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) { this.keys.add(key); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const clear = () => { this.movementReset=true;this.keys.clear(); this.session.stop();this.updateAmbient(0); };
    const motionChanged=()=>this.updateAmbient(0);this.reducedMotion.addEventListener('change',motionChanged);
    document.addEventListener('keydown', onDown); document.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const pos = this.cameras.main.getWorldPoint(p.x, p.y);
      const to = { x: pos.x / TILE - .5, y: pos.y / TILE - .5 };
      if(!this.session.locked&&!this.session.point(to))this.onWalkFailure?.();
    });
    this.events.once('shutdown', () => { this.reducedMotion.removeEventListener('change',motionChanged);document.removeEventListener('keydown', onDown); document.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); });
  }
  visualState(){return {facing:this.facing,frame:this.frame,anchor:ART.actorAnchor,scale:ART.actorScale,variety:{actorId:residentArt(this.residentId),actorTexture:this.actor?.texture?.key??null,actorFrame:this.actor?.frame?.name??null,actorSize:{width:this.actor?.width??0,height:this.actor?.height??0},residentFramesReady:!!this.actor&&RESIDENT_IDS.every(id=>this.textures.get('variety-resident-'+id).has('27')),treeKinds:this.room==='square'?[...TREE_KINDS]:[],buildingKinds:this.room==='square'?[...BUILDING_KINDS]:[],ambient:{enabled:this.ambientEnabled,canopies:this.canopies.map(c=>({key:c.key,rotation:c.image.rotation,offsetX:c.image.x-c.baseX})),steam:{alpha:this.steam?.alpha??0,y:this.steam?this.steam.y-this.steamBaseY:0},gestureOffset:this.gestureOffset}}};}
  private updateAmbient(delta:number){
    this.ambientEnabled=!document.hidden&&!this.reducedMotion.matches;
    this.sky?.motion(0,this.ambientEnabled);
    if(this.ambientEnabled)this.ambientMs+=Math.min(50,Math.max(0,delta));
    const camera=this.cameras.main,visible=(x:number,y:number)=>x>camera.worldView.left-120&&x<camera.worldView.right+120&&y>camera.worldView.top-160&&y<camera.worldView.bottom+120;
    // Keep canopy quads axis-aligned: software rendering clipped rotated SVG quads in CI.
    for(const canopy of this.canopies){const pose=ambientPose(this.ambientMs,this.ambientEnabled&&visible(canopy.baseX,canopy.image.y),canopy.phase);canopy.image.setRotation(0).setX(canopy.baseX+pose.canopyX);}
    const pose=ambientPose(this.ambientMs,this.ambientEnabled);this.gestureOffset=pose.gesture;
    if(this.steam){const active=this.ambientEnabled&&visible(this.steam.x,this.steamBaseY);this.steam.setAlpha(active?pose.steamAlpha:0).setY(this.steamBaseY+(active?pose.steamY:0));}
    for(const [index,person] of this.townfolk.entries()){const p=ambientPose(this.ambientMs,this.ambientEnabled&&visible(person.image.x,person.image.y),index*1.7);person.image.setScale(ART.actorScale,ART.actorScale+p.gesture*.004);const d=Math.hypot(person.image.x-this.actor.x,person.image.y-this.actor.y);person.label.setVisible(d<125);}
  }
  update(time: number, delta: number) {
    if (this.room !== this.session.room) { this.scene.restart(); return; }
    const pressed = (...keys: string[]) => keys.some(key => this.keys.has(key));
    const direction = {
      x: Number(pressed('ArrowRight', 'd')) - Number(pressed('ArrowLeft', 'a')),
      y: Number(pressed('ArrowDown', 's')) - Number(pressed('ArrowUp', 'w'))
    };
    if (this.session.locked) this.keys.clear();
    const before={...this.session.position};
    // Phaser smooths/replaces delayed deltas; visible walking follows bounded real elapsed time.
    // Reuse the existing <=50ms collision-safe domain steps, never offline catch-up.
    for(const step of movementFrameSteps(this.game.loop.rawDelta,!document.hidden,this.movementReset))this.session.tick(step,direction);
    this.movementReset=document.hidden;
    const dx=this.session.position.x-before.x,dy=this.session.position.y-before.y;
    const moving=Math.hypot(dx,dy)>.00001;
    if(moving)this.travelled+=Math.hypot(dx,dy)*TILE;
    this.facing=facingFor(dx,dy,this.facing);
    const reduced=this.reducedMotion.matches;
    this.frame=walkFrame(this.travelled,moving,reduced);
    this.actor.setTexture('variety-resident-'+residentArt(this.residentId),residentFrame(this.facing,this.frame));
    const x=(this.session.position.x+.5)*TILE,y=(this.session.position.y+.5)*TILE;
    this.actor.setPosition(x,y).setDepth(y);
    this.updateAmbient(delta);
    this.sky?.update(this.skyNow(),delta,this.room!=='square',this.ambientEnabled,this.skyFixture);
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
    for(const peer of peers){let view=this.residentViews.get(peer.id);if(!view){view={image:this.add.image(0,0,'variety-resident-'+residentArt(peer.id),0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale),label:this.add.text(0,0,peer.name,{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#f8f1df',padding:{x:4,y:3}}).setOrigin(.5,1)};this.residentViews.set(peer.id,view);}const px=(peer.position.x+.5)*TILE,py=(peer.position.y+.5)*TILE;view.image.setPosition(px,py).setDepth(py);view.label.setPosition(px,py-63).setDepth(py+1);}
    this.onFrame?.();
  }
}
