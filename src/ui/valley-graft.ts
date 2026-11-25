import {GRAFT_IDS,GRAFT_MINUTES,VALLEY_GRAFTS,graftReady,type GraftId,type ValleyGraft} from '../game/valley-graft.ts';
import './valley-graft.css';

type View={ok:true;order:ValleyGraft|null}|{ok:false;message:string};
type Host={read:()=>View;start:(id:GraftId,present:()=>boolean)=>Promise<View>};

function paragraph(value:string){
 const text=document.createElement('p');text.textContent=value;return text;
}
function action(label:string,fn:()=>void){
 const button=document.createElement('button');
 button.type='button';button.className='destination';button.textContent=label;button.onclick=fn;
 return button;
}
export function showValleyGraft(body:HTMLElement,host:Host){
 const area=document.createElement('section');area.className='valley-graft';
 body.append(area);
 let busy=false,note='';
 function render(focus=false){
  if(!area.isConnected)return;
  area.replaceChildren();
  const state=host.read();
  if(!state.ok){area.append(paragraph(state.message));return;}
  const order=state.order;
  if(order){
   const variety=VALLEY_GRAFTS[order.variety];
   const badge=document.createElement('img');
   badge.src='/art/hidden-valley/graft-'+order.variety+'.svg';badge.width=110;badge.height=110;badge.alt='';
   const title=document.createElement('h3');title.textContent=variety.name;
   const timer=paragraph('');
   const tick=()=>{
    if(!timer.isConnected)return;
    const now=Date.now();
    if(graftReady(order,now)){
     timer.textContent='Established. Look for your tree beside the grafting house.';
     return;
    }
    const seconds=Math.max(1,Math.ceil((order.readyAt-now)/1000));
    timer.textContent='Ready in '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    window.setTimeout(tick,500);
   };
   area.append(badge,title,timer);
   tick();
  }else{
   area.append(paragraph('Choose one graft for the tree beside the house. It takes '+GRAFT_MINUTES+' minutes to establish.'));
   const choices=document.createElement('fieldset');choices.className='graft-choices';
   const legend=document.createElement('legend');legend.textContent='Choose a variety';choices.append(legend);
   let selected:GraftId|undefined;
   const start=action('Set the graft',()=>{if(selected)void submit(selected);});
   start.disabled=true;start.classList.add('primary');
   for(const id of GRAFT_IDS){
    const option=document.createElement('input');option.type='radio';option.name='valley-graft';option.value=id;
    option.onchange=()=>{selected=id;start.disabled=busy;};
    const label=document.createElement('label');
    const image=document.createElement('img');image.src='/art/hidden-valley/graft-'+id+'.svg';image.alt='';image.width=44;image.height=44;
    const name=document.createElement('span');name.textContent=VALLEY_GRAFTS[id].name;
    label.title=VALLEY_GRAFTS[id].hint;
    label.append(option,image,name);choices.append(label);
   }
   area.append(choices,start);
  }
  if(note){
   const status=paragraph(note);status.role='status';status.tabIndex=-1;area.append(status);
   if(focus)status.focus({preventScroll:true});
  }
 }
 async function submit(id:GraftId){
  if(busy)return;
  busy=true;
  for(const control of area.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button'))control.disabled=true;
  try{
   const receipt=await host.start(id,()=>area.isConnected);
   note=receipt.ok?'Graft saved. Mabel has optimistically filed the inspection.':receipt.message;
  }catch{note='The graft request could not be confirmed. Check the current record.';}
  finally{busy=false;render(true);}
 }
 render();
}
export function valleyGraftJournal(body:HTMLElement,order:ValleyGraft|null,walk:()=>void){
 if(!order)return;
 const section=document.createElement('section');
 section.className='journal-ready-return';section.dataset.valleyGraftJournal='';
 const title=document.createElement('h3');title.textContent=VALLEY_GRAFTS[order.variety].name+' graft';
 section.append(title,paragraph(graftReady(order,Date.now())?'Established at the grafting house.':'Growing beside the grafting house.'),action('Walk to the grafting house',walk));
 body.append(section);
}
