import {SNACK_CAP} from '../game/orchard.ts';
import type {SnackAction,SnackShelf,SnackParcel} from '../game/snack-shelf.ts';
import type {TownClient} from './town-client.ts';
import './snack-shelf.css';

type Host = {open:(title:string)=>void;body:HTMLElement;canUse:()=>boolean;counter:()=>void};
function element<K extends keyof HTMLElementTagNameMap>(tag:K,text='') {
 const node=document.createElement(tag);
 node.textContent=text;
 return node;
}

function button(label:string,run:()=>void,primary=false){
 const node=element('button',label);
 node.type='button';
 node.className=primary?'destination primary':'destination';
 node.addEventListener('click',run);
 return node;
}

export class SnackShelfUI {
 private root:HTMLElement|null=null;
 private status:HTMLElement|null=null;
 private contents:HTMLElement|null=null;
 private timer:number|null=null;
 private owner='';
 private busy=false;

 constructor(private host:Host,private town:TownClient) {}

 close(){
  this.root=null;
  this.status=null;
  this.contents=null;
  this.busy=false;
  this.stopTimer();
 }

 show(){
  this.host.open('Café parcel shelf');
  this.owner=this.town.snapshot?.playerId??'';
  const root=element('div');
  root.className='snack-shelf';
  root.dataset.snackShelf='';
  this.root=root;
  const status=element('p');
  status.className='snack-shelf-status';
  status.setAttribute('role','status');
  status.tabIndex=-1;
  this.status=status;
  this.contents=element('div');
  this.contents.className='snack-shelf';
  root.append(status,this.contents,button('Back to café counter',this.host.counter));
  this.host.body.append(root);
  if(this.town.snackRetryAvailable){
   this.showRetry(root,'A previous parcel request is still waiting for confirmation.');
  }else if(this.town.retryAvailable||this.town.isSaving){
   this.notice('Confirm your previous town request before moving a parcel.');
  }else void this.load(root);
 }

 private current(root:HTMLElement){
  return this.root===root&&root.isConnected&&this.owner===this.town.snapshot?.playerId;
 }

 private notice(message:string){ if(this.status)this.status.textContent=message; }

 private reveal(node:HTMLElement){
  node.focus({preventScroll:true});
  const dialog=node.closest('dialog'),header=dialog?.querySelector('.dialog-head');
  if(!dialog||!header)return;
  const top=header.getBoundingClientRect().bottom+4;
  const bottom=dialog.getBoundingClientRect().bottom-8;
  const box=node.getBoundingClientRect();
  if(box.top<top)dialog.scrollTop-=top-box.top;
  else if(box.bottom>bottom&&box.height<=bottom-top)dialog.scrollTop+=box.bottom-bottom;
 }

 private stopTimer(){
  if(this.timer!==null)window.clearTimeout(this.timer);
  this.timer=null;
 }

 private async load(root:HTMLElement,confirmation=''){
  if(!this.current(root))return;
  this.stopTimer();
  this.contents?.replaceChildren();
  this.notice(confirmation||'Checking the parcel shelf…');
  try{
   const view=await this.town.snackShelf();
   if(!this.current(root))return;
   if(this.town.snapshot?.workshop.revision!==view.revision)await this.town.load();
   if(!this.current(root))return;
   if(this.town.snapshot?.workshop.revision!==view.revision)throw new Error('Your pouch changed. Check the shelf again.');
   this.notice(confirmation);
   this.paint(root,view);
  }catch(error){
   if(!this.current(root))return;
   this.notice((confirmation?confirmation+' ':'')+(error as Error).message);
   this.contents?.replaceChildren(button('Check the shelf again',()=>void this.load(root),true));
  }
  if(confirmation&&this.current(root)&&this.status)this.reveal(this.status);
 }

 private showRetry(root:HTMLElement,message:string){
  this.notice(message);
  const retry=button('Confirm the same request',()=>void this.act(root,null,0),true);
  this.contents?.replaceChildren(retry);
  const dialog=root.closest('dialog');
  if(dialog)dialog.scrollTop=0;
  this.reveal(retry);
 }

 private paint(root:HTMLElement,view:SnackShelf){
  const contents=this.contents;
  if(!contents||!this.current(root))return;
  this.stopTimer();
  const now=Math.max(view.serverTime,this.town.serverNow());
  const pantry=this.town.snapshot?.orchard;
  if(pantry==='unavailable'||pantry===undefined){
   this.notice('The pantry could not be read. Its existing record is kept.');
   return;
  }
  const count=pantry?.snacks??0;
  const held=Number(view.outgoing!==null);
  const summary=element('section');
  summary.className='snack-shelf-summary';
  const art=element('img');
  art.src='/art/orchard/orchard-snack.svg';
  art.alt='';
  art.width=48;
  art.height=48;
  summary.append(art,element('p',count+' available'+(held?' · 1 on hold':'')+' · '+SNACK_CAP+' pouch spaces'));
  contents.replaceChildren(summary);
  const command=(label:string,action:SnackAction,primary=false)=>
   button(label,()=>void this.act(root,action,view.revision),primary);
  const incoming=view.incoming.filter(parcel=>parcel.expiresAt>now);
  for(const parcel of incoming){
   contents.append(this.incoming(parcel,count+held>=SNACK_CAP,command,now));
  }
  if(view.outgoing) {
   const parcel=view.outgoing;
   const outgoing=element('section');
   const title=parcel.state==='declined'?'Declined by '+parcel.name:parcel.expiresAt<=now?'Parcel expired':'Waiting for '+parcel.name;
   outgoing.append(element('h3',title),element('p','This parcel reserves one pouch space.'),
    command('Take back snack',{kind:'reclaim',parcelId:parcel.id},true));
   contents.append(outgoing);
  }else{
   const send=element('section');
   send.append(element('h3','Leave one packed snack'));
   if(!count||!view.neighbors.length){
    send.append(element('p',count?'A neighbor needs to enter the town first.':'Pack an orchard snack before leaving one here.'));
   }else{
    const label=element('label','Choose a neighbor');
    const names=element('select');
    names.id='snack-recipient';
    label.htmlFor=names.id;
    names.append(new Option('Select a resident',''));
    for(const person of view.neighbors)names.append(new Option(person.name,person.id));
    const leave=button('Leave snack',()=>{
     if(names.value)void this.act(root,{kind:'leave',recipientId:names.value},view.revision);
    },true);
    leave.disabled=true;
    names.onchange=()=>{leave.disabled=!names.value;};
    send.append(element('p','They have 24 hours to pick it up.'),label,names,leave);
   }
   contents.append(send);
  }
  const next=Math.min(...[...incoming,...(view.outgoing&&view.outgoing.state==='waiting'?[view.outgoing]:[])]
   .map(parcel=>parcel.expiresAt).filter(expiry=>expiry>now));
  if(Number.isFinite(next))this.timer=window.setTimeout(()=>{
   if(!this.current(root))return;
   if(!this.busy){this.paint(root,view);this.notice('The collection window ended. The sender can take the snack back.');}
  },Math.min(next-now+1,2_147_483_647));
 }

 private incoming(parcel:SnackParcel,full:boolean,
  command:(label:string,action:SnackAction,primary?:boolean)=>HTMLButtonElement,now:number){
  const card=element('section');
  const hours=Math.ceil((parcel.expiresAt-now)/3_600_000);
  card.append(element('h3','A snack from '+parcel.name),
   element('p','“The committee saved you lunch.” · '+hours+' h to collect'));
  const actions=element('div');
  actions.className='snack-shelf-actions';
  const accept=command('Accept snack',{kind:'accept',parcelId:parcel.id},true);
  accept.disabled=full;
  actions.append(accept,command('Decline',{kind:'decline',parcelId:parcel.id}));
  if(full){
   card.append(element('p','Your pouch is full. The parcel can wait while you make room.'));
   actions.append(command('Taste a snack',{kind:'taste'}));
  }
  card.append(actions);
  return card;
 }

 private async act(root:HTMLElement,action:SnackAction|null,revision:number){
  if(!this.current(root)||this.busy)return;
  if(!this.host.canUse()){
   this.notice('Return to the café counter to confirm your parcel.');
   return;
  }
  this.busy=true;
  this.stopTimer();
  this.notice('Confirming the parcel…');
  this.contents?.replaceChildren();
  root.setAttribute('aria-busy','true');
  try{
   const outcome=await this.town.snackCommand(action,revision,()=>this.current(root));
   if(this.current(root))await this.load(root,outcome.message);
  }catch(error){
   if(!this.current(root))return;
   if(this.town.snackRetryAvailable)this.showRetry(root,'The reply was interrupted. Confirm once to check the parcel.');
   else await this.load(root,(error as Error).message);
  }finally{
   if(this.current(root)){
    this.busy=false;
    root.removeAttribute('aria-busy');
   }
  }
 }
}
