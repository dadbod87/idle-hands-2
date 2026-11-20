import {HEADWEAR,headwearName,isHeadwear} from '../art/headwear.ts';
import {ARRIVAL_STORIES,isArrivalStory} from '../game/arrival-stories.ts';
import {RESIDENT_IDS, type ResidentId} from '../art/variety.ts';
import {BROWSER_RESIDENT_KEY, readBrowserResident, saveBrowserResident, type BrowserResident} from '../game/browser-resident.ts';
import './browser-resident.css';

const storage = {getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};
const appearances: Record<ResidentId,string> = {
 aster: 'Short hair and teal jacket', bea: 'Curly hair and an apron',
 casey: 'Long hair and olive vest', devon: 'Cap and blue jacket',
};

type Host = {open:(title:string)=>void; body:HTMLElement; appearance:(profile:BrowserResident|null)=>void};

export function mountBrowserResident(host:Host) {
 host.appearance(readBrowserResident(storage).resident);
 window.addEventListener('storage',event=>{
  if(event.key===null||event.key===BROWSER_RESIDENT_KEY) host.appearance(readBrowserResident(storage).resident);
 });
 return () => {
  host.open('Your resident');
  const current=readBrowserResident(storage);
  const status=document.createElement('p');
  status.className='resident-profile-status';
  status.id='resident-profile-status';
  status.setAttribute('role','status');
  if(current.status!=='ready'){
   status.textContent=current.status==='unreadable'
    ?'This saved appearance could not be read. Its original record is kept.'
    :'This browser has blocked storage for your appearance.';
   host.body.append(status);
   return;
  }

  let baseline=current.raw;
  const editor=document.createElement('section');
  editor.className='resident-profile';
  const label=document.createElement('label');
  label.textContent='Name on your badge';
  const name=document.createElement('input');
  name.setAttribute('aria-required','true');
  name.maxLength=120;
  name.dir='auto';
  name.autocomplete='off';
  name.value=current.resident?.name??'';
  name.addEventListener('input',()=>{
   if(!name.hasAttribute('aria-invalid'))return;
   name.removeAttribute('aria-invalid');
   name.removeAttribute('aria-describedby');
   status.textContent='';
  });
  label.append(name);
  const options=document.createElement('fieldset');
  const legend=document.createElement('legend');
  legend.textContent='Appearance';
  options.append(legend);
  const looks=document.createElement('div');
  looks.className='resident-profile-looks';
  let selected=current.resident?.look??'devon';
  const previews:HTMLElement[]=[];
  for(const look of RESIDENT_IDS){
   const choice=document.createElement('label');
   const radio=document.createElement('input');
   radio.type='radio';
   radio.name='resident-look';
   radio.value=look;
   radio.checked=look===selected;
   radio.setAttribute('aria-label',appearances[look]);
   radio.onchange=()=>{selected=look;};
   const preview=document.createElement('span');
   preview.className='resident-profile-tile';
   preview.setAttribute('aria-hidden','true');
   const art=document.createElement('span');
   art.className='resident-profile-art';
   art.style.backgroundImage='url(/art/variety/resident-'+look+'.svg)';
   const top=document.createElement('span');
   top.className='resident-profile-headwear';
   art.append(top);
   previews.push(top);
   preview.append(art);
   choice.append(radio,preview);
   looks.append(choice);
  }
  options.append(looks);

  const headwearLabel=document.createElement('label');
  headwearLabel.textContent='Headwear';
  headwearLabel.htmlFor='resident-headwear';
  const headwear=document.createElement('select');
  headwear.id=headwearLabel.htmlFor;
  headwear.append(new Option('Original look','none'));
  for(const hat of HEADWEAR)headwear.append(new Option(headwearName[hat],hat));
  headwear.value=current.resident&&current.resident.version!==1?current.resident.headwear??'none':'none';
  const previewHeadwear=()=>{
   const value=headwear.value;
   for(const layer of previews)layer.style.backgroundImage=isHeadwear(value)?'url(/art/headwear/'+value+'.svg)':'none';
  };
  headwear.addEventListener('change',previewHeadwear);
  previewHeadwear();
  const headwearChoice=document.createElement('div');
  headwearChoice.className='resident-profile-headwear-choice';
  headwearChoice.append(headwearLabel,headwear);

  const storyChoice=document.createElement('div');
  storyChoice.className='resident-profile-story-choice';
  const storyLabel=document.createElement('label');
  storyLabel.textContent='Arrival story';
  storyLabel.htmlFor='resident-story';
  const story=document.createElement('select');
  story.id=storyLabel.htmlFor;
  story.append(new Option('No story','none'));
  for(const [id,choice] of Object.entries(ARRIVAL_STORIES))story.append(new Option(choice.label,id));
  story.value=current.resident?.version===3?current.resident.story:'none';
  storyChoice.append(storyLabel,story);
  const choices=document.createElement('div');
  choices.className='resident-profile-selects';
  choices.append(headwearChoice,storyChoice);

  const submit=document.createElement('button');
  submit.type='button';
  submit.className='destination';
  submit.textContent='Save changes';
  editor.append(label,options,choices,submit,status);
  host.body.append(editor);

  async function save(){

   if(submit.disabled)return;
   submit.disabled=true;
   name.readOnly=true;
   options.disabled=true;
   headwear.disabled=true;
   story.disabled=true;
   name.removeAttribute('aria-invalid');
   name.removeAttribute('aria-describedby');
   const submittedName=name.value,submittedLook=selected;
   const submittedHat=isHeadwear(headwear.value)?headwear.value:null;
   const submittedStory=isArrivalStory(story.value)?story.value:null;
   const write=()=>saveBrowserResident(storage,baseline,submittedName,submittedLook,submittedHat,submittedStory);
   try{
    const result=navigator.locks?await navigator.locks.request(BROWSER_RESIDENT_KEY,write):write();
    if(result.status==='saved'){
     baseline=result.raw;
     host.appearance(result.resident);
     if(editor.isConnected)status.textContent='Resident saved in this browser.';
    }else if(editor.isConnected){
     if(result.status==='invalid'){
      status.textContent='Enter a name up to 24 characters using letters or numbers.';
      name.setAttribute('aria-invalid','true');
      name.setAttribute('aria-describedby',status.id);
      name.focus();
     }else if(result.status==='changed'){
      status.textContent='Appearance changed in another tab. Reopen this panel to review it.';
     }else{
      status.textContent='Your appearance could not be saved. The previous appearance is kept.';
     }
    }
   }catch{
    if(editor.isConnected)status.textContent='Your appearance could not be saved. The previous appearance is kept.';
   }finally{
    submit.disabled=false;
    name.readOnly=false;
    options.disabled=false;
    headwear.disabled=false;
    story.disabled=false;
   }
  }
  submit.onclick=()=>void save();
  editor.addEventListener('focusin',event=>{
   const target=event.target;
   const dialog=editor.closest('dialog'),header=dialog?.querySelector('.dialog-head');
   if(!(target instanceof HTMLElement)||!target.matches(':focus-visible')||!dialog||!header)return;
   const item=target===name?label:target===headwear?headwearChoice:target===story?storyChoice:target.closest('label')??target;
   const bounds=item.getBoundingClientRect();
   const top=header.getBoundingClientRect().bottom+6,bottom=dialog.getBoundingClientRect().bottom-6;
   if(bounds.top<top)dialog.scrollTop+=bounds.top-top;
   else if(bounds.bottom>bottom)dialog.scrollTop+=bounds.bottom-bottom;
  });
  editor.addEventListener('keydown',event=>{
   if(event.key!=='Enter'||!(event.target instanceof HTMLInputElement))return;
   event.preventDefault();
   if(event.target===name)void save();
  });
 };
}
