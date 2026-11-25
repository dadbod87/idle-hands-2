import {INKMINT_FINISH,type InkmintAction} from '../game/nursery-inkmint.ts';
import {GLASSHOUSE_PLANTS,glasshousePlantArt,type GlasshousePlant} from '../game/glasshouse-plants.ts';
import type {TownClient} from './town-client.ts';
import './glasshouse.css';

export function showHomeWindowsill(body:HTMLElement,town:TownClient,plotId:string,atSill:()=>boolean){
 const resident=town.snapshot?.playerId;
 const view=document.createElement('section');
 view.className='nursery-keepsake';
 view.dataset.homeWindowsill=plotId;
 body.append(view);
 let statusText='',busy=false;
 let previous='';
 const present=()=>view.isConnected&&town.snapshot?.playerId===resident&&atSill();
 function render(){
  if(!present())return;
  const snapshot=town.snapshot!;
  const plot=snapshot.plots.find(item=>item.id===plotId);
  const isOwner=!!plot&&plot.ownerId===resident;
  const plant:GlasshousePlant|undefined=isOwner?snapshot.glasshousePlant:plot?.windowsillPlant;
  view.replaceChildren();
  if(!plant)return;
  const art=document.createElement('img');
  const striped=isOwner?snapshot.inkmint?.phase==='applied':plot?.windowsillStriped===true;
  previous=String(plant)+':'+String(striped);
  art.src=glasshousePlantArt(plant,striped);
  art.alt='';
  art.decoding='sync';
  art.width=96;
  art.height=96;
  const title=document.createElement('h3');
  title.textContent=GLASSHOUSE_PLANTS[plant].name;
  const detail=document.createElement('p');
  detail.textContent=GLASSHOUSE_PLANTS[plant].detail;
  detail.className='windowsill-flavor';
  const summary=document.createElement('div');
  summary.className='windowsill-summary';
  const copy=document.createElement('div');
  copy.append(title,detail);
  if(striped){
   const finish=document.createElement('p');
   finish.textContent=INKMINT_FINISH+' on the pot.';
   copy.append(finish);
  }
  summary.append(art,copy);
  view.append(summary);
  const consent=document.createElement('p');
  consent.className='windowsill-consent';
  if(isOwner){
   consent.textContent=plot?.windowsillPlant?'On display for visitors.':'Private in your collection.';
   copy.append(consent);
   const button=document.createElement('button');
   button.type='button';
   button.className='destination';
   const retry=town.retryAvailable;
   button.textContent=retry?'Retry the same request':plot?.windowsillPlant?'Return plant to my collection':'Display plant for visitors';
   button.disabled=busy||town.isSaving;
   button.onclick=()=>void save(retry?null:!plot?.windowsillPlant);
   view.append(button);
   if(!retry&&(snapshot.inkmint?.phase==='mixed'||snapshot.inkmint?.phase==='applied')){
    const finish=document.createElement('button');
    finish.type='button';
    finish.className='destination';
    finish.textContent=striped?'Restore original pot':'Apply Inkmint stripe';
    finish.disabled=busy||town.isSaving;
    finish.onclick=()=>void save(striped?'remove':'apply');
    view.append(finish);
   }
  }
  const status=document.createElement('p');
  status.className='glasshouse-status';
  status.role='status';
  status.tabIndex=-1;
  status.textContent=statusText;
  view.append(status);
 }
 async function save(change:boolean|Extract<InkmintAction,'apply'|'remove'>|null){
  if(busy||!present()||town.snapshot?.plots.find(plot=>plot.id===plotId)?.ownerId!==resident)return;
  busy=true;
  statusText='Confirming with the town…';
  render();
  try{
   if(change===null)await town.retry(present);
   else if(typeof change==='boolean')await town.command({kind:'glasshouse-display-plant',plotId,display:change},present);
   else await town.command({kind:'glasshouse-inkmint',action:change},present);
   statusText=town.lastMessage;
  }catch(error){
   statusText=(error as Error).message;
  }finally{
   busy=false;
   if(present()){
    render();
    const status=view.querySelector<HTMLElement>('[role=status]');
    status?.focus({preventScroll:true});
    status?.scrollIntoView({block:'nearest'});
   }
  }
 }
 const unsubscribe=town.subscribe(snapshot=>{
  if(busy||!present()||snapshot.plot?.id===plotId)return;
  const plot=snapshot.plots.find(item=>item.id===plotId);
  const next=String(plot?.windowsillPlant)+':'+String(plot?.windowsillStriped===true);
  if(next!==previous)render();
 });
 render();
 return unsubscribe;
}
