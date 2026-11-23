import type Phaser from 'phaser';
import type {RiverSpot,RiverSurvey} from '../game/river-survey.ts';
import {COMMONS_PONDS} from '../game/town-expansion.ts';
import {commonsWingPose} from '../art/commons-life.ts';
const floatPoints:Record<RiverSpot,{x:number;y:number}>={
 reeds:{x:2310,y:371},
 bridge:{x:2256,y:349},
 riffle:{x:2346,y:359},
};

/** World-anchored scenery at no more than ten redraws a second.
 * The optional float only reflects a confirmed browser-practice cast. */
export class TownCommonsLife{
 private view:Phaser.GameObjects.Graphics;private bucket=-1;private draws=0;private enabled=false;private ms=0;
 private floatView?:Phaser.GameObjects.Graphics;
 private floatFrame='';
 private riverFloat:{spot:RiverSpot;x:number;y:number;ready:boolean;motion:boolean;offset:number}|null=null;
 constructor(scene:Phaser.Scene){this.view=scene.add.graphics().setDepth(-980);}
 showRiverFloat(cast:RiverSurvey['cast'],camera:Phaser.Geom.Rectangle,ms:number,motion:boolean){
  const point=cast?floatPoints[cast.spot]:null;
  if(!cast||!point||!camera.contains(point.x,point.y)||document.hidden){
   if(this.floatView?.visible)this.floatView.setVisible(false);
   this.riverFloat=null;
   this.floatFrame='';
   return;
  }
  const ready=Date.now()>=cast.readyAt;
  const frame=motion?Math.floor(ms/120)%12:0;
  const key=cast.spot+':'+ready+':'+frame+':'+motion;
  if(this.floatFrame===key)return;
  this.floatFrame=key;
  const view=this.floatView??=this.view.scene.add.graphics().setDepth(-979);
  const offset=motion?Math.sin(frame*Math.PI/6)*1.7:0;
  view.setPosition(point.x,point.y).setVisible(true).clear();
  view.lineStyle(1.6,0xd5e6bf,.8).strokeEllipse(0,1,17+frame/2,7+frame/4);
  view.fillStyle(0xf3ddb4).fillRoundedRect(-4,-9+offset,8,13,3);
  view.fillStyle(0xbf704e).fillRoundedRect(-4,-9+offset,8,6,2);
  view.lineStyle(1.5,0x4e5945).strokeRoundedRect(-4,-9+offset,8,13,3);
  if(ready)view.lineStyle(2,0xffedb9,.95).lineBetween(-10,-10,-14,-14).lineBetween(10,-10,14,-14);
  this.riverFloat={spot:cast.spot,...point,ready,motion,offset};
 }
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
 snapshot(){return{riverFloat:this.riverFloat,enabled:this.enabled,draws:this.draws,bucket:this.bucket,butterflies:this.enabled?commonsWingPose(this.ms,true):[],worldAnchored:true,maxHz:10};}
}
