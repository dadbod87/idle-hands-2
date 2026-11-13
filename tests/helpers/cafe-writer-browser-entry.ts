/** Ephemeral intercepted test page only; never imported by the actual game. */
import {browserCafeWriter} from '../../src/persistence/cafe-writer-candidate.ts';
import {CAFE_SAVE_KEY,CAFE_LEGACY_KEY,CAFE_WRITER_LOCK,type CafeWriterLocks} from '../../src/persistence/cafe-save-candidate.ts';
import {createWorkshop,loadWorkshop,applyWorkshop} from '../../src/game/workshop.ts';
import {serveLocalCafeCandidate} from '../../src/game/cafe-candidate.ts';
import {cafeFixture,CAFE_FIXTURE_AT as at} from './cafe.ts';
function harness(){
 let binding:ReturnType<typeof browserCafeWriter>|null=null,now=at,failures=0,denyStorage=false,requests=0;
 const events:Array<{stage:string;confirmedRevision:number|null;storedRevision:number|null}>=[];
 const record=(stage:string)=>events.push({stage,confirmedRevision:binding?.writer.confirmedSnapshot()?.revision??null,storedRevision:JSON.parse(localStorage.getItem(CAFE_SAVE_KEY)??'null')?.revision??null});
 const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,text:string)=>{record('before-write');if(failures>0){failures--;throw new DOMException('Injected quota error','QuotaExceededError');}localStorage.setItem(key,text);record('stored-before-confirmation');}};
 const locks:CafeWriterLocks={request:(name,options,callback)=>{requests++;return navigator.locks.request(name,options,callback);}};
 const host={get localStorage(){if(denyStorage)throw new DOMException('Injected getter refusal','SecurityError');return storage;},get navigator(){return{locks};},addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window)};
 const writer=()=>{if(!binding)binding=browserCafeWriter(host as unknown as Window,()=>now);return binding.writer;};
 const show=<T extends {status:string;state:unknown;working:unknown;dirty:boolean}>(r:T)=>{document.querySelector('output')!.textContent=JSON.stringify(r,null,2);return r;};
 return{
  async seed(mode:'current'|'third'|'legacy'){
   binding?.dispose();binding=null;await new Promise<void>(r=>setTimeout(r,0));now=at;failures=0;denyStorage=false;requests=0;let s=cafeFixture();
   if(mode==='third')for(let i=0;i<2;i++){const r=serveLocalCafeCandidate(s,{expectedRevision:s.revision,presentation:'slices'},at+i*4*3_600_000);if(!r.ok)throw Error(r.message);s=r.state;now=at+8*3_600_000;}
   localStorage.removeItem(CAFE_SAVE_KEY);localStorage.removeItem(CAFE_LEGACY_KEY);const raw=mode==='legacy'?' \n'+JSON.stringify(createWorkshop(at),null,2)+'\n':JSON.stringify(s);localStorage.setItem(CAFE_SAVE_KEY,raw);events.length=0;return raw;
  },
  connect:async()=>show(await writer().connect()),
  command:(revision:number,id='ordinary')=>show(writer().command({id,expectedRevision:revision,kind:'gather',resource:['scrap','timber','supplies'][revision%3]})),
  serve:(revision:number)=>show(writer().serve({expectedRevision:revision,presentation:'formal'})),
  flush:()=>show(writer().flush()),retry:()=>show(writer().retry()),cancel:()=>writer().cancelPending(),
  reload:()=>show(writer().reload()),discard:()=>show(writer().discardAndReload()),
  snapshot:()=>writer().snapshot(),confirmed:()=>writer().confirmedSnapshot(),
  raw:()=>localStorage.getItem(CAFE_SAVE_KEY),replace:(raw:string)=>localStorage.setItem(CAFE_SAVE_KEY,raw),
  fail:(n:number)=>{failures=n;},deny:(v:boolean)=>{denyStorage=v;},clock:(v:number)=>{now=v;},events:()=>structuredClone(events),requests:()=>requests,
  hide:()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})),show:()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})),
  dispose:()=>binding?.dispose(),locks:async()=>(await navigator.locks.query()).held?.filter(x=>x.name===CAFE_WRITER_LOCK).length??0,
  legacyProbe(){const raw=JSON.parse(localStorage.getItem(CAFE_SAVE_KEY)!);return{recovered:loadWorkshop(raw,now).recovered,canWrite:applyWorkshop(raw,{id:'old-cached',expectedRevision:raw.revision,kind:'gather',resource:'scrap'},now).ok};}
 };
}
export type CafeWriterHarness=ReturnType<typeof harness>;
declare global{interface Window{__cafeWriter:CafeWriterHarness;}}
window.__cafeWriter=harness();
