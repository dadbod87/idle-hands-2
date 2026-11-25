import type Phaser from 'phaser';
import {levelFor, LOWER_ROOMS, type LowerRoom} from '../game/lower-pumpworks-room.ts';
import {distance, miteOrigin, LOWER_STRIKE, type LowerView} from '../game/lower-pumpworks.ts';
import {TILE, type Point} from '../game/world.ts';

const outline=0x2e3b33;
const stone={safe:0x998668,work:0xa38a62,water:0x56807a,danger:0x906d5a};
const pixel=(n:number)=>(n+.5)*TILE;

function hardware(brush:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,fill:number){
  brush.fillStyle(outline,1).fillRoundedRect(x-3,y-3,w+6,h+6,3);
  brush.fillStyle(fill,1).fillRoundedRect(x,y,w,h,2);
}

export class LowerWorksArt {
  private readonly floor:Phaser.GameObjects.Graphics;
  private readonly cue:Phaser.GameObjects.Graphics;
  private readonly mite:Phaser.GameObjects.Graphics;
  private readonly chest:Phaser.GameObjects.Graphics;
  private readonly chestLabel?:Phaser.GameObjects.Text;
  private readonly miteLabel?:Phaser.GameObjects.Text;
  private readonly chestPoint?:Point;
  private lastClaim:boolean|null=null;
  private lastView:LowerView|null=null;
  constructor(private readonly scene:Phaser.Scene, private readonly room:LowerRoom){
    this.floor=scene.add.graphics().setDepth(-1000);
    this.cue=scene.add.graphics().setDepth(0);
    this.mite=scene.add.graphics();
    this.chest=scene.add.graphics();
    const {world,spaces,passages,markers}=levelFor(room);
    this.floor.fillStyle(0x20312f,1).fillRect(0,0,world.width*TILE,world.height*TILE);
    for(const {kind,bounds:[x,y,w,h]} of spaces){
      this.floor.fillStyle(outline,1).fillRoundedRect(x*TILE-5,y*TILE-5,w*TILE+10,h*TILE+10,6);
      this.floor.fillStyle(stone[kind],1).fillRect(x*TILE,y*TILE,w*TILE,h*TILE);
      for(let row=0;row<h;row++)for(let column=0;column<w;column++){
        const tx=(x+column)*TILE,ty=(y+row)*TILE;
        this.floor.fillStyle((row+column)%2?0xefdfb1:0x352f27,.10).fillRect(tx+1,ty+1,TILE-2,TILE-2);
        if((row*13+column*7)%11===0)this.floor.fillStyle(outline,.30).fillRect(tx+10,ty+8,8,2);
      }
    }
    for(const [x,y,w,h] of passages){
      this.floor.fillStyle(0x7b795f,1).fillRect(x*TILE,y*TILE,w*TILE,h*TILE);
      for(let t=1;t<w;t++)this.floor.lineStyle(1,0x3a473b,.36).lineBetween((x+t)*TILE,y*TILE,(x+t)*TILE,(y+h)*TILE);
    }
    this.paintStripes();
    for(const marker of markers){
      const x=pixel(marker.point.x),y=pixel(marker.point.y);
      if(marker.kind==='door'){
        this.drawDoor(x,y,marker.id.startsWith('lift'));
        const name=marker.id==='exit'?'Upper Pumpworks':marker.name;
        this.label(x,y+19,name);
      }
      if(marker.id==='store-chest'){
        this.chestPoint=marker.point;
        this.chestLabel=this.label(x,y+17,'Stores chest').setVisible(false);
      }
      if(marker.id==='mite'){
        this.miteLabel=this.label(x,y+16,'Filter mite').setVisible(false);
      }
    }
    if(room===LOWER_ROOMS[0]){
      this.drawSign({x:15.1,y:25.4},'Stores →');
      this.drawSign({x:11.4,y:20.2},'Gallery ↑');
    }
  }
  private label(x:number,y:number,text:string){
    return this.scene.add.text(x,y,text,{
      fontFamily:'Georgia,serif',fontSize:13,color:'#27382e',backgroundColor:'#f0e0b7',
      padding:{x:6,y:3},
    }).setOrigin(.5,0).setDepth(y+3);
  }
  private drawSign(point:Point,text:string){
    const x=pixel(point.x),y=pixel(point.y);
    this.floor.fillStyle(0x594d36,1).fillRect(x-4,y-22,7,27);
    this.label(x,y-27,text);
  }
  private drawDoor(x:number,y:number,lift:boolean){
    hardware(this.floor,x-18,y-40,36,40,lift?0x838878:0x9b7855);
    for(let step=0;step<4;step++)this.floor.lineStyle(2,outline,.8).lineBetween(x-14,y-33+step*9,x+14,y-33+step*9);
    this.floor.fillStyle(0xe7cb89,1).fillCircle(x+9,y-10,3);
  }
  private paintStripes(){
    const route=this.room===LOWER_ROOMS[0]?
      [[6.5,28.5],[12.5,28.5],[12.5,10.5],[49.5,10.5],[49.5,8.5]]:
      [[18.5,29.5],[18.5,14.5],[35.5,14.5]];
    this.floor.fillStyle(0xf4d58a,.95);
    for(let index=1;index<route.length;index++){
      const [a,b]=route[index-1]!,[x,y]=route[index]!;
      const length=Math.hypot(x-a,y-b)*TILE;
      for(let step=0;step<length;step+=18){
        const horizontal=a!==x;
        const sign=horizontal?Math.sign(x-a):Math.sign(y-b);
        this.floor.fillRect(a*TILE+(horizontal?step*sign:-1.5),b*TILE+(horizontal?-1.5:step*sign),horizontal?10:3,horizontal?3:10);
      }
    }
    const lamps=this.room===LOWER_ROOMS[0]?[[8,26],[12,19],[12,11],[24,9],[39,9],[49,10]]:[[18,33],[19,27],[18,21],[18,14],[30,13]];
    for(const [x,y] of lamps){
      const cx=pixel(x!),cy=pixel(y!);
      this.floor.fillStyle(0xffdd97,.13).fillCircle(cx,cy,19).fillCircle(cx,cy,11);
      this.floor.fillStyle(outline,1).fillCircle(cx,cy,5);
      this.floor.fillStyle(0xf8d683,1).fillCircle(cx,cy,3);
    }
  }
  private drawChest(claimed:boolean){
    if(!this.chestPoint||this.lastClaim===claimed)return;
    this.lastClaim=claimed;
    const x=pixel(this.chestPoint.x),y=pixel(this.chestPoint.y);
    const ink=this.chest.clear().setDepth(y);
    hardware(ink,x-22,y-25,44,26,claimed?0x786952:0xb28350);
    ink.fillStyle(outline,1).fillRect(x-22,y-15,44,4);
    if(claimed)ink.fillStyle(0x524936,1).fillRect(x-17,y-26,34,11);
    ink.fillStyle(0xf4cc83,1).fillRect(x-4,y-17,8,9);
  }
  private drawMite(feet:Point,engaged:boolean,opening:boolean){
    const x=pixel(feet.x),y=pixel(feet.y);
    const ink=this.mite.clear().setDepth(y);
    ink.fillStyle(outline,.30).fillEllipse(x,y+1,44,14);
    ink.lineStyle(4,outline,1);
    for(const side of [-1,1])for(let leg=0;leg<3;leg++)ink.lineBetween(x+side*12,y-12+leg*4,x+side*(23-leg),y-9+leg*5);
    ink.fillStyle(outline,1).fillEllipse(x,y-14,39,24);
    ink.fillStyle(opening?0xd4ae66:0x738e64,1).fillEllipse(x,y-15,32,18);
    ink.fillStyle(0xe5d894,1).fillCircle(x-6,y-11,4).fillCircle(x+6,y-11,4);
    ink.fillStyle(outline,1).fillCircle(x-6,y-10,1.6).fillCircle(x+6,y-10,1.6);
    this.miteLabel?.setPosition(x,y+9).setDepth(y+10).setVisible(!engaged);
  }
  paint(view:LowerView|null,feet:Point){
    const current=view?.room===this.room?view:null;
    this.drawChest(!!current?.progress.toolClaim);
    this.chestLabel?.setVisible(!!this.chestPoint&&distance(feet,this.chestPoint)<6);
    if(current===this.lastView)return;
    this.lastView=current;
    const cue=this.cue.clear();
    if(this.room!==LOWER_ROOMS[0])return;
    const engaged=current?.enemy;
    const show=!!current&&!current.progress.miteCleared;
    this.mite.setVisible(show);
    if(!show){this.miteLabel?.setVisible(false);return;}
    this.drawMite(engaged?.position??miteOrigin,!!engaged,engaged?.phase==='opening');
    const warning=engaged?.warning;
    if(warning){
      const {from,target}=warning;
      const x=pixel(target.x),y=pixel(target.y),radius=LOWER_STRIKE.radius*TILE;
      cue.lineStyle(radius*2,0xd79453,.45).lineBetween(pixel(from.x),pixel(from.y),x,y);
      cue.lineStyle(2,0x6e3928,1).strokeCircle(x,y,radius);
      cue.lineStyle(3,0x6e3928,1).lineBetween(x-7,y,x+7,y).lineBetween(x,y-7,x,y+7);
    }
    if(engaged){
      const x=pixel(engaged.position.x),y=pixel(engaged.position.y);
      cue.fillStyle(outline,1).fillRoundedRect(x-20,y-40,40,7,3);
      cue.fillStyle(0xf2dda3,1).fillRect(x-18,y-38,36*engaged.health/engaged.maxHealth,3);
      if(engaged.phase==='opening')cue.lineStyle(2,0xffe5a4,1).strokeRoundedRect(x-26,y-31,52,34,6);
    }
    if(current?.impact){
      const x=pixel(current.impact.point.x),y=pixel(current.impact.point.y)-14;
      cue.lineStyle(3,current.impact.kind==='damage'?0xf3a786:0xffdc86,1).strokeCircle(x,y,17);
    }
  }
}
