import {applyRiverSurvey,readRiverSurvey,RIVER_SPOT_IDS,RIVER_SPOTS,RIVER_SURVEY_KEY,type RiverAction,type RiverSurvey} from '../game/river-survey.ts';
import './river-survey.css';

export function showRiverSurvey(body:HTMLElement,onSave:()=>void):()=>void {
 const surface=document.createElement('section');
 surface.className='river-survey';
 const title=document.createElement('h3');title.textContent='Borrow a rod';
 const intro=document.createElement('p');intro.textContent='Survey three spots. Walk away while your line is out, then come back to reel in and record what you find.';
 const sketch=document.createElement('div');sketch.className='river-survey-sketch';sketch.setAttribute('aria-hidden','true');
 const status=document.createElement('p');status.className='river-survey-status';status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='river-survey-actions';
 const notebook=document.createElement('ul');notebook.className='river-survey-notebook';notebook.setAttribute('aria-label','Recorded river finds');
 surface.append(title,intro,sketch,status,actions,notebook);
 body.append(surface);
 let busy=false,closed=false,timer:number|undefined;
 let locks:LockManager|undefined;
 try{locks=navigator.locks;}catch{/* The notebook can still be read. */}
 let note='';

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
  try{
   await locks.request(RIVER_SURVEY_KEY,()=>{
    if(closed)return;
    const result=applyRiverSurvey(read(),action,Date.now());
    const encoded=JSON.stringify(result);
    try{localStorage.setItem(RIVER_SURVEY_KEY,encoded);}
    catch(error){if(localStorage.getItem(RIVER_SURVEY_KEY)!==encoded)throw error;}
    onSave();
    note=action.kind==='cast'?'Line out at '+RIVER_SPOTS[action.spot].name+'.':'Recorded '+RIVER_SPOTS[action.cast.spot].find.toLowerCase()+'.';
   });
  }catch(error){note=error instanceof Error&&error.name==='Error'?error.message:'The notebook could not be saved. Try again when browser storage is available.';}
  finally{
   busy=false;
   if(!closed){
    render();
    const focus=actions.querySelector<HTMLButtonElement>('button:not(:disabled)');
    if(focus)focus.focus();else status.focus();
   }
  }
 }
 function render(){
  window.clearTimeout(timer);
  actions.replaceChildren();notebook.replaceChildren();
  status.tabIndex=-1;
  let state:RiverSurvey;
  try{state=read();}
  catch{status.textContent='Your river notebook could not be read. The saved entry was kept.';return;}
  for(const spot of state.recorded){
   const {find,note}=RIVER_SPOTS[spot],item=document.createElement('li');
   const name=document.createElement('strong');name.textContent=find;item.append(name,document.createTextNode(' · '+note));notebook.append(item);
  }
  const remaining=RIVER_SPOT_IDS.filter(spot=>!state.recorded.includes(spot));
  const {cast}=state;
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
