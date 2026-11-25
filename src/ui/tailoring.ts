import {kerchiefDyePicker,kerchiefPreview,type OutfitLook} from './kerchief-preview.ts';
import {EDGING_COST,TAILOR_COST,TAILOR_MS,savedKerchiefDye,sewingJob,sewingReady,tailoringRank,type TailoringAction} from '../game/tailoring.ts';
import {FINISHING_MS} from '../game/trade-practice.ts';
import {KERCHIEF_COLORS,KERCHIEF_TIE_NAMES,type KerchiefDye,type KerchiefTie,type WornArmor} from '../game/field-appearance.ts';
import type {TownClient} from './town-client.ts';
import './tailoring.css';

type Host={open:(title:string)=>void;body:HTMLElement;atTable:()=>boolean;cue:()=>void;look:()=>OutfitLook;armor:()=>WornArmor|null;walkToSupplies:()=>void};
export function showTailoring(host:Host,town:TownClient,fromBag=false){
 const player=town.snapshot?.playerId;
 if(!player||town.snapshot?.tailoring===undefined||!fromBag&&!host.atTable())return;
 if(fromBag&&town.snapshot?.tailoring?.collectedAt==null)return;
 host.open(fromBag?'Style kerchief':'Sewing table');
 const section=document.createElement('section');section.className='sewing-order';
 host.body.append(section);
 const image=kerchiefPreview(host.look());image.element.classList.add('sewing-preview');image.element.style.display='none';
 const detail=document.createElement('p');
 const rank=document.createElement('p');rank.className='sewing-rank';
 const clock=document.createElement('p');clock.className='sewing-clock';
 const controls=document.createElement('div');controls.className='sewing-controls';
 const work=document.createElement('div');work.className='sewing-controls';
 const status=document.createElement('p');status.role='status';status.className='sewing-note';
 section.append(rank,image.element,detail,controls,work,clock,status);
 let busy=false,shownRevision=-1,shownStage='',workKey='',timer=0;
 let draft:{dye:KerchiefDye;tie:KerchiefTie;wear:boolean;goldEdge:boolean}|undefined;
 const present=()=>section.isConnected&&town.snapshot?.tailoring!==undefined&&town.snapshot.playerId===player&&(fromBag||host.atTable());
 const button=(label:string,action:TailoringAction|null)=>{
  const control=document.createElement('button');control.type='button';control.className='destination';control.textContent=label;
  control.onclick=()=>void save(action);
  control.disabled=busy||town.isSaving;
  return control;
 };
 const suppliesLink=(cost:number)=>{
  const row=document.createElement('div');row.className='sewing-controls';
  const note=document.createElement('p');note.textContent='Bring '+cost+' Supplies to start.';
  const link=document.createElement('button');link.type='button';link.className='destination';link.textContent='Walk to Supply depot';
  link.onclick=host.walkToSupplies;row.append(note,link);return row;
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
  const job=sewingJob(state);
  const ready=sewingReady(state,town.serverNow());
  const stage=!state?'start':state.collectedAt===null?(ready?'collect':'wait'):'dye';
  if(job&&!ready&&!fromBag){
   const label=(job.kind==='gold-edging'?'Gold edging':'Trail kerchief')+' ready in '+displayTime(job.readyAt-Math.max(job.startedAt,town.serverNow()));
   if(clock.textContent!==label)clock.textContent=label;
  }else if(clock.textContent)clock.textContent='';

  const newWorkKey=[fromBag,stage,ready,state?.edging?.collectedAt,snapshot.workshop.revision,town.retryAvailable,town.isSaving,busy].join(':');
  if(newWorkKey!==workKey){
   workKey=newWorkKey;
   work.replaceChildren();
   if(!fromBag&&stage==='dye'&&!state?.edging){
    const practice=button('Start gold edging · '+EDGING_COST+' Supplies · '+FINISHING_MS/60000+' min',{kind:'start-edging'});
    practice.disabled ||= snapshot.workshop.inventory.supplies<EDGING_COST||town.retryAvailable;
    work.append(practice);
    if(snapshot.workshop.inventory.supplies<EDGING_COST)work.append(suppliesLink(EDGING_COST));
   }else if(!fromBag&&stage==='dye'&&ready){
    const collect=button('Collect gold edging',{kind:'collect-edging'});
    collect.disabled ||= town.retryAvailable;
    work.append(collect);
   }
   if(town.tailoringRetryAvailable)work.append(button('Retry sewing request',null));
  }
  if(stage===shownStage&&shownRevision===snapshot.workshop.revision)return;
  shownStage=stage;shownRevision=snapshot.workshop.revision;
  controls.replaceChildren();
  rank.textContent='Tailoring · Rank '+tailoringRank(state);
  if(stage==='start'){
   detail.textContent=TAILOR_COST+' unit of Supplies · '+TAILOR_MS/60000+' minutes';
   const begin=button('Make a trail kerchief',{kind:'start'});
   begin.disabled ||= snapshot.workshop.inventory.supplies<TAILOR_COST||town.retryAvailable;
   controls.append(begin);
   if(snapshot.workshop.inventory.supplies<TAILOR_COST)controls.append(suppliesLink(TAILOR_COST));
  }else if(stage==='collect'){
   detail.textContent='Your trail kerchief is ready.';
   const collect=button('Collect trail kerchief',{kind:'collect'});
   collect.disabled ||= town.retryAvailable;
   controls.append(collect);
  }else if(stage==='dye'){
   const currentDye=state?savedKerchiefDye(state):'none';
   const worn=state?.worn!=='none',currentTie=state?.tie??'knot';
   detail.textContent=currentDye==='none'?'Choose a dye.':KERCHIEF_COLORS[currentDye].label+(worn?' · Worn':' · Packed')+' · '+KERCHIEF_TIE_NAMES[currentTie]+(worn?'':' · Preview');
   const picker=kerchiefDyePicker(draft?.dye??currentDye,draft?.wear??worn,draft?.tie??currentTie);
   const edgeLabel=document.createElement('label');edgeLabel.className='sewing-wear';
   const canAddEdge=state?.edging?.collectedAt!=null;
   const edge=document.createElement('input');edge.type='checkbox';
   edge.checked=canAddEdge&&(draft?.goldEdge??state?.goldEdge??false);
   edgeLabel.append(edge,' Gold edge');
   const apply=button('Save kerchief',null);
   const preview=()=>{
    const dye=picker.dye();
    image.element.style.display=dye?'':'none';
    const vest=host.armor();
    image.paint(dye??'none',vest?.armor??null,picker.tie(),vest?.finish,edge.checked);
    apply.disabled=busy||town.isSaving||town.retryAvailable||!dye||dye===currentDye&&picker.wear.checked===worn&&picker.tie()===currentTie&&edge.checked===!!state?.goldEdge;
   };
   apply.onclick=()=>{const dye=picker.dye();if(dye)void save({kind:'style',dye,wear:picker.wear.checked,tie:picker.tie(),goldEdge:edge.checked});};
   const revise=()=>{
    const dye=picker.dye();
    draft=dye?{dye,tie:picker.tie(),wear:picker.wear.checked,goldEdge:edge.checked}:undefined;
    preview();
   };
   for(const input of [picker.select,picker.wear,picker.style,edge])input.addEventListener('change',revise);
   preview();
   controls.append(picker.row,picker.wearLabel);
   if(canAddEdge)controls.append(edgeLabel);
   controls.append(apply);
  }
 }
 async function save(action:TailoringAction|null){
  if(busy||!present())return;
  busy=true;
  for(const control of section.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement>('button,select,input'))control.disabled=true;
  try{
   const result=await town.saveTailoring(action,shownRevision,present);
   if(!present())return;
   status.textContent=result.message;
   if(result.ok&&action?.kind==='style')draft=undefined;
   if(result.ok&&(action?.kind==='collect'||action?.kind==='collect-edging'))host.cue();
  }catch(error){if(present())status.textContent=error instanceof Error?error.message:'The last sewing request is unresolved.';}
  finally{busy=false;shownStage='';workKey='';render();}
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
 preview.paint(dye==='none'?'fern':dye,null,state.tie,'original',state.goldEdge===true);
 preview.element.setAttribute('aria-hidden','true');
 icon.append(preview.element);
 const title=document.createElement('h4');title.textContent='Trail kerchief';
 const status=document.createElement('p');status.className='bag-slot-detail';
 status.textContent=dye==='none'?'Undyed · Packed':KERCHIEF_COLORS[dye].label+(state.worn==='none'?' · Packed':' · Worn');
 if(state.goldEdge)status.textContent+=' · Gold edge';
 const button=document.createElement('button');button.type='button';button.className='bag-equip-action';button.textContent='Style kerchief';button.onclick=open;
 card.append(icon,title,status,button);
 return [card];
}

export function refreshSewingJournal(body:HTMLElement,town:TownClient){
 const section=body.querySelector<HTMLElement>('[data-sewing-journal]');
 const snapshot=town.snapshot;
 if(!section||!snapshot||section.dataset.sewingJournal!==snapshot.playerId)return;
 const order=snapshot.tailoring;
 const job=sewingJob(order);
 if(!job){section.remove();return;}
 const title=section.querySelector('h3')!,note=section.querySelector('p')!;
 const label=job.kind==='gold-edging'?'Gold edging':'Trail kerchief';
 const message=sewingReady(order,town.serverNow())?'Ready to collect at the sewing table.':'Sewing in progress.';
 if(title.textContent!==label)title.textContent=label;
 if(note.textContent!==message)note.textContent=message;
}

export function sewingJournal(body:HTMLElement,town:TownClient,walk:()=>void){
 const snapshot=town.snapshot;
 if(!snapshot||!sewingJob(snapshot.tailoring))return;
 const section=document.createElement('section');section.className='journal-ready-return';section.dataset.sewingJournal=snapshot.playerId;
 const title=document.createElement('h3'),note=document.createElement('p');note.role='status';
 const button=document.createElement('button');button.type='button';button.className='destination';
 button.textContent='Walk to sewing table';button.onclick=walk;
 section.append(title,note,button);body.append(section);
 refreshSewingJournal(body,town);
}
