import type Phaser from 'phaser';
import {writeSmokePose,type SmokePose} from '../art/residential.ts';
export type ChimneyAnchor={plotId:string;slot:number;x:number;y:number;depth:number};
type Puff={anchor:ChimneyAnchor;image:Phaser.GameObjects.Image;phase:number;pose:SmokePose};
/** Only public house projection changes allocate quads; frame updates reuse every pose. */
export class ResidentialLife {
 private puffs:Puff[]=[];
 private generation=0;
 constructor(private scene:Phaser.Scene){}
 replace(anchors:ReadonlyArray<ChimneyAnchor>){
  for(const puff of this.puffs)puff.image.destroy();this.puffs=[];this.generation++;
  if(anchors.length>24)throw new Error('Residential life exceeds one authored block.');
  for(const anchor of anchors)for(let i=0;i<3;i++)this.puffs.push({anchor:{...anchor},image:this.scene.add.image(anchor.x,anchor.y,'residential-chimney-smoke').setDepth(anchor.depth).setAlpha(0).setVisible(false),phase:anchor.slot*.173+i/3,pose:{x:0,y:0,scale:.55,alpha:0}});
 }
 update(milliseconds:number,enabled:boolean){
  const bounds=this.scene.cameras.main.worldView;
  for(const puff of this.puffs){const a=puff.anchor,active=enabled&&a.x>bounds.left-80&&a.x<bounds.right+80&&a.y>bounds.top-80&&a.y<bounds.bottom+80;
   writeSmokePose(puff.pose,milliseconds,puff.phase,active);puff.image.setVisible(active).setPosition(a.x+puff.pose.x,a.y+puff.pose.y).setScale(puff.pose.scale).setAlpha(puff.pose.alpha);
  }
 }
 snapshot(){return{generation:this.generation,allocated:this.puffs.length,puffs:this.puffs.map(p=>({plotId:p.anchor.plotId,slot:p.anchor.slot,anchorX:p.anchor.x,anchorY:p.anchor.y,x:p.image.x,y:p.image.y,scale:p.image.scaleX,alpha:p.image.alpha,visible:p.image.visible}))};}
}
