/** Test-only entry: intercepted document in a fresh Playwright context.
 * Never loaded by the game or against an existing browser profile. */
import {CafeSaveCandidate,CAFE_SAVE_KEY,CAFE_LEGACY_KEY,CAFE_WRITER_LOCK,type CafeSaveOutcome} from '../../src/persistence/cafe-save-candidate.ts';
import {serveLocalCafeCandidate} from '../../src/game/cafe-candidate.ts';
import {createWorkshop} from '../../src/game/workshop.ts';
import {cafeFixture,CAFE_FIXTURE_AT as at} from './cafe.ts';
function createHarness(){
 let now=at,failures=0,save:CafeSaveCandidate|null=null,release:(()=>void)|null=null,held:Promise<unknown>|null=null;
 const events:Array<{stage:string;confirmedServes:number|null;storedServes:number|null}>=[];
 const entry=(stage:string)=>events.push({stage,confirmedServes:save?.snapshot()?.cafe.totalServes??null,storedServes:JSON.parse(localStorage.getItem(CAFE_SAVE_KEY)??'null')?.cafe?.totalServes??null});
 const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>{
  entry('before-write');if(failures>0){failures--;throw new DOMException('Injected fixture quota failure','QuotaExceededError');}
  localStorage.setItem(key,value);entry('stored-before-return');
 }};
 const show=(r:CafeSaveOutcome)=>{document.querySelector('output')!.textContent=JSON.stringify({status:r.status,teapotAwarded:r.teapotAwarded,revision:r.state?.revision??null});return r;};
 return {
  seed(mode:'current'|'third'|'legacy'){
   now=at;let state=cafeFixture();
   if(mode==='third')for(let i=0;i<2;i++){const r=serveLocalCafeCandidate(state,{expectedRevision:state.revision,presentation:'slices'},at+i*4*3_600_000);if(!r.ok)throw new Error(r.message);state=r.state;now=at+8*3_600_000;}
   localStorage.removeItem(CAFE_SAVE_KEY);localStorage.removeItem(CAFE_LEGACY_KEY);
   const text=mode==='legacy'?' \n'+JSON.stringify(createWorkshop(at),null,2)+'\n':JSON.stringify(state);
   localStorage.setItem(CAFE_SAVE_KEY,text);events.length=0;save=null;return text;
  },
  async connect(){save=new CafeSaveCandidate(storage,navigator.locks,()=>now);return show(await save.load());},
  async load(){return show(await save!.load());},
  async serve(expectedRevision:number,presentation='slices'){return show(await save!.serve({expectedRevision,presentation}));},
  async retry(){return show(await save!.retry());},
  state:()=>save?.snapshot()??null,
  raw:()=>localStorage.getItem(CAFE_SAVE_KEY),
  replaceRaw:(raw:string)=>localStorage.setItem(CAFE_SAVE_KEY,raw),
  failWrites:(n:number)=>{failures=n;},
  setClock:(value:number)=>{now=value;},
  events:()=>structuredClone(events),
  async holdWriter(){
   await new Promise<void>((entered,reject)=>{
    held=navigator.locks.request(CAFE_WRITER_LOCK,async()=>{entered();await new Promise<void>(resolve=>release=resolve);release=null;});held.catch(reject);
   });
  },
  async releaseWriter(){release?.();await held;held=null;},
  async heldLocks(){return (await navigator.locks.query()).held?.filter(l=>l.name===CAFE_WRITER_LOCK).length??0;}
 };
}
export type CafeSaveBrowserHarness=ReturnType<typeof createHarness>;
declare global{interface Window{__cafeSaveHarness:CafeSaveBrowserHarness;}}
window.__cafeSaveHarness=createHarness();
