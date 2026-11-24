import {GLASSHOUSE_RULES, GLASSHOUSE_TASKS, type GlasshouseTask} from '../game/glasshouse.ts';
import type {TownClient, TownCommand} from './town-client.ts';
import './glasshouse.css';

const jobs:Record<GlasshouseTask,{name:string;ready:string;detail:string}> = {
 entrance:{name:'Clear the entrance',ready:'Entrance cleared',detail:'Free · pull the vines away from the door.'},
 frame:{name:'Supply the window frame',ready:'Window frame supplied',detail:'2 carried pine bundles.'},
 chart:{name:'File the planting chart',ready:'Planting chart filed',detail:'Free · requires all three Inkwood field notes.'},
};
const facades={
 'overgrown':'/art/glasshouse/overgrown.svg',
 'under-repair':'/art/glasshouse/under-repair.svg',
 'open':'/art/glasshouse/restored.svg',
};

type Host = {open:()=>void;body:HTMLElement;atDoor:()=>boolean};

export class GlasshouseBoard {
 private section?:HTMLElement;
 private resident='';
 private message='';
 private busy=false;
 private dismissedReview?:string;
 private key='';
 private readonly host:Host;
 private readonly town:TownClient;

 constructor(host:Host,town:TownClient){
  this.host=host;
  this.town=town;
 }

 show(){
  this.host.open();
  this.resident=this.town.snapshot?.playerId??'';
  this.message='';
  this.dismissedReview=undefined;
  this.key='';
  this.section=document.createElement('section');
  this.section.className='glasshouse-board';
  this.host.body.append(this.section);
  this.refresh();
 }

 refresh(){
  const section=this.section,snapshot=this.town.snapshot;
  if(!section?.isConnected||snapshot?.playerId!==this.resident||!snapshot.glasshouse)return;
  const {project,review}=snapshot.glasshouse;
  const now=this.town.serverNow(),pine=snapshot.workshop.carpentry.pine.carried,stamps=snapshot.trail?.stamps.length??0;
  const quote=review&&review.expiresAt>now&&review.id!==this.dismissedReview?review:null;
  const here=this.host.atDoor(),retry=this.town.retryAvailable;
  const blocked=this.busy||retry||this.town.isSaving||!here;
  const key=JSON.stringify([project,quote,pine,stamps,blocked,retry,here,this.message]);
  if(key===this.key)return;
  this.key=key;

  const art=document.createElement('img');
  art.src=facades[project.phase];
  art.className='glasshouse-art';
  art.alt='';
  art.width=148;
  art.height=112;
  const heading=document.createElement('h3');
  heading.textContent=project.phase==='overgrown'?'Three jobs to restore the Glasshouse':project.phase==='under-repair'?'Repairs funded':'Glasshouse restored';
  const note=document.createElement('p');
  note.textContent=project.phase==='overgrown'?'Pick any unfinished job. One resident can do them all, or neighbors can divide the work.'
   :project.phase==='under-repair'&&project.opensAt!==null?'The crew has until '+new Date(project.opensAt).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'})+'. Come back whenever you like.'
   :'The doors and new planting beds are ready. Interior visits are still in development.';
  const lead=document.createElement('div');
  lead.className='glasshouse-lead';
  const intro=document.createElement('div');
  intro.append(heading,note);
  lead.append(art,intro);
  const status=document.createElement('p');
  status.className='glasshouse-status';
  status.role='status';
  status.tabIndex=-1;
  status.textContent=this.message;
  section.replaceChildren(lead,status);

  if(quote){
   const reviewBox=document.createElement('section');
   reviewBox.className='glasshouse-quote';
   const title=document.createElement('h4');
   title.textContent=jobs[quote.task].name;
   const cost=document.createElement('p');
   cost.textContent=quote.pine?quote.pine+' pine · '+pine+' carried · '+Math.max(0,pine-quote.pine)+' after confirming.':'Free. Your field notes and supplies stay with you.';
   const confirm=this.button(quote.pine?'Confirm · give '+quote.pine+' pine':'Confirm · free',()=>void this.send({kind:'glasshouse-confirm',reviewId:quote.id}));
   confirm.disabled=blocked||pine<quote.pine;
   const cancel=this.button('Cancel review',()=>{
    this.dismissedReview=quote.id;
    this.message='Review closed. Nothing was spent.';
    this.refresh();
    this.revealStatus();
   });
   cancel.disabled=this.busy||retry;
   reviewBox.append(title,cost,confirm,cancel);
   section.append(reviewBox);
  } else if(project.phase==='overgrown'){
   for(const task of GLASSHOUSE_TASKS){
    const job=jobs[task];
    const row=document.createElement('section');
    row.className='glasshouse-job';
    const name=document.createElement('h4');
    name.textContent=project[task]?'✓ '+job.ready:job.name;
    row.append(name);
    if(!project[task]){
     const detail=document.createElement('p');
     detail.textContent=job.detail+(task==='frame'?' '+pine+' carried.':task==='chart'?' '+stamps+' of 3 recorded.':'');
     const action=this.button('Review '+(task==='entrance'?'entrance clearing':task==='frame'?'window frame':'planting chart'),()=>void this.send({kind:'glasshouse-review',task}));
     action.disabled=blocked||task==='frame'&&pine<GLASSHOUSE_RULES.pine||task==='chart'&&stamps!==3;
     row.append(detail,action);
    }
    section.append(row);
   }
  }
  if(retry)section.append(this.button('Retry the same request',()=>void this.send()));
 }

 private button(label:string,action:()=>void){
  const button=document.createElement('button');
  button.type='button';
  button.className='destination';
  button.textContent=label;
  button.onclick=action;
  return button;
 }

 private revealStatus(){
  const status=this.section?.querySelector<HTMLElement>('.glasshouse-status');
  if(status?.isConnected){
   status.focus({preventScroll:true});
   status.scrollIntoView({block:'center'});
  }
 }

 private async send(command?:TownCommand){
  const section=this.section,owner=this.town.snapshot?.playerId;
  if(this.busy||!section?.isConnected||owner!==this.resident)return;
  const priorQuote=this.town.snapshot?.glasshouse?.review?.id;
  this.busy=true;
  this.message='Confirming with the town…';
  this.refresh();
  const present=()=>section.isConnected&&owner===this.town.snapshot?.playerId;
  try{
   await (command?this.town.command(command,present):this.town.retry(present));
   if(present())this.message=this.town.lastMessage;
  }catch(error){
   if(present())this.message=(error as Error).message;
  }finally{
   this.busy=false;
   if(present()){
    this.refresh();
    const quote=this.town.snapshot?.glasshouse?.review;
    if(!this.town.retryAvailable&&quote&&quote.id!==priorQuote){
     const primary=section.querySelector<HTMLButtonElement>('.glasshouse-quote button:not(:disabled)');
     primary?.focus({preventScroll:true});
     primary?.scrollIntoView({block:'center'});
    }else this.revealStatus();
   }
  }
 }
}
