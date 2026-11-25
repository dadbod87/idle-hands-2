import type {FieldCue} from '../audio/combat-cues.ts';
import {
 FIELD_HEALTH,HOPPER_HEALTH,OATCAKE_HEAL,PUMPWORKS_KEY,readPumpworks,savePumpworks,
 type PumpworksAction,type PumpworksPlace,
} from '../game/pumpworks.ts';
import {
 braceForHopper,freshHopper,hopperLeash,hopperNotices,hopperOpen,inPracticeReach,
 HOPPER_MOVEMENT,stepHopper,swingAtHopper,patrolHopper,FIELD_IMPACT_MS,type FieldImpact,
} from '../game/pumpworks-chase.ts';
import {PRACTICE_BELL} from '../game/pumpworks-room.ts';
import type {Point} from '../game/world.ts';
import './pumpworks.css';

const ROD_ART='/art/pumpworks/sounding-rod.svg';

type Host={
 body:HTMLElement;
 hud:HTMLElement;
 controls:HTMLElement;
 combat:()=>{inRoom:boolean;able:boolean;position:Point};
 wakeFrame:()=>void;
 cue:(cue:FieldCue)=>void;
 open:(title:string)=>void;
 place:()=>PumpworksPlace;
 equipment:()=>void;
 moveToBed:()=>void;
 update:(state:ReturnType<typeof readPumpworks>)=>void;
 feedback:(message:string)=>void;
};

const titles:Partial<Record<PumpworksPlace,string>>={
 locker:'Survey locker',bench:'Dry bench',bed:'Boarding-house bed',
 cache:'Lost property shelf',desk:'Inspection desk',
};
function paragraph(text:string){
 const p=document.createElement('p');p.textContent=text;return p;
}
function meter(label:string,value:number,max:number){
 const line=document.createElement('label');
 const title=document.createElement('span');title.textContent=label+' '+value+' / '+max;
 const progress=document.createElement('progress');
 progress.value=value;progress.max=max;
 line.append(title,progress);
 return line;
}

export function createPumpworks(host:Host,storage:Pick<Storage,'getItem'|'setItem'>){
 let record=readPumpworks(storage);
 let busy=false;
 let hopper=freshHopper();
 let impact:FieldImpact|null=null;
 let priorAt=0;
 let retryAt=0;
 let practiceReadyAt=0;
 let renderedControls='';
 const fieldStatus=document.createElement('span');
 fieldStatus.className='pump-control-status';
 const enemyMeter=document.createElement('meter');
 enemyMeter.className='pump-enemy-meter';
 enemyMeter.max=HOPPER_HEALTH;enemyMeter.hidden=true;
 enemyMeter.setAttribute('aria-label','Silt hopper health');
 const fieldReadout=document.createElement('div');fieldReadout.className='pump-readout';
 fieldReadout.append(fieldStatus,enemyMeter);
 const worldHud=host.hud.parentElement!;
 const strikeButton=button('Strike',()=>strike());
 const braceButton=button('Brace',()=>brace());
 const oatcakeButton=button('Eat',()=>eat());
 strikeButton.setAttribute('aria-keyshortcuts','Space');
 braceButton.setAttribute('aria-keyshortcuts','Shift');
 oatcakeButton.setAttribute('aria-keyshortcuts','F');
 oatcakeButton.setAttribute('aria-label','Eat oatcake · +'+OATCAKE_HEAL+' health');
 for(const [action,label,key] of [[strikeButton,'Strike','Space'],[braceButton,'Brace','Shift'],[oatcakeButton,'Eat oatcake · +'+OATCAKE_HEAL+' health','F']] as const){
  action.setAttribute('aria-label',label);
  // Browsers may omit a click for a secondary touch. Keep the other thumb
  // free to steer while the player uses an action.
  let secondaryPointer:number|null=null;
  action.addEventListener('pointerdown',event=>{
   secondaryPointer=null;
   if(event.pointerType!=='touch'||event.isPrimary||action.disabled)return;
   event.preventDefault();
   secondaryPointer=event.pointerId;
   action.click();
  });
  action.addEventListener('click',event=>{
   if(secondaryPointer!==null&&event instanceof PointerEvent&&event.pointerId===secondaryPointer){
    event.stopImmediatePropagation();
    secondaryPointer=null;
   }
  },true);
  const hint=document.createElement('kbd');hint.setAttribute('aria-hidden','true');hint.textContent=key;
  action.append(hint);
 }
 const actionRow=document.createElement('div');actionRow.className='pump-action-row';
 actionRow.append(strikeButton,braceButton,oatcakeButton);
 host.controls.append(fieldReadout,actionRow);
 const current=()=>record.ok?record.state:null;
 const refresh=()=>{record=readPumpworks(storage);host.update(record);};
 window.addEventListener('storage',event=>{if(event.key===PUMPWORKS_KEY||event.key===null)refresh();});

 function button(label:string,click:()=>void){
  const item=document.createElement('button');
  item.type='button';item.className='destination';item.textContent=label;item.disabled=busy;
  item.onclick=click;
  return item;
 }

 async function change(action:PumpworksAction,place:PumpworksPlace,present:()=>boolean,expected:string|null,onField=false){
  if(!present()||busy)return '';
  record=readPumpworks(storage);
  if(!record.ok){host.feedback(record.message);return record.message;}
  if(!navigator.locks){
   const text='This browser cannot safely save an outing across tabs.';
   host.feedback(text);return text;
  }
  busy=true;
  try{
   const result=await navigator.locks.request(PUMPWORKS_KEY,()=>{
    if(!present()||(!onField&&place!=='elsewhere'&&host.place()!==place))return {ok:false as const,message:'Return to the marked spot first.'};
    return savePumpworks(storage,expected,action,place);
   });
   if(result.ok&&onField){
    const kind=action==='strike'||action==='counter'?action:
     action==='guard'?'blocked':action==='hit'||action==='splash-hit'?'damage':null;
    if(kind){
     const point=kind==='strike'||kind==='counter'?hopper.feet:host.combat().position;
     impact={kind,point:{...point},until:performance.now()+FIELD_IMPACT_MS};
     host.wakeFrame();
    }
    if(action==='hit'||action==='splash-hit')host.cue('thud');
    if(action==='guard')host.cue('block');
   }
   refresh();
   host.feedback(result.message);
   if(result.ok&&result.returnToBed)host.moveToBed();
   return result.message;
  }catch{
   const text='The outing could not be confirmed in this browser.';
   host.feedback(text);return text;
  }finally{busy=false;}
 }

 const encounterActive=()=>hopper.phase!=='idle';
 function encounter(){
  const currentFight=current()?.fight;
  return {
   hopper,impact,
   enemyHealth:currentFight?.health??null,
   recovering:current()?.recovering??false,
  };
 }
 async function combatAction(action:PumpworksAction){
  if(busy||!record.ok)return;
  const expected=record.raw;
  const before=record.state.revision;
  await change(action,'arena',()=>host.combat().able,expected,true);
  if(before===current()?.revision)retryAt=performance.now()+1800;
 }
 function input(action:'strike'|'brace'|'eat'){
  const context=host.combat(),state=current();
  if(!context.able||!state||busy||state.recovering)return;
  if(!state.fight){
   const now=performance.now();
   if(action==='strike'&&state.rod==='equipped'&&inPracticeReach(context.position)&&now>=practiceReadyAt){
    practiceReadyAt=now+HOPPER_MOVEMENT.strikeCooldown*1000;
    impact={kind:'bell',point:PRACTICE_BELL,until:now+FIELD_IMPACT_MS};
    host.cue('bell');
    host.wakeFrame();
   }
   return;
  }
  if(action==='strike'){
   const attack=swingAtHopper(hopper,context.position,state.rod==='equipped');
   if(!attack)return;
   hopper=attack.motion;
   host.cue('swing');
   if(attack.hit)void combatAction(attack.hit);
   else if(attack.deflected){
    impact={kind:'shell',point:{...hopper.feet},until:performance.now()+FIELD_IMPACT_MS};
    host.feedback('The shell deflected it.');
   }else host.feedback('Out of reach. Get closer after it lands.');
  }else if(action==='brace'){
   const next=braceForHopper(hopper,context.position);
   if(!next)return;
   hopper=next;
  }else if(state.oatcake==='packed'&&state.satchel==='carried'&&state.health<FIELD_HEALTH&&hopperLeash(context.position)){
   void combatAction('eat');
  }
  host.wakeFrame();
 }
 function strike(){input('strike');}
 function brace(){input('brace');}
 function eat(){input('eat');}

 function tick(now:number){
  const context=host.combat(),state=current();
  if(!context.inRoom){
   if(!host.controls.hidden)host.controls.hidden=true;
   impact=null;practiceReadyAt=0;
   if(hopper.phase!=='idle'||hopper.elapsed>0)hopper=freshHopper();
   priorAt=0;
   return;
  }
  if(impact&&now>=impact.until)impact=null;
  const dt=priorAt?(now-priorAt)/1000:0;
  priorAt=now;
  if(!state||state.cleared||state.recovering){
   if(hopper.phase!=='idle')hopper=freshHopper();
  }
  else if(context.able&&!busy){
   if(!state.fight){
    hopper=patrolHopper(hopper,dt);
    if(hopperNotices(context.position,hopper.feet)&&now>=retryAt)void combatAction('begin');
   }else if(!hopperLeash(context.position)){
    hopper=freshHopper();
    if(now>=retryAt)void combatAction('retreat');
   }else{
    const next=stepHopper(hopper,context.position,dt,state.fight.health);
    if(hopper.phase!=='windup'&&next.motion.phase==='windup')host.cue(next.motion.pattern);
    hopper=next.motion;
    if(next.impact)void combatAction(next.impact==='braced'?'guard':next.impact==='splash'?'splash-hit':'hit');
   }
  }
  paintControls(state,context.position,now);
 }

 function paintControls(state:ReturnType<typeof current>,position:Point,now:number){
  if(host.controls.hidden)host.controls.hidden=false;
  const disabled=!state?.fight||hopper.phase==='idle'||busy;
  const practice=!!state&&!state.fight&&!state.recovering&&state.rod==='equipped'&&inPracticeReach(position);
  const strikeDisabled=practice?busy||now<practiceReadyAt:disabled||state?.rod!=='equipped'||hopper.strikeCooldown>0;
  const braceDisabled=disabled||hopper.braceCooldown>0;
  const eatDisabled=disabled||state?.oatcake!=='packed'||state?.satchel!=='carried'||state.health===FIELD_HEALTH;
  const text=state?.cleared?'Cleared':hopper.phase==='windup'?(hopper.pattern==='splash'?'Splash coming':'Lunge coming'):
   hopper.phase==='charge'?(hopper.pattern==='splash'?'Splashing':'Lunging'):
   hopper.phase==='recover'?(hopperOpen(hopper)?'Open to strike':'Recovering'):hopper.phase==='chase'?'Chasing':'Cross the bridge';
  const status=practice?'Try a swing':hopper.guard>0?'Braced':text;
  const enemyHealth=hopper.phase!=='idle'?state?.fight?.health:null;
  const key=[status,strikeDisabled,braceDisabled,eatDisabled,hopper.phase,enemyHealth].join(':');
  if(renderedControls===key)return;
  renderedControls=key;
  fieldStatus.textContent=status;
  enemyMeter.hidden=enemyHealth==null;
  if(enemyHealth!=null)enemyMeter.value=enemyHealth;
  host.controls.dataset.phase=hopper.phase;
  host.controls.dataset.pattern=hopper.pattern;
  strikeButton.disabled=strikeDisabled;
  braceButton.disabled=braceDisabled;
  oatcakeButton.disabled=eatDisabled;
 }

 function show(place:PumpworksPlace){
  const title=titles[place];
  if(!title||host.place()!==place)return;
  host.open(title);
  const panel=document.createElement('section');
  panel.className='pumpworks-panel';
  panel.dataset.pumpworks=place;
  host.body.append(panel);
  let note='';
  let shownRaw:string|null=null;
  const present=()=>panel.isConnected&&host.place()===place;
  const render=()=>{
   if(!present())return;
   panel.replaceChildren();
   const state=current();
   if(record.ok)shownRaw=record.raw;
   if(!state){panel.append(paragraph('The outing record is unavailable. Your workshop is still available.'));return;}
   const add=(label:string,action:PumpworksAction)=>{
    panel.append(button(label,()=>void submit(action)));
   };
   if(place==='locker'){
    if(state.rod==='unissued'){
     panel.append(paragraph('Borrow a sounding rod, field satchel and one oatcake before crossing the water.'));
     add('Pack the survey kit','issue');
    }else{
     panel.append(paragraph(state.rod==='equipped'?'Your rod is equipped. Cross the footbridge to the hopper.':'Your rod is packed. Equip it in Bag before you approach the hopper.'));
     panel.append(button('Open Bag',host.equipment));
     if(state.oatcake==='unissued')add('Pack your oatcake','oatcake');
    }
   }else if(place==='bench'||place==='bed'){
    panel.append(meter('Your health',state.health,FIELD_HEALTH));
    if(state.recovering){
     panel.append(paragraph(state.satchel==='at-pump'?'You’re back in Ledgerwick. The field satchel is on the lost property shelf in the Pumpworks.':'You’re back in Ledgerwick. Get up when you’re ready.'));
     add('Get up and recover','wake');
    }else if(state.health<FIELD_HEALTH||state.fight){
     panel.append(paragraph('Rest here to restore health and reset an unfinished encounter.'));
     add('Rest and restore health','rest');
    }else panel.append(paragraph('You’re rested.'));
   }else if(place==='cache'){
    if(state.satchel==='at-pump'){
     panel.append(paragraph('Your field satchel hangs on the dry side of the railing.'));
     add('Recover your field satchel','recover');
    }else panel.append(paragraph('The shelf is empty.'));
   }else if(place==='desk'){
    panel.append(paragraph(state.reported?'The inspection seal is in your Journal. The desk has been officially vacated.':state.cleared?'The pump turns freely. Stamp the inspection record to finish the outing.':'The inspection can wait until the hopper leaves the machinery alone.'));
    if(state.cleared&&!state.reported)add('Take the field seal','report');
   }
   const status=paragraph(note);
   status.className='glasshouse-status';status.role='status';status.tabIndex=-1;
   panel.append(status);
  };
  async function submit(action:PumpworksAction){
   if(busy)return;
   for(const control of panel.querySelectorAll('button'))control.disabled=true;
   note=await change(action,place,present,shownRaw);
   if(present()){
    render();
    if(note)panel.querySelector<HTMLElement>('[role=status]')?.focus({preventScroll:true});
   }
  }
  refresh();
  render();
 }

 function gear(){
  if(!record.ok)return;
  const state=record.state;
  let shownRaw=record.raw;
  if(state.rod==='unissued')return;
  const card=document.createElement('li');card.className='bag-slot';card.dataset.pumpBag='';
  const artwork=document.createElement('div');artwork.className='bag-slot-art';
  const art=document.createElement('img');art.src=ROD_ART;art.alt='';art.width=64;art.height=64;
  const count=document.createElement('span');count.className='bag-stack-count';count.textContent='1';
  count.setAttribute('aria-label','One sounding rod');
  artwork.append(art,count);
  const title=document.createElement('h4');title.textContent='Sounding rod';
  const detail=paragraph(state.rod==='equipped'?'Equipped · Pumpworks survey gear':'Packed · Pumpworks survey gear');
  detail.className='bag-slot-detail';
  card.append(artwork,title,detail);
  const control=button(state.rod==='equipped'?'Pack sounding rod':'Equip sounding rod',()=>{});
  control.className='bag-equip-action';
  const status=paragraph('');status.className='bag-equip-notice';status.role='status';
  control.disabled=busy||!!state.fight||state.recovering;
  control.onclick=async()=>{
   if(busy)return;
   control.disabled=true;
   const message=await change(control.textContent==='Pack sounding rod'?'pack':'equip','elsewhere',()=>card.isConnected,shownRaw);
   if(record.ok)shownRaw=record.raw;
   if(!card.isConnected)return;
   const after=current();
   detail.textContent=after?.rod==='equipped'?'Equipped · Pumpworks survey gear':'Packed · Pumpworks survey gear';
   control.textContent=after?.rod==='equipped'?'Pack sounding rod':'Equip sounding rod';
   control.disabled=!!after?.fight||!!after?.recovering;
   status.textContent=message;
  };
  card.append(control,status);
  if(state.oatcake!=='unissued'){
   const snack=paragraph(state.oatcake==='used'?'Oatcake used':state.satchel==='at-pump'?'Oatcake in the lost satchel':'Oatcake ×1 · restores up to '+OATCAKE_HEAL+' health during the encounter');
   snack.className='pump-oatcake';
   const icon=document.createElement('img');icon.src='/art/pumpworks/oatcake.svg';icon.alt='';
   snack.prepend(icon);
   card.append(snack);
  }
  return card;
 }

 function journal(body:HTMLElement,walkToDoor:()=>void,previewSeal:()=>void){
  const state=current();
  if(!state||state.rod==='unissued')return;
  const entry=document.createElement('section');entry.className='journal-ready-return';entry.dataset.pumpJournal='';
  const title=document.createElement('h3');title.textContent='The Pumpworks';
  const note=state.satchel==='at-pump'?'Your field satchel is on the lost property shelf.':
   state.reported?'Field seal':
   state.cleared?'The inspection desk is clear. Collect the field seal.':
   state.rod==='packed'?'Equip the sounding rod in Bag before entering the chamber.':'Your survey gear is ready for the pump chamber.';
  const description=paragraph(note);
  if(state.reported){
   description.className='field-keepsake-summary';
   const art=document.createElement('img');
   art.src='/art/pumpworks/field-seal.svg';art.alt='';
   art.width=58;art.height=46;
   description.prepend(art);
  }
  entry.append(title,description,state.reported
   ?button('Preview field seal',previewSeal)
   :button('Walk to the Pumpworks',walkToDoor));
  body.append(entry);
 }

 function paintHealth(visible:boolean,field=false){
  const home=field?fieldReadout:worldHud;
  if(host.hud.parentElement!==home)home.append(host.hud);
  const state=current();
  host.hud.hidden=!visible||!state;
  if(host.hud.hidden||!state)return;
  const key=String(state.health);
  if(host.hud.dataset.health!==key){
   host.hud.dataset.health=key;
   host.hud.replaceChildren(meter('Health',state.health,FIELD_HEALTH));
  }
 }

 return {current,show,gear,journal,paintHealth,tick,encounter,encounterActive,strike,brace,eat};
}
