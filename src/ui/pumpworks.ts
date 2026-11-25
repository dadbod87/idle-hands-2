import {
 FIELD_HEALTH,HOPPER_TELLS,PUMPWORKS_KEY,readPumpworks,savePumpworks,
 type PumpworksAction,type PumpworksPlace,
} from '../game/pumpworks.ts';
import './pumpworks.css';

const ROD_ART='/art/pumpworks/sounding-rod.svg';

type Host={
 body:HTMLElement;
 hud:HTMLElement;
 open:(title:string)=>void;
 place:()=>PumpworksPlace;
 equipment:()=>void;
 moveToBed:()=>void;
 update:()=>void;
 feedback:(message:string)=>void;
};

const titles:Partial<Record<PumpworksPlace,string>>={
 locker:'Survey locker',arena:'Silt hopper',bench:'Dry bench',bed:'Boarding-house bed',
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
 const current=()=>record.ok?record.state:null;
 const refresh=()=>{record=readPumpworks(storage);host.update();};
 window.addEventListener('storage',event=>{if(event.key===PUMPWORKS_KEY||event.key===null)refresh();});

 function button(label:string,click:()=>void){
  const item=document.createElement('button');
  item.type='button';item.className='destination';item.textContent=label;item.disabled=busy;
  item.onclick=click;
  return item;
 }

 async function change(action:PumpworksAction,place:PumpworksPlace,present:()=>boolean,expected:string|null){
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
    if(!present()||(place!=='elsewhere'&&host.place()!==place))return {ok:false as const,message:'Return to the marked spot first.'};
    return savePumpworks(storage,expected,action,place);
   });
   refresh();
   host.feedback(result.message);
   if(result.ok&&result.returnToBed)host.moveToBed();
   return result.message;
  }catch{
   const text='The outing could not be confirmed in this browser.';
   host.feedback(text);return text;
  }finally{busy=false;}
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
     panel.append(paragraph('Borrow a sounding rod and field satchel before crossing the water.'));
     add('Pack the survey kit','issue');
    }else{
     panel.append(paragraph(state.rod==='equipped'?'Your rod is equipped. Cross the footbridge to the hopper.':'Your rod is packed. Equip it in Bag before you approach the hopper.'));
     panel.append(button('Open Bag',host.equipment));
    }
   }else if(place==='arena'){
    const gauges=document.createElement('div');gauges.className='pump-gauges';
    gauges.append(meter('Your health',state.health,FIELD_HEALTH));
    panel.append(gauges);
    if(state.cleared)panel.append(paragraph('The hopper slipped through the grate. The inspection desk is clear.'));
    else if(state.fight){
     gauges.append(meter('Silt hopper',state.fight.health,9));
     const tell=paragraph(HOPPER_TELLS[state.fight.tell]);
     tell.className='pump-tell';tell.dataset.tell=state.fight.tell;
     panel.append(tell);
     const actions=document.createElement('div');
     actions.className='pump-actions';
     actions.append(button('Strike with rod',()=>void submit('strike')),button('Brace',()=>void submit('brace')));
     panel.append(actions);
     add('Step back','retreat');
    }else{
     panel.append(paragraph('The hopper waits past the wet tiles. Read its movements, and brace when it crouches.'));
     if(state.rod==='equipped')add('Face the Silt hopper','begin');
     else panel.append(button('Open Bag to equip the rod',host.equipment));
    }
   }else if(place==='bench'||place==='bed'){
    panel.append(meter('Your health',state.health,FIELD_HEALTH));
    if(state.recovering){
     panel.append(paragraph('You’re back in Ledgerwick. The field satchel is on the lost property shelf in the Pumpworks.'));
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
    if(place==='arena')panel.closest('dialog')?.scrollTo(0,0);
   }
  }
  refresh();
  render();
 }

 function bag(body:HTMLElement){
  if(!record.ok)return;
  const state=record.state;
  let shownRaw=record.raw;
  if(state.rod==='unissued')return;
  const card=document.createElement('section');card.className='pump-bag-card';card.dataset.pumpBag='';
  const art=document.createElement('img');art.src=ROD_ART;art.alt='';art.width=40;art.height=46;
  const copy=document.createElement('div');
  const title=document.createElement('strong');title.textContent='Sounding rod';
  copy.append(title,paragraph(state.rod==='equipped'?'Equipped · Pumpworks survey gear':'Packed · Pumpworks survey gear'));
  card.append(art,copy);
  const control=button(state.rod==='equipped'?'Pack sounding rod':'Equip sounding rod',()=>{});
  const status=paragraph('');status.className='glasshouse-status';status.role='status';
  control.disabled=busy||!!state.fight||state.recovering;
  control.onclick=async()=>{
   if(busy)return;
   control.disabled=true;
   const message=await change(control.textContent==='Pack sounding rod'?'pack':'equip','elsewhere',()=>card.isConnected,shownRaw);
   if(record.ok)shownRaw=record.raw;
   if(!card.isConnected)return;
   const after=current();
   copy.lastElementChild!.textContent=after?.rod==='equipped'?'Equipped · Pumpworks survey gear':'Packed · Pumpworks survey gear';
   control.textContent=after?.rod==='equipped'?'Pack sounding rod':'Equip sounding rod';
   control.disabled=!!after?.fight||!!after?.recovering;
   status.textContent=message;
  };
  card.append(control,status);
  body.append(card);
 }

 function journal(body:HTMLElement,walkToDoor:()=>void){
  const state=current();
  if(!state||state.rod==='unissued')return;
  const entry=document.createElement('section');entry.className='journal-ready-return';entry.dataset.pumpJournal='';
  const title=document.createElement('h3');title.textContent='The Pumpworks';
  const note=state.satchel==='at-pump'?'Your field satchel is on the lost property shelf.':
   state.reported?'Field seal · Silt hopper cleared and the pump inspected.':
   state.cleared?'The inspection desk is clear. Collect the field seal.':
   state.rod==='packed'?'Equip the sounding rod in Bag before entering the chamber.':'Your survey gear is ready for the pump chamber.';
  entry.append(title,paragraph(note),button('Walk to the Pumpworks',walkToDoor));
  body.append(entry);
 }

 function paintHealth(visible:boolean){
  const state=current();
  host.hud.hidden=!visible||!state;
  if(host.hud.hidden||!state)return;
  const key=String(state.health);
  if(host.hud.dataset.health!==key){
   host.hud.dataset.health=key;
   host.hud.replaceChildren(meter('Health',state.health,FIELD_HEALTH));
  }
 }

 return {current,show,bag,journal,paintHealth};
}
