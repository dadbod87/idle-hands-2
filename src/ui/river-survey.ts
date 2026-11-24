import {applyRiverSurvey,readRiverSurvey,RIVER_SPOT_IDS,RIVER_SPOTS,RIVER_SURVEY_KEY,type RiverAction,type RiverSpot,type RiverSurvey} from '../game/river-survey.ts';
import './river-survey.css';

import {WORKSHOP_PRINTS} from '../game/workshop-print.ts';

export function createRiverFindList(label: string): HTMLUListElement {
 const list=document.createElement('ul');
 list.className='river-survey-notebook';
 list.setAttribute('role','list');
 list.setAttribute('aria-label',label);
 return list;
}

export function updateRiverFinds(list:HTMLUListElement,recorded:readonly RiverSpot[]){
 const key=recorded.join(',');
 if(list.dataset.finds===key)return;
 list.dataset.finds=key;
 list.replaceChildren();
  for(const spot of recorded){
   const {find,note}=RIVER_SPOTS[spot],item=document.createElement('li');
   item.dataset.riverFind=spot;
   const art=document.createElement('img');art.alt='';art.width=96;art.height=80;
   art.src=WORKSHOP_PRINTS[spot].art;
   art.addEventListener('error',()=>{art.hidden=true;},{once:true});
   const copy=document.createElement('div'),name=document.createElement('strong'),caption=document.createElement('span');
   name.textContent=find;caption.textContent=note;copy.append(name,caption);
   item.append(art,copy);list.append(item);
  }
}

export function showRiverSurvey(body:HTMLElement,onSave:(action:RiverAction)=>void,walkBack:()=>void):()=>void {
 const surface=document.createElement('section');
 surface.className='river-survey';
 const title=document.createElement('h3');title.textContent='Borrow a rod';
 const intro=document.createElement('p');intro.textContent='Survey three spots. Walk away while your line is out, then come back to reel in and record what you find.';
 const sketch=document.createElement('div');sketch.className='river-survey-sketch';sketch.setAttribute('aria-hidden','true');
 const status=document.createElement('p');status.className='river-survey-status';status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='river-survey-actions';
 const back=document.createElement('button');back.type='button';back.className='destination';
 back.textContent='Walk to the old square';back.onclick=walkBack;
 const notebook=createRiverFindList('Recorded river finds');
 surface.append(title,intro,sketch,status,actions,back,notebook);
 body.append(surface);
 let busy=false,closed=false,timer:number|undefined;
 let locks:LockManager|undefined;
 try{locks=navigator.locks;}catch{/* The notebook can still be read. */}
 let note='';
 let showReceipt=false;

 function read():RiverSurvey {return readRiverSurvey(localStorage.getItem(RIVER_SURVEY_KEY));}
 function button(label:string,action:RiverAction){
  const control=document.createElement('button');control.type='button';control.className='destination';
  control.textContent=label;control.disabled=busy||!locks;
  control.onclick=()=>void act(action,control);
  return control;
 }
 async function act(action:RiverAction,control:HTMLButtonElement){
  if(busy||closed||!locks)return;
  busy=true;control.disabled=true;
  let recorded:RiverSpot|null=null;
  try{
   await locks.request(RIVER_SURVEY_KEY,()=>{
    if(closed)return;
    const result=applyRiverSurvey(read(),action,Date.now());
    const encoded=JSON.stringify(result);
    try{localStorage.setItem(RIVER_SURVEY_KEY,encoded);}
    catch(error){if(localStorage.getItem(RIVER_SURVEY_KEY)!==encoded)throw error;}
    onSave(action);
    recorded=action.kind==='reel'?action.cast.spot:null;
    showReceipt=recorded!==null;
    note=action.kind==='cast'?'Line out at '+RIVER_SPOTS[action.spot].name+'.':'Recorded in your Journal.';
   });
  }catch(error){note=error instanceof Error&&error.name==='Error'?error.message:'The notebook could not be saved. Try again when browser storage is available.';}
  finally{
   busy=false;
   if(!closed){
    render();
    const receipt=recorded?notebook.querySelector<HTMLLIElement>(`[data-river-find="${recorded}"]`):null;
    if(receipt){
     receipt.tabIndex=-1;
     receipt.focus({preventScroll:true});
     const dialog=body.closest('dialog');
     const header=dialog?.querySelector('.dialog-head');
     if(dialog&&header){
      const bounds=receipt.getBoundingClientRect();
      const visibleTop=header.getBoundingClientRect().bottom+8;
      const visibleBottom=dialog.getBoundingClientRect().bottom-8;
      if(bounds.top<visibleTop||bounds.bottom>visibleBottom)dialog.scrollTop+=bounds.top-visibleTop;
     }
    }else{
     const next=actions.querySelector<HTMLButtonElement>('button:not(:disabled)')??status;
     next.focus();
    }
   }
  }
 }
 function render(){
  window.clearTimeout(timer);
  actions.replaceChildren();
  status.tabIndex=-1;
  let state:RiverSurvey;
  try{state=read();}
  catch{updateRiverFinds(notebook,[]);status.textContent='Your river notebook could not be read. The saved entry was kept.';return;}
  updateRiverFinds(notebook,state.recorded);
  const remaining=RIVER_SPOT_IDS.filter(spot=>!state.recorded.includes(spot));
  const {cast}=state;
  const browseFinds=showReceipt&&!cast;
  const before=browseFinds?actions:null;
  if(notebook.nextElementSibling!==before)surface.insertBefore(notebook,before);
  intro.hidden=browseFinds||remaining.length===0;
  sketch.hidden=browseFinds||remaining.length===0;
  sketch.dataset.river=cast?'casting':remaining.length?'idle':'complete';
  if(!locks){status.textContent='Browser save coordination is unavailable. You can still read your notebook.';return;}
  if(cast){
   const clock=document.createElement('p');clock.className='river-survey-clock';
   const reel=button('Reel in and record', {kind:'reel',cast});
   status.textContent=note||'Line out at '+RIVER_SPOTS[cast.spot].name+'.';
   actions.append(clock,reel);
   const update=()=>{
    const seconds=Math.max(0,Math.ceil((cast.readyAt-Date.now())/1000));
    clock.textContent=seconds?'Check the float in '+seconds+' s.':'The float dipped. Your find can wait until you return.';
    reel.disabled=seconds>0||busy;
    if(seconds)timer=window.setTimeout(update,Math.min(1000,Math.max(1,cast.readyAt-Date.now())));
   };
   update();
   return;
  }
  status.textContent=remaining.length?(note||'Choose a spot to cast.'):'Survey complete. The river declines further comment.';
  for(const spot of remaining)actions.append(button('Cast at '+RIVER_SPOTS[spot].name,{kind:'cast',spot}));
 }
 function savedElsewhere(event:StorageEvent){if(!busy&&(event.key===RIVER_SURVEY_KEY||event.key===null)){note='Notebook updated in another tab.';render();}}
 window.addEventListener('storage',savedElsewhere);
 render();
 return ()=>{closed=true;window.clearTimeout(timer);window.removeEventListener('storage',savedElsewhere);};
}
