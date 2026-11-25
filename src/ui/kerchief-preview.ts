import {residentArt} from '../art/variety.ts';
import type {Headwear} from '../art/headwear.ts';
import {KERCHIEF_RIG_WIDTH,KERCHIEF_INK,KERCHIEF_OUTLINES,KERCHIEF_TRIM} from '../art/field-kerchief.ts';
import {KERCHIEF_COLORS,KERCHIEF_DYES,KERCHIEF_TIES,type FieldKerchief,type KerchiefTie} from '../game/field-appearance.ts';
import type {Point} from '../game/world.ts';

export type OutfitLook={rig:string;headwear:Headwear|null};
export function kerchiefPreview(look?:OutfitLook){
 const svg='http://www.w3.org/2000/svg';
 const preview=document.createElementNS(svg,'svg');
 preview.setAttribute('viewBox',look?'7 0 50 80':'15 28 34 34');
 preview.setAttribute('role','img');
 const sheet=(path:string,width:number,height:number,x=0,y=0)=>{
  const sprite=document.createElementNS(svg,'image');
  for(const [key,value] of Object.entries({href:path,x,y,width,height}))sprite.setAttribute(key,String(value));
  return sprite;
 };
 const rig=look?residentArt(look.rig):null;
 if(rig){
  preview.classList.add('outfit-preview');
  const character=sheet('/art/variety/resident-'+rig+'.svg',1792,80);
  character.dataset.outfitLayer='base';
  preview.append(character);
 }
 const vest=rig?sheet('/art/pumpworks/padded-vest-poses.svg',256,80):sheet('/art/pumpworks/padded-vest.svg',34,34,15,28);
 vest.dataset.outfitLayer='armor';
 const clothes=document.createElementNS(svg,'g');
 clothes.dataset.outfitLayer='clothing';
 if(rig){
  const transform='translate(32 0) scale('+KERCHIEF_RIG_WIDTH[rig]+' 1) translate(-32 0)';
  vest.setAttribute('transform',transform);
  clothes.setAttribute('transform',transform);
 }
 const cloth=document.createElementNS(svg,'polygon'),trim=document.createElementNS(svg,'polyline');
 const points=(list:Point[])=>list.map(({x,y})=>x+','+y).join(' ');
 const swatch=(ink:number)=>'#'+ink.toString(16).padStart(6,'0');
 cloth.setAttribute('stroke',swatch(KERCHIEF_INK));cloth.setAttribute('stroke-width','1.3');
 trim.setAttribute('fill','none');
 trim.setAttribute('stroke',swatch(KERCHIEF_TRIM));trim.setAttribute('stroke-width','1.2');
 clothes.append(cloth,trim);
 preview.append(vest,clothes);
 if(look?.headwear){
  const headwear=sheet('/art/headwear/'+look.headwear+'.svg',1792,80);
  headwear.dataset.outfitLayer='headwear';
  preview.append(headwear);
 }
 return {
  element:preview,
  paint(color:FieldKerchief,wearVest=false,tie:KerchiefTie='knot'){
   vest.style.display=wearVest?'':'none';
   const wearing=color!=='none';
   cloth.style.display=trim.style.display=wearing?'':'none';
   if(wearing){
    const shape=KERCHIEF_OUTLINES[tie].south;
    cloth.setAttribute('points',points(shape.cloth));
    trim.setAttribute('points',points(shape.seam));
    cloth.setAttribute('fill',swatch(KERCHIEF_COLORS[color].fill));
   }
   preview.dataset.tie=tie;
   preview.setAttribute('aria-label',wearing?KERCHIEF_COLORS[color].label+' kerchief preview':'No kerchief');
  },
 };
}


export function kerchiefDyePicker(color:FieldKerchief,worn:boolean,initialTie:KerchiefTie='knot'){
 const colorLabel=document.createElement('label');colorLabel.textContent='Kerchief color';
 const select=document.createElement('select');
 const placeholder=new Option('Choose a dye','none');placeholder.disabled=true;
 select.append(placeholder);
 for(const dye of KERCHIEF_DYES)select.append(new Option(KERCHIEF_COLORS[dye].label,dye));
 select.value=color;
 colorLabel.append(select);
 const tieLabel=document.createElement('label');tieLabel.textContent='Kerchief tie';
 const style=document.createElement('select');
 style.append(new Option('Knot','knot'),new Option('Wrap','wrap'));
 style.value=initialTie;
 tieLabel.append(style);
 const row=document.createElement('div');row.className='sewing-pickers';row.append(colorLabel,tieLabel);
 const wearLabel=document.createElement('label');wearLabel.className='sewing-wear';
 const wear=document.createElement('input');wear.type='checkbox';wear.checked=color==='none'||worn;
 wearLabel.append(wear,' Wear kerchief');
 return {row,select,style,wearLabel,wear,tie:()=>KERCHIEF_TIES.find(tie=>tie===style.value)??'knot',dye:()=>KERCHIEF_DYES.find(dye=>dye===select.value)};
}
