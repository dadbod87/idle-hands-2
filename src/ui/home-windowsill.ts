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
  art.src=glasshousePlantArt(plant);
  art.alt='';
  art.width=96;
  art.height=96;
  const title=document.createElement('h3');
  title.textContent=GLASSHOUSE_PLANTS[plant].name;
  const detail=document.createElement('p');
  detail.textContent=GLASSHOUSE_PLANTS[plant].detail;
  view.append(art,title,detail);
  const consent=document.createElement('p');
  if(isOwner){
   consent.textContent=plot?.windowsillPlant?'On display for visitors.':'Private in your collection.';
   view.append(consent);
   const button=document.createElement('button');
   button.type='button';
   button.className='destination';
   const retry=town.retryAvailable;
   button.textContent=retry?'Retry the same request':plot?.windowsillPlant?'Return plant to my collection':'Display plant for visitors';
   button.disabled=busy||town.isSaving;
   button.onclick=()=>void save(retry?null:!plot?.windowsillPlant);
   view.append(button);
  }
  const status=document.createElement('p');
  status.className='glasshouse-status';
  status.role='status';
  status.tabIndex=-1;
  status.textContent=statusText;
  view.append(status);
 }
 async function save(display:boolean|null){
  if(busy||!present()||town.snapshot?.plots.find(plot=>plot.id===plotId)?.ownerId!==resident)return;
  busy=true;
  statusText='Confirming with the town…';
  render();
  try{
   await (display===null?town.retry(present):town.command({kind:'glasshouse-display-plant',plotId,display},present));
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
 render();
}
