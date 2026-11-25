import {glasshousePlantArt,type GlasshousePlant} from '../game/glasshouse-plants.ts';
import {INKMINT_FINISH, type InkmintAction} from '../game/nursery-inkmint.ts';
import type {TownClient} from './town-client.ts';
import './glasshouse.css';

function potPreview(plant:GlasshousePlant){
 const comparison=document.createElement('div');
 comparison.className='inkmint-pot-preview';
 for(const striped of [false,true]){
  const figure=document.createElement('figure');
  const art=document.createElement('img');
  art.src=glasshousePlantArt(plant,striped);
  art.alt='';
  art.width=56;
  art.height=65;
  const label=document.createElement('figcaption');
  label.textContent=striped?INKMINT_FINISH:'Original pot';
  figure.append(art,label);
  comparison.append(figure);
 }
 return comparison;
}

export function showInkmint(
 body:HTMLElement, town:TownClient, station:'tray'|'pottery', atStation:()=>boolean, walk:()=>void, walkHome?:()=>void,
){
 const resident=town.snapshot?.playerId;
 const view=document.createElement('section');
 view.className='nursery-keepsake';
 body.append(view);
 let busy=false, active=true, message='';
 let deadline:number|undefined;
 const present=()=>active&&view.isConnected&&town.snapshot?.playerId===resident&&atStation();
 const paragraph=(text:string)=>{const p=document.createElement('p');p.textContent=text;return p;};
 const button=(label:string,onClick:()=>void)=>{
  const control=document.createElement('button');
  control.type='button';
  control.className='destination';
  control.textContent=label;
  control.disabled=busy||town.isSaving;
  control.onclick=onClick;
  return control;
 };
 function render(){
  window.clearTimeout(deadline);
  if(!present())return;
  const state=town.snapshot?.inkmint;
  view.replaceChildren();
  if(!state){
   view.append(paragraph('Choose a keepsake plant from the nursery keeper to start an Inkmint tray.'));
   return;
  }
  const status=paragraph(message);
  status.className='glasshouse-status';
  status.role='status';
  status.tabIndex=-1;
  let control:HTMLButtonElement|undefined;
  if(town.retryAvailable)control=button('Retry the same request',()=>void send());
  if(station==='tray'){
   if(state.phase==='empty'){
    view.append(paragraph('Plant a free Inkmint seed. It makes one green pigment in 24 hours.'));
    control??=button('Plant Inkmint · free',()=>void send('plant'));
   }else if(state.phase==='growing'){
    const remaining=state.readyAt-town.serverNow();
    if(remaining<=0){
     view.append(paragraph('Inkmint is ready. It will wait in the tray until you collect it.'));
     control??=button('Collect one Inkmint pigment',()=>void send('collect'));
    }else{
     const date=new Date(state.readyAt).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'});
     view.append(paragraph('Inkmint is growing. Ready '+date+'.'));
     deadline=window.setTimeout(render,Math.min(2147483647,Math.max(100,remaining+25)));
    }
   }else if(state.phase==='collected'){
    view.append(paragraph('One pigment collected. Turn it into a stripe at the pottery ledge.'));
    control??=button('Walk to the pottery ledge',walk);
   }else view.append(paragraph('Your stripe is made. Change the pot at your home windowsill.'));
  }else if(state.phase==='collected'){
   view.append(paragraph('Use one Inkmint pigment for a green stripe on either keepsake pot.'));
   control??=button('Make Inkmint stripe · 1 pigment',()=>void send('mix'));
  }else if(state.phase==='mixed'||state.phase==='applied'){
   view.append(paragraph(INKMINT_FINISH+' is available for your pot at home.'));
   if(walkHome)control??=button('Find your windowsill',walkHome);
  }else{
   view.append(paragraph('Grow and collect an Inkmint pigment at the seed drawers.'));
   control??=button('Walk to the seed drawers',walk);
  }
  const plant=town.snapshot?.glasshousePlant;
  if(station==='pottery'&&plant&&['collected','mixed','applied'].includes(state.phase))view.append(potPreview(plant));
  if(control)view.append(control);
  view.append(status);
 }
 async function send(action?:InkmintAction){
  if(busy||!present())return;
  busy=true;
  message='Confirming with the town…';
  render();
  try{
   await (action?town.command({kind:'glasshouse-inkmint',action},present):town.retry(present));
   message=town.lastMessage;
  }catch(error){message=(error as Error).message;}
  finally{
   busy=false;
   if(present()){
    render();
    view.querySelector<HTMLElement>('[role=status]')?.focus({preventScroll:true});
   }
  }
 }
 render();
 return ()=>{active=false;window.clearTimeout(deadline);};
}
