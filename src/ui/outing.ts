import{OUTING_STOPS,condition,createOuting,type OutingState,type OutingIntent,type OutingStation}from'../game/outing.ts';
import{OutingSaveWriter}from'../persistence/outing-save.ts';import type{TownClient}from'./town-client.ts';import './outing.css';
type Host={open:(title:string)=>void;body:HTMLElement;position:()=>{room:string;position:{x:number;y:number}};go:(id:string)=>void;changed:()=>void;feedback:(message:string)=>void};
export class OutingUI{
 private local:OutingSaveWriter;private opened=false;private busy=false;private epoch=0;private owner='';private key='';private message='';
 constructor(private host:Host,private town:TownClient|null){
  let locks:ConstructorParameters<typeof OutingSaveWriter>[1];try{const native=navigator.locks;if(native)locks={request:(name,fn)=>native.request(name,async()=>fn())};}catch{/* Restricted coordination makes only outings read-only. */}
  this.local=new OutingSaveWriter({getItem:key=>localStorage.getItem(key),setItem:(key,v)=>localStorage.setItem(key,v)},locks);
  window.addEventListener('storage',()=>{if(!this.town){this.local.reload();this.host.changed();this.refresh();}});
  this.host.body.addEventListener('focusin',event=>{const target=event.target;if(this.opened&&target instanceof HTMLElement&&target.matches('button,summary')&&target.matches(':focus-visible'))requestAnimationFrame(()=>{if(this.opened&&document.activeElement===target)this.reveal(target);});});
  window.addEventListener('resize',()=>{const target=document.activeElement;if(this.opened&&target instanceof HTMLElement&&this.host.body.contains(target))this.reveal(target);});
 }
 snapshot():OutingState{return this.town?this.town.snapshot?.outing??createOuting():this.local.state;}
 closed(){this.opened=false;this.epoch++;this.host.body.closest('dialog')?.classList.remove('outing-dialog');}
 refresh(){if(!this.opened||this.busy)return;const key=JSON.stringify([this.town?.snapshot?.playerId??'local',this.snapshot().revision]);if(key!==this.key)this.render();}
 show(){this.host.open('Woodland work');this.opened=true;this.owner=this.town?.snapshot?.playerId??'local';this.message='';this.render();this.host.body.closest('dialog')?.classList.add('outing-dialog');if(this.snapshot().active&&(innerHeight<500||parseFloat(getComputedStyle(document.documentElement).fontSize)>20))this.focusNext();}
 private reveal(element:HTMLElement){const dialog=this.host.body.closest('dialog');if(!dialog)return;const r=element.getBoundingClientRect(),top=(dialog.querySelector('.dialog-head')?.getBoundingClientRect().bottom??dialog.getBoundingClientRect().top)+8,bottom=dialog.getBoundingClientRect().bottom-12;const shift=r.top<top?r.top-top:r.bottom>bottom?r.bottom-bottom:0;if(Math.abs(shift)>.5)dialog.scrollTop+=shift;}
 private focusNext(){const b=this.host.body,button=b.querySelector<HTMLButtonElement>('[data-outing-action=retry]:not(:disabled)')??b.querySelector<HTMLButtonElement>('.outing-pieces button:not(:disabled),[data-outing-action=cross]:not(:disabled),[data-outing-action=detour]:not(:disabled),[data-outing-action=finish]:not(:disabled)')??b.querySelector<HTMLButtonElement>('[data-outing-nav]:not(:disabled)');const target=button??b.querySelector<HTMLElement>('.outing-status');if(target){target.focus({preventScroll:true});this.reveal(target);}}
 private p(text:string,cls=''){const el=document.createElement('p');el.textContent=text;el.className=cls;return el;}
 private button(label:string,action:()=>void,key?:string){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='destination';if(key)b.dataset.outingAction=key;b.onclick=action;b.addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();});b.disabled=this.busy;return b;}
 private near():OutingStation|null{const p=this.host.position();return p.room==='square'?OUTING_STOPS.find(s=>Math.hypot(s.point.x-p.position.x,s.point.y-p.position.y)<=1.4)?.id??null:null;}
 private walk(id:string,label?:string){const b=this.button(label??'Walk to '+OUTING_STOPS.find(s=>s.id===id)!.name,()=>this.host.go(id));b.dataset.outingNav=id;this.host.body.append(b);}
 private async act(intent:OutingIntent,retry=false){
  if(this.busy||this.owner!==(this.town?.snapshot?.playerId??'local'))return;const station=this.near();if(!station&&!retry){this.message='Walk to the work stop first.';this.render();return;}
  const epoch=this.epoch,owner=this.owner,revision=this.snapshot().revision;this.busy=true;this.message='Confirming your work…';this.render();
  try{if(this.town){if(this.town.isSaving&&!retry)throw new Error('Another change is being confirmed.');if(retry)await this.town.retry(()=>this.opened&&this.epoch===epoch);else await this.town.command({kind:'outing',outingAction:intent},()=>this.opened&&this.epoch===epoch);this.message=this.town.lastMessage;}
   else{if(retry)await this.local.retry();else await this.local.act(intent,station!,crypto.randomUUID(),revision);this.message=this.local.message;}
   this.host.changed();
  }catch(error){this.message=(error as Error).message;}finally{this.busy=false;if(this.opened&&this.epoch===epoch&&this.owner===owner){this.render();if(innerHeight<500||parseFloat(getComputedStyle(document.documentElement).fontSize)>20)this.focusNext();else{const status=this.host.body.querySelector<HTMLElement>('.outing-status');if(status){status.focus({preventScroll:true});this.reveal(status);}}}}
 }
 private render(){
  const b=this.host.body,s=this.snapshot(),run=s.active,station=this.near();this.key=JSON.stringify([this.town?.snapshot?.playerId??'local',s.revision]);b.replaceChildren();b.classList.add('outing-panel');
  if(!run)b.append(this.p('A little woodland work. Your other jobs keep going.','outing-scope'));
  if(this.town&&!this.town.snapshot?.outing){b.append(this.p('Update the practice town before starting an outing. Your existing progress is kept.'));return;}
  if(!run||run.stage===0||run.stage===4){const title=document.createElement('h3');title.textContent=run?run.stage===4?'A sign of progress':'Your woodland assignment':'An arrow has resigned';b.append(title);}
  if(!run){
   b.append(this.p(s.journal.length?'Your repair is in the journal. A different condition is ready when you feel like another walk.':'Borrow a support, inspect the bend and mend the town arrow. No materials needed.'));
   const next=condition(s.runs%2===0?'wind':'soft-bank');b.append(this.p(next.title+' · '+next.detail,'outing-condition'));
   if(station==='outing-desk'){for(const tool of['brace','rope']as const)b.append(this.button('Borrow '+tool+(tool===next.tool?' · suited to this route':' · try another way'),()=>void this.act({action:'start',tool}),'start-'+tool));}else this.walk('outing-desk','Walk to the woodland work desk');
  }else{
   const c=condition(run.variant);b.append(this.p(c.title+' · Borrowed '+run.tool,'outing-condition'));
   const image=document.createElement('img');image.src='/art/outing/post-'+(run.stage>=4?'repaired':run.stage===3?'pinned':run.stage>=2?'aligned':'broken')+'.svg';image.alt=run.stage>=4?'Repaired wooden waymarker pointing west toward town.':'A wooden arrow assembly awaiting your repair.';image.width=200;image.height=180;image.className='outing-assembly';b.append(image);
   if(run.stage===0){b.append(this.p(c.detail));if(station==='outing-crossing')b.append(this.button('Secure this route with '+run.tool,()=>void this.act({action:'cross',runId:run.id}),'cross'));else this.walk('outing-crossing','Woodland bend · direct route');if(station==='outing-detour')b.append(this.button('Take the marked detour',()=>void this.act({action:'detour',runId:run.id}),'detour'));else this.walk('outing-detour','Marked detour · same waymarker');}
   else if(run.stage<4){
    const instructions=['','Position the arrow toward town, to the west.','Fit the brass pin through the aligned joint.','Fasten the borrowed support. The arrow has no further objections.'];b.append(this.p(instructions[run.stage]));
    if(station!=='outing-post')this.walk('outing-post','Walk to the leaning waymarker');
    else{const pieces=document.createElement('div');pieces.className='outing-pieces';
     if(run.stage===1){pieces.append(this.button('← Point toward town',()=>void this.act({action:'align',runId:run.id,direction:'west'}),'align-west'),this.button('Point away →',()=>void this.act({action:'align',runId:run.id,direction:'east'}),'align-east'));}
     if(run.stage===2)pieces.append(this.button('● Fit the brass pin',()=>void this.act({action:'pin',runId:run.id}),'pin'));
     if(run.stage===3)pieces.append(this.button('⌁ Fasten the '+run.tool,()=>void this.act({action:'secure',runId:run.id}),'secure'));b.append(pieces);
    }
   }else{b.append(this.p('The arrow points home. Report back to record your repair and return the tool.'));if(station==='outing-desk')b.append(this.button('Record repair & return tool',()=>void this.act({action:'finish',runId:run.id}),'finish'));else this.walk('outing-desk','Report back at the desk');}
   if(station==='outing-desk'){for(const tool of['brace','rope']as const)if(tool!==run.tool)b.append(this.button('Exchange for '+tool+' · free',()=>void this.act({action:'borrow',runId:run.id,tool}),'borrow-'+tool));if(run.stage<4){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='End this outing';details.append(summary,this.p('Return the tool without recording a repair. Your other progress is untouched.'),this.button('Return tool · leave unfinished',()=>void this.act({action:'leave',runId:run.id}),'leave'));b.append(details);}}
   else this.walk('outing-desk','Back to the tool desk');
  }
  const journal=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Woodland journal · '+s.journal.length+(s.journal.length===1?' repair':' repairs');journal.append(summary);for(const entry of s.journal.slice(-10).reverse())journal.append(this.p(condition(entry.variant).title+' · '+(entry.route==='main'?'secured route':'scenic detour')+' · '+new Date(entry.finishedAt).toLocaleDateString()));if(!s.journal.length)journal.append(this.p('Your first recorded repair will appear here.'));b.append(journal);
  const status=this.p(this.message||(!this.town&&this.local.blocked?this.local.message:'Tools are borrowed. Follow the marked stops, then return to the desk.'),'outing-status');status.role='status';status.tabIndex=-1;const conditionLine=b.querySelector('.outing-condition');if(conditionLine)conditionLine.after(status);else b.append(status);
  if(this.town?.retryAvailable||this.local.canRetry)b.append(this.button('Retry the same pending request',()=>void this.act(run?{action:'finish',runId:run.id}:{action:'start',tool:'brace'},true),'retry'));
  if(!this.town&&this.local.blocked)for(const button of b.querySelectorAll<HTMLButtonElement>('[data-outing-action]'))button.disabled=true;
 }
}
