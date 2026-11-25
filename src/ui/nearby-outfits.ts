import {headwearName,isHeadwear} from '../art/headwear.ts';
import {KERCHIEF_COLORS,KERCHIEF_TIE_NAMES,validKerchief} from '../game/field-appearance.ts';
import type {Point} from '../game/world.ts';
import {kerchiefPreview} from './kerchief-preview.ts';
import type {MapResident} from './town-map.ts';
import './nearby-outfits.css';

const radius=7;
export function nearbyOutfits(
 peers:readonly MapResident[]|null|undefined,room:string,feet:Point,
){
 return (peers??[]).filter(peer=>!!peer.id&&peer.room===room
  &&Math.hypot(peer.position?.x-feet.x,peer.position?.y-feet.y)<=radius
  &&(isHeadwear(peer.headwear)||validKerchief(peer.kerchief)&&peer.kerchief!=='none'));
}

export function nearbyOutfitList(room:string,position:Point,inspect:(id:string)=>void){
 const section=document.createElement('details');
 section.className='places-group nearby-outfits';
 const summary=document.createElement('summary');
 summary.textContent='Nearby outfits';
 summary.tabIndex=0;
 const choices=document.createElement('div');
 section.append(summary,choices);
 let shown='';
 return {section,update(peers:readonly MapResident[]|null|undefined){
  const residents=nearbyOutfits(peers,room,position).slice(0,12);
  const key=JSON.stringify(residents.map(({id,name})=>[id,name]));
  if(key===shown)return;
  shown=key;
  const wasFocused=section.contains(document.activeElement);
  choices.replaceChildren(...residents.map(peer=>{
   const button=document.createElement('button');
   button.className='destination';button.type='button';
   button.textContent='See '+peer.name+'’s outfit';
   button.onclick=()=>inspect(peer.id!);
   return button;
  }));
  section.hidden=residents.length===0;
  if(wasFocused&&!section.hidden)summary.focus();
  if(wasFocused&&section.hidden)section.closest('dialog')?.querySelector<HTMLElement>('.dialog-head button')?.focus();
 }};
}

export function residentOutfit(body:HTMLElement,back:()=>void){
 const section=document.createElement('section');
 section.className='resident-outfit';
 const appearance=document.createElement('div');
 const itemList=document.createElement('ul');
 const status=document.createElement('p');
 status.role='status';
 const go=document.createElement('button');
 go.type='button';go.className='destination';go.textContent='Back to Places';go.onclick=back;
 section.append(appearance,itemList,status,go);body.append(section);
 return (peer:MapResident|undefined)=>{
  if(!section.isConnected)return;
  const hat=isHeadwear(peer?.headwear)?peer.headwear:null;
  const color=validKerchief(peer?.kerchief)?peer.kerchief:'none';
  const tie=peer?.kerchiefTie==='wrap'?'wrap':'knot';
  const state=peer?JSON.stringify([peer.id,peer.name,hat,color,tie]):'away';
  if(state===section.dataset.outfit)return;
  section.dataset.outfit=state;
  appearance.replaceChildren();itemList.replaceChildren();
  status.textContent=peer?'':'This resident has moved away or packed their outfit.';
  if(!peer)return;
  const preview=kerchiefPreview({rig:peer.id!,headwear:hat});
  preview.paint(color,null,tie);
  preview.element.setAttribute('aria-label',peer.name+'’s outfit');
  appearance.append(preview.element);
  for(const name of [
   ...(hat?[headwearName[hat]]:[]),
   ...(color!=='none'?[KERCHIEF_COLORS[color].label+' · '+KERCHIEF_TIE_NAMES[tie]]:[]),
  ]){
   const item=document.createElement('li');item.textContent=name;itemList.append(item);
  }
 };
}
