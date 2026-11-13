import {CROP_IDS,CROP_DEFS,CLIPPING_MARKERS,MARKER_IDS,MARKER_DEFS,STAKE_IDS,STAKE_CHOICES,STAKE_STUDIES,settleGarden,gardenStage,type GardenState,type GardenAction,type CropId,type MarkerId,type StakeId} from '../game/live-garden.ts';
import{gardenBedView,gardenGrowthLabel,plantingConfirmation}from'../game/garden-view.ts';
import {WorkshopUI,duration,type WorkshopCommandResult} from './workshop.ts';
import './garden.css';
type PublicGarden={credits:number;target:6;markers:Array<{ownerId:string;ownerName:string;marker:MarkerId}>};
type GardenHost={open:(title:string)=>void;body:HTMLElement;feedback:(text:string)=>void;changed:()=>void;owner:()=>string;shared:boolean;publicState:()=>PublicGarden|undefined;canUse:(action:GardenAction)=>boolean;go:(room:'square'|'garden',stopId:string)=>void;accepted:(action:GardenAction)=>void};
const choiceNames={'sound-end':'The firm, unbroken end','paint-mark':'The painted stripe','square-notch':'The square notch'};
export class GardenUI{
 private active:(()=>void)|null=null;private selected:number|null=null;private crop:CropId='radish';private owner='';
 private notes:HTMLDetailsElement|null=null;private layoutObserver:ResizeObserver|null=null;
 private readonly bedFeedback='Choose a bed or preview an action. Your plants wait safely.';
 private neutralFeedback=this.bedFeedback;
 private status:HTMLElement|null=null;private busy=false;private preview=false;private marker:MarkerId='sunburst';private saveError='';
 get isSaving(){return this.busy||this.workshop.gardenSaveStatus().canRetry;}
 constructor(private host:GardenHost,private workshop:WorkshopUI){const timer=window.setInterval(()=>this.refresh(),1000);const visible=()=>{if(!document.hidden)this.refresh();};document.addEventListener('visibilitychange',visible);this.host.body.addEventListener('focusin',event=>{const target=event.target;if(target instanceof HTMLElement&&target.matches(':focus-visible')&&target.matches('button,input,select,summary,[tabindex="0"]')&&!target.classList.contains('garden-status'))requestAnimationFrame(()=>{if(this.active&&this.host.body.contains(target)&&document.activeElement===target)this.ensureVisible(target);});});window.addEventListener('pagehide',e=>{if(!e.persisted){clearInterval(timer);document.removeEventListener('visibilitychange',visible);this.layoutObserver?.disconnect();}});}
 closed(){this.active=null;this.status=null;this.notes=null;this.preview=false;this.layoutObserver?.disconnect();this.layoutObserver=null;const dialog=this.host.body.closest('dialog');if(dialog){dialog.classList.remove('garden-dialog');dialog.style.scrollPaddingTop='';dialog.style.scrollPaddingBottom='';}}
 refresh(){if(document.hidden||!this.active)return;if(this.owner!==this.host.owner()){this.preview=false;this.host.body.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('button,input,select').forEach(e=>e.disabled=true);if(this.status)this.status.textContent='The resident changed. Reopen this panel to review the current resident’s garden.';return;}if(!this.workshop.state.garden){if(this.status)this.status.textContent='This local town service needs its garden update before these controls are available.';this.host.body.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('button,input,select').forEach(e=>e.disabled=true);return;}this.active();}
 private el<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;}
 private image(key:string,size=48){const image=this.el('img');image.src='/art/garden/'+key+'.svg';image.alt='';image.width=size;image.height=size;return image;}
 private button(text:string,fn:()=>void,kind=''){const b=this.el('button',text,'destination');b.type='button';b.onclick=fn;if(kind)b.dataset.gardenAction=kind;return b;}
 private view(){const raw=this.workshop.state.garden,actual=this.workshop.gardenClock();return{state:raw?settleGarden(raw,Math.max(actual,raw.observedAt)):undefined,now:Math.max(actual,raw?.observedAt??actual),clockOk:!raw||actual>=raw.observedAt};}
 private blocked(action:GardenAction){const save=this.workshop.gardenSaveStatus();return this.owner!==this.host.owner()||this.busy||save.busy||save.canRetry||save.readOnly||!this.view().clockOk||!this.host.canUse(action);}
 private begin(title:string,neutral=this.bedFeedback){
  this.neutralFeedback=neutral;
  const owner=this.host.owner();if(owner!==this.owner){this.selected=null;this.preview=false;this.owner=owner;}
  this.host.open(title);this.host.body.classList.add('garden-panel');this.host.body.closest('dialog')?.classList.add('garden-dialog');
  this.status=this.el('p',this.neutralFeedback,'garden-status');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.status.tabIndex=0;
  this.notes=this.el('details','','garden-options');this.notes.append(this.el('summary','Garden notes & privacy'),this.el('p',this.host.shared?'Shared practice · your garden stock is private. Only a deliberately selected marker is public.':'Local practice · this browser only. Markers and welcome-bed progress here are not shared with other players.','disclosure'));
  this.host.body.append(this.el('p',this.host.shared?'Your private garden':'Private garden · saved in this browser','garden-scope'));
  const error=this.workshop.gardenSaveStatus().error;if(error)this.status.textContent=error;
 }
 private ensureVisible(element:HTMLElement,block:ScrollLogicalPosition='nearest'){
  const dialog=this.host.body.closest('dialog');if(!dialog)return;
  const rect=element.getBoundingClientRect(),head=dialog.querySelector('.dialog-head')?.getBoundingClientRect().bottom??dialog.getBoundingClientRect().top;
  const foot=this.status?.getBoundingClientRect().top??dialog.getBoundingClientRect().bottom;
  // Mouse focus must not scroll an already visible action. Only uncover a
  // control hidden by the sticky title/feedback, or explicitly align a quote.
  const shift=block==='start'?rect.top-head-8:rect.top<head?rect.top-head-8:rect.bottom>foot?rect.bottom-foot+8:0;
  if(Math.abs(shift)>.5)dialog.scrollTop+=shift;
 }
 private focusQuote(quote:HTMLElement){quote.focus({preventScroll:true});this.ensureVisible(quote,'start');}
 private navigation(room:'square'|'garden',id:string,label:string){const button=this.button(label,()=>this.host.go(room,id));button.dataset.gardenNav='true';return button;}
 private retryRow(afterRetry?:(result:WorkshopCommandResult)=>void){const b=this.button('Retry the same request',()=>void this.retry(afterRetry),'retry');b.classList.add('garden-retry');this.host.body.append(b);if(this.notes)this.host.body.append(this.notes);if(this.status)this.host.body.append(this.status);this.layoutObserver=new ResizeObserver(()=>{const target=document.activeElement;if(target instanceof HTMLElement&&target.hasAttribute('data-garden-quote')&&this.host.body.contains(target))this.ensureVisible(target,'start');});const header=this.host.body.closest('dialog')?.querySelector('.dialog-head');if(header)this.layoutObserver.observe(header);if(this.status)this.layoutObserver.observe(this.status);return b;}
 private async retry(afterRetry?:(result:WorkshopCommandResult)=>void){if(this.busy||this.owner!==this.host.owner())return;const status=this.status,owner=this.owner;this.busy=true;this.refresh();try{const r=await this.workshop.retryGarden();if(status===this.status&&owner===this.host.owner()&&this.active){afterRetry?.(r);if(r.ok)this.preview=false;if(status)status.textContent=r.message;}}finally{this.busy=false;this.host.changed();this.refresh();}}
 private async perform(action:GardenAction){
  if(this.blocked(action))return false;const status=this.status,owner=this.owner;this.busy=true;if(this.status)this.status.textContent='Saving this change…';this.refresh();this.host.changed();
  try{const result=await this.workshop.runGarden(action);if(status===this.status&&owner===this.host.owner()&&this.active){if(status)status.textContent=result.message;if(result.ok)this.preview=false;}if(owner===this.host.owner()){this.host.feedback(result.message);if(result.ok)this.host.accepted(action);}return result.ok;}
  finally{this.busy=false;this.host.changed();this.refresh();}
 }
 private updateRetry(button:HTMLButtonElement){const s=this.workshop.gardenSaveStatus();button.hidden=!s.canRetry;button.disabled=this.busy||s.busy;this.host.body.querySelectorAll<HTMLButtonElement>('[data-garden-nav]').forEach(b=>b.disabled=this.isSaving);if(!this.view().clockOk&&this.status)this.status.textContent='The clock has not caught up with this saved garden. Your plants are kept; actions will be available when the time can be confirmed.';else if(s.error&&this.status&&!this.status.textContent)this.status.textContent=s.error;else if(!s.error&&this.status?.textContent===this.saveError)this.status.textContent=this.neutralFeedback;this.saveError=s.error;}
 showBeds(){
  this.begin('Your rented allotment');
  const body=this.host.body;
  const walk=this.navigation('garden','garden-beds','Walk to the beds');
  const atBeds=this.host.canUse({action:'plant',bed:0,crop:'radish'});
  if(!atBeds)body.append(walk);else body.querySelector('.garden-scope')?.remove();
  const next=this.el('section','','garden-next'),nextReason=this.el('p'),nextActions=this.el('div');next.append(nextReason,nextActions);body.append(next);
  let layoutMode:'harvest'|'attendant'|'field'|null|undefined,layoutRevision=-1,layoutSelection=-1,receiptBed:number|null=null;
  const row=this.el('div','','garden-bed-list');
  const rows:Array<{button:HTMLButtonElement;img:HTMLImageElement;name:HTMLElement;crop:HTMLElement;time:HTMLElement;short:HTMLElement}>=[];
  for(let i=0;i<3;i++){
   const button=this.button('',()=>{this.selected=i;this.preview=false;receiptBed=null;this.refresh();});button.dataset.gardenBed=String(i);
   const img=this.image('garden-bed-empty',24),name=this.el('strong','Bed '+(i+1)),crop=this.el('span','','garden-crop-name'),time=this.el('span','','garden-bed-time-full'),short=this.el('span','','garden-bed-time-short');short.setAttribute('aria-hidden','true');name.append(crop);
   const text=this.el('span');text.append(name,time,short);button.append(img,text);rows.push({button,img,name,crop,time,short});row.append(button);
  }
  body.append(row);
  const stock=this.el('p','','garden-stock'),bedNotice=this.el('p','','garden-bed-notice');bedNotice.tabIndex=0;bedNotice.setAttribute('aria-label','Selected bed status');
  // Held produce remains in growing notes; keep selected planting facts by its action.
  const seedset=this.el('fieldset','','garden-seeds');seedset.append(this.el('legend','Choose a bound seed'));
  const radios:HTMLInputElement[]=[],counts:HTMLElement[]=[];
  for(const crop of CROP_IDS){
   const label=this.el('label','','garden-seed'),radio=this.el('input');radio.type='radio';radio.name='garden-seed';radio.value=crop;radio.checked=crop===this.crop;radio.setAttribute('aria-label',CROP_DEFS[crop].name);label.title=CROP_DEFS[crop].name;
   radio.onchange=()=>{this.crop=crop;this.preview=false;receiptBed=null;this.refresh();};
   const count=this.el('span');count.id='garden-seed-stock-'+crop;radio.setAttribute('aria-describedby',count.id);counts.push(count);label.append(radio,this.image('garden-'+crop+'-seed',24),this.el('span',crop==='radish'?'Radish':'Marigold'),count);seedset.append(label);radios.push(radio);
  }
  body.append(seedset);
  const facts=this.el('section','','garden-plant-facts'),factsTitle=this.el('h3'),factsList=this.el('dl'),factValues:HTMLElement[]=[];facts.dataset.gardenFacts='';for(const label of['Seed','Grow','Harvest']){const term=this.el('dt',label),value=this.el('dd');factValues.push(value);const line=this.el('div');line.append(term,value);factsList.append(line);}facts.append(factsTitle,factsList);body.append(facts);
  const actions=this.el('div','','garden-primary-actions');
  const preview=this.button('Preview planting · free',()=>{receiptBed=null;this.preview=true;this.refresh();this.focusQuote(previewText);},'preview-plant');
  const harvest=this.button('Harvest · 1 produce + 1 seed',()=>{receiptBed=null;void this.perform({action:'harvest',bed:this.selected??0});},'harvest');actions.append(preview,harvest);body.append(actions,bedNotice);
  const previewBox=this.el('section','','garden-preview'),previewText=this.el('p');previewText.dataset.gardenQuote='true';previewText.tabIndex=-1;
  const confirm=this.button('Confirm planting · 1 bound seed',()=>{
   const selected=this.selected??0,owner=this.host.owner(),returnFocus=document.activeElement===confirm;
   receiptBed=selected;
   void this.perform({action:'plant',bed:selected,crop:this.crop}).then(ok=>{
    if(!ok&&!this.workshop.gardenSaveStatus().canRetry)receiptBed=null;
    if(ok&&returnFocus&&!this.preview&&owner===this.host.owner()&&body.contains(confirm)&&confirm.closest('dialog')?.open&&(document.activeElement===confirm||document.activeElement===document.body)){
     // Return the selected action and its facts to view after confirming;
     // keep the receipt in place and respect a different chosen focus.
     harvest.scrollIntoView({block:'center',behavior:'instant'});this.ensureVisible(harvest);this.status?.focus({preventScroll:true});
    }
   });
  },'plant');
  const cancel=this.button('Cancel preview · free',()=>{
   if(!body.contains(cancel)||!cancel.closest('dialog')?.open||this.owner!==this.host.owner())return;
   this.preview=false;receiptBed=null;this.refresh();const target=preview.disabled?rows[this.selected??0].button:preview;
   target.focus({preventScroll:true});this.ensureVisible(target);
  },'cancel-preview');previewBox.append(previewText,confirm,cancel);body.append(previewBox);
  const inspect=this.button('Inspect soil & leaves · no production bonus',()=>void this.perform({action:'observe',bed:this.selected??0}),'observe');body.append(inspect);
  const practice=this.el('p','','garden-practice');
  const swap=this.el('select');swap.setAttribute('aria-label','Other bed to swap with');
  for(let i=0;i<3;i++){const option=this.el('option','Bed '+(i+1));option.value=String(i);swap.append(option);}swap.value='1';
  const swapButton=this.button('Swap the two beds · free',()=>void this.perform({action:'swap-beds',from:this.selected??0,to:Number(swap.value)}),'swap-beds');
  const arrange=this.el('details','','garden-options'),summary=this.el('summary','Practice, bed arrangement & growing notes');
  arrange.append(summary,stock,practice,this.el('p','Three beds. No house, kit or workshop slot needed. Ready plants wait safely; there is no withering. Seeds return at harvest.'),this.el('p','Rearranging never restarts growth. Choose another bed:'),swap,swapButton);body.append(arrange);
  const nav=this.el('div','','garden-navigation');if(atBeds)nav.append(walk);
  const attendantNav=this.navigation('garden','garden-desk','Visit the allotment attendant'),fieldNav=this.navigation('square','garden-field','Make a marker at the field'),registryNav=this.navigation('square','garden-registry','See chosen garden displays');
  const reviewHarvest=this.button('Review ready harvest',()=>{harvest.focus({preventScroll:true});this.ensureVisible(harvest);},'review-harvest');
  nav.append(attendantNav,fieldNav,registryNav);body.append(nav);
  const retry=this.retryRow(result=>{if(!result.ok&&!result.retry)receiptBed=null;});
  this.active=()=>{
   const {state:s,now}=this.view();if(!s)return;
   if(this.selected===null){const ready=s.beds.map((b,i)=>({b,i})).filter(v=>v.b&&v.b.readyAt<=now&&s.produce[v.b.crop]<12).sort((a,b)=>a.b!.readyAt-b.b!.readyAt);this.selected=ready[0]?.i??Math.max(0,s.beds.findIndex(b=>!b));}
   for(const[i,r]of rows.entries()){
    const bed=s.beds[i],stage=gardenStage(bed,now),name=bed?(bed.crop==='radish'?'Radish':'Marigold'):'Empty';
    r.button.setAttribute('aria-pressed',String(i===this.selected));r.crop.textContent=' · '+name;
    r.time.textContent=bed?(stage==='ready'?'Ready':duration(bed.readyAt-now)):'Ready to plant';
    r.short.textContent=bed?(stage==='ready'?'Ready':duration(bed.readyAt-now)):'Empty';
    r.button.setAttribute('aria-label','Bed '+(i+1)+'. '+name+'. '+r.time.textContent+(bed&&stage!=='ready'?' remaining.':'.'));
    r.img.src='/art/garden/'+(bed?'garden-'+bed.crop+'-'+stage:'garden-bed-empty')+'.svg';r.button.disabled=this.busy;
   }
   stock.textContent=`Radish ${s.produce.radish}/12 · Marigold ${s.produce.marigold}/12`;
   practice.textContent=`Gardening practice: ${s.practice}. Every harvest +1; rested bonus +1 when available (${s.rested.available}/6). An empty bonus bank never blocks base progress.`;
   for(const[i,crop]of CROP_IDS.entries()){counts[i].textContent=s.seeds[crop]+' available';radios[i].disabled=this.busy;}
   const bed=s.beds[this.selected!],action:GardenAction={action:'plant',bed:this.selected!,crop:this.crop};
   // Reorder only for an explicit selection or confirmed command, never a
   // passive one-second countdown. The existing route keeps its identity.
   if(layoutRevision!==this.workshop.state.revision||layoutSelection!==this.selected){
    const mode=bed&&s.produce[bed.crop]>=12?'attendant':bed&&bed.readyAt<=now?'harvest':s.beds.every(Boolean)?'field':null;
    if(mode!==layoutMode){
     nav.append(attendantNav,fieldNav,registryNav);nextActions.replaceChildren();
     if(mode==='attendant')nextActions.append(attendantNav);else if(mode==='field')nextActions.append(fieldNav);else if(mode==='harvest')nextActions.append(reviewHarvest);
     next.hidden=mode===null;
     nextReason.textContent=mode==='attendant'?'Your harvest stays safe. Review uses for full produce.':mode==='harvest'?'A harvest is ready. Nothing is collected until you confirm.':'Plants wait safely. A field marker uses clippings, not produce.';
     layoutMode=mode;
    }
    layoutRevision=this.workshop.state.revision;layoutSelection=this.selected!;
   }
   reviewHarvest.disabled=this.isSaving;
   const previousNeutral=this.neutralFeedback;
   this.neutralFeedback=bed&&s.produce[bed.crop]>=12?'The plant and seed stay safe. Review produce uses or choose another bed.':bed&&bed.readyAt>now?'Plants wait safely while you explore another activity.':bed?'A harvest is ready. Review its bed before collecting.':this.bedFeedback;
   if(this.status?.textContent===previousNeutral)this.status.textContent=this.neutralFeedback;
   const factsView=gardenBedView(s,this.selected!,this.crop,now),grow=factsView.durationMs;factsTitle.textContent='Bed '+(this.selected!+1)+' · '+factsView.name;factValues[0].textContent=factsView.seedCost+' seed · '+factsView.seedsHeld+' held';factValues[1].textContent=gardenGrowthLabel(grow,factsView.firstRadish);factValues[2].textContent=factsView.produce+' '+factsView.crop+' + '+factsView.seedReturned+' seed back';confirm.textContent=plantingConfirmation(this.selected!,this.crop);
   preview.disabled=this.busy||!!bed||s.seeds[this.crop]===0;
   previewBox.hidden=!this.preview&&receiptBed===null;
   previewText.textContent=this.preview?`Bed ${this.selected!+1} · ${CROP_DEFS[this.crop].name}. Cost: 1 seed. ${duration(grow)} real time.${this.host.canUse(action)?'':' Confirm at your beds.'}`:receiptBed!==null?`Bed ${receiptBed+1} planted. One bound seed was spent. This receipt stays until you close it or choose another bed; your plant waits safely.`:'Preview a seed and bed before planting. Nothing is spent until you confirm.';
   confirm.disabled=!this.preview||this.blocked(action)||!!bed||s.seeds[this.crop]===0;cancel.disabled=this.busy||!this.preview&&receiptBed===null;cancel.textContent=!this.preview&&receiptBed!==null?'Close planting receipt · free':'Cancel preview · free';
   bedNotice.textContent=!bed?(s.seeds[this.crop]>0?'Empty · choose a seed and preview planting.':'No selected seed in hand. Growing plants return theirs at harvest; the attendant replaces missing starter supply.'):
    s.produce[bed.crop]>=12?'This produce space is full. The plant and seed wait safely; use produce or tend another bed.':bed.readyAt>now?'Growing · '+duration(bed.readyAt-now)+' left. Ready plants wait safely.':'Ready · harvest one produce, one seed and at least one practice point.';
   harvest.disabled=this.blocked({action:'harvest',bed:this.selected!})||!bed||bed.readyAt>now||s.produce[bed.crop]>=12;
   harvest.title=bed&&s.produce[bed.crop]>=12?'This produce space is full. The ready plant and seed will wait.':'Use a ready bed with output space.';
   inspect.disabled=this.blocked({action:'observe',bed:this.selected!})||!bed||bed.cared;swap.disabled=this.busy;
   swapButton.disabled=this.blocked({action:'swap-beds',from:this.selected!,to:Number(swap.value)})||Number(swap.value)===this.selected;
   this.updateRetry(retry);
  };
  swap.onchange=()=>this.refresh();this.refresh();
 }
 showDesk(){
  this.begin('Allotment attendant','Choose a quest or request. Costs are shown before confirmation.');const b=this.host.body;
  const lead=this.el('div','','garden-lead');lead.append(this.image('garden-attendant',48),this.el('p','Ada · Acting Dirt Liaison'));b.append(lead);
  this.notes?.append(this.el('p','“The committee has approved having roots. It would now like the roots in triplicate.”'),this.el('p','Find three usable pieces, compare their marks, then assemble a distinctive marker by hand. No workshop materials, XP, money or countdown.'));
  const seeds=this.el('p'),recover=this.button('Replace missing starter seeds · free',()=>void this.perform({action:'recover-seeds'}),'recover-seeds');
  const help=this.el('details','','garden-options');help.append(this.el('summary','Starter seed help'),seeds,recover);
  const current=this.view().state,missing=!!current&&CROP_IDS.some(c=>current.seeds[c]+current.beds.filter(v=>v?.crop===c).length<CROP_DEFS[c].seedQuota);help.open=missing;if(missing)b.append(help);
  b.append(this.el('h3','An urgent matter of almost-straight stakes'));
  const accept=this.button('Accept the stake errand · free',()=>void this.perform({action:'accept-errand'}),'accept-errand');b.append(accept);
  const pieces=this.el('ul','','garden-pieces'),piecesText:HTMLElement[]=[];
  for(const station of STAKE_IDS){const li=this.el('li'),text=this.el('span');text.tabIndex=0;piecesText.push(text);li.append(text,this.navigation('square','stake-'+station,'Find '+STAKE_STUDIES[station].name.toLowerCase()));pieces.append(li);}b.append(pieces);
  const assemble=this.button('Assemble almost-straight marker · free',()=>void this.perform({action:'assemble-marker'}),'assemble-marker');b.append(assemble);if(!missing)b.append(help);
  this.requestSection(b);b.append(this.navigation('garden','garden-desk','Walk to the attendant'),this.navigation('garden','garden-beds','Return to your beds'),this.button('Preview owned markers',()=>this.showMarkers()));const retry=this.retryRow();
  const update=this.active;this.active=()=>{
   update?.();const s=this.view().state;if(!s)return;
   seeds.textContent=`Starter seeds in hand: radish ${s.seeds.radish}, marigold ${s.seeds.marigold}. Growing and ready plants count toward your two-radish/one-marigold supply.`;
   recover.disabled=this.blocked({action:'recover-seeds'})||CROP_IDS.every(c=>s.seeds[c]+s.beds.filter(v=>v?.crop===c).length===CROP_DEFS[c].seedQuota);
   accept.disabled=this.blocked({action:'accept-errand'})||s.errand.accepted;accept.textContent=s.errand.accepted?'Stake errand accepted':'Accept the stake errand · free';
   for(const[i,id]of STAKE_IDS.entries())piecesText[i].textContent=(s.errand.pieces.includes(id)?'✓ Recorded: ':'○ To find: ')+STAKE_STUDIES[id].name;
   assemble.disabled=this.blocked({action:'assemble-marker'})||s.errand.assembled||s.errand.pieces.length!==3;this.updateRetry(retry);
  };this.refresh();
 }
 private requestSection(b:HTMLElement){
  b.append(this.el('h3','The town welcome bed'));
  const price=this.el('p','Cost: 1 radish + 1 marigold. One request per rolling 24 real hours.','garden-request-price');
  const caution=this.el('p','','garden-timer garden-request-caution'),progress=this.el('p','','garden-request-progress');
  caution.tabIndex=0;progress.tabIndex=0;const button=this.button('Confirm produce request',()=>void this.perform({action:'submit-request'}),'submit-request');button.classList.add('garden-request-confirm');b.append(price,caution,button,progress);
  this.active=()=>{
   const{state:s,now}=this.view();if(!s)return;
   const credits=this.host.shared?this.host.publicState()?.credits:Math.min(6,s.requests),cooling=s.nextRequestAt!==null&&s.nextRequestAt>now;
   const spendsGoal=this.workshop.state.carpentry.keepEaselGoal&&s.produce.marigold===1;
   progress.textContent=credits===undefined?'Welcome bed status has not loaded. Your produce is kept.':`Welcome bed: ${credits}/6. Your requests: ${s.requests}. ${credits>=6?'Complete · another request records personal recognition only.':'Any resident can contribute; one person can supply all six.'}`;
   caution.textContent=cooling?'Next request in '+duration(s.nextRequestAt!-now):spendsGoal?'Uses your last easel-goal flower. Confirm only if you want to spend it.':s.produce.radish<1||s.produce.marigold<1?'Keep one harvested radish and one marigold to make a request.':'Ready to confirm. Records recognition, with no points or production bonus.';
   button.textContent=spendsGoal?'Confirm · spend goal flower':'Confirm produce request';
   button.disabled=this.blocked({action:'submit-request'})||credits===undefined||s.produce.radish<1||s.produce.marigold<1||cooling;
  };
 }
 showStake(station:StakeId){
  this.begin(STAKE_STUDIES[station].name,'Compare the marks. Wrong choices spend nothing.');const b=this.host.body;b.append(this.image('garden-stake-'+station,112),this.el('p',STAKE_STUDIES[station].question));const buttons:HTMLButtonElement[]=[];
  for(const choice of STAKE_CHOICES){const a:GardenAction={action:'inspect-stake',station,choice};const button=this.button(choiceNames[choice],()=>void this.perform(a),'inspect-stake');button.dataset.stakeChoice=choice;buttons.push(button);b.append(button);}b.append(this.el('p',STAKE_STUDIES[station].hint,'disclosure'),this.navigation('garden','garden-desk','Return to the allotment attendant'));const state=this.el('p');b.append(state);const retry=this.retryRow();this.active=()=>{const s=this.view().state;if(!s)return;state.textContent=s.errand.pieces.includes(station)?'✓ This unique piece is recorded.':s.errand.accepted?'Compare the piece. Wrong choices spend nothing.':'Accept the errand at the attendant before recording a piece.';for(const [i,choice]of STAKE_CHOICES.entries())buttons[i].disabled=this.blocked({action:'inspect-stake',station,choice})||!s.errand.accepted||s.errand.pieces.includes(station);this.updateRetry(retry);};this.refresh();
 }
 showField(){
  this.begin('Field clippings · hand-made markers','Preview a marker. Making one costs two clippings.');const b=this.host.body;b.append(this.el('p','Make a hand-made marker · 2 field clippings.'));this.notes?.append(this.el('p','Gather two replenishing field clippings and make one new marker by hand. No workshop slot or ordinary materials. Each design is bought once; switching an owned marker is free.'));const bank=this.el('p','','garden-bank');bank.tabIndex=0;b.append(bank);const choices=this.el('div','','garden-marker-grid');b.append(choices);const buttons:Array<{button:HTMLButtonElement;marker:typeof CLIPPING_MARKERS[number]}>=[];
  for(const marker of CLIPPING_MARKERS){const button=this.button('',()=>{this.marker=marker;this.preview=true;this.refresh();this.focusQuote(description);});button.dataset.markerPreview=marker;button.append(this.image('garden-marker-'+marker,56),this.el('span',MARKER_DEFS[marker].name));buttons.push({button,marker});choices.append(button);}
  const box=this.el('section','','garden-preview'),description=this.el('p'),confirm=this.button('Make this design · 2 field clippings',()=>void this.perform({action:'make-marker',marker:this.marker as typeof CLIPPING_MARKERS[number]}),'make-marker'),cancel=this.button('Cancel preview · free',()=>{this.preview=false;this.refresh();});description.dataset.gardenQuote='true';description.tabIndex=-1;box.append(description,confirm,cancel);b.append(box,this.navigation('square','garden-field','Walk to the field'),this.button('See owned markers',()=>this.showMarkers()));const retry=this.retryRow();this.active=()=>{const {state:s,now}=this.view();if(!s)return;bank.textContent=`Field clippings: ${s.clippings.available}/6. One returns every 15 minutes; one personal pool, not one per stop.${s.clippings.available<6?' Next in '+duration(s.clippings.lastAt+15*60000-now):''}`;for(const {button,marker}of buttons){button.disabled=this.busy;button.setAttribute('aria-pressed',String(marker===this.marker));button.title=s.markers.includes(marker)?'Already owned; choose it for display.':MARKER_DEFS[marker].description;}box.hidden=false;description.textContent=this.preview?MARKER_DEFS[this.marker].name+' — '+MARKER_DEFS[this.marker].description+(s.markers.includes(this.marker)?' Already owned; choose it for display for free.':' Cost: 2 field clippings. Walk to the field before confirming.'):'Choose a design above to preview. Nothing is spent until you confirm.';confirm.disabled=!this.preview||!CLIPPING_MARKERS.includes(this.marker as typeof CLIPPING_MARKERS[number])||this.blocked({action:'make-marker',marker:this.marker as typeof CLIPPING_MARKERS[number]})||s.markers.includes(this.marker)||s.clippings.available<2;cancel.disabled=this.busy||!this.preview;this.updateRetry(retry);};this.refresh();
 }
 showMarkers(){
  this.begin('Garden displays · chosen, not automatic','Preview a design. Only Display marker shares your choice.');const b=this.host.body;b.append(this.el('p','Preview your designs for free. Only Display marker shares an owned choice.'),this.el('h3','Your marker library'));const list=this.el('div','','garden-public-list'),choices=this.el('div','','garden-marker-grid');b.append(choices);const cards:HTMLButtonElement[]=[];
  for(const marker of MARKER_IDS){const button=this.button('',()=>{this.marker=marker;this.preview=true;this.refresh();this.focusQuote(name);});button.dataset.markerPreview=marker;button.append(this.image('garden-marker-'+marker,64),this.el('span',MARKER_DEFS[marker].name));cards.push(button);choices.append(button);}
  const preview=this.el('section','','garden-preview'),name=this.el('p'),display=this.button('Display marker · free',()=>void this.perform({action:'display-marker',marker:this.marker}),'display-marker'),cancel=this.button('Cancel preview · free',()=>{this.preview=false;this.refresh();});name.dataset.gardenQuote='true';name.tabIndex=-1;preview.append(name,display,cancel);b.append(preview);const remove=this.button('Remove public marker · keep owned designs',()=>void this.perform({action:'display-marker',marker:null}),'remove-marker');b.append(remove,this.navigation('square','garden-registry','Walk to the display registry'),this.navigation('square','garden-field','Make a design at the field'),this.navigation('garden','garden-desk','Ask about the stake errand'));this.requestSection(b);b.append(this.el('h3','Chosen public markers'),list);const update=this.active,retry=this.retryRow();
  this.active=()=>{update?.();const s=this.view().state;if(!s)return;for(const [i,marker]of MARKER_IDS.entries()){cards[i].disabled=this.busy;cards[i].setAttribute('aria-pressed',String(this.marker===marker));cards[i].querySelector('span')!.textContent=MARKER_DEFS[marker].name+' · '+(s.markers.includes(marker)?s.selectedMarker===marker?'Displayed':'Owned':'Not yet owned');cards[i].title=s.markers.includes(marker)?(s.selectedMarker===marker?'Currently displayed':'Owned; preview or display for free'):'Not owned yet';}preview.hidden=false;name.textContent=!this.preview?'Choose a design to preview. Only Display marker publishes an owned choice.':MARKER_DEFS[this.marker].name+' — '+MARKER_DEFS[this.marker].description+(s.markers.includes(this.marker)?' Owned.':' Earn this design first.');display.disabled=!this.preview||this.blocked({action:'display-marker',marker:this.marker})||!s.markers.includes(this.marker)||s.selectedMarker===this.marker;remove.disabled=this.blocked({action:'display-marker',marker:null})||s.selectedMarker===null;cancel.disabled=this.busy||!this.preview;
   const markers=this.host.shared?this.host.publicState()?.markers??[]:s.selectedMarker?[{ownerId:'local',ownerName:'Your local marker',marker:s.selectedMarker}]:[];const signature=JSON.stringify([!this.host.shared||!!this.host.publicState(),markers]);if(list.dataset.signature!==signature){list.dataset.signature=signature;list.replaceChildren();if(!markers.length)list.append(this.el('p',this.host.shared&&!this.host.publicState()?'The display registry is loading.':'No public marker has been selected yet.'));for(const row of markers){const item=this.el('div','','garden-public-marker');item.dataset.markerOwner=row.ownerId;item.append(this.image('garden-marker-'+row.marker,64),this.el('strong',row.ownerName),this.el('span',MARKER_DEFS[row.marker].name));list.append(item);}}this.updateRetry(retry);};this.refresh();
 }
}
