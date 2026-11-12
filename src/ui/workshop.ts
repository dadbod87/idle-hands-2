import {collectionGrant,type CollectionGrant} from '../game/collection-receipt.ts';
import {ActivityNotebook} from './activity-notebook.ts';
import {CollectionReceiptView} from './collection-receipt.ts';
import {residentArt} from '../art/variety.ts';
import type {CommissionAction} from '../game/commission.ts';
import type {CarpentryAction} from '../game/carpentry.ts';
import type {GardenAction} from '../game/garden.ts';
import {SURVEY_IDS,SURVEYS,SURVEY_CHOICES,CHOICE_LABELS,type SurveyId} from '../game/fieldwork.ts';
import { createWorkshop, loadWorkshop, settleWorkshop, applyWorkshop, questStep, RESOURCE_IDS, PROP_IDS, PLACEMENT_SLOTS, type WorkshopState, type WorkshopCommand, skillLevel } from '../game/workshop.ts';
import './workshop.css';
export const WORKSHOP_SAVE_KEY='ih2:workshop:v2';
const SAVE_KEY=WORKSHOP_SAVE_KEY,LEGACY_SAVE_KEY='ih2:workshop:v1';
const names:Record<string,string>={scrap:'Scrap',timber:'Timber',supplies:'Supplies',planter:'Orientation planter',stool:'Break-time stool',rug:'Welcome rug',lamp:'Optimism lamp',crate:'Useful crate',shelf:'Almost level shelf',easel:'Garden study easel',letterbox:'Unreasonably Official Letterbox'};
export const duration=(ms:number)=>{const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=3600?`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
type RemoteOutcome={state:WorkshopState;message:string;ok?:boolean;command?:Record<string,unknown>;playerId?:string;collection?:CollectionGrant};
export type RemoteWorkshopAdapter={busy?:()=>boolean;allocatedElsewhere?:(prop:string)=>number;initial?:WorkshopState;load:()=>Promise<WorkshopState>;command:(command:Record<string,unknown>,present?:()=>boolean)=>Promise<RemoteOutcome>;retry:(present?:()=>boolean)=>Promise<RemoteOutcome>;canRetry:()=>boolean;now:()=>number;subscribe:(listener:(state:WorkshopState)=>void)=>()=>void};
type PanelHost={owner?:()=>string;rig?:()=>string;open:(heading:string)=>void;body:HTMLElement;feedback:(message:string)=>void;inside:()=>boolean;changed:()=>void;teaching?:()=>void;discoveries?:()=>void;returns?:()=>void;home?:()=>void;homeAvailable?:()=>boolean;objective?:()=>{title:string;detail:string};commission?:()=>void;finishing?:()=>void;carpentry?:()=>void;garden?:()=>void;walkToStudy?:(id:SurveyId)=>void;kitUse?:()=>string};
export type WorkshopCommandResult={ok:boolean;message:string;state:WorkshopState;retry:boolean};
export class WorkshopUI {
 state:WorkshopState;
 private serialized='';
 private active:(()=>void)|null=null;
 private selected:string='planter';
 private preview:string|null=null;
 private status:HTMLElement|null=null;
 private ownsSave=false;
 private localReadOnlyReason='';
 private releaseLock:(()=>void)|null=null;
 private saved=true;
 private lastSlot:string|null=null;
 private ticker:number;
 private notebook:ActivityNotebook|null=null;
 private collectionView:CollectionReceiptView|null=null;
 private collectionIntent:{id:string;owner:string;rig:string;view:CollectionReceiptView}|null=null;
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
  let raw:unknown=null;try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)??localStorage.getItem(LEGACY_SAVE_KEY)??'null');}catch{raw='invalid';}
  const loaded=raw===null?{state:createWorkshop(Date.now()),recovered:false}:loadWorkshop(raw,Date.now());this.state=loaded.state;
  if(loaded.recovered)this.freezeLocalSave();
  const acquire=()=>{if(this.localReadOnlyReason)return;if(!navigator.locks){this.host.feedback('This browser cannot coordinate local saves. Workshop actions are read-only here.');return;}
   void navigator.locks.request('ih2:workshop-writer',{ifAvailable:true},async lock=>{
    if(!lock){this.host.feedback('Workshop open in another tab. This tab is read-only; close the other tab and reload to continue.');return;}
    this.ownsSave=true;this.synchronize();if(!this.ownsSave)return;this.persist();await new Promise<void>(resolve=>this.releaseLock=resolve);
   });
  };acquire();
  window.addEventListener('storage',event=>{if(event.key===SAVE_KEY||event.key===LEGACY_SAVE_KEY&&localStorage.getItem(SAVE_KEY)===null)this.synchronize();});
  window.addEventListener('pageshow',event=>{if(event.persisted)acquire();});
  this.ticker=window.setInterval(()=>{const before=JSON.stringify(this.state);if(!this.ownsSave){this.updateClocks();return;}this.state=settleWorkshop(this.state,Date.now());if(JSON.stringify(this.state)!==before){this.persist();this.host.changed();}this.updateClocks();},1000);
  window.addEventListener('pagehide',()=>{this.persist();this.ownsSave=false;this.releaseLock?.();this.releaseLock=null;});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.state=settleWorkshop(this.state,Date.now());this.persist();this.updateClocks();}});
 }
 snapshot(){return JSON.parse(JSON.stringify(this.state));}
 closed(){this.notebook?.destroy();this.notebook=null;this.host.body.closest('dialog')?.classList.remove('notebook-dialog');this.collectionView?.destroy();this.collectionView=null;this.host.body.classList.remove('collection-panel');this.host.body.closest('dialog')?.classList.remove('collection-dialog');this.active=null;this.status=null;this.preview=null;}
 private acceptRemote(state:WorkshopState){this.state=state;if(!this.remote?.canRetry())this.remoteError='';this.host.changed();this.updateClocks();this.host.body.querySelectorAll<HTMLElement>('[data-quantity]').forEach(el=>el.textContent=String(state.inventory[el.dataset.quantity as typeof RESOURCE_IDS[number]]));}
 private remoteNotice(){if(!this.remote||!this.status)return;if(this.collectionView){const busy=this.remoteBusy||this.remote.busy?.();this.collectionView.retry.textContent=this.remote.canRetry()?'Retry the same request':'Refresh town state';if(busy||this.remoteError)this.collectionView.message(busy?'Waiting for server confirmation…':this.remoteError+(this.remote.canRetry()?' The request may have saved. Retry the same request.':''));else if(!this.collectionView.started)this.collectionView.message(this.remote.canRetry()?'A request is unresolved. Retry the same request before collecting.':'Choose Collect to gather the available material.');return;}if(this.remoteBusy||this.remoteError)this.status.textContent=this.remoteBusy?'Waiting for server confirmation…':this.remoteError;let retry=this.host.body.querySelector<HTMLButtonElement>('.remote-retry');if(!retry){retry=this.button('Retry the same request',()=>void this.remoteDispatch(null),'remote-retry');this.status.after(retry);}retry.hidden=!this.remoteError;retry.disabled=this.remoteBusy;}
 private async remoteDispatch(command:Record<string,unknown>|null,present:()=>boolean=()=>true):Promise<WorkshopCommandResult>{
  const failed=(message:string):WorkshopCommandResult=>({ok:false,state:this.state,message,retry:!!this.remote?.canRetry()});
  if(!this.remote||this.remoteBusy)return failed('A change is still being confirmed.');
  if(command&&this.remote.canRetry()){this.remoteError='Retry the previous request before making another change.';this.remoteNotice();return failed(this.remoteError);}
  const before=this.state.revision;this.remoteBusy=true;this.remoteError='';this.updateClocks();
  try{
   const receipt:RemoteOutcome=command?await this.remote.command(command,this.collectionView?()=>false:present):this.remote.canRetry()?await this.remote.retry(this.collectionView?()=>false:present):{state:await this.remote.load(),message:'Town state refreshed.',ok:false};
   if(!present()){this.finishCollection(receipt);return failed('The submitting panel changed. Confirmed state is kept.');}
   this.acceptRemote(receipt.state);const shown=this.finishCollection(receipt);if(this.collectionView&&!shown)this.collectionView.message(receipt.command?.kind==='gather'?'Original request resolved. '+receipt.message:receipt.message);this.host.feedback(receipt.message);if(this.status&&!this.collectionView)this.status.textContent=receipt.message;this.preview=null;if(this.host.body.querySelector('#placement'))this.renderPlacement();
   return{ok:receipt.ok??receipt.state.revision>before,state:this.state,message:receipt.message,retry:false};
  }catch(error){if(!this.remote.canRetry())this.collectionIntent=null;if(!present())return failed('The submitting panel changed. Confirmed state is kept.');this.remoteError=(error as Error).message;this.host.feedback(this.remoteError+(this.collectionView&&this.remote.canRetry()?' The request may have saved. Retry the same request.':''));return failed(this.remoteError);}
  finally{this.remoteBusy=false;this.updateClocks();if(this.remoteError)this.remoteNotice();}
 }
 public async runCommission(action:CommissionAction,expectedRevision?:number,present:()=>boolean=()=>true):Promise<WorkshopCommandResult>{
  const command={kind:'commission',commissionAction:action,...(expectedRevision===undefined?{}:{expectedRevision})};
  if(this.remote)return this.remoteDispatch(command,present);
  const result=this.dispatch(command);return{ok:result?.ok??false,message:result?.message??'No change was made.',state:this.state,retry:false};
 }
 public async runCarpentry(action:CarpentryAction):Promise<WorkshopCommandResult>{if(this.remote)return this.remoteDispatch({kind:'carpentry',carpentryAction:action});const result=this.dispatch({kind:'carpentry',carpentryAction:action});return{ok:result?.ok??false,message:result?.message??'No change was made.',state:this.state,retry:false};}
 public async runGarden(action:GardenAction):Promise<WorkshopCommandResult>{
  if(this.remote)return this.remoteDispatch({kind:'garden',gardenAction:action});
  const result=this.dispatch({kind:'garden',gardenAction:action});return{ok:result?.ok??false,message:result?.message??'No change was made.',state:this.state,retry:false};
 }
 public async retryCommission(present:()=>boolean):Promise<WorkshopCommandResult>{return this.remote?this.remoteDispatch(null,present):{ok:false,message:'There is no shared request to retry.',state:this.state,retry:false};}
 public async retryGarden():Promise<WorkshopCommandResult>{return this.remote?this.remoteDispatch(null):{ok:false,message:'There is no shared request to retry.',state:this.state,retry:false};}
 public gardenClock(){return Math.floor(this.remote?.now()??Date.now());}
 public gardenSaveStatus(){return{busy:this.remoteBusy,canRetry:!!this.remote?.canRetry(),readOnly:!this.remote&&!this.ownsSave,error:this.remoteError||this.localReadOnlyReason||(!this.remote&&!this.ownsSave?'This tab is read-only while another tab owns the save, or this browser cannot coordinate saves. Reload after closing other game tabs.':'')};}

 private freezeLocalSave(){this.saved=false;const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent='Saved data kept · read-only';this.localReadOnlyReason='This local save could not be read safely. It has been kept unchanged; actions are read-only.';this.ownsSave=false;this.releaseLock?.();this.releaseLock=null;this.host.feedback(this.localReadOnlyReason);}
 private synchronize(){try{const raw=localStorage.getItem(SAVE_KEY)??localStorage.getItem(LEGACY_SAVE_KEY);if(!raw||raw===this.serialized)return;const loaded=loadWorkshop(JSON.parse(raw),Date.now());if(loaded.recovered){this.freezeLocalSave();return;}this.state=loaded.state;this.serialized=raw;this.host.changed();if(this.collectionView||this.notebook){this.updateClocks();this.host.body.querySelectorAll<HTMLElement>('[data-quantity]').forEach(el=>el.textContent=String(this.state.inventory[el.dataset.quantity as typeof RESOURCE_IDS[number]]));}else this.active?.();}catch{this.freezeLocalSave();}}

 private persist(quiet=false){if(this.remote)return true;if(!this.ownsSave)return this.saved;const next=JSON.stringify(this.state);if(next===this.serialized)return this.saved;try{localStorage.setItem(SAVE_KEY,next);this.serialized=next;this.saved=true;}catch{this.saved=false;if(!quiet)this.host.feedback('Local save failed. Keep this tab open; new progress will be lost on reload.');}const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent=this.saved?'Local workshop · saved here':'Unsaved practice · keep tab open';return this.saved;}
 private button(text:string,handler:()=>void,className=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=className;b.onclick=handler;return b;}
 private p(text:string,className=''){const p=document.createElement('p');p.textContent=text;p.className=className;return p;}
 private begin(title:string,render:()=>void){if(!this.remote)this.state=settleWorkshop(this.state,Date.now());this.persist();this.host.open(title);this.active=render;this.status=null;if(this.remote)this.remoteBusy=true;render();if(this.remote){void this.remote.load().then(state=>this.acceptRemote(state)).catch(error=>{this.remoteError=error.message;this.host.feedback(error.message);}).finally(()=>{this.remoteBusy=false;this.updateClocks();});}}
 private notice(){this.status=this.p('','workshop-status');this.status.setAttribute('role','status');this.host.body.append(this.status);this.remoteNotice();}
 private dispatch(command:Record<string,unknown>){
  if(this.remote){void this.remoteDispatch(command);return;}
  if(!this.ownsSave){const message=this.localReadOnlyReason||'Workshop open in another tab, or local-save coordination unavailable. Close other game tabs and reload this one to continue.';this.host.feedback(message);if(this.status)this.status.textContent=message;return{ok:false,message};}
  const before=this.state,id=typeof command.id==='string'?command.id:crypto.randomUUID();
  const receipt=applyWorkshop(this.state,{...command,id,expectedRevision:typeof command.expectedRevision==='number'?command.expectedRevision:this.state.revision} as WorkshopCommand,Date.now());this.state=receipt.state;this.persist(command.kind==='gather');const message=receipt.message+(this.saved?'':' Local save failed; this progress will be lost on reload.');this.host.feedback(message);this.host.changed();
  // Keep the action controls stable: update quantities/timers without rebuilding the form.
  const grant=receipt.ok&&!receipt.replayed&&command.kind==='gather'?collectionGrant(id,this.host.owner?.()??'local',command.resource,before,this.state):undefined;
  this.finishCollection({state:this.state,message,ok:receipt.ok,command:{...command,id},playerId:this.host.owner?.()??'local',collection:grant},this.saved);
  this.updateClocks();if(this.status&&!this.collectionView)this.status.textContent=message;
  this.host.body.querySelectorAll<HTMLElement>('[data-quantity]').forEach(el=>{el.textContent=String(this.state.inventory[el.dataset.quantity as typeof RESOURCE_IDS[number]]);});
  return{ok:receipt.ok,message};
 }
 private disclosure(){return this.p(this.remote?'Shared practice town · fictional residents. Confirmed changes are saved here.':'Local practice save · this browser only. No account, trading or shared town progress.','disclosure');}
 private resources(){const list=document.createElement('dl');list.className='resource-list';for(const id of RESOURCE_IDS){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=names[id];const icon=document.createElement('img');icon.src='/art/homes/home-'+id+'-icon.svg';icon.alt='';icon.width=32;icon.height=32;icon.className='item-icon';dt.prepend(icon);dd.dataset.quantity=id;dd.textContent=String(this.state.inventory[id]);list.append(dt,dd);}return list;}
 showSketchbook(station?:SurveyId){const render=()=>{
  const b=this.host.body;b.replaceChildren();
  b.append(this.p('The grounds committee needs three observations. Trees cannot fill out forms. Apparently that makes it your job. Explore the square in any order; looking is free, and your bench keeps working.'));
  const progress=this.p('');progress.dataset.sketchProgress='';progress.className='quest-card';b.append(progress);
  const job=this.p('');job.dataset.job='';b.append(job);
  if(station){const study=SURVEYS[station];b.append(this.p(study.question),this.p(study.hint,'disclosure'));
   for(const choice of SURVEY_CHOICES){const answer=this.button(CHOICE_LABELS[choice],()=>this.dispatch({kind:'survey',station,choice}),'destination');answer.dataset.surveyChoice=station;b.append(answer);}
   b.append(this.button('Back to town sketchbook',()=>this.showSketchbook(),'destination'));
  }
  for(const id of station?[station]:SURVEY_IDS){const section=document.createElement('section');section.className='sketch-card';
   const image=document.createElement('img');image.src='/art/fieldwork/study-'+id+'.svg';image.alt=SURVEYS[id].name+' — earned field sketch';image.width=160;image.height=192;image.dataset.sketchImage=id;
   const note=this.p('');note.dataset.sketchRecord=id;section.append(image,note);
   if(!station&&this.host.walkToStudy)section.append(this.button('Find '+SURVEYS[id].name,()=>this.host.walkToStudy?.(id),'destination'));b.append(section);
  }
  const certificate=document.createElement('img');certificate.src='/art/fieldwork/naturalist-keepsake.svg';certificate.alt='Neighborhood Naturalist — honorary department of looking at things';certificate.width=240;certificate.height=160;certificate.dataset.sketchKeepsake='';certificate.className='sketch-keepsake';b.append(certificate);
  b.append(this.p('Three studies earn a keepsake for your journal. It stays saved; it is not furniture or a production bonus. No weather window or bridge access needed. When your fieldwork is done, redecorate, meet the residents, or head home. The trees will manage.','disclosure'));this.notice();b.append(this.disclosure());this.updateClocks();
 };this.begin(station?SURVEYS[station].name:'Town sketchbook',render);}
 private collectionCurrent(view:CollectionReceiptView,owner:string,rig:string){return this.collectionView===view&&view.root.isConnected&&(this.host.owner?.()??'local')===owner&&residentArt(this.host.rig?.()??'devon')===rig;}
 private gather(resource:CollectionGrant['resource'],view:CollectionReceiptView){
  if(!view.usable||this.collectionView!==view||this.remote?.busy?.()||this.remoteBusy||this.remoteError||this.remote?.canRetry()||!this.state.nodes[resource].stock||Object.values(this.state.inventory).reduce((a,v)=>a+v,0)>=60)return;
  const owner=this.host.owner?.()??'local',rig=residentArt(this.host.rig?.()??'devon');
  if(!this.remote&&!this.ownsSave){view.begin('');this.dispatch({kind:'gather',resource});return;}
  const id=crypto.randomUUID();this.collectionIntent={id,owner,rig,view};view.begin(id);this.host.feedback('Confirming collection…');
  if(this.remote)void this.remoteDispatch({kind:'gather',resource,id},()=>this.collectionCurrent(view,owner,rig));else this.dispatch({kind:'gather',resource,id});
 }
 private finishCollection(receipt:RemoteOutcome,saved=true){
  const intent=this.collectionIntent;if(!intent)return false;
  if(receipt.command?.id!==intent.id){if(!this.remote?.canRetry())this.collectionIntent=null;return false;}
  this.collectionIntent=null;
  if(!this.collectionCurrent(intent.view,intent.owner,intent.rig))return false;
  const g=receipt.collection;
  if(receipt.ok&&g&&g.commandId===intent.id&&g.playerId===intent.owner&&g.resource===intent.view.resource)intent.view.confirm(g,saved,receipt.message);else intent.view.message(receipt.message);return true;
 }
 showResource(resource:typeof RESOURCE_IDS[number]){const render=()=>{
  this.collectionView?.destroy();const b=this.host.body;b.replaceChildren();b.classList.add('collection-panel');b.closest('dialog')?.classList.add('collection-dialog');b.append(this.p('Rescued from the company’s extremely ambitious disposal policy.'),this.resources());
  const stock=this.p('');stock.dataset.node=resource;b.append(stock);const owner=this.host.owner?.()??'local',rig=residentArt(this.host.rig?.()??'devon');
  const view=new CollectionReceiptView(resource,rig,()=>this.collectionCurrent(view,owner,rig),()=>this.gather(resource,view),()=>void this.remoteDispatch(null,()=>this.collectionCurrent(view,owner,rig)));
  this.collectionView=view;view.retry.hidden=!this.remote;b.append(view.root);this.status=view.status;
  b.append(this.p('Each depot holds at most 6. One unit returns every 4 real hours, for up to 24 real hours per absence. Bag capacity: 60 materials. Returning often does not speed it up.','disclosure'),this.disclosure());this.updateClocks();queueMicrotask(()=>{if(this.collectionCurrent(view,owner,rig))view.focus();});
 };this.begin(names[resource]+' depot',render);}

 showBench(){const render=()=>{
  const b=this.host.body;b.replaceChildren();b.append(this.p('Useful work. Unnecessary forms. One job at a time. All durations use real time, not the town’s day/night clock.'),this.resources());
  const job=this.p('');job.dataset.job='';b.append(job);
  const claim=this.button('Collect finished work',()=>this.dispatch({kind:'claim'}),'destination');claim.dataset.claim='';b.append(claim);
  const recipes=[{id:'planter',label:'Make orientation planter',text:'2 scrap + 2 timber + 1 supplies. First planter: 5 seconds, once. Later planters: 8 real hours.'},{id:'bridge-kit',label:'Make bridge supplies',text:'3 scrap + 2 timber + 1 supplies. 12 real hours. '+(this.remote?'Bring the finished kit to the bridge committee.':'Crafting practice stock stays in this browser’s workshop.')}];
  for(const recipe of recipes){const section=document.createElement('section');section.className='recipe';const craft=this.button(recipe.label,()=>this.dispatch({kind:'craft',recipe:recipe.id}),'destination');craft.dataset.craft=recipe.id;section.append(this.p(recipe.text),craft);b.append(section);}
  if(this.host.commission)b.append(this.button('Pip’s post · route & letterbox',()=>this.host.commission!(),'destination'));
  b.append(this.button('While work runs · town sketchbook',()=>this.showSketchbook(),'destination'));if(this.host.carpentry)b.append(this.button('Pine workshop · tools, easels & hampers',()=>this.host.carpentry!()));
  if(this.host.garden)b.append(this.button('While work runs · your allotment',()=>this.host.garden?.(),'destination'));
  if(this.host.teaching)b.append(this.button('Orientation maintenance · one-time contribution',()=>this.host.teaching?.(),'destination'));this.notice();b.append(this.p('A queued job finishes while you are away and waits for collection. No automatic repeat jobs or hidden lost output.','disclosure'),this.disclosure());this.updateClocks();
 };this.begin('Your work bench',render);}
 showInventory(){const render=()=>{
  const b=this.host.body;b.replaceChildren();b.closest('dialog')?.classList.add('notebook-dialog');this.notebook?.destroy();this.notebook=new ActivityNotebook({bench:{label:'Open work bench · jobs & recipes',open:()=>this.showBench()},rack:{label:'Open pine finishing rack',open:()=>this.host.finishing?.()},garden:{label:'Your allotment · crops, markers & quests',open:()=>this.host.garden?.()}});b.append(this.notebook.root);
  const other=document.createElement('section'),summary=document.createElement('h3');summary.textContent='While work runs';other.append(summary);if(this.host.commission)other.append(this.button('Pip’s post · route & letterbox',()=>this.host.commission!(),'destination'));other.append(this.button('Town sketchbook · optional fieldwork',()=>this.showSketchbook(),'destination'));if(this.host.carpentry)other.append(this.button('Pine workshop · tools, easels & hampers',()=>this.host.carpentry!()));b.append(other,this.resources());
  const quest=this.p('');quest.dataset.quest='';quest.className='quest-card';b.append(quest);
  const skill=this.p('');skill.dataset.skills='';b.append(skill);
  const kits=this.p('');kits.dataset.kits='';b.append(kits);
  if(this.host.discoveries)b.append(this.button('Trail field notebook',()=>this.host.discoveries?.(),'destination'));if(this.host.home&&this.host.homeAvailable?.())b.append(this.button('Inspect or arrange a house',()=>this.host.home?.(),'destination'));if(this.host.returns)b.append(this.button('Since your last visit',()=>this.host.returns?.(),'destination'));b.append(this.p('Your starter furnishings were donated by the previous tenant. Check your orientation note above for the next step.'));
  if(!this.host.inside())b.append(this.p('Enter your workshop to arrange furniture.'));
  const select=document.createElement('select');select.setAttribute('aria-label','Furniture to place');
  for(const id of PROP_IDS){const opt=document.createElement('option');opt.value=id;opt.textContent=names[id];select.append(opt);}select.value=this.selected;select.onchange=()=>{this.selected=select.value;this.preview=null;this.renderPlacement();};b.append(select);
  const placement=document.createElement('div');placement.id='placement';b.append(placement);this.renderPlacement();this.notice();b.append(this.disclosure());this.updateClocks();
 };this.begin('Bag & journal',render);}
 private renderPlacement(){
  const area=this.host.body.querySelector('#placement');if(!area)return;const restoreFocus=area.contains(document.activeElement);area.replaceChildren();
  const count=this.state.owned[this.selected as typeof PROP_IDS[number]];const owned=this.p(`${names[this.selected]} · ${count} owned. Preview and moving are free.`);owned.dataset.owned=this.selected;const picture=document.createElement('img');picture.src=this.selected==='letterbox'?'/art/commission/letterbox-'+this.state.commission.motif+'-closed.svg':'/art/homes/home-'+this.selected+'-icon.svg';picture.alt=names[this.selected];picture.width=64;picture.height=64;picture.className='furniture-preview';area.append(picture,owned);
  const grid=document.createElement('div');grid.className='placement-grid';grid.setAttribute('aria-label','Workshop furniture positions');
  for(const slot of PLACEMENT_SLOTS){const prop=this.state.placements[slot.id];const button=this.button(`${slot.label}: ${prop?names[prop]:'empty'}${this.preview===slot.id?' · preview '+names[this.selected]:''}`,()=>{this.preview=slot.id;this.lastSlot=slot.id;this.renderPlacement();});button.disabled=!this.host.inside();button.dataset.slot=slot.id;if(this.preview===slot.id)button.classList.add('preview');grid.append(button);}area.append(grid);
  const apply=this.button('Place here',()=>{if(!this.preview)return;const placed=Object.entries(this.state.placements).filter(([,prop])=>prop===this.selected);const available=this.state.owned[this.selected as typeof PROP_IDS[number]]-(this.remote?.allocatedElsewhere?.(this.selected)??0);if(this.remote&&available<=0){const message=this.state.owned[this.selected as typeof PROP_IDS[number]]===0?'Make or acquire this furniture before placing it.':'All copies are in your house plot. Return one to the bag there before placing it here.';this.host.feedback(message);if(this.status)this.status.textContent=message;return;}const fromSlot=placed.length>=available?placed[0]?.[0]:undefined;this.dispatch({kind:'place',prop:this.selected,slot:this.preview,...(fromSlot?{fromSlot}:{})});if(!this.remote){this.preview=null;this.renderPlacement();}},'primary');apply.disabled=!this.preview||!this.host.inside();
  area.append(apply,this.button('Cancel preview',()=>{this.preview=null;this.renderPlacement();}));
  if(this.preview&&this.state.placements[this.preview as keyof WorkshopState['placements']])area.append(this.button('Return this furniture to bag',()=>{this.dispatch({kind:'remove',slot:this.preview});if(!this.remote){this.preview=null;this.renderPlacement();}}));
  if(restoreFocus){const next=area.querySelector<HTMLButtonElement>(`[data-slot="${this.lastSlot??PLACEMENT_SLOTS[0].id}"]`);next?.focus({preventScroll:true});if(next){next.scrollIntoView({block:'nearest'});const dialog=next.closest('dialog'),head=dialog?.querySelector('header');if(dialog&&head){const hidden=head.getBoundingClientRect().bottom+8-next.getBoundingClientRect().top;if(hidden>0)dialog.scrollTop-=hidden;}}}
 }
 private updateClocks(){
  this.notebook?.update(this.state,this.gardenClock());if(!this.active)return;
  if(this.remote){const blocked=this.remoteBusy||!!this.remoteError||this.remote.canRetry();this.host.body.setAttribute('aria-busy',String(this.remoteBusy));this.host.body.querySelectorAll<HTMLButtonElement>('button:not(.remote-retry):not(.collection-control)').forEach(button=>{if(blocked){if(button.dataset.remoteDisabled===undefined)button.dataset.remoteDisabled=String(button.disabled);button.disabled=true;}else if(button.dataset.remoteDisabled!==undefined){button.disabled=button.dataset.remoteDisabled==='true';delete button.dataset.remoteDisabled;}});this.remoteNotice();}
  const now=this.remote?.now()??Date.now(),b=this.host.body;
  const sketches=this.state.sketches??[];
  const sketchProgress=b.querySelector('[data-sketch-progress]');if(sketchProgress)sketchProgress.textContent=sketches.length+' / 3 tree studies recorded'+(sketches.length===3?' · keepsake earned':' · choose your own order');
  for(const el of b.querySelectorAll<HTMLElement>('[data-sketch-record]')){const id=el.dataset.sketchRecord as SurveyId;el.textContent=sketches.includes(id)?'Recorded · '+SURVEYS[id].note:'Not recorded · '+SURVEYS[id].name;}
  for(const el of b.querySelectorAll<HTMLElement>('[data-sketch-image]'))el.hidden=!sketches.includes(el.dataset.sketchImage as SurveyId);
  const keepsake=b.querySelector<HTMLElement>('[data-sketch-keepsake]');if(keepsake)keepsake.hidden=sketches.length!==3;
  for(const button of b.querySelectorAll<HTMLButtonElement>('[data-survey-choice]'))button.disabled=sketches.includes(button.dataset.surveyChoice as SurveyId)||!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry());
  if(this.remote||this.notebook){for(const el of b.querySelectorAll<HTMLElement>('[data-owned]'))el.textContent=`${names[this.selected]} · ${this.state.owned[this.selected as typeof PROP_IDS[number]]} owned. Preview and moving are free.`;for(const el of b.querySelectorAll<HTMLButtonElement>('[data-slot]')){const slot=PLACEMENT_SLOTS.find(slot=>slot.id===el.dataset.slot);if(slot)el.textContent=`${slot.label}: ${this.state.placements[slot.id]?names[this.state.placements[slot.id]!]:'empty'}${this.preview===slot.id?' · preview '+names[this.selected]:''}`;}}
  for(const el of b.querySelectorAll<HTMLElement>('[data-node]')){const node=this.state.nodes[el.dataset.node as typeof RESOURCE_IDS[number]];el.textContent=`${node.stock} available · ${node.stock>=6?'depot full':`next unit in ${duration(node.lastAt+4*3600_000-now)}`}`;}
  for(const button of b.querySelectorAll<HTMLButtonElement>('[data-collect]:not(.collection-control)'))button.disabled=!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry())||this.state.nodes[button.dataset.collect as typeof RESOURCE_IDS[number]].stock===0||Object.values(this.state.inventory).reduce((a,v)=>a+v,0)>=60;
  if(this.collectionView)this.collectionView.blocked(!!this.remote&&(this.remoteBusy||!!this.remote.busy?.()||!!this.remoteError||this.remote.canRetry())||!this.collectionView.usable||this.state.nodes[this.collectionView.resource].stock===0||Object.values(this.state.inventory).reduce((a,v)=>a+v,0)>=60,!this.remote||this.remoteBusy||!!this.remote?.busy?.()||(!this.remoteError&&!this.remote?.canRetry()));
  const claim=b.querySelector<HTMLButtonElement>('[data-claim]');if(claim)claim.disabled=!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry())||!this.state.job||this.state.job.readyAt>now;
  for(const button of b.querySelectorAll<HTMLButtonElement>('[data-craft]')){button.disabled=!!this.state.job||!!this.remote&&(this.remoteBusy||!!this.remoteError||this.remote.canRetry());if(button.dataset.craft==='planter')button.textContent=this.state.stats.plantersCrafted?'Make another planter · 8 real hours':'Make orientation planter';}
  const job=b.querySelector('[data-job]');if(job)job.textContent=this.state.job?`${this.state.job.recipe==='planter'?'Planter':'Bridge supplies'} · ${this.state.job.readyAt<=now?'ready to collect':duration(this.state.job.readyAt-now)+' remaining'}`:'Bench is free. Choose a recipe.';
  const quest=b.querySelector('[data-quest]');if(quest){const objective=this.host.objective?.()??questStep(this.state);quest.textContent='Orientation: '+objective.title+' — '+objective.detail;}
  const skills=b.querySelector('[data-skills]');if(skills)skills.textContent=`Gathering L${skillLevel(this.state.skills.gathering)} (${this.state.skills.gathering} XP) · Making L${skillLevel(this.state.skills.making)} (${this.state.skills.making} XP). Skills are persistent practice progress; no speed bonus yet.`;
  const kits=b.querySelector('[data-kits]');if(kits)kits.textContent=`Bridge supplies in storage: ${this.state.bridgeKits}. ${this.host.kitUse?.()??(this.remote?'Visit the bridge committee to contribute.':'Shared practice has separate resources and bridge donations; stock from this browser is not imported.')}`;
 }
}
