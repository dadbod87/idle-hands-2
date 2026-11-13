import {cafePublicSchema,type CafePublicState} from '../game/cafe-public.ts';
import {collectionGrantSchema,type CollectionGrant} from '../game/collection-receipt.ts';
import {isCurrentHomeLayout,homeAllocation,homeAllocationValid,type HomeLayout} from '../game/live-home-layout.ts';
import type {LetterboxMotif} from '../game/commission.ts';
import {nextGardenDeadline,type MarkerId} from '../game/live-garden.ts';
import {isCurrentWorkshop,type WorkshopState} from '../game/live-workshop.ts';
import {nextCarpentryDeadline,noticeboardSchema,type NoticeboardState} from '../game/carpentry.ts';
import {TOWN_SCHEMA} from '../game/protocol-version.ts';
import type {Room,Point} from '../game/world.ts';
import type {RemoteWorkshopAdapter} from './workshop.ts';
export type TownPosition={room:Room;position:Point;homePlotId?:string;districtId?:string};
export type TownPlot={id:string;ownerId:string|null;ownerName?:string;tier?:number;level:1|2;placements:HomeLayout['placements'];workroomPlacements:HomeLayout['workroomPlacements'];pennantOwned?:boolean;letterboxMotif?:LetterboxMotif|null};
export type TownLesson={startedAt:number|null;readyAt:number|null;completed:boolean;redeemed:boolean;route:'construction'|'upkeep'|null;legacySatisfied:boolean};
export type TownSnapshot={cafe?:CafePublicState;commissionTown?:{styles:Array<{ownerId:string;ownerName:string;motif:LetterboxMotif}>};serverInstance?:string;noticeboard?:NoticeboardState;playerId:string;name:string;workshop:WorkshopState;position:TownPosition;quest:{contentVersion:string|number;awarded:unknown};bridge:{contributed:number;target:number;restored:boolean;phase?:'collecting'|'building'|'open';startedAt?:number|null;readyAt?:number|null;openedAt?:number|null;grandfathered?:boolean};trail?:{stamps:string[];pennantOwned:boolean};projectJournal?:Array<{id:string;kind:'opened'|'grandfathered';effectiveAt:number|null;recordedAt:number}>;plot:TownPlot|null;plots:TownPlot[];seasonKey:string;scores:unknown;serverTime:number;gardenTown?:{credits:number;target:6;markers:Array<{ownerId:string;ownerName:string;marker:MarkerId}>};lesson?:TownLesson;lessonQuote?:{route:'construction'|'upkeep';expectedBridgeContributed:number}};
export type TownCommand=Record<string,unknown>&{kind:string;id?:string;expectedRevision?:number};
export type TownHooks={beforeCommand?:()=>Promise<void>;onSnapshot?:(snapshot:TownSnapshot)=>void;onPresence?:(presence:unknown)=>void;onConnection?:(state:string)=>void};
type CommandOutcome={snapshot:TownSnapshot;message:string;ok:boolean;command:TownCommand;playerId:string;collection?:CollectionGrant};
type Provenance={generation:number;epoch:number;playerId?:string};
type TownRequestError=Error&{definite?:boolean;staleBoot?:boolean};
const marker=(snapshot:TownSnapshot|null|undefined)=>typeof snapshot?.serverInstance==='string'&&snapshot.serverInstance.length>0?snapshot.serverInstance:null;
export class TownClient {
 snapshot:TownSnapshot|null=null;
 lastMessage='';
 private loading:Promise<TownSnapshot>|null=null;
 private refreshDirty=false;
 private pending:TownCommand|null=null;
 private inFlight:Promise<TownSnapshot>|null=null;
 private outcomes=new WeakMap<Promise<TownSnapshot>,Promise<CommandOutcome>>();
 private listeners=new Set<(snapshot:TownSnapshot)=>void>();
 private events:EventSource|null=null;
 private offset=0;
 private generation=0;
 private bootEpoch=0;
 private retiredBoots=new Set<string>();
 private recovery='';
 get recoveryNotice(){return this.recovery;}
 private message(value:string){return this.recovery?this.recovery+' '+value:value;}
 private notify(value:string){this.hooks.onConnection?.(this.message(value));}
 private identityAbort=new AbortController();
 private closed=false;
 private clockTimer:number|null=null;
 private streamRetryTimer:number|null=null;
 private streamRetryDelay=5_000;
 private hooks:TownHooks;
 constructor(hooks:TownHooks={}){this.hooks=hooks;document.addEventListener('visibilitychange',()=>{if(document.hidden){this.events?.close();this.events=null;this.cancelClock();this.cancelStreamRetry();}else if(this.snapshot&&!this.closed){this.connect();}});}
 serverNow=()=>Date.now()+this.offset;
 private cancelClock(){if(this.clockTimer!==null)window.clearTimeout(this.clockTimer);this.clockTimer=null;}
 private cancelStreamRetry(reset=false){if(this.streamRetryTimer!==null)window.clearTimeout(this.streamRetryTimer);this.streamRetryTimer=null;if(reset)this.streamRetryDelay=5_000;}
 private retryClosedStream(generation:number,epoch:number){if(this.streamRetryTimer!==null||this.closed||document.hidden)return;const delay=this.streamRetryDelay;this.streamRetryDelay=Math.min(30_000,delay*2);const handle=window.setTimeout(()=>{if(this.streamRetryTimer!==handle)return;this.streamRetryTimer=null;if(generation===this.generation&&epoch===this.bootEpoch&&!this.closed&&!document.hidden)this.connect();},delay);this.streamRetryTimer=handle;}
 private scheduleClock(){this.cancelClock();if(!this.snapshot||this.closed||document.hidden)return;const now=this.serverNow(),state=this.snapshot.workshop;const deadlines=Object.values(state.nodes).filter(node=>node.stock<6).map(node=>node.lastAt+4*3600_000);if(state.job&&state.job.readyAt>now)deadlines.push(state.job.readyAt);if(this.snapshot.lesson?.readyAt&&this.snapshot.lesson.readyAt>now)deadlines.push(this.snapshot.lesson.readyAt);if(this.snapshot.bridge.phase==='building'&&this.snapshot.bridge.readyAt&&this.snapshot.bridge.readyAt>now)deadlines.push(this.snapshot.bridge.readyAt);if(state.garden&&now>=state.garden.observedAt){const garden=nextGardenDeadline(state.garden,Math.floor(now));if(garden!==null)deadlines.push(garden);}if(state.carpentry&&now>=state.carpentry.observedAt){const nextCarpentry=nextCarpentryDeadline(state.carpentry,Math.floor(now));if(nextCarpentry!==null)deadlines.push(nextCarpentry);}if(this.snapshot.noticeboard?.phase==='installing'&&this.snapshot.noticeboard.readyAt!==null&&this.snapshot.noticeboard.readyAt>now)deadlines.push(this.snapshot.noticeboard.readyAt);if(this.snapshot.cafe?.readyAt&&this.snapshot.cafe.phase==='opening'&&this.snapshot.cafe.readyAt>now)deadlines.push(this.snapshot.cafe.readyAt);const next=Math.min(...deadlines.filter(time=>time>now));if(Number.isFinite(next))this.clockTimer=window.setTimeout(()=>{this.clockTimer=null;void this.load().catch(error=>this.notify(error.message));},Math.min(2_147_483_647,Math.max(100,next-now+50)));}

 get retryAvailable(){return !!this.pending&&!this.inFlight;}
 private obsolete(){return new DOMException('The practice resident changed; the old request was discarded.','AbortError');}
 private changeIdentity(){this.generation++;this.identityAbort.abort();this.identityAbort=new AbortController();this.loading=null;this.refreshDirty=false;this.cancelClock();this.cancelStreamRetry(true);this.events?.close();this.events=null;this.bootEpoch++;this.retiredBoots.clear();this.recovery='';}
 private staleBoot():TownRequestError{return Object.assign(new Error('The service changed before this reply could be confirmed. Retry the same request to confirm it.'),{staleBoot:true});}
 private provenance(generation=this.generation,playerId=this.snapshot?.playerId):Provenance{return{generation,epoch:this.bootEpoch,playerId};}
 private validateReply(context:Provenance,snapshot?:TownSnapshot){
  if(context.generation!==this.generation)throw this.obsolete();
  if(snapshot&&context.playerId&&snapshot.playerId!==context.playerId)throw new Error('The town returned a different resident. Refresh before continuing.');
  const incoming=marker(snapshot),current=marker(this.snapshot);
  if(snapshot?.serverInstance!==undefined&&(typeof snapshot.serverInstance!=='string'||!incoming||incoming.length>128))throw new Error('The town returned an unreadable service identity.');
  if(incoming&&this.retiredBoots.has(incoming))throw this.staleBoot();
  if(snapshot&&current&&!incoming)throw this.staleBoot();
  // An old request cannot introduce a new process, even after its retired ID
  // leaves the bounded set. An explicit current-process reply is still useful.
  if(context.epoch!==this.bootEpoch&&(!incoming||incoming!==current))throw this.staleBoot();
 }
 private accept(snapshot:TownSnapshot,context=this.provenance()){
  this.validateReply(context,snapshot);
  if(!snapshot?.workshop||!isCurrentWorkshop(snapshot.workshop))throw new Error('The town service and this game use different save versions. Reload after the service update; saved progress has not been replaced.');
  if(!Number.isFinite(snapshot.serverTime)||!Number.isSafeInteger(snapshot.workshop.revision)||typeof snapshot.playerId!=='string')throw new Error('The town returned an unreadable snapshot. Refresh before continuing.');
  if(snapshot.noticeboard&&!noticeboardSchema.safeParse(snapshot.noticeboard).success)throw new Error('The town returned an unreadable noticeboard. Refresh before continuing.');
  if(!Array.isArray(snapshot.plots)||snapshot.plots.some(p=>!isCurrentHomeLayout(p))||snapshot.plot!==null&&!isCurrentHomeLayout(snapshot.plot))throw new Error('The town returned an incompatible home layout. Reload after the service update; progress has not been replaced.');
  if(snapshot.plot&&!homeAllocationValid(snapshot.workshop,snapshot.plot))throw new Error('The town returned an invalid furniture allocation. Saved progress was not replaced.');
  const previous=this.snapshot,incoming=marker(snapshot),old=marker(previous),changed=!!incoming&&incoming!==old;
  if(!changed&&previous?.playerId===snapshot.playerId&&(snapshot.serverTime<previous.serverTime||snapshot.workshop.revision<previous.workshop.revision))return previous;
  if(!changed&&previous?.playerId===snapshot.playerId){const prior=previous.bridge,next=snapshot.bridge;if(prior.restored||prior.phase==='building'&&next.phase==='collecting'||next.contributed<prior.contributed)snapshot={...snapshot,bridge:prior,...(prior.restored?{projectJournal:previous.projectJournal}: {})};}
  if(!changed&&previous?.playerId===snapshot.playerId&&previous.noticeboard&&snapshot.noticeboard){const prior=previous.noticeboard,next=snapshot.noticeboard;if(prior.phase==='open'||next.credits<prior.credits||prior.phase==='installing'&&next.phase==='collecting')snapshot={...snapshot,noticeboard:prior};}
  if(!changed&&previous?.playerId===snapshot.playerId&&previous.cafe&&snapshot.cafe){const prior=previous.cafe,next=snapshot.cafe;if(next.credits<prior.credits||prior.readyAt!==null&&next.readyAt!==prior.readyAt||prior.phase==='open'&&next.phase!=='open')snapshot={...snapshot,cafe:prior};}
  let reconnect=false;
  if(changed){
   if(old){this.retiredBoots.add(old);if(this.retiredBoots.size>16)this.retiredBoots.delete(this.retiredBoots.values().next().value!);}
   this.bootEpoch++;
   if(previous?.playerId===snapshot.playerId&&(snapshot.workshop.revision<previous.workshop.revision||snapshot.serverTime<previous.serverTime))this.recovery='The service recovered an earlier saved state. The confirmed town below may have older progress.';
   reconnect=!!this.events||this.streamRetryTimer!==null;this.cancelStreamRetry(true);this.events?.close();this.events=null;
  }
  if(snapshot.cafe&&!cafePublicSchema.safeParse(snapshot.cafe).success)throw new Error('The café project could not be confirmed.');
  this.snapshot=snapshot;this.offset=snapshot.serverTime-Date.now();this.scheduleClock();this.hooks.onSnapshot?.(snapshot);for(const listener of this.listeners)listener(snapshot);
  if(changed&&this.recovery)this.notify('Confirmed state loaded.');
  if(reconnect){const generation=this.generation,epoch=this.bootEpoch;queueMicrotask(()=>{if(generation===this.generation&&epoch===this.bootEpoch&&!this.closed&&!document.hidden)this.connect();});}
  return snapshot;
 }
 private async request(path:string,body?:unknown,generation=this.generation,playerId=this.snapshot?.playerId){
  const context=this.provenance(generation,playerId);if(generation!==this.generation)throw this.obsolete();
  let response:Response;
  try{response=await fetch('/api/town/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',signal:this.identityAbort.signal,headers:{'X-IH2-Schema':TOWN_SCHEMA,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});}catch(error){this.validateReply(context);throw error;}
  const data=await response.json().catch(()=>({message:'The town could not be reached.'}));
  const snapshot=data.snapshot??(data.workshop?data:undefined);this.validateReply(context,snapshot);
  if(!response.ok){if(snapshot)this.accept(snapshot,context);const error:TownRequestError=new Error(data.message??data.error??'The town request failed.');error.definite=response.status>=400&&response.status<500;throw error;}
  return{data,context};
 }
 async fixtures(){const {data}=await this.request('fixtures');return (data.fixtures??data) as Array<{id:string;name:string}>;}
 async login(fixtureId:string){if(this.pending)throw new Error('Resolve the previous resident’s pending request before switching residents.');this.changeIdentity();this.snapshot=null;this.closed=false;const generation=this.generation;const {data,context}=await this.request('login',{fixtureId},generation,fixtureId);const snapshot=data.snapshot??data;this.accept(snapshot,context);this.connect();return snapshot as TownSnapshot;}
 load():Promise<TownSnapshot>{if(this.loading)return this.loading;const generation=this.generation;const run=this.request('snapshot',undefined,generation).then(({data,context})=>this.accept(data.snapshot??data,context)).catch((error:TownRequestError)=>{if(error.staleBoot&&generation===this.generation&&this.snapshot)return this.snapshot;throw error;}).finally(()=>{if(this.loading===run){this.loading=null;if(this.refreshDirty&&generation===this.generation&&!this.closed&&!document.hidden)this.refreshFromEvent();}});this.loading=run;return run;}
 private refreshFromEvent(){this.refreshDirty=true;if(this.loading||this.closed||document.hidden)return;this.refreshDirty=false;const generation=this.generation;void this.load().catch(error=>{if(generation===this.generation&&!this.pending)this.notify(error.message);});}
 command(command:TownCommand,present:()=>boolean=()=>true):Promise<TownSnapshot>{if(this.inFlight)return this.inFlight;if(this.pending)return Promise.reject(new Error('Retry the previous request before making another change.'));if(!this.snapshot)return Promise.reject(new Error('Choose a practice player first.'));this.pending={...command,id:command.id??crypto.randomUUID(),expectedRevision:command.expectedRevision??this.snapshot.workshop.revision};return this.sendPending(present);}
 retry(present:()=>boolean=()=>true){if(this.inFlight)return this.inFlight;if(!this.pending)return this.load();return this.sendPending(present);}
 private sendPending(present:()=>boolean){
  const command={...this.pending!},generation=this.generation;if(present())this.notify('Saving…');
  const outcome=Promise.resolve().then(()=>this.hooks.beforeCommand?.()).then(()=>this.request('command',command,generation)).then(({data,context})=>{
   const snapshot=this.accept(data.snapshot??data,context),ok=data.ok!==false,message=this.message(data.message??snapshot.workshop.lastMessage),parsed=collectionGrantSchema.safeParse(data.collection);
   const collection=data.ok===true&&command.kind==='gather'&&parsed.success&&parsed.data.commandId===command.id&&parsed.data.playerId===snapshot.playerId&&parsed.data.resource===command.resource&&parsed.data.revision===data.revision?parsed.data:undefined;
   this.lastMessage=message;this.pending=null;if(present())this.notify(data.message??'Saved to the local town server.');
   return{snapshot,message,ok,command,playerId:snapshot.playerId,collection};
  }).catch((error:Error&{definite?:boolean})=>{if(generation===this.generation){if(error.definite)this.pending=null;if(present())this.notify(error.message);}throw error;});
  const run=outcome.then(result=>result.snapshot).finally(()=>{if(this.inFlight===run)this.inFlight=null;});this.inFlight=run;this.outcomes.set(run,outcome);return run;
 }
 private async workshopOutcome(operation:Promise<TownSnapshot>){
  const snapshot=await operation,outcome=await this.outcomes.get(operation);
  return outcome?{state:outcome.snapshot.workshop,message:outcome.message,ok:outcome.ok,command:outcome.command,playerId:outcome.playerId,collection:outcome.collection}:{state:snapshot.workshop,message:'Town state refreshed.',ok:false};
 }

 async movement(position:TownPosition){const generation=this.generation;const {data,context}=await this.request('movement',position,generation);if(data.snapshot)this.accept(data.snapshot,context);return data;}
 async logout(){this.changeIdentity();await this.request('logout',{});this.close();this.snapshot=null;this.pending=null;}
 close(){this.closed=true;this.changeIdentity();}
 connect(){this.cancelStreamRetry();this.events?.close();this.events=null;if(this.closed||document.hidden)return;const generation=this.generation,epoch=this.bootEpoch;const source=new EventSource('/api/town/events?schema='+TOWN_SCHEMA,{withCredentials:true});this.events=source;const current=()=>generation===this.generation&&epoch===this.bootEpoch&&this.events===source;const reload=()=>{if(current())this.refreshFromEvent();};source.onopen=()=>{if(!current())return;this.cancelStreamRetry(true);if(!this.pending)this.notify('Connected · practice town');reload();};source.onerror=()=>{if(!current())return;if(!this.pending)this.notify('Connection interrupted. Reconnecting; changes require server confirmation.');if(source.readyState===2){source.close();this.events=null;this.retryClosedStream(generation,epoch);}};source.addEventListener('invalidate',reload);source.addEventListener('snapshot',event=>{if(!current())return;try{const data=JSON.parse((event as MessageEvent).data);this.accept(data.snapshot??data,{generation,epoch,playerId:this.snapshot?.playerId});}catch{reload();}});source.addEventListener('presence',event=>{if(!current())return;try{this.hooks.onPresence?.(JSON.parse((event as MessageEvent).data));}catch{/* Next presence update replaces this one. */}});}
 workshopAdapter():RemoteWorkshopAdapter{return{allocatedElsewhere:prop=>this.snapshot?.plot?homeAllocation(this.snapshot.plot,prop):0,initial:this.snapshot?.workshop,load:async()=>{try{return (await this.load()).workshop;}catch(error){if((error as Error).name==='AbortError'&&this.snapshot)return this.snapshot.workshop;throw error;}},command:(command,present)=>this.workshopOutcome(this.command(command as TownCommand,present)),retry:(present)=>this.workshopOutcome(this.retry(present)),busy:()=>!!this.inFlight,canRetry:()=>this.retryAvailable,now:this.serverNow,subscribe:listener=>{const handle=(snapshot:TownSnapshot)=>listener(snapshot.workshop);this.listeners.add(handle);return()=>this.listeners.delete(handle);}};}
}
