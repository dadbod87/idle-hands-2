import {kerchiefPreview} from './kerchief-preview.ts';
import {TAILOR_COST,TAILOR_MS,savedKerchiefDye,sewingReady,type TailoringAction} from '../game/tailoring.ts';
import {KERCHIEF_DYES,KERCHIEF_COLORS} from '../game/field-appearance.ts';
import type {TownClient} from './town-client.ts';
import './tailoring.css';

type Host={open:(title:string)=>void;body:HTMLElement;atTable:()=>boolean;cue:()=>void};
export function showTailoring(host:Host,town:TownClient,fromBag=false){
 const player=town.snapshot?.playerId;
 if(!player||town.snapshot?.tailoring===undefined||!fromBag&&!host.atTable())return;
 if(fromBag&&town.snapshot?.tailoring?.collectedAt==null)return;
 host.open(fromBag?'Trail kerchief':'Sewing table');
 const section=document.createElement('section');section.className='sewing-order';
 host.body.append(section);
 const image=kerchiefPreview();image.element.classList.add('sewing-preview');image.element.style.display='none';
 const detail=document.createElement('p');
 const controls=document.createElement('div');controls.className='sewing-controls';
 const status=document.createElement('p');status.role='status';status.className='sewing-note';
 section.append(image.element,detail,controls,status);
 let busy=false,shownRevision=-1,shownStage='',timer=0;
 const present=()=>section.isConnected&&town.snapshot?.tailoring!==undefined&&town.snapshot.playerId===player&&(fromBag||host.atTable());
 const button=(label:string,action:TailoringAction|null)=>{
  const control=document.createElement('button');control.type='button';control.className='destination';control.textContent=label;
  control.onclick=()=>void save(action);
  control.disabled=busy||town.isSaving;
  return control;
 };
 const displayTime=(ms:number)=>{
  const remaining=Math.max(0,Math.ceil(ms/1000));
  return Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 };

 function render(){
  const snapshot=town.snapshot;
  if(!present()||!snapshot){window.clearTimeout(timer);return;}
  const state=snapshot.tailoring;
  if(state===undefined)return;
  const stage=!state?'start':state.collectedAt!==null?'dye':state.readyAt>town.serverNow()?'wait':'collect';
  if(stage==='wait'){
   const label='Ready in '+displayTime(state!.readyAt-town.serverNow());
   if(detail.textContent!==label)detail.textContent=label;
  }
  if(stage===shownStage&&shownRevision===snapshot.workshop.revision)return;
  shownStage=stage;shownRevision=snapshot.workshop.revision;
  controls.replaceChildren();
  if(stage==='start'){
   detail.textContent=TAILOR_COST+' unit of Supplies · '+TAILOR_MS/60000+' minutes';
   const begin=button('Make a trail kerchief',{kind:'start'});
   begin.disabled ||= snapshot.workshop.inventory.supplies<TAILOR_COST||town.retryAvailable;
   controls.append(begin);
  }else if(stage==='collect'){
   detail.textContent='Your trail kerchief is ready.';
   const collect=button('Collect trail kerchief',{kind:'collect'});
   collect.disabled ||= town.retryAvailable;
   controls.append(collect);
  }else if(stage==='dye'){
   const currentDye=state?savedKerchiefDye(state):'none';
   const worn=state?.worn!=='none';
   detail.textContent=currentDye==='none'?'Choose a dye.':KERCHIEF_COLORS[currentDye].label+(worn?' · Worn':' · Packed');
   const label=document.createElement('label');label.textContent='Kerchief color';
   const choices=document.createElement('select');
   const placeholder=new Option('Choose a dye','none');
   placeholder.disabled=true;
   choices.append(placeholder);
   for(const color of KERCHIEF_DYES)choices.append(new Option(KERCHIEF_COLORS[color].label,color));
   choices.value=currentDye;label.append(choices);
   const wearLabel=document.createElement('label');wearLabel.className='sewing-wear';
   const wear=document.createElement('input');wear.type='checkbox';wear.checked=currentDye==='none'||worn;
   wearLabel.append(wear,' Wear kerchief');
   const apply=button('Save kerchief',null);
   const selectedDye=()=>KERCHIEF_DYES.find(color=>color===choices.value);
   const preview=()=>{
    const dye=selectedDye();
    image.element.style.display=dye?'':'none';
    image.paint(dye??'none');
    apply.disabled=busy||town.isSaving||town.retryAvailable||!dye||dye===currentDye&&wear.checked===worn;
   };
   apply.onclick=()=>{const dye=selectedDye();if(dye)void save({kind:'style',dye,wear:wear.checked});};
   choices.addEventListener('change',preview);
   wear.addEventListener('change',preview);
   preview();
   controls.append(label,wearLabel,apply);
  }
  if(town.tailoringRetryAvailable)controls.append(button('Retry sewing request',null));
 }
 async function save(action:TailoringAction|null){
  if(busy||!present())return;
  busy=true;
  for(const control of controls.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement>('button,select,input'))control.disabled=true;
  try{
   const result=await town.saveTailoring(action,shownRevision,present);
   if(!present())return;
   status.textContent=result.message;
   if(result.ok&&action?.kind==='collect')host.cue();
  }catch(error){if(present())status.textContent=error instanceof Error?error.message:'The last sewing request is unresolved.';}
  finally{busy=false;shownStage='';render();}
 }
 const tick=()=>{
  if(!present())return;
  render();
  timer=window.setTimeout(tick,500);
 };
 tick();
}

export function tailoringBagCards(town:TownClient,open:()=>void){
 const state=town.snapshot?.tailoring;
 if(!state||state.collectedAt===null)return;
 const card=document.createElement('li');card.className='bag-slot tailoring-bag';card.dataset.tailoringBag='';
 const icon=document.createElement('div');icon.className='bag-slot-art';
 const preview=kerchiefPreview();preview.element.classList.add('sewing-preview');
 const dye=savedKerchiefDye(state);
 preview.paint(dye==='none'?'fern':dye);
 preview.element.setAttribute('aria-hidden','true');
 icon.append(preview.element);
 const title=document.createElement('h4');title.textContent='Trail kerchief';
 const status=document.createElement('p');status.className='bag-slot-detail';
 status.textContent=dye==='none'?'Undyed · Packed':KERCHIEF_COLORS[dye].label+(state.worn==='none'?' · Packed':' · Worn');
 const button=document.createElement('button');button.type='button';button.className='bag-equip-action';button.textContent='Style kerchief';button.onclick=open;
 card.append(icon,title,status,button);
 return [card];
}

export function sewingJournal(body:HTMLElement,town:TownClient,walk:()=>void){
 const order=town.snapshot?.tailoring;
 if(!order||order.collectedAt!==null)return;
 const section=document.createElement('section');section.className='journal-ready-return';section.dataset.sewingJournal='';
 const title=document.createElement('h3');title.textContent='Trail kerchief';
 const note=document.createElement('p');note.textContent=sewingReady(order,town.serverNow())?'Ready to collect at the sewing table.':'Sewing in progress.';
 const button=document.createElement('button');button.type='button';button.className='destination';
 button.textContent='Walk to sewing table';button.onclick=walk;
 section.append(title,note,button);body.append(section);
}
