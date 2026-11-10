import { createWorkshop, loadWorkshop, settleWorkshop, applyWorkshop, questStep, RESOURCE_IDS, PROP_IDS, PLACEMENT_SLOTS, type WorkshopState, type WorkshopCommand, skillLevel } from '../game/workshop.ts';
import './workshop.css';
const SAVE_KEY='ih2:workshop:v1';
const names:Record<string,string>={scrap:'Scrap',timber:'Timber',supplies:'Supplies',planter:'Orientation planter',stool:'Break-time stool',rug:'Welcome rug',lamp:'Optimism lamp',crate:'Useful crate',shelf:'Almost level shelf'};
export const duration=(ms:number)=>{const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=3600?`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
export type RemoteWorkshopAdapter={allocatedElsewhere?:(prop:string)=>number;initial?:WorkshopState;load:()=>Promise<WorkshopState>;command:(command:Record<string,unknown>)=>Promise<{state:WorkshopState;message:string}>;retry:()=>Promise<{state:WorkshopState;message:string}>;canRetry:()=>boolean;now:()=>number;subscribe:(listener:(state:WorkshopState)=>void)=>()=>void};
type PanelHost={open:(heading:string)=>void;body:HTMLElement;feedback:(message:string)=>void;inside:()=>boolean;changed:()=>void;teaching?:()=>void;returns?:()=>void;home?:()=>void;homeAvailable?:()=>boolean};
export class WorkshopUI {
 state:WorkshopState;
 private serialized='';
 private active:(()=>void)|null=null;
 private selected:string='planter';
 private preview:string|null=null;
 private status:HTMLElement|null=null;
 private ownsSave=false;
 private releaseLock:(()=>void)|null=null;
 private saved=true;
 private lastSlot:string|null=null;
 private ticker:number;
 private remoteBusy=false;
 private remoteError='';
 constructor(private host:PanelHost,private remote?:RemoteWorkshopAdapter){
  if(remote){
   this.state=remote.initial??createWorkshop(Date.now());
   remote.subscribe(state=>this.acceptRemote(state));
   this.ticker=window.setInterval(()=>this.updateClocks(),1000);
   window.addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(this.ticker);});
   window.addEventListener('pageshow',event=>{if(event.persisted){this.updateClocks();void remote.load().then(state=>this.acceptRemote(state)).catch(error=>this.host.feedback(error.message));}});
   if(!remote.initial){this.remoteBusy=true;void remote.load().then(state=>this.acceptRemote(state)).catch(error=>{this.remoteError=error.message;this.host.feedback(error.message);}).finally(()=>{this.remoteBusy=false;this.updateClocks();});}
   return;
  }
  let raw:unknown=null;try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)??'null');}catch{raw='invalid';}
  const loaded=raw===null?{state:createWorkshop(Date.now()),recovered:false}:loadWorkshop(raw,Date.now());this.state=loaded.state;
  if(loaded.recovered)host.feedback('The local workshop save was invalid. A fresh practice workshop is open; no online account is connected.');
  const acquire=()=>{if(!navigator.locks){this.host.feedback('This browser cannot coordinate local saves. Workshop actions are read-only here.');return;}
   void navigator.locks.request('ih2:workshop-writer',{ifAvailable:true},async lock=>{
    if(!lock){this.host.feedback('Workshop open in another tab. This tab is read-only; close the other tab and reload to continue.');return;}
    this.ownsSave=true;this.synchronize();this.persist();await new Promise<void>(resolve=>this.releaseLock=resolve);
   });
  };acquire();
  window.addEventListener('storage',event=>{if(event.key===SAVE_KEY)this.synchronize();});
  window.addEventListener('pageshow',event=>{if(event.persisted)acquire();});
  this.ticker=window.setInterval(()=>{const before=JSON.stringify(this.state);if(!this.ownsSave){this.updateClocks();return;}this.state=settleWorkshop(this.state,Date.now());if(JSON.stringify(this.state)!==before){this.persist();this.host.changed();}this.updateClocks();},1000);
  window.addEventListener('pagehide',()=>{this.persist();this.ownsSave=false;this.releaseLock?.();this.releaseLock=null;});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.state=settleWorkshop(this.state,Date.now());this.persist();this.updateClocks();}});
 }
 snapshot(){return JSON.parse(JSON.stringify(this.state));}
 closed(){this.active=null;this.status=null;this.preview=null;}
 private acceptRemote(state:WorkshopState){this.state=state;if(!this.remote?.canRetry())this.remoteError='';this.host.changed();this.updateClocks();this.host.body.querySelectorAll<HTMLElement>('[data-quantity]').forEach(el=>el.textContent=String(state.inventory[el.dataset.quantity as typeof RESOURCE_IDS[number]]));}
 private remoteNotice(){if(!this.remote||!this.status)return;if(this.remoteBusy||this.remoteError)this.status.textContent=this.remoteBusy?'Waiting for server confirmation…':this.remoteError;let retry=this.host.body.querySelector<HTMLButtonElement>('.remote-retry');if(!retry){retry=this.button('Retry the same request',()=>void this.remoteDispatch(null),'remote-retry');this.status.after(retry);}retry.hidden=!this.remoteError;retry.disabled=this.remoteBusy;}
 private async remoteDispatch(command:Record<string,unknown>|null){if(!this.remote||this.remoteBusy)return;if(command&&this.remote.canRetry()){this.remoteError='Retry the previous request before making another change.';this.remoteNotice();return;}this.remoteBusy=true;this.remoteError='';this.updateClocks();try{const receipt=command?await this.remote.command(command):this.remote.canRetry()?await this.remote.retry():{state:await this.remote.load(),message:'Town state refreshed.'};this.acceptRemote(receipt.state);this.host.feedback(receipt.message);if(this.status)this.status.textContent=receipt.message;this.preview=null;if(this.host.body.querySelector('#placement'))this.renderPlacement();}catch(error){this.remoteError=(error as Error).message;this.host.feedback(this.remoteError);}finally{this.remoteBusy=false;this.updateClocks();if(this.remoteError)this.remoteNotice();}}
 private synchronize(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw||raw===this.serialized)return;const loaded=loadWorkshop(JSON.parse(raw),Date.now());if(loaded.recovered)return;this.state=loaded.state;this.serialized=raw;this.host.changed();this.active?.();}catch{/* Existing in-memory progress remains available; persist reports any write failure. */}}
 private persist(){if(this.remote)return true;if(!this.ownsSave)return this.saved;const next=JSON.stringify(this.state);if(next===this.serialized)return this.saved;try{localStorage.setItem(SAVE_KEY,next);this.serialized=next;this.saved=true;}catch{this.saved=false;this.host.feedback('Local save failed. Keep this tab open; new progress will be lost on reload.');}const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent=this.saved?'Local workshop · saved here':'Unsaved practice · keep tab open';return this.saved;}
 private button(text:string,handler:()=>void,className=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=className;b.onclick=handler;return b;}
 private p(text:string,className=''){const p=document.createElement('p');p.textContent=text;p.className=className;return p;}
 private begin(title:string,render:()=>void){if(!this.remote)this.state=settleWorkshop(this.state,Date.now());this.persist();this.host.open(title);this.active=render;this.status=null;if(this.remote)this.remoteBusy=true;render();if(this.remote){void this.remote.load().then(state=>this.acceptRemote(state)).catch(error=>{this.remoteError=error.message;this.host.feedback(error.message);}).finally(()=>{this.remoteBusy=false;this.updateClocks();});}}
 private notice(){this.status=this.p('','workshop-status');this.status.setAttribute('role','status');this.host.body.append(this.status);this.remoteNotice();}
 private dispatch(command:Record<string,unknown>){
  if(this.remote){void this.remoteDispatch(command);return;}
  if(!this.ownsSave){const message='Workshop open in another tab, or local-save coordination unavailable. Close other game tabs and reload this one to continue.';this.host.feedback(message);if(this.status)this.status.textContent=message;return;}
  const receipt=applyWorkshop(this.state,{...command,id:crypto.randomUUID(),expectedRevision:this.state.revision} as WorkshopCommand,Date.now());this.state=receipt.state;this.persist();const message=receipt.message+(this.saved?'':' Local save failed; this progress will be lost on reload.');this.host.feedback(message);this.host.changed();
  // Keep the action controls stable: update quantities/timers without rebuilding the form.
  this.updateClocks();if(this.status)this.status.textContent=message;
  this.host.body.querySelectorAll<HTMLElement>('[data-quantity]').forEach(el=>{el.textContent=String(this.state.inventory[el.dataset.quantity as typeof RESOURCE_IDS[number]]);});
 }
 private disclosure(){return this.p(this.remote?'Shared practice town · fictional residents. Confirmed changes are saved here.':'Local practice save · this browser only. No account, trading or shared town progress.','disclosure');}
 private resources(){const list=document.createElement('dl');list.className='resource-list';for(const id of RESOURCE_IDS){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=names[id];const icon=document.createElement('img');icon.src='/art/homes/home-'+id+'-icon.svg';icon.alt='';icon.width=32;icon.height=32;icon.className='item-icon';dt.prepend(icon);dd.dataset.quantity=id;dd.textContent=String(this.state.inventory[id]);list.append(dt,dd);}return list;}
 showResource(resource:typeof RESOURCE_IDS[number]){const render=()=>{
  const b=this.host.body;b.replaceChildren();b.append(this.p('Rescued from the company’s extremely ambitious disposal policy.'),this.resources());
  const stock=this.p('');stock.dataset.node=resource;b.append(stock);
  const collect=this.button('Collect available '+names[resource].toLowerCase(),()=>this.dispatch({kind:'gather',resource}),'primary');collect.dataset.collect=resource;b.append(collect);
  this.notice();b.append(this.p('Each depot holds at most 6. One unit returns every 4 real hours, for up to 24 real hours per absence. Bag capacity: 60 materials. Returning often does not speed it up.','disclosure'),this.disclosure());this.updateClocks();
 };this.begin(names[resource]+' depot',render);}
 showBench(){const render=()=>{
  const b=this.host.body;b.replaceChildren();b.append(this.p('Useful work. Unnecessary forms. One job at a time. All durations use real time, not the town’s day/night clock.'),this.resources());
  const job=this.p('');job.dataset.job='';b.append(job);
  const claim=this.button('Collect finished work',()=>this.dispatch({kind:'claim'}),'destination');claim.dataset.claim='';b.append(claim);
  const recipes=[{id:'planter',label:'Make orientation planter',text:'2 scrap + 2 timber + 1 supplies. First planter: 5 seconds, once. Later planters: 8 real hours.'},{id:'bridge-kit',label:'Make bridge supplies',text:'3 scrap + 2 timber + 1 supplies. 12 real hours. '+(this.remote?'Bring the finished kit to the bridge committee.':'Crafting practice stock stays in this browser’s workshop.')}];
  for(const recipe of recipes){const section=document.createElement('section');section.className='recipe';const craft=this.button(recipe.label,()=>this.dispatch({kind:'craft',recipe:recipe.id}),'destination');craft.dataset.craft=recipe.id;section.append(this.p(recipe.text),craft);b.append(section);}
  if(this.host.teaching)b.append(this.button('Orientation maintenance · one-time contribution',()=>this.host.teaching?.(),'destination'));this.notice();b.append(this.p('A queued job finishes while you are away and waits for collection. No automatic repeat jobs or hidden lost output.','disclosure'),this.disclosure());this.updateClocks();
 };this.begin('Your work bench',render);}
 showInventory(){const render=()=>{
  const b=this.host.body;b.replaceChildren();b.append(this.resources());
  const quest=this.p('');quest.dataset.quest='';quest.className='quest-card';b.append(quest);
  const skill=this.p('');skill.dataset.skills='';b.append(skill);
  const kits=this.p('');kits.dataset.kits='';b.append(kits);
  if(this.host.home&&this.host.homeAvailable?.())b.append(this.button('Inspect or arrange a house',()=>this.host.home?.(),'destination'));if(this.host.returns)b.append(this.button('Since your last visit',()=>this.host.returns?.(),'destination'));b.append(this.p('Your starter furnishings were donated by the previous tenant. Check your orientation note above for the next step.'));
  if(!this.host.inside())b.append(this.p('Enter your workshop to arrange furniture.'));
  const select=document.createElement('select');select.setAttribute('aria-label','Furniture to place');
  for(const id of PROP_IDS){const opt=document.createElement('option');opt.value=id;opt.textContent=names[id];select.append(opt);}select.value=this.selected;select.onchange=()=>{this.selected=select.value;this.preview=null;this.renderPlacement();};b.append(select);
  const placement=document.createElement('div');placement.id='placement';b.append(placement);this.renderPlacement();this.notice();b.append(this.disclosure());this.updateClocks();
 };this.begin('Bag & journal',render);}
 private renderPlacement(){
  const area=this.host.body.querySelector('#placement');if(!area)return;const restoreFocus=area.contains(document.activeElement);area.replaceChildren();
  const count=this.state.owned[this.selected as typeof PROP_IDS[number]];const owned=this.p(`${names[this.selected]} · ${count} owned. Preview and moving are free.`);owned.dataset.owned=this.selected;const picture=document.createElement('img');picture.src='/art/homes/home-'+this.selected+'-icon.svg';picture.alt=names[this.selected];picture.width=64;picture.height=64;picture.className='furniture-preview';area.append(picture,owned);
  const grid=document.createElement('div');grid.className='placement-grid';grid.setAttribute('aria-label','Workshop furniture positions');
  for(const slot of PLACEMENT_SLOTS){const prop=this.state.placements[slot.id];const button=this.button(`${slot.label}: ${prop?names[prop]:'empty'}${this.preview===slot.id?' · preview '+names[this.selected]:''}`,()=>{this.preview=slot.id;this.lastSlot=slot.id;this.renderPlacement();});button.disabled=!this.host.inside();button.dataset.slot=slot.id;if(this.preview===slot.id)button.classList.add('preview');grid.append(button);}area.append(grid);
  const apply=this.button('Place here',()=>{if(!this.preview)return;const placed=Object.entries(this.state.placements).filter(([,prop])=>prop===this.selected);const available=this.state.owned[this.selected as typeof PROP_IDS[number]]-(this.remote?.allocatedElsewhere?.(this.selected)??0);if(this.remote&&available<=0){const message=this.state.owned[this.selected as typeof PROP_IDS[number]]===0?'Make or acquire this furniture before placing it.':'All copies are in your house plot. Return one to the bag there before placing it here.';this.host.feedback(message);if(this.status)this.status.textContent=message;return;}const fromSlot=placed.length>=available?placed[0]?.[0]:undefined;this.dispatch({kind:'place',prop:this.selected,slot:this.preview,...(fromSlot?{fromSlot}:{})});if(!this.remote){this.preview=null;this.renderPlacement();}},'primary');apply.disabled=!this.preview||!this.host.inside();
  area.append(apply,this.button('Cancel preview',()=>{this.preview=null;this.renderPlacement();}));
  if(this.preview&&this.state.placements[this.preview as keyof WorkshopState['placements']])area.append(this.button('Return this furniture to bag',()=>{this.dispatch({kind:'remove',slot:this.preview});if(!this.remote){this.preview=null;this.renderPlacement();}}));
  if(restoreFocus){const next=area.querySelector<HTMLButtonElement>(`[data-slot="${this.lastSlot??PLACEMENT_SLOTS[0].id}"]`);next?.focus({preventScroll:true});if(next){next.scrollIntoView({block:'nearest'});const dialog=next.closest('dialog'),head=dialog?.querySelector('header');if(dialog&&head){const hidden=head.getBoundingClientRect().bottom+8-next.getBoundingClientRect().top;if(hidden>0)dialog.scrollTop-=hidden;}}}
 }
 private updateClocks(){if(!this.active)return;
  if(this.remote){const blocked=this.remoteBusy||!!this.remoteError||this.remote.canRetry();this.host.body.setAttribute('aria-busy',String(this.remoteBusy));this.host.body.querySelectorAll<HTMLButtonElement>('button:not(.remote-retry)').forEach(button=>{if(blocked){if(button.dataset.remoteDisabled===undefined)button.dataset.remoteDisabled=String(button.disabled);button.disabled=true;}else if(button.dataset.remoteDisabled!==undefined){button.disabled=button.dataset.remoteDisabled==='true';delete button.dataset.remoteDisabled;}});this.remoteNotice();}
  const now=this.remote?.now()??Date.now(),b=this.host.body;
  if(this.remote){for(const el of b.querySelectorAll<HTMLElement>('[data-owned]'))el.textContent=`${names[this.selected]} · ${this.state.owned[this.selected as typeof PROP_IDS[number]]} owned. Preview and moving are free.`;for(const el of b.querySelectorAll<HTMLButtonElement>('[data-slot]')){const slot=PLACEMENT_SLOTS.find(slot=>slot.id===el.dataset.slot);if(slot)el.textContent=`${slot.label}: ${this.state.placements[slot.id]?names[this.state.placements[slot.id]!]:'empty'}${this.preview===slot.id?' · preview '+names[this.selected]:''}`;}}
  for(const el of b.querySelectorAll<HTMLElement>('[data-node]')){const node=this.state.nodes[el.dataset.node as typeof RESOURCE_IDS[number]];el.textContent=`${node.stock} available · ${node.stock>=6?'depot full':`next unit in ${duration(node.lastAt+4*3600_000-now)}`}`;}
  for(const button of b.querySelectorAll<HTMLButtonElement>('[data-collect]'))button.disabled=!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry())||this.state.nodes[button.dataset.collect as typeof RESOURCE_IDS[number]].stock===0||Object.values(this.state.inventory).reduce((a,v)=>a+v,0)>=60;
  const claim=b.querySelector<HTMLButtonElement>('[data-claim]');if(claim)claim.disabled=!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry())||!this.state.job||this.state.job.readyAt>now;
  for(const button of b.querySelectorAll<HTMLButtonElement>('[data-craft]'))button.disabled=!!this.state.job||!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry());
  const job=b.querySelector('[data-job]');if(job)job.textContent=this.state.job?`${this.state.job.recipe==='planter'?'Planter':'Bridge supplies'} · ${this.state.job.readyAt<=now?'ready to collect':duration(this.state.job.readyAt-now)+' remaining'}`:'Bench is free. Choose a recipe.';
  const quest=b.querySelector('[data-quest]');if(quest)quest.textContent='Orientation: '+questStep(this.state).title+' — '+questStep(this.state).detail;
  const skills=b.querySelector('[data-skills]');if(skills)skills.textContent=`Gathering L${skillLevel(this.state.skills.gathering)} (${this.state.skills.gathering} XP) · Making L${skillLevel(this.state.skills.making)} (${this.state.skills.making} XP). Skills are persistent practice progress; no speed bonus yet.`;
  const kits=b.querySelector('[data-kits]');if(kits)kits.textContent=`Bridge supplies in storage: ${this.state.bridgeKits}. ${this.remote?'Visit the bridge committee to contribute.':'Shared practice has separate resources and bridge donations; stock from this browser is not imported.'}`;
 }
}
