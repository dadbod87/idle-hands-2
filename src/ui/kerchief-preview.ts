import {KERCHIEF_INK,KERCHIEF_OUTLINES,KERCHIEF_TRIM} from '../art/field-kerchief.ts';
import {KERCHIEF_COLORS,type FieldKerchief} from '../game/field-appearance.ts';
import type {Point} from '../game/world.ts';

export function kerchiefPreview(){
 const svg='http://www.w3.org/2000/svg';
 const preview=document.createElementNS(svg,'svg');preview.setAttribute('viewBox','15 28 34 34');
 preview.setAttribute('role','img');
 const vest=document.createElementNS(svg,'image');
 for(const [key,value] of Object.entries({href:'/art/pumpworks/padded-vest.svg',x:15,y:28,width:34,height:34}))vest.setAttribute(key,String(value));
 const cloth=document.createElementNS(svg,'polygon'),trim=document.createElementNS(svg,'polyline');
 const points=(list:Point[])=>list.map(({x,y})=>x+','+y).join(' ');
 const swatch=(ink:number)=>'#'+ink.toString(16).padStart(6,'0');
 cloth.setAttribute('points',points(KERCHIEF_OUTLINES.south.cloth));
 cloth.setAttribute('stroke',swatch(KERCHIEF_INK));cloth.setAttribute('stroke-width','1.3');
 trim.setAttribute('points',points(KERCHIEF_OUTLINES.south.seam));trim.setAttribute('fill','none');
 trim.setAttribute('stroke',swatch(KERCHIEF_TRIM));trim.setAttribute('stroke-width','1.2');
 preview.append(vest,cloth,trim);
 return {
  element:preview,
  paint(color:FieldKerchief,wearVest=false){
   vest.style.display=wearVest?'':'none';
   const wearing=color!=='none';
   cloth.style.display=trim.style.display=wearing?'':'none';
   if(wearing)cloth.setAttribute('fill',swatch(KERCHIEF_COLORS[color].fill));
   preview.setAttribute('aria-label',wearing?KERCHIEF_COLORS[color].label+' kerchief preview':'No kerchief');
  },
 };
}
