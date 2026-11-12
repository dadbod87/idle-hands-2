import {residentArt} from '../art/variety.ts';
import type {CollectionGrant} from '../game/collection-receipt.ts';
type Asset={url:string}|null;
const sheets=new Map<string,Promise<Asset>>();const failedSheets=new Set<string>();
function sheet(key:string){if(failedSheets.delete(key))sheets.delete(key);let request=sheets.get(key);if(!request){const image=new Image();image.src='/art/collection/'+key+'.svg';request=image.decode().then(()=>({url:image.src})).catch(()=>{failedSheets.add(key);return null;});sheets.set(key,request);}return request;}
/** Disposable presentation only: no state, transport, persistence or world actions. */
export class CollectionReceiptView {
 readonly root=document.createElement('section');readonly collect=document.createElement('button');readonly retry=document.createElement('button');readonly status=document.createElement('p');
 private actor=document.createElement('div');private empty=document.createElement('span');private note=document.createElement('p');private region=document.createElement('div');
 private media=matchMedia('(prefers-reduced-motion: reduce)');private timers:number[]=[];private generation=0;private destroyed=false;private asset:Asset= null;private loaded=false;private confirmed=false;private pendingId='';private seen=new Set<string>();
 constructor(readonly resource:CollectionGrant['resource'],rig:string,private current:()=>boolean,onCollect:()=>void,onRetry:()=>void){
  this.root.className='collection-receipt';this.root.dataset.collectionArt='loading';this.root.dataset.collectionAnimating='false';this.root.dataset.collectionResource=resource;const row=document.createElement('div');row.className='collection-action';this.collect.type='button';this.collect.className='primary collection-control';this.collect.dataset.collect=resource;this.collect.textContent='Collect available '+resource;this.collect.onclick=()=>{if(this.collect.getAttribute('aria-disabled')!=='true')onCollect();};
  const art=document.createElement('div');art.className='collection-art';art.setAttribute('aria-hidden','true');this.empty.textContent='—';this.actor.className='collection-actor';this.actor.hidden=true;art.append(this.empty,this.actor);row.append(this.collect,art);
  this.region.className='collection-status-wrap';this.region.tabIndex=0;this.region.setAttribute('role','region');this.region.setAttribute('aria-label','Collection receipt');this.status.className='workshop-status collection-status';this.status.setAttribute('aria-live','off');this.status.textContent='Choose Collect to gather the available material.';this.region.append(this.status);
  this.retry.type='button';this.retry.className='remote-retry collection-control';this.retry.textContent='Retry the same request';this.retry.setAttribute('aria-disabled','true');this.retry.onclick=()=>{if(this.retry.getAttribute('aria-disabled')!=='true')onRetry();};this.note.className='collection-art-note';this.note.textContent='The clerk has reserved a form.';this.root.append(row,this.region,this.retry,this.note);
  document.addEventListener('keydown',this.key,true);document.addEventListener('pointerdown',this.pointer,true);this.root.addEventListener('focusin',this.focused);this.media.addEventListener('change',this.staticResult);document.addEventListener('visibilitychange',this.staticResult);
  const key=residentArt(rig)+'-'+resource;this.root.dataset.collectionRig=residentArt(rig);void sheet(key).then(asset=>{if(this.destroyed||!this.current())return;this.loaded=true;this.asset=asset;this.root.dataset.collectionArt=asset?'ready':'failed';if(asset)this.actor.style.backgroundImage='url("'+asset.url+'")';if(this.confirmed)this.still();});
 }
 private keyboard=false;
 private key=()=>{this.keyboard=true;};private pointer=()=>{this.keyboard=false;};private focused=(event:FocusEvent)=>{if(this.keyboard&&event.target instanceof HTMLElement)this.uncover(event.target);};
 get started(){return !!this.pendingId;}
 get usable(){return this.valid();}
 private valid(){return !this.destroyed&&this.root.isConnected&&this.current();}
 private cancel(){this.root.dataset.collectionAnimating='false';this.generation++;this.timers.forEach(clearTimeout);this.timers=[];}
 private staticResult=()=>{this.cancel();if(this.confirmed&&this.valid())this.still();};
 private frame(col:number){this.actor.style.backgroundPosition=(-col*57.6)+'px 0px';this.root.dataset.collectionPhase=String(col);}
 private still(){const ready=!!this.asset;this.actor.hidden=!ready;this.empty.hidden=ready;this.frame(2);this.note.textContent=ready?'Filed under: useful.':this.loaded?'Artwork unavailable. Receipt kept.':'Artwork loading. Receipt kept.';}
 begin(id:string){this.cancel();this.pendingId=id;this.confirmed=false;this.actor.hidden=true;this.empty.hidden=false;delete this.root.dataset.collectionQuantity;delete this.root.dataset.collectionSaved;this.note.textContent='Waiting for the receipt.';this.message('Waiting for confirmation…');}
 message(text:string){if(this.status.textContent!==text){this.status.textContent=text;this.region.scrollTop=0;}}
 confirm(grant:CollectionGrant,saved:boolean,message:string){
  if(!this.valid()||grant.commandId!==this.pendingId||grant.resource!==this.resource||this.seen.has(grant.commandId))return false;
  this.seen.add(grant.commandId);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value!);this.confirmed=true;this.root.dataset.collectionQuantity=String(grant.quantity);this.root.dataset.collectionSaved=String(saved);this.message(message+(saved?' Saved.':''));this.still();
  if(!this.asset||this.media.matches||document.hidden)return true;
  this.cancel();this.root.dataset.collectionAnimating='true';const generation=this.generation;[1,2,3,2].forEach((col,i)=>{const apply=()=>{if(!this.valid()||generation!==this.generation)return;this.frame(col);if(i===3)this.root.dataset.collectionAnimating='false';};if(!i)apply();else{const timer=window.setTimeout(()=>{this.timers=this.timers.filter(t=>t!==timer);apply();},i*140);this.timers.push(timer);}});return true;
 }
 blocked(collect:boolean,retry:boolean){this.collect.setAttribute('aria-disabled',String(collect));this.retry.setAttribute('aria-disabled',String(retry));}
 focus(){const dialog=this.root.closest('dialog');if(dialog)dialog.scrollTop=0;this.collect.focus({preventScroll:true});this.uncover(this.collect);}
 uncover(target:HTMLElement){const dialog=this.root.closest('dialog'),head=dialog?.querySelector('header');if(!dialog||!head)return;const b=target.getBoundingClientRect(),h=head.getBoundingClientRect(),d=dialog.getBoundingClientRect();if(b.top<h.bottom+8||b.bottom>d.bottom-8)dialog.scrollTop+=b.top-h.bottom-8;}
 destroy(){document.removeEventListener('keydown',this.key,true);document.removeEventListener('pointerdown',this.pointer,true);this.root.removeEventListener('focusin',this.focused);this.destroyed=true;this.cancel();this.media.removeEventListener('change',this.staticResult);document.removeEventListener('visibilitychange',this.staticResult);}
}
