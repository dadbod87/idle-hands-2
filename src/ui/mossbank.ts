import {MOSSBANK_KEY,readMossbank,saveMossbank,type MossbankSurvey,type SurveyAction,type SurveyPlace} from '../game/mossbank.ts';
import {MOSSBANK_STOPS} from '../game/mossbank-room.ts';
import './mossbank.css';

type Host={
 body:HTMLElement;open:(title:string)=>void;place:()=>string|undefined;
 walk:(place:SurveyPlace|'mossbank-road')=>void;feedback:(message:string)=>void;
 saved:()=>void;preview?:()=>void;inMossbank:()=>boolean;observationCue:()=>void;
};

type SurveyRecord=NonNullable<ReturnType<typeof readMossbank>>;
type SharedSurvey={
 read:()=>SurveyRecord|null;
 save:(action:SurveyAction,expected:string|null,present:()=>boolean)=>Promise<{ok:boolean;message:string}>;
};

function line(copy:string){
 const p=document.createElement('p');p.textContent=copy;return p;
}
function mark(state:MossbankSurvey){
 const list=document.createElement('ul');list.className='mossbank-checklist';
 for(const [name,done] of [['Alder windrow',state.windrow],['Flume landing',state.flume]] as const){
  const item=document.createElement('li');
  item.textContent=(done?'Recorded · ':'To visit · ')+name;
  list.append(item);
 }
 return list;
}

export function createMossbank(host:Host,storage:Pick<Storage,'getItem'|'setItem'>,shared?:SharedSurvey){
 const read=()=>shared?shared.read():readMossbank(storage);
 let saving=false;
 async function save(action:SurveyAction,place:SurveyPlace,expected:string|null,present:()=>boolean){
  if(!shared&&!navigator.locks)return 'This browser cannot safely save the route card across tabs.';
  if(saving||!present())return '';
  saving=true;
  try{
   const result=shared?await shared.save(action,expected,present):await navigator.locks.request(MOSSBANK_KEY,()=>present()
    ?saveMossbank(storage,expected,action,place)
    :{ok:false,message:'Return to the route marker first.'} as const);
   if(result.ok){host.saved();if(action==='windrow'||action==='flume')host.observationCue();}
   return result.message;
  }catch{return 'The route card could not be confirmed.';}
  finally{saving=false;}
 }

 async function observe(place:'mossbank-windrow'|'mossbank-flume',record:SurveyRecord){
  const action=place==='mossbank-windrow'?'windrow':'flume';
  if(record.state[action]){
   host.feedback(record.state.finished?'Wren filed this observation.':'Already recorded. Check the route card in Journal.');
   return;
  }
  const message=await save(action,place,record.raw,()=>host.inMossbank()&&host.place()===place);
  if(message)host.feedback(message);
 }

 function show(place:SurveyPlace){
  const stop=MOSSBANK_STOPS.find(stop=>stop.id===place);
  if(!stop||host.place()!==place)return;
  let record=read();
  if(record?.state.joined&&(place==='mossbank-windrow'||place==='mossbank-flume')){
   void observe(place,record);
   return;
  }
  host.open(stop.name);
  const section=document.createElement('section');
  section.className='mossbank-field-card';section.dataset.mossbank=place;
  host.body.append(section);

  let busy=false;
  const present=()=>section.isConnected&&host.place()===place;
  const button=(label:string,callback:()=>void)=>{
   const control=document.createElement('button');
   control.className='destination';control.type='button';control.textContent=label;
   control.onclick=callback;
   section.append(control);
  };
  const next=(label:string,target:SurveyPlace)=>button(label,()=>host.walk(target));
  const action=(label:string,kind:SurveyAction)=>button(label,()=>void commit(kind));

  function render(message=''){
   if(!present())return;
   section.replaceChildren();
   const state=record?.state;
   if(!state){section.append(line('Your route card is unavailable. The road stays open.'));return;}
   if(place!=='mossbank-mill'||!state.joined) section.append(line(stop!.text));

   if(place==='mossbank-mill'){
    if(!state.joined){
     section.append(line('Wren needs two observations before the next timber delivery.'));
     action('Take the route card','join');
    }else if(state.finished){
     section.append(sample(),line('Your route card is complete. The sample is in your Journal.'));
     next('Visit the sapling beds','mossbank-nursery');
    }else{
     section.append(line(state.windrow||state.flume?'One observation remains.':'Choose either stop first.'));
     if(state.flume&&state.windrow)action('Trade the survey for an alder swatch','finish');
     else {
      if(!state.windrow)next('Walk to the alder windrow','mossbank-windrow');
      if(!state.flume)next('Walk to the flume landing','mossbank-flume');
     }
    }
   }else if(place==='mossbank-nursery'){
    section.append(line('Alder grows by the wet bank. Pine prefers the dry rise. The rabbits prefer what you planted last.'));
   }else if(!state.joined){
    next('Meet Wren at the sawmill','mossbank-mill');
   }
   const status=line(message);
   status.className='mossbank-status';status.role='status';status.tabIndex=-1;
   section.append(status);
  }

  async function commit(kind:SurveyAction){
   if(!record||busy||!present())return;
   const expected=record.raw;
   for(const item of section.querySelectorAll('button'))item.disabled=true;
   busy=true;
   const result=await save(kind,place,expected,present);
   busy=false;
   record=read();
   if(result)host.feedback(result);
   if(!present())return;
   render(result);
   section.querySelector<HTMLElement>('[role=status]')?.focus({preventScroll:true});
  }
  render();
 }

 function sample(){
  const img=document.createElement('img');
  img.src='/art/mossbank/alder-swatch.svg';img.alt='A honey-brown alder sample with visible grain';
  img.width=96;img.height=78;
  return img;
 }

 function journal(body:HTMLElement){
  const state=read()?.state;
  if(!state?.joined)return;
  const entry=document.createElement('section');entry.className='journal-ready-return mossbank-field-card';entry.dataset.mossbankJournal='';
  const title=document.createElement('h3');title.textContent='Mossbank route card';entry.append(title);
  if(state.finished){
   const reward=line('Alder swatch');
   reward.className='field-keepsake-summary';
   reward.prepend(sample());
   entry.append(reward);
  }else entry.append(mark(state));
  if(state.finished&&host.preview){
   const preview=document.createElement('button');
   preview.type='button';preview.className='destination';
   preview.textContent='Preview the swatch in your workshop';preview.onclick=host.preview;
   entry.append(preview);
  }
  const route=(name:string,destination:SurveyPlace|'mossbank-road')=>{
   const button=document.createElement('button');
   button.type='button';button.className='destination';
   button.textContent=name;button.onclick=()=>host.walk(destination);
   entry.append(button);
  };
  if(!host.inMossbank())route('Walk toward Mossbank','mossbank-road');
  else if(state.finished||state.windrow&&state.flume)route('Walk to Wren','mossbank-mill');
  else{
   if(!state.windrow)route('Walk to the alder windrow','mossbank-windrow');
   if(!state.flume)route('Walk to the flume landing','mossbank-flume');
  }
  body.append(entry);
 }

 return {show,journal};
}
