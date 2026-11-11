import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TownClient,type TownSnapshot} from '../src/ui/town-client.ts';
import {createWorkshop} from '../src/game/workshop.ts';

const value=(boot:string|undefined='A',revision=10,time=1000,playerId='aster'):TownSnapshot=>({serverInstance:boot,playerId,name:playerId,serverTime:time,workshop:{...createWorkshop(time),revision},position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},plots:[],plot:null,seasonKey:'fixture',scores:[]});
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const deferred=<T>()=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
 const keys=['document','window','EventSource','fetch'] as const,originals=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const oldNow=Date.now;Date.now=()=>2_000_000;
 class Document extends EventTarget{hidden=false;}
 class Events extends EventTarget{
  static all:Events[]=[];onopen:((event:Event)=>void)|null=null;onerror:((event:Event)=>void)|null=null;closed=false;
  constructor(){super();Events.all.push(this);}close(){this.closed=true;}
  emit(type:string,data:unknown){this.dispatchEvent(new MessageEvent(type,{data:JSON.stringify(data)}));}
 }
 const requests:Array<{path:string;body:any;signal:AbortSignal|undefined}>=[],messages:string[]=[],accepted:TownSnapshot[]=[],presence:unknown[]=[];
 let current=value(),handler:((request:typeof requests[number])=>Response|Promise<Response>)|null=null,timer=0;
 const timers=new Map<number,()=>void>();
 Object.defineProperties(globalThis,{
  document:{configurable:true,value:new Document()},window:{configurable:true,value:{setTimeout:(callback:()=>void)=>{timers.set(++timer,callback);return timer;},clearTimeout:(id:number)=>timers.delete(id)}},EventSource:{configurable:true,value:Events},
  fetch:{configurable:true,value:async(url:string,options:RequestInit)=>{const request={path:url.split('/').at(-1)!,body:options.body?JSON.parse(String(options.body)):undefined,signal:options.signal??undefined};requests.push(request);return handler?handler(request):json({snapshot:structuredClone(current)});}}
 });
 const client=new TownClient({onSnapshot:s=>accepted.push(structuredClone(s)),onConnection:m=>messages.push(m),onPresence:p=>presence.push(p)});
 return{client,requests,messages,accepted,presence,Events,set:(s:TownSnapshot)=>current=s,handle:(next:typeof handler)=>handler=next,stream:()=>Events.all.at(-1)!,async close(){client.close();await drain();Date.now=oldNow;for(const key of keys){const descriptor=originals.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete(globalThis as any)[key];}}};
}

test('new confirmed boot accepts older saved state, while same-boot stale state and retired stream events cannot regress it',async()=>{
 const f=fixture();try{
  await f.client.login('aster');const old=f.stream(),b=value('B',5,500);b.bridge={contributed:0,target:3,restored:false,phase:'collecting'};b.position={room:'workshop',position:{x:9,y:11}};f.set(b);
  await f.client.load();await drain();assert.deepEqual(f.client.snapshot,b);assert.equal(f.client.serverNow(),500);assert.match(f.client.recoveryNotice,/earlier saved state/);assert.equal(old.closed,true);assert.equal(f.Events.all.length,2);
  const events=f.Events.all.length,accepts=f.accepted.length;f.set(value('B',4,600));await f.client.load();f.set(value('B',6,499));await f.client.load();assert.deepEqual(f.client.snapshot,b);assert.equal(f.accepted.length,accepts);f.set(value('A',100,10_000));await f.client.load();assert.deepEqual(f.client.snapshot,b);
  old.emit('snapshot',{snapshot:value('A',100,10_000)});old.emit('presence',[{id:'old'}]);old.onopen?.(new Event('open'));old.onerror?.(new Event('error'));await drain();assert.equal(f.presence.length,0);assert.deepEqual(f.client.snapshot,b);assert.equal(f.Events.all.length,events);
  f.set({...b,serverTime:700});f.stream().onopen?.(new Event('open'));await drain();assert.match(f.messages.at(-1)!,/earlier saved state.*Connected/);assert.equal(f.client.snapshot!.serverTime,700);
 }finally{await f.close();}
});

for(const responseKind of ['success','4xx','network'] as const)test('old-boot '+responseKind+' reply keeps the pending UUID and exact payload for current-boot retry',async()=>{
 const f=fixture();try{
  await f.client.login('aster');const held=deferred<Response>(),sent=deferred<void>();
  f.handle(request=>{if(request.path==='command'){sent.resolve();return held.promise;}return json({snapshot:value('B',5,500)});});
  const pending=f.client.command({kind:'gather',resource:'timber'});const failure=assert.rejects(pending,/service changed/);await sent.promise;
  await f.client.load();const first=f.requests.find(r=>r.path==='command')!.body;
  if(responseKind==='success')held.resolve(json({ok:true,message:'OLD SUCCESS MUST NOT SHOW',snapshot:value('A',11,1100)}));
  else if(responseKind==='4xx')held.resolve(json({message:'OLD REJECTION MUST NOT SHOW'},409));
  else held.reject(new TypeError('old fetch failed'));
  await failure;assert.equal(f.client.retryAvailable,true);assert.equal(f.client.snapshot!.serverInstance,'B');assert.equal(f.messages.some(m=>/OLD SUCCESS|OLD REJECTION/.test(m)),false);
  await assert.rejects(f.client.login('bea'),/pending request/);
  f.handle(request=>{assert.equal(request.path,'command');assert.deepEqual(request.body,first);return json({ok:false,replayed:false,message:'Review the recovered state before a new request.',snapshot:value('B',5,500)});});
  await f.client.retry();assert.equal(f.client.retryAvailable,false);assert.equal(f.client.snapshot!.workshop.revision,5);assert.equal(f.requests.filter(r=>r.path==='command').length,2);assert.equal(first.expectedRevision,10);assert.equal(typeof first.id,'string');
 }finally{await f.close();}
});

test('current-boot reply to an earlier request and an older same-boot saved receipt remain definitive',async()=>{
 const f=fixture();try{
  await f.client.login('aster');let held=deferred<Response>(),sent=deferred<void>();
  f.handle(request=>{if(request.path==='command'){sent.resolve();return held.promise;}return json({snapshot:value('B',5,500)});});
  let pending=f.client.command({kind:'gather',resource:'scrap'});await sent.promise;await f.client.load();held.resolve(json({ok:true,message:'Current B receipt confirmed',snapshot:value('B',6,600)}));await pending;assert.equal(f.client.retryAvailable,false);assert.equal(f.client.snapshot!.workshop.revision,6);
  held=deferred<Response>();sent=deferred<void>();pending=f.client.command({kind:'gather',resource:'supplies'});await sent.promise;f.handle(request=>request.path==='command'?held.promise:json({snapshot:value('B',8,800)}));await f.client.load();held.resolve(json({ok:true,replayed:true,message:'Saved same-boot receipt',snapshot:value('B',7,700)}));await pending;
  assert.equal(f.client.snapshot!.workshop.revision,8);assert.equal(f.client.retryAvailable,false);assert.match(f.client.lastMessage,/Saved same-boot receipt/);
 }finally{await f.close();}
});

test('same-epoch unmarked 4xx is definite but marked state cannot be replaced by an unmarked snapshot',async()=>{
 const f=fixture();try{
  await f.client.login('aster');f.handle(()=>json({message:'Current request rejected'},409));await assert.rejects(f.client.command({kind:'gather'}),/Current request rejected/);assert.equal(f.client.retryAvailable,false);
  const before=f.client.snapshot;f.handle(()=>json({snapshot:{...value('A',20,2000),serverInstance:undefined}}));await f.client.load();assert.equal(f.client.snapshot,before);
 }finally{await f.close();}
});

test('unmarked legacy snapshots remain usable and wrong-resident or old-generation replies cannot replace identity',async()=>{
 const f=fixture();try{
  f.set({...value(),serverInstance:undefined});await f.client.login('aster');f.set({...value('A',9,900),serverInstance:undefined});await f.client.load();assert.equal(f.client.snapshot!.workshop.revision,10);
  const held=deferred<Response>(),sent=deferred<void>();f.handle(request=>{if(request.path==='snapshot'){sent.resolve();return held.promise;}return json({snapshot:value('B',1,500,'bea')});});
  const oldLoad=f.client.load(),aborted=assert.rejects(oldLoad,error=>(error as Error).name==='AbortError');await sent.promise;const oldSignal=f.requests.at(-1)!.signal;await f.client.login('bea');assert.equal(oldSignal!.aborted,true);held.resolve(json({snapshot:value('A',50,5000)}));await aborted;assert.equal(f.client.snapshot!.playerId,'bea');
  f.handle(()=>json({snapshot:value('B',99,9999,'aster')}));await assert.rejects(f.client.load(),/different resident/);assert.equal(f.client.snapshot!.playerId,'bea');
 }finally{await f.close();}
});

test('retired storage stays bounded while very old HTTP replies and markerless movement acknowledgments remain obsolete',async()=>{
 const f=fixture();try{
  await f.client.login('aster');const held=deferred<Response>(),sent=deferred<void>(),oldCommand=deferred<Response>(),commandSent=deferred<void>();f.handle(request=>{if(request.path==='movement'){sent.resolve();return held.promise;}if(request.path==='command'){commandSent.resolve();return oldCommand.promise;}return json({snapshot:value('B',5,500)});});
  const move=f.client.movement({room:'square',position:{x:24.5,y:25}}),failure=assert.rejects(move,/service changed/);await sent.promise;const command=f.client.command({kind:'gather',resource:'scrap'}),commandFailure=assert.rejects(command,/service changed/);await commandSent.promise;
  for(let i=0;i<20;i++){f.set(value('boot-'+i,5,500));f.handle(request=>request.path==='movement'?held.promise:request.path==='command'?oldCommand.promise:json({snapshot:value('boot-'+i,5,500)}));await f.client.load();await drain();}
  assert.equal((f.client as any).retiredBoots.size,16);assert.equal((f.client as any).retiredBoots.has('A'),false);oldCommand.resolve(json({ok:true,message:'EVICTED OLD SUCCESS',snapshot:value('A',999,9999)}));await commandFailure;assert.equal(f.client.retryAvailable,true);assert.equal(f.messages.some(m=>m.includes('EVICTED OLD SUCCESS')),false);held.resolve(json({ok:true,position:{room:'square',position:{x:24.5,y:25}}}));await failure;assert.equal(f.client.snapshot!.serverInstance,'boot-19');
 }finally{await f.close();}
});
