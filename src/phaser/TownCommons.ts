import type Phaser from 'phaser';
import {COMMONS_PATHS,COMMONS_PONDS,COMMONS_STOPS,COMMONS_SHELTERS,TOWN_SIZE} from '../game/town-expansion.ts';
import {TILE} from '../game/world.ts';
/** Original world-space scenery; no scaled-up town bitmap or viewport wash. */
export function drawTownCommons(scene:Phaser.Scene){
 const occluders:Array<{image:Phaser.GameObjects.Graphics;x:number;y:number;width:number;height:number}>=[];
 const width=TOWN_SIZE.width*TILE,height=TOWN_SIZE.height*TILE;
 const base=scene.add.graphics().setDepth(-1100);base.fillStyle(0xaebc92).fillRect(0,0,width,height);
 for(let i=0;i<620;i++){
  const x=20+(i*173)%(width-40),y=20+(i*251)%(height-40);
  // Keep the accepted starter-plaza illustration intact.
  if(x<1536&&y<1536)continue;
  base.fillStyle(i%2?0xa3b487:0xb8c49c).fillEllipse(x,y,45+i%53,22+i%28);
  base.lineStyle(1,0x97aa7e,.7).lineBetween(x+5,y+8,x+8,y+3).lineBetween(x+8,y+3,x+11,y+8);
 }
 const ground=scene.add.graphics().setDepth(-990);
 for(const [x,y,w,h]of COMMONS_PATHS){ground.fillStyle(0xc6b78f).fillRoundedRect(x*TILE,y*TILE,w*TILE,h*TILE,24);ground.fillStyle(0xded0ac).fillRoundedRect(x*TILE+4,y*TILE+4,w*TILE-8,h*TILE-8,20);}
 ground.fillStyle(0x719b99).fillRect(1536,318,width-1536,68);ground.fillStyle(0x85b3ad).fillRect(1536,324,width-1536,54);
 for(let x=1541;x<width;x+=67){ground.lineStyle(2,0xb2d1c4).lineBetween(x,342,x+28,342).lineBetween(x+23,365,x+42,365);}
 for(const [x,y,w,h]of COMMONS_PONDS){ground.fillStyle(0x8d9c76).fillRoundedRect(x*TILE-12,y*TILE-12,w*TILE+24,h*TILE+24,40);ground.fillStyle(0x719b99).fillRoundedRect(x*TILE,y*TILE,w*TILE,h*TILE,30);ground.fillStyle(0x85b3ad).fillRoundedRect(x*TILE+8,y*TILE+8,w*TILE-16,h*TILE-16,25);for(let i=1;i<w-1;i+=2)ground.lineStyle(2,0xb2d1c4).lineBetween((x+i)*TILE,(y+2)*TILE,(x+i)*TILE+22,(y+2)*TILE);}
 // Hand-laid gravel, flower verges and civic shelters break up long lanes.
 for(const [x,y,w,h]of COMMONS_PATHS)for(let i=0;i<Math.ceil(w*h*2);i++){const px=(x+.2+((i*137)%997)/997*(w-.4))*TILE,py=(y+.2+((i*59)%991)/991*(h-.4))*TILE;ground.lineStyle(1,0xc4b48c,.8).lineBetween(px,py,px+3+i%4,py-1);}
 for(const [x,y]of [[54,24],[77,24],[92,30],[96,42],[72,53],[43,65],[75,76],[100,73],[31,68]]){
  ground.fillStyle(0x87986e).fillRoundedRect(x*TILE,y*TILE,112,40,15);
  for(let i=0;i<14;i++){const px=x*TILE+9+(i*23)%94,py=y*TILE+7+(i*13)%25;ground.fillStyle([0xe4c473,0xc08b91,0xa8a0bb][i%3]).fillCircle(px,py,3);}
 }
 for(const s of COMMONS_SHELTERS){const x=s.x*TILE,y=s.y*TILE,w=s.width*TILE,h=s.height*TILE,g=scene.add.graphics().setDepth(y+h);
  occluders.push({image:g,x:x-15,y:y+h,width:w+30,height:h+44});
  g.fillStyle(0x6e755b,.2).fillEllipse(x+w/2,y+h+10,w+22,35);
  g.fillStyle(0xbaa47c).fillRoundedRect(x,y+h-22,w,30,6).lineStyle(2,0x343c36).strokeRoundedRect(x,y+h-22,w,30,6);
  for(const px of [x+14,x+w-14])g.fillStyle(0x967b56).fillRect(px,y+18,8,h-30).lineStyle(2,0x343c36).strokeRect(px,y+18,8,h-30);
  g.fillStyle(s.kind==='market'?0xb57f62:0x607c70).fillTriangle(x-15,y+30,x+w/2,y-44,x+w+15,y+30).lineStyle(3,0x343c36).strokeTriangle(x-15,y+30,x+w/2,y-44,x+w+15,y+30);
  for(let i=0;i<3;i++){g.fillStyle(0xa78b62).fillRect(x+32+i*(w-60)/3,y+h-42,45,18).lineStyle(2,0x343c36).strokeRect(x+32+i*(w-60)/3,y+h-42,45,18);}
  scene.add.text(x+w/2,y+17,s.kind==='market'?'MARKET SHELTER':'PICNIC PAVILION',{fontFamily:'Georgia',fontSize:11,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:5,y:3}}).setOrigin(.5).setDepth(y+h+1);
 }
 // Small picnic clearings: distinct activity spaces, not fake purchasable lots.
 for(const [x,y]of [[62,33],[99,49],[73,71],[97,84]]){
  ground.fillStyle(0xc4c593).fillEllipse(x*TILE,y*TILE,240,160);
  const bench=scene.add.graphics().setPosition(x*TILE,y*TILE).setDepth(y*TILE);
  bench.lineStyle(3,0x343c36).fillStyle(0xa78b62).fillRoundedRect(-45,-22,90,17,3).strokeRoundedRect(-45,-22,90,17,3).fillRoundedRect(-45,-42,90,12,3).strokeRoundedRect(-45,-42,90,12,3).lineBetween(-34,-5,-34,9).lineBetween(34,-5,34,9);
 }
 for(const stop of COMMONS_STOPS){
  const x=(stop.point.x+.5)*TILE,y=(stop.point.y-1)*TILE;
  const sign=scene.add.graphics().setDepth(y);sign.fillStyle(0x967b56).fillRect(x-3,y,6,36);sign.fillStyle(0xf3e6c5).fillRoundedRect(x-56,y-26,112,30,4).lineStyle(2,0x343c36).strokeRoundedRect(x-56,y-26,112,30,4);
  scene.add.text(x,y-11,stop.name,{fontFamily:'Georgia',fontSize:12,color:'#343c36',align:'center'}).setOrigin(.5).setDepth(y+1);
 }
 for(const [x,y,text]of [[40,25,'East Commons →'],[69,20,'Riverwalk ↑'],[71,46,'Orchard →'],[49,76,'Old square ↑'],[104,76,'South meadow ↓']] as const)scene.add.text(x*TILE,y*TILE,text,{fontFamily:'Georgia',fontSize:14,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:8,y:5}}).setDepth(y*TILE);
 return occluders;
}
