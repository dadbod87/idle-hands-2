import{housingPurchase}from'../game/housing-view.ts';
import{addressForPlot}from'../game/neighborhood.ts';
import {homeSlots,homeDisplay} from '../game/home-layout.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../game/town-rules.ts';
import {PROPS,type WorkshopState } from '../game/workshop.ts';
import {TRAIL_LANDMARK_IDS,type Room,type Point } from '../game/world.ts';
import {duration} from './workshop.ts';
import {TownClient,type TownSnapshot,type TownPlot,type TownCommand} from './town-client.ts';
export {TownClient} from './town-client.ts';
export type {TownPosition,TownPlot,TownLesson,TownSnapshot,TownCommand,TownHooks} from './town-client.ts';
import './town.css';
type TownHost={open:(title:string)=>void;body:HTMLElement;feedback:(message:string)=>void;changed?:()=>void;enterHome?:(plotId:string)=>Promise<void>;enterNeighborhood?:(districtId:string)=>Promise<void>;enterTrail?:()=>void};
export class TownUI {
 private status:HTMLElement|null=null;
 private busy=false;
 private panel:''|'bridge'|'plots'|'lesson'|'trail'='';
 private landmark:string|undefined;
 private plotVersion='';
 private choiceOwner='';private registryOpen=false;
 private homeChoices=new Map<string,{prop:string;slot:string;details:boolean}>();
 private homeKeyboard=false;
 private purchaseUpdates:Array<()=>void>=[];
 constructor(private host:TownHost,private client:TownClient){const dialog=this.host.body.closest('dialog');dialog?.addEventListener('keydown',event=>{if(event.key==='Tab')this.homeKeyboard=true;});dialog?.addEventListener('pointerdown',()=>this.homeKeyboard=false);window.setInterval(()=>{if(!document.hidden&&this.status?.isConnected)this.refresh();},1000);}
 private p(text:string){const p=document.createElement('p');p.textContent=text;return p;}
 private button(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.className='destination';b.onclick=action;return b;}
 private start(title:string,context=true){this.purchaseUpdates=[];this.panel='';this.host.open(title);this.host.body.classList.remove('home-arrangement-panel');this.host.body.replaceChildren();if(context)this.host.body.append(this.p('Practice town · fictional residents and test supplies. Confirmed changes are saved here.'));this.status=this.p('');this.status.className='town-status';this.status.setAttribute('role','status');this.status.tabIndex=-1;}
 private notice(){this.host.body.append(this.status!);}
 /** Keys describe a control's purpose and owning plot, never its label or order. */
 private focusKey(target:Element|null){
  if(!(target instanceof HTMLElement)||!this.host.body.contains(target))return null;
  const plot=target.closest<HTMLElement>('[data-home-plot]')?.dataset.homePlot,scope=plot?'[data-home-plot="'+CSS.escape(plot)+'"] ':'';
  for(const attribute of['data-home-field','data-home-action','data-home-upgrade','data-home-enter','data-town-claim','data-town-focus','data-town-plot-refresh','data-town-donate','data-bridge-check','data-lesson-start','data-lesson-complete','data-lesson-redeem','data-enter-trail','data-trail-stamp']){
   const value=target.getAttribute(attribute);if(value!==null)return scope+'['+attribute+'="'+CSS.escape(value)+'"]';
  }
  return null;
 }
 private repaintResult(refresh:()=>void,anchor:Element|null,message:string){
  const dialog=this.host.body.closest('dialog'),current=document.activeElement,chosen=current!==anchor&&current!==document.body&&current!==dialog,inside=!!current&&this.host.body.contains(current),key=this.focusKey(chosen?current:anchor),scroll=dialog?.scrollTop??0,keyboard=this.homeKeyboard;
  refresh();if(this.status)this.status.textContent=message;
  if(!dialog?.open||document.hidden||chosen&&!inside)return;
  if(chosen)dialog.scrollTop=scroll;
  const match=key?this.host.body.querySelector<HTMLElement>(key):null,target=match&&!match.hidden&&!match.matches(':disabled')&&getComputedStyle(match).visibility!=='hidden'&&match.getClientRects().length?match:this.status;
  target?.focus({preventScroll:true});
  if(chosen)dialog.scrollTop=scroll;
  if(target&&(keyboard||target===this.status))this.revealHomeFocus(target);
 }
 private async action(command:TownCommand,refresh:()=>void){
  if(this.busy)return;
  const status=this.status,owner=this.client.snapshot?.playerId,anchor=document.activeElement,dialog=this.host.body.closest('dialog'),ownsPanel=()=>status===this.status&&!!status?.isConnected&&this.client.snapshot?.playerId===owner,present=()=>!!dialog?.open&&ownsPanel();
  const showResult=(initiator:Element|null)=>{
   if(!present())return;
   const message=this.client.lastMessage||this.client.snapshot?.workshop.lastMessage||'Saved to the local town server.';
   this.host.feedback(message);this.host.changed?.();this.repaintResult(refresh,initiator,message);
  };
  this.busy=true;if(status)status.textContent='Waiting for the town server…';this.host.body.setAttribute('aria-busy','true');
  try{await this.client.command(command,present);showResult(anchor);}
  catch(error){
   if(!present())return;if(status)status.textContent=(error as Error).message;
   if(this.client.retryAvailable){
    const retry=this.button('Retry the same request',()=>{
     if(this.busy||!present())return;const retryAnchor=document.activeElement;this.busy=true;retry.disabled=true;this.host.body.setAttribute('aria-busy','true');
     void this.client.retry(present).then(()=>showResult(retryAnchor)).catch(e=>{if(present()){retry.disabled=false;if(status)status.textContent=e.message;}}).finally(()=>{this.busy=false;if(ownsPanel())this.host.body.removeAttribute('aria-busy');});
    });retry.dataset.townFocus='retry';this.host.body.querySelector('[data-town-focus="retry"]')?.remove();this.host.body.append(retry);
   }
  }finally{this.busy=false;if(ownsPanel())this.host.body.removeAttribute('aria-busy');}
 }

 async showLogin(onLogin?:(snapshot:TownSnapshot)=>void){this.start('Choose a practice resident');this.host.body.append(this.p('Choose a fictional resident. Each keeps their own saved workshop and plot.'));this.notice();let fixtures:Array<{id:string;name:string}>;try{fixtures=await this.client.fixtures();}catch{fixtures=[{id:'aster',name:'Aster'},{id:'bea',name:'Bea'},{id:'casey',name:'Casey'}];}if(!this.status?.isConnected)return;for(const fixture of fixtures)this.host.body.append(this.button(fixture.name,()=>{if(this.busy)return;this.busy=true;this.status!.textContent='Opening '+fixture.name+'’s practice town…';void this.client.login(fixture.id).then(snapshot=>{this.status!.textContent='Signed in as '+snapshot.name;onLogin?.(snapshot);}).catch(error=>this.status!.textContent=error.message).finally(()=>this.busy=false);}));}
 private paintJournal(s:TownSnapshot){const section=this.host.body.querySelector<HTMLElement>('[data-project-journal]');if(!section)return;const key=JSON.stringify(s.projectJournal??[]);if(section.dataset.version===key)return;section.dataset.version=key;section.replaceChildren();if(!s.projectJournal?.length)return;const heading=document.createElement('h3');heading.textContent='Committee minutes';section.append(heading);for(const event of s.projectJournal){const row=this.p(event.kind==='grandfathered'?'Already repaired. Earlier work and access are honored.':'Bridge opened · '+(event.effectiveAt===null?'recorded':new Date(event.effectiveAt).toLocaleString())+'. The path stays open.');row.dataset.projectEvent=event.id;section.append(row);}}
 private bridgeText(s:TownSnapshot){return `${s.bridge.contributed} / ${s.bridge.target} repair credits funded. `+(s.bridge.restored?'The bridge is open. Inkwood is ready.':s.bridge.phase==='building'?'Materials complete. Construction and inspection are in progress.':'Three credits. Several meetings. One bridge.');}
 showBridge(){
  this.start('Bridge committee');this.panel='bridge';const s=this.client.snapshot;if(!s){void this.showLogin();return;}
  const counter=this.p(this.bridgeText(s));counter.dataset.townBridge='';const clock=this.p('');clock.dataset.bridgeClock='';clock.setAttribute('role','timer');clock.setAttribute('aria-label','Bridge construction');const kits=this.p(`Your bridge kits: ${s.workshop.bridgeKits}. Keep ordinary stock for housing once repairs are funded.`);kits.dataset.townKits='';this.host.body.append(counter,clock,kits);
  const donate=this.button('Contribute one bridge kit',()=>void this.action({kind:'contribute'},()=>this.showBridge()));donate.dataset.townDonate='';this.host.body.append(donate);
  const lesson=s.lesson;if(lesson?.completed&&!lesson.redeemed&&!lesson.legacySatisfied){const route=s.lessonQuote?.route??(s.bridge.contributed>=s.bridge.target?'upkeep':'construction');const redeem=this.button(route==='upkeep'?'Record your maintenance inspection':'Contribute orientation maintenance',()=>void this.action({kind:'redeem-lesson',route,expectedBridgeContributed:s.lessonQuote?.expectedBridgeContributed??s.bridge.contributed},()=>this.showBridge()));redeem.dataset.lessonRedeem=route;this.host.body.append(this.p(route==='upkeep'?'The bridge is funded. Your paid credit records a separate inspection without changing construction time.':'Your paid orientation credit counts toward this repair. No kit or currency is created.'),redeem);}else if(lesson?.redeemed||lesson?.legacySatisfied)this.host.body.append(this.p('Your participation is already recorded. Your work stays saved.'));
  const enter=this.button('Walk into Inkwood trail',()=>this.host.enterTrail?.());enter.dataset.enterTrail='';this.host.body.append(enter);
  const refresh=this.button('Check bridge opening',()=>{if(this.busy)return;this.busy=true;refresh.disabled=true;void this.client.load().then(()=>this.showBridge()).catch(error=>{if(this.status)this.status.textContent=error.message;}).finally(()=>{this.busy=false;this.refresh();});});refresh.dataset.bridgeCheck='';this.host.body.append(refresh,this.p('A newly funded bridge takes six real hours. Its deadline is fixed; more contributions cannot restart or shorten it. Nobody needs to attend its opening.'));
  const journal=document.createElement('section');journal.dataset.projectJournal='';this.host.body.append(journal);this.paintJournal(s);
  this.notice();this.refresh();
 }
 showTrail(landmark?:string){
  this.start(landmark?worldLandmarkName(landmark):'Trail field notebook');this.panel='trail';this.landmark=landmark;const s=this.client.snapshot;if(!s){void this.showLogin();return;}
  this.host.body.append(this.p('Three small discoveries. One pennant for a wall that has otherwise been waiting politely. No currency, supplies or faster production.'));
  const progress=this.p('');progress.dataset.trailProgress='';this.host.body.append(progress);
  for(const id of TRAIL_LANDMARK_IDS){const row=this.p('');row.dataset.trailMark=id;this.host.body.append(row);}
  if(landmark){const note=landmark==='trailhead'?'The stump has passed its inspection. Nobody asked it to move.':landmark==='old-sign'?'The arrows disagree, but the field notebook can be precise.':'No birds have signed the attendance sheet. Nature remains unsupervised.';this.host.body.append(this.p(note));const stamp=this.button('Record this discovery',()=>void this.action({kind:'stamp-trail',landmarkId:landmark},()=>this.showTrail(landmark)));stamp.dataset.trailStamp=landmark;this.host.body.append(stamp);}
  else{const enter=this.button('Walk into Inkwood trail',()=>this.host.enterTrail?.());enter.disabled=!s.bridge.restored;this.host.body.append(enter);}
  const earned=document.createElement('img');earned.src='/art/trail/trail-pennant-icon.svg';earned.alt='Earned Inkwood discovery pennant';earned.width=64;earned.height=64;earned.dataset.trailPennant='';this.host.body.append(earned,this.p('Discoveries belong to you, even if someone else repaired the bridge. All three stamps earn one permanent home pennant. Re-reading a landmark gives no duplicate reward.'));this.notice();this.refresh();
 }
 showNeighborhoods(){
  const s=this.client.snapshot;if(!s){void this.showLogin();return;}this.start('Homes & neighbors');
  this.host.body.append(this.p('Choose a neighborhood, then walk to a door. Visitors may look around; only owners can arrange their homes.'));
  const districts=[...new Set(['1',...s.plots.map(p=>addressForPlot(p.id).block)])].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
  for(const id of districts){const homes=s.plots.filter(p=>addressForPlot(p.id).block===id),own=homes.some(p=>p.ownerId===s.playerId),button=this.button((own?'Your street · ':'')+'Neighborhood '+id+' · '+homes.length+' homes',()=>void this.host.enterNeighborhood?.(id));button.dataset.neighborhoodEnter=id;this.host.body.append(button);}
  this.notice();
 }
 private purchaseFacts(kind:'claim'|'expand',button:HTMLButtonElement,plotId?:string){
  const owner=this.client.snapshot!.playerId,card=document.createElement('p'),stock=document.createElement('strong'),reason=document.createElement('span');
  card.className='housing-purchase';card.dataset.housingPurchase=kind;card.id='housing-cost-'+(plotId??'new')+'-'+this.purchaseUpdates.length;card.append(stock,reason);button.setAttribute('aria-describedby',card.id);
  const update=()=>{const s=this.client.snapshot;if(this.panel!=='plots'||!s||s.playerId!==owner)return;const plot=s.plots.find(p=>p.id===plotId),v=housingPurchase(s.workshop.bridgeKits,kind,plot?.level??0),changed=kind==='claim'?!!s.plot:!plot||plot.ownerId!==s.playerId;
   if(stock.textContent!==v.stock)stock.textContent=v.stock;const message=changed?'Ownership changed · refresh plot information.':v.reason;if(reason.textContent!==message)reason.textContent=message;button.disabled=this.busy||changed||!v.canAfford;
  };
  this.purchaseUpdates.push(update);update();return card;
 }
 showPlots(plotId?:string){
  const s=this.client.snapshot;if(!s){void this.showLogin();return;}
  const selected=s.plots.find(p=>p.id===plotId),inside=!!selected&&s.position.room.startsWith('home')&&s.position.homePlotId===selected.id;
  const arranging=inside&&selected?.ownerId===s.playerId;
  this.start(arranging?'Your home':inside?'Visiting':'Town house plots',!inside);this.panel='plots';
  if(this.choiceOwner!==s.playerId){this.homeChoices.clear();this.choiceOwner=s.playerId;this.registryOpen=false;}
  this.plotVersion=JSON.stringify([s.plots,s.workshop.owned,s.workshop.bridgeKits]);
  if(inside)this.host.body.classList.add('home-arrangement-panel');
  if(!inside)this.host.body.append(this.p('Plots receive a permanent street address when claimed. You are not buying this registry building or choosing an occupied site.'));
  if(!s.plot&&!plotId){const claim=this.button(`Claim your house plot · ${PLOT_CLAIM_KITS} bridge kits`,()=>void this.action({kind:'claim-plot'},()=>this.showPlots()));claim.dataset.townClaim='new';claim.disabled=s.workshop.bridgeKits<PLOT_CLAIM_KITS;this.host.body.append(this.purchaseFacts('claim',claim),claim);}
  let records:HTMLDetailsElement|undefined;if(!inside&&!plotId&&s.plots.length>6){records=document.createElement('details');records.className='registry-records';records.dataset.registryRecords='';records.open=this.registryOpen;const summary=document.createElement('summary');summary.dataset.townFocus='registry-records';summary.textContent='Other home records · '+s.plots.filter(p=>p.ownerId!==s.playerId).length;records.append(summary);records.ontoggle=()=>{if(records?.isConnected)this.registryOpen=records.open;};}
  const plots=[...s.plots].sort((a,b)=>Number(b.ownerId===s.playerId)-Number(a.ownerId===s.playerId));
  for(const plot of plots){
   if(plotId&&plot.id!==plotId)continue;
   const owner=plot.ownerId===s.playerId,inThisHome=inside&&selected?.id===plot.id;
   const section=document.createElement('section');section.className='town-plot';section.dataset.homePlot=plot.id;
   const saved=this.homeChoices.get(plot.id)??{prop:'',slot:'',details:false};this.homeChoices.set(plot.id,saved);
   const rerender=()=>{const dialog=this.host.body.closest('dialog'),scroll=dialog?.scrollTop??0;this.showPlots(plotId);if(dialog)dialog.scrollTop=scroll;};
   const info=document.createElement('div');
   if(plot.ownerId){const enter=this.button(owner?'Enter your house':'Visit '+(plot.ownerName??'this house'),()=>{if(this.busy)return;this.busy=true;void this.host.enterHome?.(plot.id).catch(error=>this.host.feedback(error.message)).finally(()=>this.busy=false);});enter.dataset.homeEnter=plot.id;if(!inThisHome)info.append(enter);}
   info.append(this.p(`${addressForPlot(plot.id).label} · ${plot.ownerName??'Unclaimed'} · level ${plot.level??plot.tier??0}`));
   if(inThisHome)info.append(this.p('Practice town · fictional residents and test supplies. Confirmed changes are saved here.'));
   if(plot.pennantOwned)info.append(this.p('Inkwood discovery pennant · earned and displayed at home'));
   if(owner){
    const upgrade=this.button(`Upgrade plot · ${PLOT_UPGRADE_KITS} bridge kits`,()=>void this.action({kind:'upgrade-plot',plotId:plot.id},rerender));
    upgrade.dataset.homeUpgrade=plot.id;upgrade.disabled=s.workshop.bridgeKits<PLOT_UPGRADE_KITS||plot.level>=2;
    info.append(this.purchaseFacts('expand',upgrade,plot.id),upgrade,this.p(plot.level===2?'Expanded home · eight furnishing nooks, including two in your workroom.':'Starter home · six furnishing nooks. Expansion adds two workroom nooks.'));
    const controls=document.createElement('div');controls.className='home-arrange';controls.dataset.homeArrange='';
    const prop=document.createElement('select');prop.setAttribute('aria-label','Owned furniture for plot');prop.dataset.homeField='furniture';
    for(const[id,count]of Object.entries(s.workshop.owned))if(count>0){const option=document.createElement('option');option.value=id;option.textContent=PROPS[id as keyof typeof PROPS].name+' · '+count+' owned';prop.append(option);}
    if([...prop.options].some(o=>o.value===saved.prop))prop.value=saved.prop;saved.prop=prop.value;
    const slot=document.createElement('select');slot.setAttribute('aria-label','Plot furniture position');slot.dataset.homeField='position';
    for(const nook of homeSlots(plot.level)){const option=document.createElement('option'),placed=homeDisplay(plot)[nook.id];option.value=nook.id;option.textContent=(nook.id.startsWith('workroom-')?nook.label:nook.id)+' · '+(placed?PROPS[placed].name:'empty');slot.append(option);}
    if([...slot.options].some(o=>o.value===saved.slot))slot.value=saved.slot;saved.slot=slot.value;
    const preview=document.createElement('img');preview.alt='Selected owned furnishing';preview.width=56;preview.height=56;
    const updatePreview=()=>{preview.src=prop.value==='letterbox'?'/art/commission/letterbox-'+s.workshop.commission.motif+'-closed.svg':'/art/homes/home-'+prop.value+'-icon.svg';};updatePreview();
    prop.onchange=()=>{saved.prop=prop.value;updatePreview();};slot.onchange=()=>saved.slot=slot.value;
    const furnitureLabel=document.createElement('label');furnitureLabel.append('Furniture',prop);
    const row=document.createElement('div');row.className='home-furniture-row';row.append(preview,furnitureLabel);
    const positionLabel=document.createElement('label');positionLabel.append('Position',slot);
    const place=this.button('Place owned furniture here',()=>this.placePlot(plot.id,prop.value,slot.value,rerender));place.dataset.homeAction='place';
    const remove=this.button('Return furniture to bag',()=>void this.action({kind:'edit-plot',plotId:plot.id,action:'remove',slot:slot.value},rerender));remove.dataset.homeAction='remove';
    controls.append(row,positionLabel,place,remove);
    section.addEventListener('keydown',event=>{if(event.key==='Tab')this.homeKeyboard=true;});
    section.addEventListener('pointerdown',()=>this.homeKeyboard=false);
    section.addEventListener('focusin',event=>{if(this.homeKeyboard&&event.target instanceof HTMLElement)requestAnimationFrame(()=>this.revealHomeFocus(event.target as HTMLElement));});
    if(inThisHome){
     section.append(controls);
     const details=document.createElement('details');details.className='home-secondary';details.dataset.homeSecondary='';details.open=saved.details;
     const summary=document.createElement('summary');summary.dataset.townFocus='home-expansion';summary.textContent='House & expansion';details.append(summary,info);details.ontoggle=()=>{if(details.isConnected)saved.details=details.open;};
     section.append(details);
    }else section.append(info,controls);
   }else if(!plot.ownerId){
    section.append(info);const claim=this.button(`Claim plot · ${PLOT_CLAIM_KITS} bridge kits`,()=>void this.action({kind:'claim-plot'},()=>this.showPlots(plotId)));claim.dataset.townClaim='new';claim.disabled=!!s.plot||s.workshop.bridgeKits<PLOT_CLAIM_KITS;section.append(this.purchaseFacts('claim',claim),claim);
   }else{section.append(this.p('Visiting · only the owner can change this plot.'),info);}
   (records&&!owner?records:this.host.body).append(section);
  }
  if(records)this.host.body.append(records);
  const reload=this.button('Refresh plot information',()=>{if(this.busy)return;const dialog=this.host.body.closest('dialog'),scroll=dialog?.scrollTop??0;this.showPlots(plotId);if(dialog)dialog.scrollTop=scroll;});reload.dataset.townPlotRefresh='';
  if(inside){reload.style.visibility='hidden';reload.dataset.homeRefreshReserved='';}else reload.hidden=true;
  this.host.body.append(reload);this.notice();if(inside)this.status?.classList.add('home-status');
 }
 private revealHomeFocus(target:HTMLElement){
  if(!target.isConnected||!this.host.body.contains(target))return;
  const dialog=this.host.body.closest('dialog');if(!dialog)return;const rect=target.getBoundingClientRect(),head=dialog.querySelector('.dialog-head')?.getBoundingClientRect().bottom??dialog.getBoundingClientRect().top,bottom=dialog.getBoundingClientRect().bottom-8;
  if(rect.top<head+8)dialog.scrollTop-=head+8-rect.top;else if(rect.bottom>bottom)dialog.scrollTop+=rect.bottom-bottom;
 }
 showReturns(lines:string[]){this.start('Since your last visit');for(const line of lines)this.host.body.append(this.p(line));this.notice();}
 showLesson(){this.start('Orientation maintenance');this.panel='lesson';const s=this.client.snapshot;if(!s){void this.showLogin();return;}this.host.body.append(this.p('A useful first job. The committee insists it is not a shortcut to a house.'),this.p('Once only: 1 scrap + 1 timber + 1 supplies. 60 real seconds. Your ordinary bench job can run separately. This earns one nontradeable participation credit, never an inventory kit or currency.'));const quote=this.p('Current quote: '+((s.lessonQuote?.route??(s.bridge.contributed>=s.bridge.target?'upkeep':'construction'))==='construction'?'contribute to the collecting bridge repair.':'record a separate upkeep/inspection; the bridge is already funded or finished.')+' Cost: 1 scrap + 1 timber + 1 supplies, once. If this route changes before payment, nothing is spent and a refreshed quote is shown.');quote.className='quest-card';this.host.body.append(quote);const timer=this.p('');timer.dataset.lessonClock='';const start=this.button('Prepare orientation maintenance',()=>void this.action({kind:'start-lesson',route:s.lessonQuote?.route??(s.bridge.contributed>=s.bridge.target?'upkeep':'construction'),expectedBridgeContributed:s.lessonQuote?.expectedBridgeContributed??s.bridge.contributed},()=>this.showLesson()));start.dataset.lessonStart='';const complete=this.button('Collect maintenance credit',()=>void this.action({kind:'complete-lesson'},()=>this.showLesson()));complete.dataset.lessonComplete='';this.host.body.append(timer,start,complete,this.p('Bring the credit to the bridge committee. If repairs are already finished, record an upkeep inspection instead. Previously accepted bridge participation stays satisfied.'));this.notice();this.refresh();}
 private placePlot(plotId:string,prop:string,slot:string,refresh:()=>void){const snapshot=this.client.snapshot;if(!snapshot)return;const plot=snapshot.plots.find(plot=>plot.id===plotId);if(!plot)return;const elsewhere=Object.values(snapshot.workshop.placements).filter(value=>value===prop).length;const available=(snapshot.workshop.owned[prop as keyof WorkshopState['owned']]??0)-elsewhere;if(available<=0){const message='All copies are in your rental workshop. Return one to the bag there before placing it in your house plot.';if(this.status)this.status.textContent=message;this.host.feedback(message);return;}const placed=Object.entries(homeDisplay(plot)).filter(([,value])=>value===prop);void this.action({kind:'edit-plot',plotId,action:'place',slot,prop,...(placed.length>=available?{fromSlot:placed[0]?.[0]}:{})},refresh);}
 refresh(){if(!this.status?.isConnected||!this.client.snapshot)return;const s=this.client.snapshot;if(this.panel==='plots')for(const update of this.purchaseUpdates)update();if(this.panel==='lesson'){const lesson=s.lesson;const timer=this.host.body.querySelector<HTMLElement>('[data-lesson-clock]');const remaining=lesson?.readyAt?Math.max(0,Math.ceil((lesson.readyAt-this.client.serverNow())/1000)):0;if(timer)timer.textContent=lesson?.legacySatisfied?'Earlier bridge participation already satisfies this step.':lesson?.redeemed?'Participation recorded. Ordinary production and housing continue.':lesson?.completed?'Credit ready. Bring it to the bridge committee.':lesson?.startedAt!==null&&lesson?.startedAt!==undefined?(remaining?'Preparation ready in '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+'.':'Preparation finished. Collect your credit.'):'Make and place your first planter, then prepare this small task at your bench.';const start=this.host.body.querySelector<HTMLButtonElement>('[data-lesson-start]');if(start)start.disabled=this.busy||lesson?.startedAt!=null||!!lesson?.legacySatisfied||!!lesson?.redeemed||!s.workshop.stats.planterPlacedAfterCraft||Object.values(s.workshop.inventory).some(n=>n<1);const complete=this.host.body.querySelector<HTMLButtonElement>('[data-lesson-complete]');if(complete)complete.disabled=this.busy||lesson?.startedAt==null||remaining>0||!!lesson.completed||!!lesson.legacySatisfied;}else if(this.panel==='bridge'){const counter=this.host.body.querySelector<HTMLElement>('[data-town-bridge]');if(counter)counter.textContent=this.bridgeText(s);const clock=this.host.body.querySelector<HTMLElement>('[data-bridge-clock]');if(clock)clock.textContent=s.bridge.phase==='building'&&s.bridge.readyAt?(s.bridge.readyAt>this.client.serverNow()?'Inspection ready in '+duration(s.bridge.readyAt-this.client.serverNow())+'.':'Inspection deadline reached. Confirm opening with the committee.'):(s.bridge.restored?'Access saved. The trail stays open.':'The construction clock starts only when all materials are funded.');const kits=this.host.body.querySelector<HTMLElement>('[data-town-kits]');if(kits)kits.textContent=`Your bridge kits: ${s.workshop.bridgeKits}. Keep ordinary stock for housing once repairs are funded.`;const donate=this.host.body.querySelector<HTMLButtonElement>('[data-town-donate]');if(donate)donate.disabled=this.busy||s.bridge.contributed>=s.bridge.target||s.bridge.restored||s.workshop.bridgeKits<1;const enter=this.host.body.querySelector<HTMLButtonElement>('[data-enter-trail]');if(enter)enter.disabled=this.busy||!s.bridge.restored;const check=this.host.body.querySelector<HTMLButtonElement>('[data-bridge-check]');if(check)check.disabled=this.busy;this.paintJournal(s);}else if(this.panel==='trail'){const stamps=s.trail?.stamps??[];const progress=this.host.body.querySelector<HTMLElement>('[data-trail-progress]');if(progress)progress.textContent=`${stamps.length} / 3 discoveries recorded. `+(s.trail?.pennantOwned?'Your home pennant is earned.':'Find each landmark along the restored path.');for(const row of this.host.body.querySelectorAll<HTMLElement>('[data-trail-mark]'))row.textContent=(stamps.includes(row.dataset.trailMark!)?'✓ Recorded · ':'○ To find · ')+worldLandmarkName(row.dataset.trailMark!);const stamp=this.host.body.querySelector<HTMLButtonElement>('[data-trail-stamp]');if(stamp)stamp.disabled=this.busy||!s.bridge.restored||stamps.includes(this.landmark??'');const earned=this.host.body.querySelector<HTMLImageElement>('[data-trail-pennant]');if(earned)earned.hidden=!s.trail?.pennantOwned;}else if(this.panel==='plots'&&this.plotVersion!==JSON.stringify([s.plots,s.workshop.owned,s.workshop.bridgeKits])){const reload=this.host.body.querySelector<HTMLButtonElement>('[data-town-plot-refresh]');if(reload){reload.hidden=false;reload.style.visibility='visible';}}}
}

function worldLandmarkName(id:string){return id==='trailhead'?'Inspection stump':id==='old-sign'?'Retired wayfinding post':'Municipal birdwatching sign';}
