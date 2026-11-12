import {RECIPIENT_IDS,RECIPIENTS,MOTIFS,MOTIF_NAMES,routeCaption,type RecipientId,type LetterboxMotif,type CommissionAction} from '../game/commission.ts';
import {WorkshopUI} from './workshop.ts';
import './commission.css';
type Host={open:(title:string)=>void;body:HTMLElement;feedback:(message:string)=>void;changed:()=>void;owner:()=>string;shared:boolean;canUse:(action:CommissionAction)=>boolean;go:(room:'square'|'garden'|'workshop',stop:string)=>void;styles:()=>Array<{ownerId:string;ownerName:string;motif:LetterboxMotif}>|undefined};
export class CommissionUI{
 private active:(()=>void)|null=null;private busy=false;private status:HTMLElement|null=null;private owner='';private preview:LetterboxMotif='leaf';private quoteRevision:number|null=null;private revealUntil=0;private generation=0;
 get isSaving(){return this.busy||this.workshop.gardenSaveStatus().canRetry;}
 constructor(private host:Host,private workshop:WorkshopUI){
  const timer=setInterval(()=>{if(!document.hidden)this.refresh();},1000);
  const revealFocus=()=>{const focused=document.activeElement;if(this.active&&focused instanceof HTMLElement&&focused!==this.status&&host.body.contains(focused))this.ensureVisible(focused);};
  const keyboardFocus=()=>{if(document.activeElement?.matches(':focus-visible'))revealFocus();};
  host.body.addEventListener('focusin',keyboardFocus);const observer=new ResizeObserver(revealFocus),head=host.body.closest('dialog')?.querySelector('.dialog-head');if(head)observer.observe(head);
  window.addEventListener('pagehide',e=>{if(!e.persisted){clearInterval(timer);observer.disconnect();host.body.removeEventListener('focusin',keyboardFocus);}});
 }
 private ensureVisible(element:HTMLElement){
  const dialog=this.host.body.closest('dialog');if(!dialog)return;
  const rect=element.getBoundingClientRect(),head=dialog.querySelector('.dialog-head')?.getBoundingClientRect().bottom??dialog.getBoundingClientRect().top,foot=this.status?.getBoundingClientRect().top??dialog.getBoundingClientRect().bottom;
  const shift=rect.top<head?rect.top-head-8:rect.bottom>foot?rect.bottom-foot+8:0;
  if(Math.abs(shift)>.5)dialog.scrollTop+=shift;
 }

 closed(){this.generation++;this.active=null;this.status=null;this.quoteRevision=null;this.revealUntil=0;}
 refresh(){this.active?.();}
 private el<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''){const e=document.createElement(tag);e.textContent=text;e.className=className;return e;}
 private image(key:string,alt='',width=72,height=88){const img=this.el('img');img.src='/art/commission/'+key+'.svg';img.alt=alt;img.width=width;img.height=height;return img;}
 private button(label:string,fn:()=>void,id:string){const b=this.el('button',label,'destination');b.type='button';b.dataset.commissionAction=id;b.onclick=fn;return b;}
 private blocked(a?:CommissionAction){const save=this.workshop.gardenSaveStatus();return this.busy||save.busy||save.canRetry||save.readOnly||this.owner!==this.host.owner()||!!a&&!this.host.canUse(a);}
 private begin(title:string){this.host.open(title);this.owner=this.host.owner();this.host.body.classList.add('commission-panel');this.quoteRevision=null;this.status=this.el('p','','commission-status');this.status.tabIndex=0;this.status.setAttribute('role','status');return this.host.body;}
 private async perform(a:CommissionAction,revision?:number){
  if(this.blocked(a))return;
  const focused=document.activeElement,owner=this.owner,generation=this.generation,status=this.status;
  const current=()=>owner===this.host.owner()&&generation===this.generation&&status===this.status&&this.active!==null;
  this.busy=true;if(status)status.textContent='Confirming this change…';this.refresh();this.host.changed();
  try{const r=await this.workshop.runCommission(a,revision,current);if(!current())return;if(status)status.textContent=r.message;this.host.feedback(r.message);if(r.ok){this.quoteRevision=null;if(a.action==='make'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.revealUntil=performance.now()+600;setTimeout(()=>{if(current())this.refresh();},650);}}}
  finally{this.busy=false;this.refresh();this.host.changed();if(current()&&focused instanceof HTMLButtonElement&&(focused.disabled||focused.hidden||!focused.isConnected||focused.closest('[hidden]')))status?.focus({preventScroll:true});}
 }

 private nav(label:string,room:'square'|'garden'|'workshop',stop:string,id='walk-'+stop){const b=this.button(label,()=>{if(!this.isSaving)this.host.go(room,stop);},id);b.dataset.commissionNav='';return b;}
 private footer(){
  const retry=this.button('Retry the same unconfirmed request',()=>{
   if(this.busy)return;const owner=this.owner,generation=this.generation,status=this.status;
   const current=()=>owner===this.host.owner()&&generation===this.generation&&status===this.status&&this.active!==null;
   this.busy=true;this.refresh();void this.workshop.retryCommission(current).then(r=>{if(!current())return;if(status)status.textContent=r.message;this.quoteRevision=null;}).finally(()=>{this.busy=false;this.refresh();this.host.changed();});
  },'retry');
  this.host.body.append(retry,this.el('p',this.host.shared?'Shared fictional practice · the server confirms deliveries and ownership.':'Local browser practice · a separate save from the shared town.','commission-note'),this.status!);return retry;
 }

 private refreshFooter(retry:HTMLButtonElement){const s=this.workshop.gardenSaveStatus();retry.hidden=!s.canRetry;retry.disabled=this.busy||s.busy||!s.canRetry;this.host.body.querySelectorAll<HTMLButtonElement>('[data-commission-nav]').forEach(b=>b.disabled=this.isSaving);if(this.owner!==this.host.owner()){this.host.body.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);if(this.status)this.status.textContent='The resident changed. Reopen this panel to inspect the current resident’s route.';}else if(s.error&&this.status&&!this.busy)this.status.textContent=s.error;}
 addNpcLink(recipient:RecipientId|'courier'){
  const b=this.button(recipient==='courier'?'Pip’s post · optional route & letterbox':'Deliver an addressed parcel · optional',()=>recipient==='courier'?this.showPip():this.showRecipient(recipient),'open-'+recipient);
  this.host.body.firstElementChild?.after(b);
  if(recipient!=='courier')b.hidden=this.workshop.state.commission.acceptedAt===null||this.workshop.state.commission.completedAt!==null;
 }
 showRecipient(recipient:RecipientId){
  const r=RECIPIENTS[recipient],b=this.begin(r.name+' · addressed post');b.append(this.el('h3','A parcel with an actual address'),this.el('p',r.role+'. Choose a parcel to hand over explicitly. A wrong address returns the same parcel; nothing is spent.'));
  const progress=this.el('p','','commission-stock');b.append(progress);const actions:HTMLButtonElement[]=[];
  for(const id of RECIPIENT_IDS){const a:CommissionAction={action:'handover',parcel:id,recipient},button=this.button('Hand '+RECIPIENTS[id].name+'’s parcel to '+r.name,()=>void this.perform(a),'handover-'+id);button.prepend(this.image('parcel-'+RECIPIENTS[id].short,'',44,44));b.append(button);actions.push(button);}
  b.append(this.nav('Return to Pip · receipts & resume','square','courier'));const retry=this.footer();this.active=()=>{const c=this.workshop.state.commission;progress.textContent=c.paused?'Route paused. Resume the same route with Pip.':`${c.order.length}/3 receipts kept. Parcels use no ordinary or produce bag space.`;actions.forEach((button,i)=>{const id=RECIPIENT_IDS[i];button.disabled=this.blocked({action:'handover',parcel:id,recipient})||c.acceptedAt===null||c.paused||c.order.includes(id)||c.completedAt!==null;button.lastChild!.textContent=c.order.includes(id)?RECIPIENTS[id].name+' · receipt already kept':'Hand '+RECIPIENTS[id].name+'’s parcel to '+r.name;});this.refreshFooter(retry);};this.refresh();
 }
 showPip(){
  const b=this.begin('Pip’s post'),intro=this.el('div','','commission-lead');intro.append(this.image('pip-work-surface'),this.el('p','The Post Must Go Somewhere. Three addressed parcels, no fee and no deadline. Your workbenches keep working.'));b.append(intro);
  const progress=this.el('p','','commission-stock');b.append(progress);
  const accept=this.button('Accept the three parcels · free',()=>void this.perform({action:'accept'}),'accept'),pause=this.button('Pause route · keep everything',()=>void this.perform({action:'pause',paused:!this.workshop.state.commission.paused}),'pause');b.append(accept,pause);
  const route=this.el('section'),routeTitle=this.el('h3','Your addressed route');route.append(routeTitle);const rows:HTMLElement[]=[];
  for(const id of RECIPIENT_IDS){const item=this.el('div','','commission-route-stop'),image=this.image('parcel-'+RECIPIENTS[id].short,'',48,48),text=this.el('p');item.append(image,text,this.nav('Find '+RECIPIENTS[id].name,'square',id));route.append(item);rows.push(item);}
  b.append(route);const complete=this.button('Return three receipts · save route card',()=>void this.perform({action:'complete'}),'complete');b.append(complete);
  const card=this.el('section','','commission-card');card.append(this.el('h3','A route worth filing'),this.image('route-card','The Post Must Go Somewhere — private route card',320,200));const caption=this.el('p');card.append(caption,this.el('p','Your card and plan are kept. A physical letterbox is optional and made separately. No production bonus.','commission-note'));b.append(card);
  const craft=this.el('section');craft.append(this.el('h3','One Unreasonably Official Letterbox'));const picture=this.image('letterbox-leaf-closed','Letterbox preview',100,140);picture.dataset.commissionPreview='';craft.append(picture);
  const variants=this.el('div','','commission-motifs');const variantButtons=MOTIFS.map(motif=>{const button=this.button(MOTIF_NAMES[motif],()=>{this.preview=motif;this.quoteRevision=null;this.refresh();},'preview-'+motif);button.prepend(this.image('letterbox-'+motif+'-closed','',48,68));variants.append(button);return button;});craft.append(variants);
  const stock=this.el('p','','commission-stock'),warning=this.el('p','','commission-note');craft.append(stock,warning);
  const review=this.button('Review 2 pine + 1 radish · no extra timer',()=>{this.quoteRevision=this.workshop.state.revision;this.refresh();quote.focus({preventScroll:true});const head=b.closest('dialog')?.querySelector('.dialog-head');quote.style.scrollMarginTop=((head?.getBoundingClientRect().height??0)+8)+'px';quote.scrollIntoView({block:'start',behavior:'instant'});},'review');craft.append(review);
  const quote=this.el('section','','commission-quote');quote.tabIndex=-1;quote.dataset.commissionQuote='';const quoteText=this.el('p'),confirm=this.button('Make this letterbox · 2 pine + 1 radish',()=>{if(this.quoteRevision!==null)void this.perform({action:'make',motif:this.preview},this.quoteRevision);},'make'),cancel=this.button('Keep the plan · cancel preview',()=>{this.quoteRevision=null;this.refresh();review.focus({preventScroll:true});},'cancel');quote.append(quoteText,confirm,cancel);craft.append(quote);
  const style=this.button('Save chosen motif · free',()=>void this.perform({action:'style',motif:this.preview}),'style'),publish=this.button('Show my style at Pip’s register',()=>void this.perform({action:'publish',enabled:!this.workshop.state.commission.published}),'publish');craft.append(style,publish,this.el('p','One owned furnishing across your workshop and home. Move or store it through Bag & journal; motif changes are free. This is NPC-post decoration, not a player inbox.','commission-note'));b.append(craft);
  b.append(this.nav('Walk to Pip · confirm post actions','square','courier'),this.nav('Find Nella · free saw lesson & pine','square','carpentry-desk','pine-help'),this.nav('Visit your crops · seed, bed & harvest','garden','garden-beds'));
  const gallery=this.el('section'),galleryTitle=this.el('h3','Pip’s style register'),galleryList=this.el('div');gallery.append(galleryTitle,this.el('p','Owners choose whether to show a name and motif. Route order, stock and parcel contents stay private. A sample is not an extra owned object.','commission-note'),galleryList);b.append(gallery);let galleryKey='';const retry=this.footer();
  this.active=()=>{
   const s=this.workshop.state,c=s.commission,here=this.host.canUse({action:'accept'}),made=c.madeCount===1;progress.textContent=c.acceptedAt===null?'Optional free chapter. No house, open bridge, helper or spare bag space required.':c.completedAt!==null?'Route card & plan kept · physical letterbox '+c.madeCount+'/1.':c.paused?'Paused · same parcels and receipts kept.':`${c.order.length}/3 receipts · deliver in any order, then return to Pip.`;
   accept.hidden=c.acceptedAt!==null;accept.disabled=this.blocked({action:'accept'});pause.hidden=c.acceptedAt===null||c.completedAt!==null;pause.textContent=c.paused?'Resume the same route · free':'Pause route · keep everything';pause.disabled=this.blocked({action:'pause',paused:!c.paused});route.hidden=c.acceptedAt===null||c.completedAt!==null;
   rows.forEach((row,i)=>{const id=RECIPIENT_IDS[i],delivered=c.order.includes(id);row.querySelector('p')!.textContent=RECIPIENTS[id].name+' · '+(delivered?'✓ Receipt kept':RECIPIENTS[id].parcel);row.querySelector('img')!.setAttribute('src','/art/commission/'+(delivered?'receipt-':'parcel-')+RECIPIENTS[id].short+'.svg');});
   complete.hidden=c.acceptedAt===null||c.completedAt!==null;complete.disabled=this.blocked({action:'complete'})||c.order.length!==3||c.paused;card.hidden=c.completedAt===null;caption.textContent=c.order.map(id=>RECIPIENTS[id].name).join(' → ')+'. '+routeCaption(c.order);craft.hidden=c.completedAt===null;
   const image='/art/commission/letterbox-'+this.preview+(this.revealUntil>performance.now()?'-open.svg':'-closed.svg');if(picture.getAttribute('src')!==image)picture.src=image;variantButtons.forEach((button,i)=>{button.setAttribute('aria-pressed',String(this.preview===MOTIFS[i]));button.disabled=this.isSaving;});stock.textContent=`Carried pine ${s.carpentry.pine.carried}/24 · harvested radishes ${s.garden.produce.radish}/12. Owned letterbox ${c.madeCount}/1.`;
   const conflicts:string[]=[];if(s.carpentry.keepEaselGoal&&s.carpentry.pine.carried>=4&&s.carpentry.pine.carried-2<4)conflicts.push('This uses pine shown in your 4-pine easel goal.');if(s.garden.produce.radish===1&&s.garden.produce.marigold>0)conflicts.push('This spends the last harvested radish available for a mixed welcome request.');if(s.carpentry.pine.carried<=2&&s.garden.produce.radish>=2&&s.garden.produce.marigold>0)conflicts.push('This leaves insufficient pine for a hamper.');warning.textContent=made?'Your saved motif: '+MOTIF_NAMES[c.motif]+'. Preview freely; Save chosen motif confirms one free change.':conflicts.join(' ')+' Two pine have an eight-hour replenishment opportunity cost. Nothing is reserved.';
   review.hidden=made;review.disabled=this.blocked();quote.hidden=made||this.quoteRevision===null;const current=this.quoteRevision===s.revision,affordable=s.carpentry.pine.carried>=2&&s.garden.produce.radish>=1;quoteText.textContent=!current?'Your belongings changed. Review the current price again; nothing was spent.':`Spend 2 carried pine + 1 harvested radish for one ${MOTIF_NAMES[this.preview]} letterbox. Would leave ${Math.max(0,s.carpentry.pine.carried-2)} pine and ${Math.max(0,s.garden.produce.radish-1)} radish. `+(affordable?'': 'Missing ingredients. Seeds and growing crops cannot be spent. ')+(!here?'Walk to Pip to confirm.':'');confirm.disabled=!current||!affordable||this.blocked({action:'make',motif:this.preview});cancel.disabled=this.isSaving;
   style.hidden=!made;style.disabled=this.blocked({action:'style',motif:this.preview})||this.preview===c.motif;publish.hidden=!made;publish.disabled=this.blocked({action:'publish',enabled:!c.published});publish.textContent=c.published?'Remove my style sample · keep item':'Show my style at Pip’s register';
   const styles=this.host.styles(),key=JSON.stringify(styles??null);if(key!==galleryKey){galleryKey=key;galleryList.replaceChildren();if(!styles)galleryList.append(this.el('p','The public register has not loaded.'));else if(!styles.length)galleryList.append(this.el('p','No styles published yet. Publishing is optional.'));else for(const sample of styles){const entry=this.el('div','','commission-public-style');entry.append(this.image('letterbox-'+sample.motif+'-closed','',48,68),this.el('p',sample.ownerName+' · '+MOTIF_NAMES[sample.motif]));galleryList.append(entry);}}
   this.refreshFooter(retry);
  };this.preview=this.workshop.state.commission.motif;this.refresh();
 }
}
