import type Phaser from 'phaser';
import {COMMONS_PONDS} from '../game/town-expansion.ts';
import {commonsWingPose} from '../art/commons-life.ts';
/** Six ambient butterflies and slow water detail, all anchored to the world.
 * One bounded Graphics buffer at <=10Hz; no network, wall clock or game state. */
export class TownCommonsLife{
 private view:Phaser.GameObjects.Graphics;private bucket=-1;private draws=0;private enabled=false;private ms=0;
 constructor(scene:Phaser.Scene){this.view=scene.add.graphics().setDepth(-980);}
 update(ms:number,enabled:boolean){
  const bucket=enabled?Math.floor(ms/100):0;if(bucket===this.bucket&&enabled===this.enabled)return;
  this.bucket=bucket;this.enabled=enabled;this.ms=enabled?ms:0;this.draws++;this.view.clear();
  if(!enabled)return;
  // Small elliptical rings stay well inside the existing water footprints.
  for(const [n,[x,y,w,h]]of COMMONS_PONDS.entries())for(let i=0;i<3;i++){
   const phase=(ms/3200+i*.31+n*.17)%1,cx=(x+2+i*(w-4)/3)*32,cy=(y+2+(i%2)*(h-4))*32;
   this.view.lineStyle(1.5,0xc1d7c3,(1-phase)*.55).strokeEllipse(cx,cy,10+phase*28,3+phase*9);
  }
  for(const [i,p]of commonsWingPose(ms,true).entries()){
   this.view.fillStyle(i%2?0xd6ba72:0xc2a3b5,.85).fillEllipse(p.x-p.wing*.6,p.y,p.wing*1.5,4).fillEllipse(p.x+p.wing*.6,p.y,p.wing*1.5,4);
   this.view.lineStyle(1,0x536653,.8).lineBetween(p.x,p.y-2,p.x,p.y+2);
  }
 }
 snapshot(){return{enabled:this.enabled,draws:this.draws,bucket:this.bucket,butterflies:this.enabled?commonsWingPose(this.ms,true):[],worldAnchored:true,maxHz:10};}
}
