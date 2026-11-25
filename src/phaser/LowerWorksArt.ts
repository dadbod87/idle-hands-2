import type Phaser from 'phaser';
import {levelFor, LANDING_BENCH, LOWER_ROOMS, type LowerRoom} from '../game/lower-pumpworks-room.ts';
import {clearedField, distance, enemyFor, LOWER_ENEMIES, LOWER_LOOT, PRESSURE_RADIUS, type LowerClaim, type LowerView} from '../game/lower-pumpworks.ts';
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
  private readonly foe:Phaser.GameObjects.Graphics;
  private readonly foeLabel:Phaser.GameObjects.Text;
  private readonly chests:Array<{kind:LowerClaim;ink:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;point:Point;claimed:boolean|null}>=[];
  private readonly enemyId:ReturnType<typeof enemyFor>;
  private lastView:LowerView|null=null;
  constructor(private readonly scene:Phaser.Scene, private readonly room:LowerRoom){
    this.floor=scene.add.graphics().setDepth(-1000);
    this.cue=scene.add.graphics().setDepth(0);
    this.foe=scene.add.graphics();
    this.enemyId=enemyFor(room);
    const enemy=LOWER_ENEMIES[this.enemyId];
    this.foeLabel=this.label(pixel(enemy.origin.x),pixel(enemy.origin.y)+16,enemy.name).setVisible(false);
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
      const claim=marker.id==='store-chest'?'tool-chest':marker.id==='kiln-chest'?'kiln-chest':marker.id==='collector-chest'?'collector-reward':null;
      if(claim)this.chests.push({
        kind:claim,point:marker.point,ink:scene.add.graphics(),label:this.label(x,y+17,LOWER_LOOT[claim].name).setVisible(false),
        claimed:null,
      });
    }
    if(room===LOWER_ROOMS[0]){
      const x=pixel(LANDING_BENCH.point.x),y=pixel(LANDING_BENCH.point.y);
      hardware(this.floor,x-26,y-23,52,19,0xa99771);
      this.floor.fillStyle(outline,1).fillRect(x-19,y-5,5,8).fillRect(x+14,y-5,5,8);
      this.label(x,y+8,LANDING_BENCH.name);
      this.drawSign({x:15.1,y:25.4},'Stores →');
      this.drawSign({x:11.4,y:20.2},'Gallery ↑');
    }else{
      this.drawSign({x:23.8,y:28.2},'Kiln →');
      this.drawSign({x:17.4,y:23.2},'Spillway ↑');
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
  private drawChests(view:LowerView|null,feet:Point){
    for(const chest of this.chests){
      const claimed=!!view?.progress[LOWER_LOOT[chest.kind].field];
      const locked=chest.kind==='collector-reward'&&!view?.progress.collectorCleared;
      const x=pixel(chest.point.x),y=pixel(chest.point.y);
      chest.label.setVisible(distance(feet,chest.point)<6);
      if(chest.claimed===claimed&&chest.label.text===(locked?'Collector’s chest · locked':LOWER_LOOT[chest.kind].name))continue;
      chest.claimed=claimed;
      chest.label.setText(locked?'Collector’s chest · locked':LOWER_LOOT[chest.kind].name);
      const ink=chest.ink.clear().setDepth(y);
      const width=chest.kind==='collector-reward'?54:44;
      hardware(ink,x-width/2,y-25,width,26,claimed?0x786952:chest.kind==='collector-reward'?0x996448:0xb28350);
      ink.fillStyle(outline,1).fillRect(x-width/2,y-15,width,4);
      if(claimed)ink.fillStyle(0x524936,1).fillRect(x-width/2+5,y-26,width-10,11);
      ink.fillStyle(locked?0xbcaa89:0xf4cc83,1).fillRect(x-4,y-17,8,9);
    }
  }
  private drawMite(feet:Point,engaged:boolean,opening:boolean){
    const x=pixel(feet.x),y=pixel(feet.y);
    const ink=this.foe.clear().setDepth(y);
    ink.fillStyle(outline,.30).fillEllipse(x,y+1,44,14);
    ink.lineStyle(4,outline,1);
    for(const side of [-1,1])for(let leg=0;leg<3;leg++)ink.lineBetween(x+side*12,y-12+leg*4,x+side*(23-leg),y-9+leg*5);
    ink.fillStyle(outline,1).fillEllipse(x,y-14,39,24);
    ink.fillStyle(opening?0xd4ae66:0x738e64,1).fillEllipse(x,y-15,32,18);
    ink.fillStyle(0xe5d894,1).fillCircle(x-6,y-11,4).fillCircle(x+6,y-11,4);
    ink.fillStyle(outline,1).fillCircle(x-6,y-10,1.6).fillCircle(x+6,y-10,1.6);
    this.foeLabel.setPosition(x,y+9).setDepth(y+10).setVisible(!engaged);
  }
  private drawCollector(feet:Point,engaged:boolean,opening:boolean){
    const x=pixel(feet.x),y=pixel(feet.y);
    const ink=this.foe.clear().setDepth(y);
    ink.fillStyle(outline,.40).fillEllipse(x,y+2,88,23);
    hardware(ink,x-33,y-62,66,55,0xa65c43);
    hardware(ink,x-39,y-31,18,28,0x555b4c);
    hardware(ink,x+21,y-31,18,28,0x555b4c);
    ink.fillStyle(outline,1).fillRoundedRect(x-22,y-56,44,24,4);
    ink.fillStyle(opening?0xf7e69a:0xe19a60,1).fillRect(x-15,y-50,30,9);
    if(opening)ink.fillStyle(0xf4d383,1).fillCircle(x,y-20,12);
    else ink.fillStyle(0x6a3d30,1).fillRoundedRect(x-17,y-29,34,16,4);
    ink.lineStyle(7,outline,1).lineBetween(x-16,y-66,x-16,y-80).lineBetween(x-16,y-80,x+7,y-80);
    ink.lineStyle(3,0xc3875e,1).lineBetween(x-16,y-66,x-16,y-80).lineBetween(x-16,y-80,x+7,y-80);
    ink.fillStyle(0xedd18e,1).fillCircle(x+9,y-80,3);
    this.foeLabel.setPosition(x,y+11).setDepth(y+13).setVisible(!engaged);
  }
  paint(view:LowerView|null,feet:Point){
    const current=view?.room===this.room?view:null;
    this.drawChests(current,feet);
    if(current===this.lastView)return;
    this.lastView=current;
    const cue=this.cue.clear();
    const engaged=current?.enemy;
    const config=LOWER_ENEMIES[this.enemyId];
    const show=!!current&&!current.progress[clearedField(this.enemyId)];
    this.foe.setVisible(show);
    if(show){
      const origin=engaged?.position??config.origin,opening=engaged?.phase==='opening'&&!current?.collectorCounterUsed;
      if(this.enemyId==='mite')this.drawMite(origin,!!engaged,opening);
      else this.drawCollector(origin,!!engaged,opening);
    }else this.foeLabel.setVisible(false);
    const warning=engaged?.warning;
    if(warning?.kind==='lunge'){
      const {from,target}=warning;
      const x=pixel(target.x),y=pixel(target.y),radius=config.radius*TILE;
      cue.lineStyle(radius*2,0xd79453,.55).lineBetween(pixel(from.x),pixel(from.y),x,y);
      cue.lineStyle(3,0x6e3928,1).strokeCircle(x,y,radius);
      cue.lineBetween(x-10,y,x+10,y).lineBetween(x,y-10,x,y+10);
    }else if(warning?.kind==='pressure'){
      const x=pixel(warning.from.x),y=pixel(warning.from.y),radius=PRESSURE_RADIUS*TILE;
      cue.fillStyle(0xe6a458,.40).fillCircle(x,y,radius);
      cue.lineStyle(5,0x652e27,1).strokeCircle(x,y,radius);
      cue.lineStyle(2,0xffe9b3,1).strokeCircle(x,y,radius-6).strokeCircle(x,y,radius-13);
    }
    if(engaged){
      const x=pixel(engaged.position.x),y=pixel(engaged.position.y),collector=engaged.id==='collector';
      const meter=collector?68:36,meterY=y-(collector?94:40);
      cue.fillStyle(outline,1).fillRoundedRect(x-meter/2-2,meterY,meter+4,7,3);
      cue.fillStyle(0xf2dda3,1).fillRect(x-meter/2,meterY+2,meter*engaged.health/engaged.maxHealth,3);
      if(engaged.phase==='opening'&&!current?.collectorCounterUsed){
        const w=collector?84:52,h=collector?83:34;
        cue.lineStyle(2,0xffe5a4,1).strokeRoundedRect(x-w/2,y-h+3,w,h,6);
      }
    }
    if(current?.impact){
      const x=pixel(current.impact.point.x),y=pixel(current.impact.point.y)-14;
      const radius=current.impact.kind==='clear'?25:17;
      cue.lineStyle(3,current.impact.kind==='damage'?0xf3a786:0xffdc86,1).strokeCircle(x,y,radius);
    }
  }
}
