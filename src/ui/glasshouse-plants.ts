import {GLASSHOUSE_PLANTS,glasshousePlantArt,type GlasshousePlant} from '../game/glasshouse-plants.ts';
import type {TownClient} from './town-client.ts';
import './glasshouse.css';

const selection=Object.keys(GLASSHOUSE_PLANTS) as GlasshousePlant[];

export function showNurseryKeeper(body:HTMLElement,town:TownClient,atKeeper:()=>boolean,walkToTray?:()=>void){
 const resident=town.snapshot?.playerId;
 const root=document.createElement('section');
 root.className='nursery-keepsake';
 body.append(root);
 let selected:GlasshousePlant|null=null;
 let busy=false;
 let message='';
 const present=()=>root.isConnected&&town.snapshot?.playerId===resident;
 const button=(label:string,onClick:()=>void)=>{
  const control=document.createElement('button');
  control.type='button';
  control.className='destination';
  control.textContent=label;
  control.onclick=onClick;
  return control;
 };
 const plantPicture=(plant:GlasshousePlant)=>{
  const img=document.createElement('img');
  img.src=glasshousePlantArt(plant);
  img.alt='';
  img.width=96;
  img.height=96;
  return img;
 };
 const render=()=>{
  if(!present())return;
  const owned=town.snapshot?.glasshousePlant;
  root.replaceChildren();
  if(owned){
   const heading=document.createElement('h3');
   heading.textContent=GLASSHOUSE_PLANTS[owned].name;
   const note=document.createElement('p');
   note.textContent='Kept in your private collection.';
   root.append(plantPicture(owned),heading,note);
   if(town.snapshot?.inkmint){
    const tray=document.createElement('p');
    tray.textContent='The seed drawers have an Inkmint tray for your pot.';
    root.append(tray);
    if(walkToTray)root.append(button('Walk to the seed drawers',walkToTray));
   }
  }else{
   const note=document.createElement('p');
   note.textContent='Keep one plant for free. No committee vote required.';
   const variants=document.createElement('div');
   variants.className='nursery-choices';
   root.append(note,variants);
   for(const plant of selection){
    const option=button(GLASSHOUSE_PLANTS[plant].name,()=>{
     selected=plant;
     groupPress();
     refreshConfirmation();
    });
    const detail=document.createElement('small');
    detail.textContent=GLASSHOUSE_PLANTS[plant].detail;
    option.append(plantPicture(plant),detail);
    option.dataset.plant=plant;
    variants.append(option);
   }
   const confirm=button('',()=>{if(selected)void keep(selected);});
   confirm.classList.add('nursery-confirm');
   const refreshConfirmation=()=>{
    confirm.disabled=!selected||busy||!atKeeper()||town.retryAvailable;
    confirm.textContent=selected?'Keep '+GLASSHOUSE_PLANTS[selected].name+' · free':'Choose a plant';
    if(selected)confirm.prepend(plantPicture(selected));
   };
   const groupPress=()=>{for(const option of variants.querySelectorAll<HTMLButtonElement>('button')){
    option.setAttribute('aria-pressed',String(option.dataset.plant===selected));
    option.disabled=busy||town.retryAvailable;
   }};
   groupPress();
   refreshConfirmation();
   root.append(confirm);
  }
  if(town.retryAvailable)root.append(button('Retry the same request',()=>void keep()));
  const status=document.createElement('p');
  status.className='glasshouse-status';
  status.role='status';
  status.tabIndex=-1;
  status.textContent=message;
  root.append(status);
 };
 async function keep(plant?:GlasshousePlant){
  if(busy||!present()||!atKeeper())return;
  busy=true;
  message='Ask the keeper to confirm…';
  render();
  try{
   await (plant?town.command({kind:'glasshouse-keep-plant',plant},present):town.retry(present));
   message=town.lastMessage;
  }catch(error){
   message=(error as Error).message;
  }finally{
   busy=false;
   if(present()){
    render();
    const status=root.querySelector<HTMLElement>('.glasshouse-status')!;
    status.focus({preventScroll:true});
    status.scrollIntoView({block:'nearest'});
   }
  }
 }
 render();
}
