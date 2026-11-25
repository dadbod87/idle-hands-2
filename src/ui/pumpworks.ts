import {FORGE_ORDER_MS,forgeReady} from '../game/forge-order.ts';
import {kerchiefDyePicker,kerchiefPreview,type OutfitLook} from './kerchief-preview.ts';
import {KERCHIEF_COLORS,KERCHIEF_TIE_NAMES} from '../game/field-appearance.ts';
import type {FieldCue} from '../audio/combat-cues.ts';
import {BOW_DRAW_SECONDS,BOW_STILL_RADIUS,BOW_TRACE_MS,STAFF_PULSE_MS,equippedFieldWeapon,FIELD_WEAPONS,type BowDraw,type BowTrace,type FieldWeapon,type StaffPulse} from '../game/field-weapons.ts';
import {
 fieldArmor,FIELD_HEALTH,HOPPER_HEALTH,OATCAKE_HEAL,PADDED_VEST_ARMOR,PUMPWORKS_KEY,readPumpworks,savePumpworks,
 type PumpworksAction,type PumpworksPlace,
} from '../game/pumpworks.ts';
import {
 braceForHopper,freshHopper,hopperLeash,hopperNotices,hopperOpen,inPracticeReach,pushHopper,
 HOPPER_MOVEMENT,stepHopper,swingFieldWeapon,patrolHopper,FIELD_IMPACT_MS,type FieldImpact,type HopperMotion,
} from '../game/pumpworks-chase.ts';
import {PRACTICE_BELL} from '../game/pumpworks-room.ts';
import type {Point} from '../game/world.ts';
import './pumpworks.css';

const EQUIPMENT={
 rod:{name:FIELD_WEAPONS.rod.name,art:'/art/pumpworks/sounding-rod.svg',
  description:FIELD_WEAPONS.rod.damage+' damage · Close reach. Strong counter.',equip:'equip',pack:'pack'},
 bow:{name:FIELD_WEAPONS.bow.name,art:'/art/pumpworks/field-bow.svg',
  description:FIELD_WEAPONS.bow.damage+' damage · Long reach. Stand still to draw.',equip:'equip-bow',pack:'pack-bow'},
 staff:{name:FIELD_WEAPONS.staff.name,art:'/art/pumpworks/breeze-staff.svg',
  description:FIELD_WEAPONS.staff.damage+' damage · An opening pulse pushes back.',equip:'equip-staff',pack:'pack-staff'},
 vest:{name:'Padded vest',art:'/art/pumpworks/padded-vest.svg',
  description:PADDED_VEST_ARMOR+' Armor · Reduces unbraced hits.',equip:'equip-vest',pack:'pack-vest'},
} as const;


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
 look:()=>OutfitLook;
 reward:()=>void;
 moveToBed:()=>void;
 update:(state:ReturnType<typeof readPumpworks>)=>void;
 feedback:(message:string)=>void;
};

const titles:Partial<Record<PumpworksPlace,string>>={
 locker:'Survey locker',forge:'Dry-side forge',bench:'Dry bench',bed:'Boarding-house bed',
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
 let draw:BowDraw|null=null;
 let shot:BowTrace|null=null;
 let pulse:StaffPulse|null=null;
 let priorAt=0;
 let browserPaused=false;
 let windowUnfocused=false;
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
 const current=()=>record.ok?record.state:null;
 const refresh=()=>{record=readPumpworks(storage);host.update(record);};
 window.addEventListener('storage',event=>{if(event.key===PUMPWORKS_KEY||event.key===null)refresh();});
 const resetFrameClock=()=>{priorAt=0;};
 const pauseBrowser=()=>{browserPaused=true;resetFrameClock();};
 const wakeClock=()=>{
  resetFrameClock();
  if(host.combat().inRoom)host.wakeFrame();
 };
 const resumeBrowser=()=>{browserPaused=false;wakeClock();};
 document.addEventListener('freeze',pauseBrowser);
 document.addEventListener('resume',resumeBrowser);
 document.addEventListener('visibilitychange',resetFrameClock);
 window.addEventListener('pagehide',pauseBrowser);
 window.addEventListener('pageshow',resumeBrowser);
 window.addEventListener('blur',()=>{windowUnfocused=true;resetFrameClock();});
 window.addEventListener('focus',()=>{windowUnfocused=false;wakeClock();});

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
    if(!present()||(!onField&&place!=='elsewhere'&&host.place()!==place)){
     return {ok:false as const,message:onField?'':'Return to the marked spot first.'};
    }
    return savePumpworks(storage,expected,action,place);
   });
   if(result.ok&&onField){
    const kind=action==='strike'||action==='counter'?action:
     action==='guard'?'blocked':action==='hit'||action==='splash-hit'?'damage':action==='eat'?'heal':null;
    if(kind){
     const point=kind==='strike'||kind==='counter'?hopper.feet:host.combat().position;
     impact={kind,point:{...point},until:performance.now()+FIELD_IMPACT_MS};
     host.wakeFrame();
    }
    if(action==='hit'||action==='splash-hit'){
     draw=null;
     host.cue('thud');
    }
    if(action==='counter'&&result.state.staff==='equipped'&&!result.state.cleared){
     hopper=pushHopper(hopper,host.combat().position);
    }
    if(action==='guard')host.cue('block');
    if(action==='eat')host.cue('heal');
   }
   refresh();
   if(result.message)host.feedback(result.message);
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
   hopper,impact,draw,shot,pulse,
   enemyHealth:currentFight?.health??null,
   recovering:current()?.recovering??false,
  };
 }
 async function combatAction(action:PumpworksAction,previous?:HopperMotion){
  if(busy||!record.ok)return;
  const expected=record.raw;
  const able=()=>!browserPaused&&!windowUnfocused&&host.combat().able;
  await change(action,'arena',able,expected,true);
  if(record.ok&&record.raw===expected){
   if(previous)hopper=previous;
   // Retrying a rejected contact must not leave it counted as resolved.
   // An intentional pause can resume immediately; failed storage is throttled.
   if(able())retryAt=performance.now()+1800;
  }
 }
 function attackWith(weapon:FieldWeapon,position:Point,practice:boolean,now:number){
  const profile=FIELD_WEAPONS[weapon];
  if(weapon!=='rod'){
   const target=practice?PRACTICE_BELL:hopper.feet;
   const range=Math.hypot(target.x-position.x,target.y-position.y);
   const scale=range>profile.reach?profile.reach/range:1;
   const to={x:position.x+(target.x-position.x)*scale,y:position.y+(target.y-position.y)*scale};
   if(weapon==='bow'){
    shot={from:{...position},to,until:now+BOW_TRACE_MS};
    host.cue('bow');
   }else{
    pulse={from:{...position},to,until:now+STAFF_PULSE_MS};
    host.cue('staff');
   }
  }
  if(practice){
   practiceReadyAt=now+profile.cooldown*1000;
   impact={kind:'bell',point:PRACTICE_BELL,until:now+FIELD_IMPACT_MS};
   host.cue('bell');
   return;
  }
  const attack=swingFieldWeapon(hopper,position,weapon);
  if(!attack)return;
  const previous=hopper;
  hopper=attack.motion;
  if(weapon==='rod')host.cue('swing');
  if(attack.hit)void combatAction(attack.hit,previous);
  else if(attack.deflected){
   impact={kind:'shell',point:{...hopper.feet},until:now+FIELD_IMPACT_MS};
   host.feedback('The shell deflected it.');
  }else host.feedback('Out of reach. Get closer after it lands.');
 }
 function input(action:'strike'|'brace'|'eat'){
  const context=host.combat(),state=current();
  if(browserPaused||windowUnfocused||!context.able||!state||busy||state.recovering)return;
  if(action==='strike'){
   const weapon=equippedFieldWeapon(state);
   if(!weapon||draw)return;
   const now=performance.now();
   const practice=!state.fight&&inPracticeReach(context.position,weapon)&&now>=practiceReadyAt;
   if(!practice&&(!state.fight||hopper.phase==='idle'||hopper.strikeCooldown>0||!hopperLeash(context.position)))return;
   if(weapon==='bow')draw={from:{...context.position},remaining:BOW_DRAW_SECONDS,practice};
   else attackWith(weapon,context.position,practice,now);
  }else if(state.fight&&action==='brace'){
   const next=braceForHopper(hopper,context.position);
   if(!next)return;
   draw=null;
   hopper=next;
  }else if(state.fight&&action==='eat'&&state.oatcake==='packed'&&state.satchel==='carried'&&state.health<FIELD_HEALTH&&hopperLeash(context.position)){
   draw=null;
   void combatAction('eat');
  }
  host.wakeFrame();
 }
 function advanceDraw(position:Point,dt:number,now:number){
  if(!draw)return;
  const state=current();
  const {from,practice}=draw;
  const placeStillValid=practice?!state?.fight&&inPracticeReach(position,'bow'):!!state?.fight&&hopperLeash(position);
  if(!state||state.recovering||equippedFieldWeapon(state)!=='bow'||!placeStillValid||
     Math.hypot(position.x-from.x,position.y-from.y)>BOW_STILL_RADIUS){
   draw=null;
   return;
  }
  draw={from,practice,remaining:draw.remaining-Math.min(.065,dt)};
  if(draw.remaining<=0){
   draw=null;
   attackWith('bow',position,practice,now);
  }
 }
 function strike(){input('strike');}
 function brace(){input('brace');}
 function eat(){input('eat');}

 function tick(now:number){
  const context=host.combat(),state=current();
  if(!context.inRoom){
   if(!host.controls.hidden){
    host.controls.hidden=true;
    fieldReadout.remove();actionRow.remove();
   }
   impact=null;draw=null;shot=null;pulse=null;practiceReadyAt=0;
   if(hopper.phase!=='idle'||hopper.elapsed>0)hopper=freshHopper();
   priorAt=0;
   return;
  }
  if(impact&&now>=impact.until)impact=null;
  if(shot&&now>=shot.until)shot=null;
  if(pulse&&now>=pulse.until)pulse=null;
  const running=context.able&&!browserPaused&&!windowUnfocused;
  const dt=running&&priorAt?(now-priorAt)/1000:0;
  priorAt=running?now:0;
  if(!state||state.cleared||state.recovering){
   if(hopper.phase!=='idle')hopper=freshHopper();
  }
  else if(running&&!busy){
   if(!state.fight){
    hopper=patrolHopper(hopper,dt);
    if(hopperNotices(context.position,hopper.feet)&&now>=retryAt)void combatAction('begin');
   }else if(!hopperLeash(context.position)){
    hopper=freshHopper();
    if(now>=retryAt)void combatAction('retreat');
   }else{
    const previous=hopper;
    const next=stepHopper(previous,context.position,dt,state.fight.health);
    if(!next.impact||now>=retryAt){
     if(previous.phase!=='windup'&&next.motion.phase==='windup')host.cue(next.motion.pattern);
     hopper=next.motion;
     if(next.impact)void combatAction(next.impact==='braced'?'guard':next.impact==='splash'?'splash-hit':'hit',previous);
    }
   }
  }
  if(running&&!busy)advanceDraw(context.position,dt,now);
  paintControls(state,context.position,now);
 }

 function paintControls(state:ReturnType<typeof current>,position:Point,now:number){
  if(host.controls.hidden){
   host.controls.append(fieldReadout,actionRow);
   host.controls.hidden=false;
  }
  const disabled=!state?.fight||hopper.phase==='idle'||busy;
  const weapon=state?equippedFieldWeapon(state):null;
  const practice=!!state&&!state.fight&&!state.recovering&&!!weapon&&inPracticeReach(position,weapon);
  const strikeDisabled=!!draw||(practice?busy||now<practiceReadyAt:disabled||!weapon||hopper.strikeCooldown>0);
  const braceDisabled=disabled||hopper.braceCooldown>0;
  const eatDisabled=disabled||state?.oatcake!=='packed'||state?.satchel!=='carried'||state.health===FIELD_HEALTH;
  const text=state?.cleared?'Cleared':hopper.phase==='windup'?(hopper.pattern==='splash'?'Splash coming':'Lunge coming'):
   hopper.phase==='charge'?(hopper.pattern==='splash'?'Splashing':'Lunging'):
   hopper.phase==='recover'?(hopperOpen(hopper)?'Open to strike':'Recovering'):hopper.phase==='chase'?'Chasing':'Cross the bridge';
  const status=hopper.phase==='windup'||hopper.phase==='charge'?text:
   draw?'Drawing bow':practice?(weapon==='bow'?'Try a shot':weapon==='staff'?'Try a pulse':'Try a swing'):hopper.guard>0?'Braced':text;
  const enemyHealth=hopper.phase!=='idle'?state?.fight?.health:null;
  const key=[status,weapon,strikeDisabled,braceDisabled,eatDisabled,hopper.phase,enemyHealth].join(':');
  if(renderedControls===key)return;
  renderedControls=key;
  fieldStatus.textContent=status;
  enemyMeter.hidden=enemyHealth==null;
  if(enemyHealth!=null)enemyMeter.value=enemyHealth;
  host.controls.dataset.phase=hopper.phase;
  host.controls.dataset.pattern=hopper.pattern;
  const attackLabel=weapon==='bow'?'Shoot':weapon==='staff'?'Pulse':'Strike';
  strikeButton.firstChild!.textContent=attackLabel;
  strikeButton.setAttribute('aria-label',attackLabel);
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
  let forgeTimer=0;
  const present=()=>panel.isConnected&&host.place()===place;
  const render=()=>{
   window.clearTimeout(forgeTimer);
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
     panel.append(paragraph('The kit comes with a field satchel and one oatcake.'));
     add('Equip rod and take kit','issue');
    }else{
     const weapon=equippedFieldWeapon(state);
     panel.append(paragraph(weapon==='bow'?'Stand still to draw the bow. The practice bell makes a good target.':
      weapon==='staff'?'Pulse at the practice bell. Catch the hopper open to push it back.':
      weapon==='rod'?'Try a swing at the practice bell, then cross the footbridge.':'Equip field gear in Bag before crossing the footbridge.'));
     if(!state.fight){
      if(state.bow==='unissued')add('Try a field bow','borrow-bow');
      if(state.staff==='unissued')add('Try a breeze staff','borrow-staff');
      if(state.vest==='unissued')add('Borrow padded vest','borrow-vest');
     }
     panel.append(button('Open Bag',host.equipment));
     if(state.oatcake==='unissued')add('Pack your oatcake','oatcake');
    }
   }else if(place==='forge'){
    const order=state.forge;
    const preview=document.createElement('div');preview.className='forge-profile';
    const image=document.createElement('img');image.src='/art/pumpworks/riveted-vest.svg';image.alt='';
    image.width=64;image.height=64;
    const title=document.createElement('h3');title.textContent='Riveted survey vest';
    preview.append(image,title,paragraph('Armor '+PADDED_VEST_ARMOR));
    panel.append(preview);
    if(state.rod==='unissued'){
     panel.append(paragraph('Take a survey kit at the locker. The forge has one practice blank for each kit.'));
    }else if(!order){
     panel.append(paragraph('One supplied blank · '+FORGE_ORDER_MS/60000+' minutes'));
     add('Start riveted vest','start-forge');
    }else if(order.phase==='working'){
     const status=paragraph('');panel.append(status);
     const tick=()=>{
      if(!present()||!status.isConnected)return;
      if(forgeReady(order,Date.now())){
       if(status.textContent===''){status.textContent='Your vest is ready.';add('Collect and equip vest','collect-forge');}
       else render();
       return;
      }
      const seconds=Math.max(1,Math.ceil((order.readyAt-Date.now())/1000));
      status.textContent='Ready in '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
      forgeTimer=window.setTimeout(tick,500);
     };
     tick();
    }else{
     panel.append(paragraph('This forge has stamped your vest. Procurement put its name on the inside.'));
     panel.append(button('Open Bag',host.equipment));
    }
   }else if(place==='bench'||place==='bed'){
    panel.append(meter('Your health',state.health,FIELD_HEALTH));
    if(state.recovering){
     panel.append(paragraph(state.satchel==='at-pump'?'You’re back in Ledgerwick. The field satchel is on the lost property shelf in the Pumpworks.':'You’re back in Ledgerwick. Get up when you’re ready.'));
     add('Get up and recover','wake');
    }else if(place==='bench'&&state.reported&&state.cleared){
     panel.append(paragraph('Start at full health. Your inspection seal stays earned.'));
     add('Start a rematch','rematch');
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
    if(action==='collect-forge'&&current()?.forge?.phase==='equipped')host.reward();
    render();
    if(note)panel.querySelector<HTMLElement>('[role=status]')?.focus({preventScroll:true});
   }
  }
  refresh();
  render();
 }

 function gear(){
  if(!record.ok||record.state.rod==='unissued')return;
  const state=record.state;
  let shownRaw=record.raw;
  const repaints:((message?:string)=>void)[]=[];
  const cards=(['rod','bow','staff','vest'] as const).filter(item=>state[item]!=='unissued').map(item=>{
   const profile=EQUIPMENT[item],name=profile.name.toLowerCase();
   const card=document.createElement('li');card.className='bag-slot';card.dataset.pumpBag=item;
   const artwork=document.createElement('div');artwork.className='bag-slot-art';
   const art=document.createElement('img');art.src=profile.art;art.alt='';art.width=64;art.height=64;
   const count=document.createElement('span');count.className='bag-stack-count';count.textContent='1';
   count.setAttribute('aria-label','One '+name);
   artwork.append(art,count);
   const title=document.createElement('h4');title.textContent=profile.name;
   const detail=paragraph('');detail.className='bag-slot-detail';
   const status=paragraph('');status.className='bag-equip-notice';status.role='status';
   const control=button('',()=>{});
   control.className='bag-equip-action';
   card.append(artwork,title,detail,control,status);
   const paint=(message='')=>{
    const live=current();
    if(!live)return;
    const equipped=live[item]==='equipped';
    detail.textContent=(equipped?'Equipped':'Packed')+' · '+profile.description;
    control.textContent=(equipped?'Pack ':'Equip ')+name;
    control.disabled=busy||!!live.fight||live.recovering;
    status.textContent=message;
   };
   repaints.push(paint);
   paint();
   control.onclick=async()=>{
    const live=current();
    if(busy||!live)return;
    control.disabled=true;
    const action=live[item]==='equipped'?profile.pack:profile.equip;
    const message=await change(action,'elsewhere',()=>card.isConnected,shownRaw);
    if(record.ok)shownRaw=record.raw;
    if(card.isConnected)for(const repaint of repaints)repaint(repaint===paint?message:'');
   };
   if(item==='rod'&&state.oatcake!=='unissued'){
    const snack=paragraph(state.oatcake==='used'?'Oatcake used':state.satchel==='at-pump'?'Oatcake in the lost satchel':'Oatcake ×1 · restores up to '+OATCAKE_HEAL+' health during the encounter');
    snack.className='pump-oatcake';
    const icon=document.createElement('img');icon.src='/art/pumpworks/oatcake.svg';icon.alt='';
    snack.prepend(icon);
    card.append(snack);
   }
   return card;
  });
  if(state.forge&&state.forge.phase!=='working'){
   const card=document.createElement('li');card.className='bag-slot';card.dataset.pumpBag='riveted';
   const art=document.createElement('div');art.className='bag-slot-art';
   const image=document.createElement('img');image.src='/art/pumpworks/riveted-vest.svg';image.alt='';image.width=64;image.height=64;
   art.append(image);
   const title=document.createElement('h4');title.textContent='Riveted survey vest';
   const detail=paragraph('');detail.className='bag-slot-detail';
   const control=button('',()=>{});control.className='bag-equip-action';
   const status=paragraph('');status.className='bag-equip-notice';status.role='status';
   const paint=(message='')=>{
    const live=current();
    const worn=live?.forge?.phase==='equipped';
    control.textContent=worn?'Pack riveted vest':'Equip riveted vest';
    control.disabled=busy||!!live?.fight||!!live?.recovering;
    detail.textContent=(worn?'Equipped':'Packed')+' · Armor '+PADDED_VEST_ARMOR;
    status.textContent=message;
   };
   control.onclick=async()=>{
    if(control.disabled)return;
    const action=current()?.forge?.phase==='equipped'?'pack-riveted':'equip-riveted';
    control.disabled=true;
    const message=await change(action,'elsewhere',()=>card.isConnected,shownRaw);
    if(record.ok)shownRaw=record.raw;
    if(card.isConnected)for(const repaint of repaints)repaint(repaint===paint?message:'');
   };
   card.append(art,title,detail,control,status);
   cards.push(card);repaints.push(paint);paint();
  }
  const dye=document.createElement('li');dye.className='bag-slot field-kerchief';dye.dataset.fieldKerchief='';
  const title=document.createElement('h4');title.textContent='Trail kerchief';
  const detail=paragraph('');detail.className='bag-slot-detail';
  const appearance=document.createElement('div');appearance.className='bag-slot-art';
  const preview=kerchiefPreview(host.look());
  appearance.append(preview.element);
  const picker=kerchiefDyePicker(state.kerchiefDye??state.kerchief,state.kerchief!=='none',state.kerchiefTie);
  const saveLook=button('Save kerchief',()=>{});
  saveLook.className='bag-equip-action';
  const status=paragraph('');status.className='bag-equip-notice';status.role='status';
  const paintLook=(message='')=>{
   const live=current();
   if(!live)return;
   const selected=picker.dye();
   const saved=live.kerchiefDye??live.kerchief;
   const worn=live.kerchief!=='none';
   const tie=live.kerchiefTie??'knot';
   preview.paint(selected??'none',live.vest==='equipped',picker.tie(),live.forge?.phase==='equipped');
   const detailText=saved==='none'?'Undyed · Packed':worn?KERCHIEF_COLORS[saved].label+' kerchief worn':KERCHIEF_COLORS[saved].label+' · Packed';
   detail.textContent=saved==='none'?detailText:detailText+' · '+KERCHIEF_TIE_NAMES[tie];
   picker.select.disabled=picker.wear.disabled=picker.style.disabled=busy||!!live.fight||live.recovering;
   saveLook.disabled=picker.select.disabled||!selected||selected===saved&&picker.wear.checked===worn&&picker.tie()===tie;
   status.textContent=message;
  };
  repaints.push(paintLook);
  picker.select.onchange=picker.wear.onchange=picker.style.onchange=()=>paintLook();
  saveLook.onclick=async()=>{
   const dyeChoice=picker.dye();
   if(saveLook.disabled||!dyeChoice)return;
   const action={dye:dyeChoice,wear:picker.wear.checked,tie:picker.tie()};
   saveLook.disabled=true;
   const message=await change(action,'elsewhere',()=>dye.isConnected,shownRaw);
   if(record.ok)shownRaw=record.raw;
   if(dye.isConnected)for(const repaint of repaints)repaint(repaint===paintLook?message:'');
  };
  dye.append(appearance,title,detail,picker.row,picker.wearLabel,saveLook,status);
  paintLook();
  return [...cards,dye];
 }

 function journal(body:HTMLElement,walkToDoor:()=>void,previewSeal:()=>void,walkToForge:()=>void){
  const state=current();
  if(!state||state.rod==='unissued')return;
  const entry=document.createElement('section');entry.className='journal-ready-return';entry.dataset.pumpJournal='';
  const title=document.createElement('h3');title.textContent='The Pumpworks';
  const note=state.satchel==='at-pump'?'Your field satchel is on the lost property shelf.':
   state.reported?'Field seal':
   state.cleared?'The inspection desk is clear. Collect the field seal.':
   !equippedFieldWeapon(state)?'Equip a weapon in Bag before entering the chamber.':'Your survey gear is ready for the pump chamber.';
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
  if(state.forge?.phase==='working'){
   const order=document.createElement('section');order.className='journal-ready-return';order.dataset.forgeJournal='';
   const title=document.createElement('h3');title.textContent='Riveted survey vest';
   order.append(title,paragraph(forgeReady(state.forge,Date.now())?'Ready to collect.':'At the forge.'),button('Walk to the forge',walkToForge));
   body.append(order);
  }
 }

 function paintHealth(visible:boolean,field=false){
  const home=field?fieldReadout:worldHud;
  if(host.hud.parentElement!==home)home.append(host.hud);
  const state=current();
  host.hud.hidden=!visible||!state;
  if(host.hud.hidden||!state)return;
  const armor=field?fieldArmor(state):0;
  const key=state.health+':'+armor;
  if(host.hud.dataset.readout!==key){
   host.hud.dataset.readout=key;
   host.hud.dataset.health=String(state.health);
   host.hud.replaceChildren(meter('Health',state.health,FIELD_HEALTH));
   if(armor){
    const text=document.createElement('span');
    text.className='pump-armor';text.textContent='Armor '+armor;
    host.hud.append(text);
   }
  }
 }

 return {current,show,gear,journal,paintHealth,tick,encounter,encounterActive,strike,brace,eat};
}
