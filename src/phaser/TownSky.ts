import Phaser from 'phaser';
import {climateAt,type TownClimate} from '../game/town-climate.ts';

/** Disposable local presentation. No progress, commands, clocks or network writes. */
export class TownSky {
 private shade:Phaser.GameObjects.Rectangle;
 private lamps:Phaser.GameObjects.Graphics;
 private rain:Phaser.GameObjects.Graphics;
 private width=0;
 private height=0;
 private offset=0;
 private enabled=false;
 private state:TownClimate=climateAt(0);
 private effectiveAlpha=0;
 private fixture=false;
 private interior=false;
 private lastSecond=-1;
 constructor(private scene:Phaser.Scene,private windows:Array<{x:number;y:number;width:number;height:number}>){
  this.shade=scene.add.rectangle(0,0,1,1,0,0).setOrigin(0).setScrollFactor(0).setDepth(1_000_000);
  this.lamps=scene.add.graphics().setDepth(1_000_001);
  this.rain=scene.add.graphics().setScrollFactor(0).setDepth(1_000_002);
 }
 update(now:number,delta:number,interior:boolean,motion:boolean,fixture:TownClimate|null){
  const width=this.scene.scale.width,height=this.scene.scale.height;
  if(width!==this.width||height!==this.height){this.width=width;this.height=height;this.shade.setSize(width,height);this.rain.clear().lineStyle(1,0xc2d0d1,.22);
   // One repeating batch, not individual particles or simulation objects.
   for(let x=18;x<width+24;x+=72)for(let y=-96;y<height+96;y+=96){const xx=x+(Math.floor(x/72)%3)*11;this.rain.lineBetween(xx,y,xx-2,y+7);}
  }
  const second=Math.floor(now/1000);
  if(second!==this.lastSecond||interior!==this.interior||!!fixture!==this.fixture){
   this.lastSecond=second;this.interior=interior;this.fixture=!!fixture;this.state=fixture??climateAt(now);
   this.effectiveAlpha=this.state.tint.alpha*(interior?.25:1);this.shade.setFillStyle(this.state.tint.color,this.effectiveAlpha);
   this.lamps.clear();if(!interior&&this.state.lampStrength>0){for(const box of this.windows){this.lamps.fillStyle(0xf8d889,this.state.lampStrength*.5).fillRect(box.x,box.y,box.width,box.height);this.lamps.lineStyle(3,0xf2c568,this.state.lampStrength*.18).strokeRect(box.x-1,box.y-1,box.width+2,box.height+2);}}
  }
  this.motion(delta,motion);
 }
 motion(delta:number,motion:boolean){
  this.enabled=motion&&!this.interior&&this.state.weather==='drizzle';
  if(this.enabled)this.offset=(this.offset+Math.max(0,Math.min(50,delta))*.055)%96;else this.offset=0;
  this.rain.setVisible(this.enabled).setPosition(0,this.offset);
 }
 snapshot(){return {...this.state,tint:{...this.state.tint},effectiveAlpha:this.effectiveAlpha,fixture:this.fixture,interior:this.interior,precipitation:{enabled:this.enabled,offset:this.offset}};}
}
