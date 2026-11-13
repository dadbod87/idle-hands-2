import {z} from 'zod';
import {CAFE_PRESENTATIONS,migrateCafeCandidate,serveLocalCafeCandidate,type CafeWorkshopCandidate} from '../game/cafe-candidate.ts';
import {applyCafeOrdinaryCommand} from '../game/cafe-commands-candidate.ts';
import {CAFE_SAVE_KEY,CAFE_LEGACY_KEY,CAFE_WRITER_LOCK,type CafeStorage,type CafeWriterLocks} from './cafe-save-candidate.ts';

/** Isolated coordinator. No live UI/server imports. All writers must cooperate
 * with the same tab-lifetime lease; raw checks are not a cross-process CAS. */
export type WriterEnvironment={storage:()=>CafeStorage;locks:()=>CafeWriterLocks|undefined;now:()=>number};
export type WriterStatus='ready'|'saved'|'unsaved'|'blocked'|'invalid'|'busy'|'suspended'|'conflict'|'unavailable'|'missing'|'unreadable'|'save-failed'|'no-pending';
/** state is detached last-confirmed data; conflict/unavailable may mean it is stale.
 * working is explicitly unconfirmed practice until a successful native write. */
export type WriterOutcome={status:WriterStatus;message:string;state:CafeWorkshopCandidate|null;working:CafeWorkshopCandidate|null;dirty:boolean;ownsLease:boolean;canRetry:boolean;ordinaryAccepted:boolean;teapotAwarded:boolean};
type RawPair={current:string|null;legacy:string|null};
const intentSchema=z.object({expectedRevision:z.number().int().min(0).max(1_000_000),presentation:z.enum(CAFE_PRESENTATIONS)}).strict();
type Pending={kind:'load'}|{kind:'serve';intent:z.infer<typeof intentSchema>};
const same=(a:RawPair,b:RawPair)=>a.current===b.current&&a.legacy===b.legacy;
export class CafeWriterCandidate{
 private environment:WriterEnvironment;
 private storage:CafeStorage|null=null;
 private confirmed:CafeWorkshopCandidate|null=null;
 private working:CafeWorkshopCandidate|null=null;
 private baseline:RawPair|null=null;
 private pending:Pending|null=null;
 private dirty=false;
 private held=false;
 private conflict=false;
 private mutating=false;
 private epoch=0;
 private disposed=false;
 private release:(()=>void)|null=null;
 private acquiring:Promise<WriterOutcome>|null=null;
 private cancelAcquisition:(()=>void)|null=null;
 constructor(environment:WriterEnvironment){this.environment=environment;}
 snapshot(){return this.working?structuredClone(this.working):null;}
 confirmedSnapshot(){return this.confirmed?structuredClone(this.confirmed):null;}
 private outcome(status:WriterStatus,message:string,ordinaryAccepted=false,teapotAwarded=false):WriterOutcome{
  return{status,message,state:this.confirmedSnapshot(),working:this.snapshot(),dirty:this.dirty,ownsLease:this.held,canRetry:!this.mutating&&!!this.pending&&!this.conflict&&this.held,ordinaryAccepted,teapotAwarded};
 }
 /** Resolves after acquisition/load while the lock callback stays alive. */
 connect():Promise<WriterOutcome>{
  if(this.disposed)return Promise.resolve(this.outcome('suspended','This writer has been disposed.'));
  if(this.held)return Promise.resolve(this.outcome(this.conflict?'conflict':this.dirty?'unsaved':this.pending?'save-failed':'ready','This tab already owns its writer lease.'));
  if(this.acquiring)return this.acquiring;
  const epoch=++this.epoch;let resolve!:(r:WriterOutcome)=>void;
  const ready=new Promise<WriterOutcome>(done=>resolve=done);this.acquiring=ready;
  const finish=(r:WriterOutcome)=>{if(this.acquiring===ready){this.acquiring=null;this.cancelAcquisition=null;}resolve(r);};
  this.cancelAcquisition=()=>finish(this.outcome('suspended','Writer acquisition cancelled; progress is kept.'));
  let storage:CafeStorage,locks:CafeWriterLocks|undefined;
  try{storage=this.environment.storage();locks=this.environment.locks();if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||!locks||typeof locks.request!=='function')throw new Error('Missing capability');}
  catch{finish(this.outcome('unavailable','Local storage or writer coordination is unavailable. No save was changed.'));return ready;}
  try{
   void locks.request(CAFE_WRITER_LOCK,{ifAvailable:true},async lock=>{
    if(epoch!==this.epoch){finish(this.outcome('suspended','An old acquisition was ignored.'));return;}
    if(!lock||lock.name!==CAFE_WRITER_LOCK){finish(this.outcome('busy','Another tab owns the save. This tab has not changed it.'));return;}
    const wait=new Promise<void>(done=>this.release=done);this.storage=storage;this.held=true;
    finish(this.run(()=>this.loadOwned(false)));await wait;
    if(epoch===this.epoch){this.held=false;this.release=null;}
   }).catch(()=>{if(epoch!==this.epoch)return;this.held=false;this.release=null;finish(this.outcome('unavailable','The writer lease could not be confirmed. Progress is kept.'));});
  }catch{finish(this.outcome('unavailable','The writer lease could not be requested. No save was changed.'));}
  return ready;
 }
 /** Invalidate even a callback that has not acquired yet; never await pagehide. */
 suspend(){this.epoch++;this.held=false;this.cancelAcquisition?.();this.cancelAcquisition=null;this.acquiring=null;const release=this.release;this.release=null;release?.();}
 dispose(){this.disposed=true;this.suspend();}
 private run(action:()=>WriterOutcome):WriterOutcome{
  if(this.mutating)return this.outcome('busy','A save operation is already in progress.');
  this.mutating=true;let result:WriterOutcome;
  try{result=action();}finally{this.mutating=false;}
  return{...result,canRetry:!!this.pending&&!this.conflict&&this.held};
 }
 private guard():WriterOutcome|null{
  if(!this.held||!this.storage)return this.outcome('suspended','This tab does not own the writer lease. Progress is kept.');
  if(this.conflict)return this.outcome('conflict','The saved text changed. Unsaved practice is kept; choose explicit reload before replacing it.');
  return null;
 }
 private read():RawPair{
  const current=this.storage!.getItem(CAFE_SAVE_KEY);
  return{current,legacy:current===null?this.storage!.getItem(CAFE_LEGACY_KEY):null};
 }
 private checkBaseline():WriterOutcome|null{
  const denied=this.guard();if(denied)return denied;
  let raw:RawPair;try{raw=this.read();}catch{return this.outcome('unavailable','The save cannot be read. Both confirmed and unsaved progress are kept.');}
  if(!this.baseline)return this.outcome('blocked','Load a supported save before changing it.');
  if(!same(raw,this.baseline)){this.conflict=true;return this.outcome('conflict','The saved text changed. Neither version was overwritten.');}
  return null;
 }
 private loadOwned(discard:boolean):WriterOutcome{
  const denied=this.guard();if(denied&&!discard)return denied;
  if(!this.held||!this.storage)return this.outcome('suspended','Acquire the writer lease before loading.');
  let raw:RawPair;try{raw=this.read();}catch{return this.outcome('unavailable','Local save access failed. Progress is kept.');}
  if(!discard&&(this.dirty||this.pending)&&this.baseline&&!same(raw,this.baseline)){this.conflict=true;return this.outcome('conflict','The saved text changed while this tab was away. Unsaved practice and pending intent are kept.');}
  if(!discard&&this.dirty)return this.outcome('unsaved','Unsaved practice is kept. Save it explicitly before a tasting.');
  if(!discard&&this.pending?.kind==='serve')return this.outcome('save-failed','The original tasting is unresolved. Retry or cancel it.');
  const text=raw.current??raw.legacy;if(text===null)return this.outcome('missing','No save exists. No replacement progress was created.');
  let value:unknown;try{value=JSON.parse(text);}catch{return this.outcome('unreadable','Unreadable original save kept untouched.');}
  const loaded=migrateCafeCandidate(value);if(!loaded.ok)return this.outcome('unreadable','Unsupported original save kept untouched.');
  const prior={baseline:this.baseline,conflict:this.conflict,pending:this.pending,dirty:this.dirty};
  this.baseline=raw;this.conflict=false;
  if(loaded.migrated||raw.current===null){
   this.pending={kind:'load'};
   const result=this.write(loaded.state,'ready','Supported save upgraded before actions are enabled.');
   if(discard&&result.status!=='ready'){
    this.baseline=prior.baseline;this.conflict=prior.conflict||result.status==='conflict';this.pending=prior.pending;this.dirty=prior.dirty;
    return this.outcome(result.status,'Replacement could not be saved. Previous practice is kept; review explicit reload again.');
   }
   return result;
  }
  this.confirmed=loaded.state;this.working=structuredClone(loaded.state);this.pending=null;this.dirty=false;this.conflict=false;
  return this.outcome('ready','Confirmed save loaded under this tab’s writer lease.');
 }
 reload(){return this.run(()=>this.loadOwned(false));}
 /** A future UI must invoke this only after an explicit discard/reload choice. */
 discardAndReload(){return this.run(()=>this.loadOwned(true));}
 command(raw:unknown){return this.run(()=>{
  const denied=this.checkBaseline();if(denied)return denied;
  if(this.pending)return this.outcome('blocked','Resolve the pending save before another action.');
  if(!this.working)return this.outcome('blocked','A confirmed supported save is required.');
  let now:number;try{now=this.environment.now();}catch{return this.outcome('unavailable','The clock is unavailable. Progress is kept.');}
  const result=applyCafeOrdinaryCommand(this.working,raw,now);
  if(!result.ok)return this.outcome('blocked',result.message);
  if(result.replayed)return this.outcome(this.dirty?'unsaved':'ready',result.message);
  this.working=result.state;this.dirty=true;
  return this.write(result.state,'saved',result.message,true);
 });}
 flush(){return this.run(()=>{
  const denied=this.checkBaseline();if(denied)return denied;
  if(this.pending)return this.outcome('blocked','Retry or cancel the pending tasting before saving other work.');
  if(!this.dirty||!this.working)return this.outcome('ready','No unsaved practice needs writing.');
  return this.write(this.working,'saved','All ordinary practice saved. Review the tasting separately.');
 });}
 serve(raw:unknown){return this.run(()=>{
  const denied=this.checkBaseline();if(denied)return denied;
  if(this.dirty)return this.outcome('unsaved','Save your unsaved practice before reviewing a tasting. No produce was spent.');
  if(this.pending)return this.outcome('blocked','Retry or cancel the original unresolved save.');
  if(!this.working)return this.outcome('blocked','A confirmed supported save is required.');
  const intent=intentSchema.safeParse(raw);if(!intent.success)return this.outcome('invalid','Invalid tasting request. Nothing changed.');
  this.pending={kind:'serve',intent:structuredClone(intent.data)};return this.servePending();
 });}
 private servePending():WriterOutcome{
  if(!this.working||this.pending?.kind!=='serve')return this.outcome('blocked','A supported confirmed save is required.');
  let now:number;try{now=this.environment.now();}catch{return this.outcome('unavailable','The clock is unavailable. Retry the original tasting.');}
  const result=serveLocalCafeCandidate(this.working,this.pending.intent,now);
  if(!result.ok){this.pending=null;return this.outcome('blocked',result.message);}
  return this.write(result.state,'saved',result.message,false,result.teapotAwarded);
 }
 retry(){return this.run(()=>{
  const denied=this.checkBaseline();if(denied)return denied;
  if(!this.pending)return this.outcome('no-pending','There is no unresolved save.');
  return this.pending.kind==='load'?this.loadOwned(false):this.servePending();
 });}
 /** Migration is a readiness gate, not a cancellable spending intent. */
 cancelPending(){if(this.mutating||this.pending?.kind!=='serve')return false;this.pending=null;return true;}
 /** No await/UI callback between raw check, complete native write and confirm. */
 private write(state:CafeWorkshopCandidate,status:'ready'|'saved',message:string,ordinaryAccepted=false,teapotAwarded=false):WriterOutcome{
  const denied=this.checkBaseline();if(denied)return denied;
  let text:string;try{text=JSON.stringify(state);this.storage!.setItem(CAFE_SAVE_KEY,text);}
  catch{return this.outcome(this.dirty?'unsaved':'save-failed','Save failed. Unsaved practice is kept; no new tasting or teapot is confirmed.',ordinaryAccepted);}
  this.baseline={current:text,legacy:null};this.confirmed=structuredClone(state);this.working=structuredClone(state);this.dirty=false;this.pending=null;
  return this.outcome(status,message,ordinaryAccepted,teapotAwarded);
 }
}
/** Capabilities are read lazily inside connect, so throwing browser getters are
 * caught before a lock, migration or write. Not wired to the live bootstrap. */
export function browserCafeWriter(host:Pick<Window,'localStorage'|'navigator'|'addEventListener'|'removeEventListener'>,now:()=>number=Date.now){
 const writer=new CafeWriterCandidate({storage:()=>host.localStorage,locks:()=>host.navigator.locks,now});
 const hide=()=>writer.suspend(),show=(event:Event)=>{if((event as PageTransitionEvent).persisted)void writer.connect();};
 host.addEventListener('pagehide',hide);host.addEventListener('pageshow',show);
 return{writer,dispose:()=>{host.removeEventListener('pagehide',hide);host.removeEventListener('pageshow',show);writer.dispose();}};
}
