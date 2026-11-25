import {MOSSBANK_KEY,readMossbank,saveMossbank,type MossbankSurvey,type SurveyAction,type SurveyPlace} from '../game/mossbank.ts';
import {MOSSBANK_STOPS} from '../game/mossbank-room.ts';
import './mossbank.css';

type Host={
 body:HTMLElement;open:(title:string)=>void;place:()=>string|undefined;
 walk:(place:SurveyPlace|'mossbank-road')=>void;feedback:(message:string)=>void;
 saved:()=>void;preview:()=>void;
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

export function createMossbank(host:Host,storage:Pick<Storage,'getItem'|'setItem'>){
 function show(place:SurveyPlace){
  const stop=MOSSBANK_STOPS.find(stop=>stop.id===place);
  if(!stop||host.place()!==place)return;
  host.open(stop.name);
  const section=document.createElement('section');
  section.className='mossbank-field-card';section.dataset.mossbank=place;
  host.body.append(section);

  let record=readMossbank(storage);
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
   }else{
    if(place==='mossbank-flume'&&!state.flume)action('Mark the higher shelf for timber','flume');
    else if(place==='mossbank-windrow'&&!state.windrow)action('Record the alder windrow','windrow');
    else if(!state.windrow)next('Walk to the alder windrow','mossbank-windrow');
    else if(!state.flume)next('Walk to the flume landing','mossbank-flume');
    else next('Walk back to Wren','mossbank-mill');
   }
   const status=line(message);
   status.className='mossbank-status';status.role='status';status.tabIndex=-1;
   section.append(status);
  }

  async function commit(kind:SurveyAction){
   if(!record||busy||!present())return;
   const expected=record.raw;
   if(!navigator.locks){render('This browser cannot safely save the route card across tabs.');return;}
   for(const item of section.querySelectorAll('button'))item.disabled=true;
   busy=true;
   let result:string;
   try{
    result=await navigator.locks.request(MOSSBANK_KEY,()=>present()
     ?saveMossbank(storage,expected,kind,place).message
     :'Return to the route marker first.');
   }catch{result='The route card could not be confirmed.';}
   finally{busy=false;}
   record=readMossbank(storage);
   host.saved();host.feedback(result);
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
  const state=readMossbank(storage)?.state;
  if(!state?.joined)return;
  const entry=document.createElement('section');entry.className='journal-ready-return mossbank-field-card';entry.dataset.mossbankJournal='';
  const title=document.createElement('h3');title.textContent='Mossbank route card';entry.append(title);
  if(state.finished)entry.append(sample(),line('Alder swatch · Received from Wren after recording the windrow and flood line.'));
  else entry.append(mark(state));
  if(state.finished){
   const preview=document.createElement('button');
   preview.type='button';preview.className='destination';
   preview.textContent='Preview the swatch in your workshop';preview.onclick=host.preview;
   entry.append(preview);
  }
  const button=document.createElement('button');
  button.type='button';button.className='destination';
  button.textContent=host.place()?'Walk to Wren':'Walk toward Mossbank';button.onclick=()=>host.walk('mossbank-road');
  entry.append(button);body.append(entry);
 }

 return {show,journal};
}
