import assert from 'node:assert/strict';
import test from 'node:test';
import {setTimeout as wait} from 'node:timers/promises';
import type {Pool} from 'pg';
import {createTownServer} from '../server/http.ts';
import type {TownPosition,TownSnapshot} from '../server/live-store.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {WAVE_VISIBLE_MS,WAVE_COOLDOWN_MS} from '../src/game/town-wave.ts';
import {worlds} from '../src/game/world.ts';

test('the local HTTP wave is room-scoped, expires, and bypasses stored progression', {timeout:8000}, async()=>{
 const workshop=worlds.square.stops.find(stop=>stop.id==='workshop')!;
 let clock=Date.UTC(2026,10,23),reads=0,checkpoints=0;
 const positions=new Map<string,TownPosition>([
  ['aster',{room:'square',position:workshop.point}],
  ['bea',{room:'square',position:{x:24,y:25}}],
  ['casey',{room:'workshop',position:workshop.arrival!}],
 ]);
 const app=createTownServer({pool:{} as Pool,secret:'fictional-town-wave-isolated-test-key',now:()=>clock,transportNow:()=>clock,port:0});
 const snapshot=async(id:string)=>{
  reads++;
  // The loopback transport consumes only position, plots and the current bridge phase.
  return {position:positions.get(id)!,plots:[],bridge:{phase:'collecting'}} as unknown as TownSnapshot;
 };
 app.store.ensurePlayer=snapshot;
 app.store.snapshot=snapshot;
 app.store.savePosition=async(id,position)=>{checkpoints++;positions.set(id,position);};
 const base='http://127.0.0.1:'+await app.listen();
 type Peer={id:string;waveUntil?:number};
 type Watcher={frames:Peer[][];close:()=>Promise<void>};
 const watchers:Watcher[]=[];
 const headers={'X-IH2-Schema':TOWN_SCHEMA};
 const post=(path:string,body:unknown,cookie='')=>fetch(base+'/api/town/'+path,{
  method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:base,Cookie:cookie},
  body:JSON.stringify(body),signal:AbortSignal.timeout(1500),
 });
 async function login(id:string){
  const response=await post('login',{fixtureId:id});
  assert.equal(response.status,200);
  await response.text();
  return response.headers.get('set-cookie')!.split(';')[0];
 }
 async function sendWave(cookie:string,body:unknown,code:number){
  const response=await post('wave',body,cookie);
  assert.equal(response.status,code);
  return response.json();
 }
 async function watch(cookie:string):Promise<Watcher>{
  const controller=new AbortController();
  const response=await fetch(base+'/api/town/events',{headers:{...headers,Cookie:cookie},signal:controller.signal});
  assert.equal(response.status,200);
  const reader=response.body!.pipeThrough(new TextDecoderStream()).getReader();
  const frames:Peer[][]=[];
  const closed=(async()=>{
   let remainder='';
   try{for(;;){
    const next=await reader.read();if(next.done)break;
    const events=(remainder+next.value).split('\n\n');remainder=events.pop()??'';
    for(const event of events)if(event.startsWith('event: presence\n'))frames.push(JSON.parse(event.split('data: ')[1]));
   }}catch(error){if(!controller.signal.aborted)throw error;}
  })();
  const watcher={frames,close:async()=>{controller.abort();await closed;}};
  watchers.push(watcher);
  return watcher;
 }
 async function until(check:()=>boolean){
  const deadline=performance.now()+1800;
  while(!check()&&performance.now()<deadline)await wait(12);
  assert.ok(check(),'Expected the loopback stream to broadcast.');
 }
 try{
  await sendWave('',{},401);
  const a=await login('aster'),b=await login('bea'),c=await login('casey');
  const aStream=await watch(a),cStream=await watch(c);
  await sendWave(a,{},409);
  const bStream=await watch(b);
  await until(()=>bStream.frames.at(-1)?.some(w=>w.id==='aster')??false);
  const readsBefore=reads;
  await sendWave(a,{name:'A different resident'},400);
  const wave=await sendWave(a,{},200);
  assert.equal(wave.waveUntil,clock+WAVE_VISIBLE_MS);
  await sendWave(a,{},429);
  await until(()=>bStream.frames.at(-1)?.some(w=>w.id==='aster'&&w.waveUntil===wave.waveUntil)??false);
  assert.ok(cStream.frames.every(frame=>frame.every(peer=>peer.id!=='aster')));
  assert.ok(aStream.frames.every(frame=>frame.every(peer=>peer.id!=='aster')));
  assert.equal(app.metrics.commands,0);
  assert.equal(app.metrics.positionCheckpoints,0);
  assert.equal(reads,readsBefore);

  clock+=WAVE_VISIBLE_MS;
  const newcomer=await watch(b);
  await until(()=>Boolean(newcomer.frames.length));
  assert.ok(newcomer.frames.at(-1)?.some(peer=>peer.id==='aster'&&peer.waveUntil===undefined));
  clock+=WAVE_COOLDOWN_MS-WAVE_VISIBLE_MS;
  await sendWave(a,{},200);
  const out=await post('movement',{room:'workshop',position:workshop.arrival},a);
  assert.equal(out.status,200);
  await out.text();
  await sendWave(a,{},409);
  await until(()=>bStream.frames.at(-1)?.every(peer=>peer.id!=='aster')??false);
  assert.equal(checkpoints,1);
 }finally{
  await Promise.all(watchers.map(watcher=>watcher.close()));
  await app.close();
 }
});
