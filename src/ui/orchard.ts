import {APPLE_CAP, APPLES_PER_SNACK, BROWSER_ORCHARD_KEY, ORCHARD_STOPS, SNACK_CAP,
 orchardBranchFromStop, readOrchard, writeOrchard, type BranchId, type Orchard, type OrchardAction, type OrchardRead,
} from '../game/orchard.ts';
import type {Stop} from '../game/world.ts';
import {duration} from './workshop.ts';
import './orchard.css';

const storage = {getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value)};
const unreadable = 'Your orchard record could not be read. The saved data is kept.';
const unavailable = 'The browser cannot safely save orchard progress here.';
type Host = {
 open:(title:string)=>void; close:()=>void; body:HTMLElement; feedback:(text:string)=>void;
 walk:(stop:Stop)=>void; at:(stop:Stop)=>boolean; pick:(branch:BranchId)=>void;
};

type OrchardResult=ReturnType<typeof writeOrchard>&{fresh?:boolean};
export type SharedOrchardPort={
 read:()=>OrchardRead;
 state:()=>Orchard|null;
 now:()=>number;
 canWrite:()=>boolean;
 retryAvailable:()=>boolean;
 save:(baseline:string|null,action:OrchardAction|null,present:()=>boolean)=>Promise<OrchardResult>;
};

export class OrchardUI {
 private clock?: number;
 private current: OrchardRead;
 private visible?: HTMLElement;
 private readonly reload = (event:StorageEvent) => {
  if (event.key===BROWSER_ORCHARD_KEY || event.key===null) this.current=readOrchard(storage);
 };

 constructor(private host:Host, private table:Stop, private shared?:SharedOrchardPort) {
  this.current=this.read();
  if(!shared){
   window.addEventListener('storage',this.reload);
   window.addEventListener('pageshow',()=>{this.current=readOrchard(storage);});
  }
 }

 private read(){return this.shared?this.shared.read():readOrchard(storage);}
 get state(){return this.shared?this.shared.state():this.current.status==='ready'?this.current.state:null;}

 closed(){
  if (this.clock!==undefined) window.clearInterval(this.clock);
  this.clock=undefined;
  this.visible=undefined;
 }

 showBranch(stop:Stop, branch:BranchId){this.show(stop,branch);}
 showTable(){this.show(this.table);}

 private show(stop:Stop, branch?:BranchId) {
  if (!this.host.at(stop)) return;
  this.host.open(branch?stop.name:'Orchard packing table');
  this.current=this.read();
  const shared=this.shared;
  const section=document.createElement('section');
  section.className='orchard';
  this.visible=section;
  const status=document.createElement('p');
  status.className='orchard-confirmation';
  status.setAttribute('role','status');
  const quantities=document.createElement('div');
  quantities.className='orchard-quantities';
  const stack=(asset:string, label:string) => {
   const slot=document.createElement('span');
   const icon=document.createElement('img');
   icon.src='/art/orchard/'+asset+'.svg';
   icon.alt='';
   icon.width=40;
   icon.height=40;
   const text=document.createElement('span');
   slot.append(icon,text);
   quantities.append(slot);
   return (count:number|null, capacity:number)=>{
    const value=count===null?label+' unavailable':count+' / '+capacity+' '+label;
    if (text.textContent!==value) text.textContent=value;
   };
  };
  const apples=stack('apple','apples');
  const snacks=stack('orchard-snack','snacks');
  const stage=document.createElement('p');
  stage.className='orchard-stage';
  const details=document.createElement('p');
  details.textContent=branch?'Branches ripen in eight real hours. Pack two apples at Orchard walk.':'Two apples make one snack. Packing takes 30 real minutes.';
  details.className='orchard-note';

  let ready = this.current;
  let saving = false;
  let confirmingPrevious=false;
  let packingReceiptExpires:number|null=null;
  const button=(label:string, click:()=>void)=>{
   const node=document.createElement('button');
   node.type='button';
   node.textContent=label;
   node.onclick=click;
   return node;
  };
  const primary=button(branch?'Pick an apple':'Pack snack',()=>void submit(
   branch?{kind:'pick',branch}:ready.status==='ready'&&ready.state.parcel?{kind:'collect'}:{kind:'pack'}
  ));
  primary.className='primary';
  const taste=button('Taste a snack',()=>void submit({kind:'taste'}));
  const actions=document.createElement('div');
  actions.className='orchard-actions';
  actions.append(primary);
  if (!branch) actions.append(taste);
  const retry=button('Confirm the same request',()=>void submit(null));
  retry.hidden=true;
  if(shared)actions.append(retry);
  section.append(stage,actions,status,quantities,details);

  const routes=document.createElement('details');
  const summary=document.createElement('summary');
  summary.textContent=branch?'Find the packing table':'Find apple branches';
  routes.append(summary);
  for (const place of branch?[this.table]:ORCHARD_STOPS) {
   const option=button(branch?'Walk to Orchard walk':'Walk to '+place.name,()=>this.host.walk(place));
   option.className='destination';
   routes.append(option);
  }
  section.append(routes);
  this.host.body.append(section);
  refresh();
  this.clock=window.setInterval(refresh,1000);

  function refresh(){
   const canWrite=shared?shared.canWrite():!!navigator.locks;
   const recovering=confirmingPrevious||!!shared?.retryAvailable();
   retry.hidden=!recovering;
   retry.disabled=saving;
   primary.hidden=recovering;
   taste.hidden=recovering;
   const state=ready.status==='ready'?ready.state:null;
   apples(state?.apples??null,APPLE_CAP);
   snacks(state?.snacks??null,SNACK_CAP);
   const now=shared?.now()??Date.now();
   if (packingReceiptExpires!==null && now>=packingReceiptExpires) {
    status.textContent='';
    packingReceiptExpires=null;
   }
   const nextText=branch||!state?.parcel?(branch?'Pick an apple':'Pack snack'):'Collect snack';
   if (primary.textContent!==nextText) primary.textContent=nextText;
   const message=recovering?'Confirm your last request.':state===null?(ready.status==='unreadable'?unreadable:unavailable):!canWrite?(shared?'Waiting for the town to confirm progress.':unavailable):
    branch?(state.ripeAt[branch]>now?'Ripens in '+duration(state.ripeAt[branch]-now):
     state.apples>=APPLE_CAP?'Your basket is full.':'Ripe now'):
    state.parcel?(state.parcel.readyAt>now?'Ready in '+duration(state.parcel.readyAt-now):'Ready to collect'):
     state.snacks>=SNACK_CAP?'Your snack pouch is full.':
     state.apples<APPLES_PER_SNACK?state.apples===1?'Pick one more apple.':'Pick two apples to pack a snack.':'Ready to pack';
   if (stage.textContent!==message) stage.textContent=message;
   primary.disabled=saving||!state||!canWrite||(branch?state.ripeAt[branch]>now||state.apples>=APPLE_CAP:
    state.parcel?state.parcel.readyAt>now||state.snacks>=SNACK_CAP:state.apples<APPLES_PER_SNACK||state.snacks>=SNACK_CAP);
   taste.disabled=saving||!state||!canWrite||state.snacks===0;
  }

  const owner=this;
  async function submit(action:OrchardAction|null) {
   if (saving || ready.status!=='ready' || (!shared && (!navigator.locks || !action))) return;
   const baseline=ready.raw;
   const present=()=>owner.visible===section&&section.isConnected&&owner.host.at(stop)&&!document.hidden;
   if (!present()) return;
   saving=true;
   confirmingPrevious=action===null;
   refresh();
   try {
    const result:OrchardResult|null=shared
     ?await shared.save(baseline,action,present)
     :await navigator.locks.request(BROWSER_ORCHARD_KEY,()=>present()?writeOrchard(storage,baseline,action!,Date.now()):null);
    if (!result) return;
    if (result.status==='saved') {
     ready=owner.current={status:'ready',raw:result.raw,state:result.state};
     if (!present()) return;
     owner.host.feedback(result.message);
     if (action?.kind==='pick' && result.fresh!==false) {
      owner.host.close();
      owner.host.pick(action.branch);
     } else {
      packingReceiptExpires=action?.kind==='pack'?result.state.parcel?.readyAt??null:null;
      status.textContent=result.message;
     }
     return;
    }
    if (!present()) return;
    if (result.status==='changed') {
     ready=owner.current=owner.read();
     status.textContent=shared?'The town pantry changed. Review the refreshed counts and choose again.':
      'Another tab changed the pantry. Check these counts and choose again.';
    } else if (result.status==='refused') {
     if(shared)ready=owner.current=owner.read();
     status.textContent=result.message;
    } else {
     status.textContent='Your action could not be saved. The previous pantry is kept.';
    }
   } catch {
    if (present()){
     if(shared?.retryAvailable()){
      status.textContent='The reply was interrupted. Confirm the same request before making another change.';
      owner.host.feedback('Confirm the last orchard request to finish.');
     }else status.textContent='Your action could not be saved. The previous pantry is kept.';
    }
   } finally {
    saving=false;
    confirmingPrevious=false;
    if (present()){
     refresh();
     if(!retry.hidden)retry.focus({preventScroll:true});
    }
   }
  }
 }
}
