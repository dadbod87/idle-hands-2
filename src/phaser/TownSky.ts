import type Phaser from 'phaser';
import {climateAt,type TownClimate} from '../game/town-climate.ts';

/** Disposable compositor layers. No progress, commands, clocks or network writes. */
export class TownSky {
 private overlay:HTMLDivElement;
 private shade:HTMLDivElement;
 private lamps:HTMLDivElement;
 private rain:HTMLDivElement;
 private offset=0;
 private enabled=false;
 private state:TownClimate=climateAt(0);
 private effectiveAlpha=0;
 private fixture=false;
 private interior=false;
 private lastSecond=-1;
 private cameraX=NaN;
 private cameraY=NaN;
 constructor(private scene:Phaser.Scene,windows:Array<{x:number;y:number;width:number;height:number}>){
  this.overlay=document.createElement('div');this.overlay.className='town-sky-overlay';this.overlay.setAttribute('aria-hidden','true');
  // Keep this stacking context inside #world, beneath later location/guide DOM.
  // CSS compositing avoids a full-viewport alpha pass in each WebGL context.
  this.overlay.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict;isolation:isolate;';
  this.shade=document.createElement('div');this.shade.style.cssText='position:absolute;inset:0;';
  this.lamps=document.createElement('div');this.lamps.style.cssText='position:absolute;left:0;top:0;pointer-events:none;';
  for(const box of windows){
   const fill=document.createElement('div');fill.style.cssText=`position:absolute;left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;background:var(--lamp-fill);`;
   const edge=document.createElement('div');edge.style.cssText=`position:absolute;left:${box.x-2.5}px;top:${box.y-2.5}px;width:${box.width+5}px;height:${box.height+5}px;border:3px solid var(--lamp-edge);box-sizing:border-box;`;
   this.lamps.append(fill,edge);
  }
  this.rain=document.createElement('div');
  const pattern='<svg xmlns="http://www.w3.org/2000/svg" width="216" height="96" viewBox="0 0 216 96"><path d="M18 0l-2 7M101 0l-2 7M184 0l-2 7" fill="none" stroke="#c2d0d1" stroke-opacity=".22" stroke-width="1"/></svg>';
  // One cached repeating bitmap; only its compositor transform changes per frame.
  this.rain.style.cssText=`position:absolute;left:0;right:0;top:-96px;bottom:-96px;background-image:url("data:image/svg+xml,${encodeURIComponent(pattern)}");background-repeat:repeat;background-size:216px 96px;visibility:hidden;will-change:transform;`;
  this.overlay.append(this.shade,this.lamps,this.rain);
  scene.game.canvas.parentElement!.append(this.overlay);
  scene.events.once('shutdown',()=>this.overlay.remove());
  // Camera follow updates inside cameras.render; align DOM glows afterwards,
  // before this animation frame is composited by the browser.
  const align=()=>this.alignCamera();scene.events.on('render',align);
  scene.events.once('shutdown',()=>scene.events.off('render',align));
 }
 private alignCamera(){const camera=this.scene.cameras.main;if(camera.scrollX!==this.cameraX||camera.scrollY!==this.cameraY){this.cameraX=camera.scrollX;this.cameraY=camera.scrollY;this.lamps.style.transform=`translate(${-this.cameraX}px,${-this.cameraY}px)`;}}
 update(now:number,delta:number,interior:boolean,motion:boolean,fixture:TownClimate|null){
  const second=Math.floor(now/1000);
  if(second!==this.lastSecond||interior!==this.interior||!!fixture!==this.fixture){
   this.lastSecond=second;this.interior=interior;this.fixture=!!fixture;this.state=fixture??climateAt(now);
   this.effectiveAlpha=this.state.tint.alpha*(interior?.25:1);
   const color=this.state.tint.color;this.shade.style.backgroundColor=`rgba(${(color>>16)&255},${(color>>8)&255},${color&255},${this.effectiveAlpha})`;
   this.lamps.hidden=interior||this.state.lampStrength<=0;
   this.lamps.style.setProperty('--lamp-fill',`rgba(248,216,137,${this.state.lampStrength*.5})`);
   this.lamps.style.setProperty('--lamp-edge',`rgba(242,197,104,${this.state.lampStrength*.18})`);
  }
  this.alignCamera();this.motion(delta,motion);
 }
 motion(delta:number,motion:boolean){
  this.enabled=motion&&!this.interior&&this.state.weather==='drizzle';
  if(this.enabled)this.offset=(this.offset+Math.max(0,Math.min(50,delta))*.055)%96;else this.offset=0;
  this.rain.style.visibility=this.enabled?'visible':'hidden';this.rain.style.transform=`translateY(${this.offset}px)`;
 }
 snapshot(){return {...this.state,tint:{...this.state.tint},effectiveAlpha:this.effectiveAlpha,fixture:this.fixture,interior:this.interior,precipitation:{enabled:this.enabled,offset:this.offset}};}
}
