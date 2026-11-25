import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore,type TownPosition} from '../server/live-store.ts';
import {FORGE_ORDER_MS} from '../src/game/forge-order.ts';
import {FINISHING_MS} from '../src/game/trade-practice.ts';
import {smithingRank} from '../src/game/pumpworks.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {PUMPWORKS_DOOR,PUMPWORKS_ENTRY,PUMPWORKS_SAFE_BENCH} from '../src/game/pumpworks-room.ts';
import type {SharedFieldInput,SharedFieldReply,SharedFieldView} from '../src/game/shared-field.ts';
import {routeTo,worlds,type Point} from '../src/game/world.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
const nativeData=process.env.IH2_GLASSHOUSE_TEMP_DATA;
if(target){
 const u=new URL(target);
 const ci=process.env.CI==='true'&&u.port==='5432'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
 const local=u.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
 const native=u.port==='56371'&&nativeData&&/^\/(?:private\/)?tmp\/ih2-new-db\.[a-zA-Z0-9]+\/data$/.test(nativeData);
 assert.ok(u.hostname==='127.0.0.1'&&u.pathname==='/ih2_test'&&!u.search&&!u.hash&&(ci||local||native),
  'Shared combat tests require the dedicated disposable town database.');
}

test('Shared Pumpworks verifies hits from its own room, feet, clock and encounter, then keeps each resident’s result',
 {skip:!target,timeout:45000},async()=>{
 const pool=database(target);
 let now=Date.UTC(2026,10,25,21),transportAt=0;
 const store=new TownStore(pool,{now:()=>now});
 const start=()=>createTownServer({pool,secret:'isolated-shared-pumpworks-check-key',now:()=>now,transportNow:()=>transportAt,port:0});
 let app=start(),base:string;
 const streams:AbortController[]=[];
 const events:Record<string,SharedFieldView[]>={aster:[],bea:[]};
 const ids=['aster','bea'] as const;
 type Member=typeof ids[number];
 const cookies={} as Record<Member,string>;
 const feet:Record<Member,Point>={aster:{...PUMPWORKS_ENTRY},bea:{...PUMPWORKS_ENTRY}};
 async function request(member:Member,path:string,body?:unknown){
  transportAt+=150;
  return fetch(base+'/api/town/'+path,{
   method:body===undefined?'GET':'POST',headers:{'X-IH2-Schema':TOWN_SCHEMA,
    ...(body===undefined?{}:{Origin:base,'Content-Type':'application/json'}),Cookie:cookies[member]??''},
   body:body===undefined?undefined:JSON.stringify(body),
  });
 }
 async function login(member:Member){
  const response=await request(member,'login',{fixtureId:member});
  assert.equal(response.status,200);
  cookies[member]=response.headers.get('set-cookie')!.split(';')[0]!;
 }
 async function stream(member:Member){
  const stop=new AbortController();streams.push(stop);
  const response=await fetch(base+'/api/town/events?schema='+TOWN_SCHEMA,{headers:{Cookie:cookies[member]},signal:stop.signal});
  assert.equal(response.status,200);
  const reader=response.body!.getReader(),decoder=new TextDecoder();
  void (async()=>{
   let pending='';
   while(true){
    const result=await reader.read();
    if(result.done)return;
    pending+=decoder.decode(result.value,{stream:true});
    let edge:number;
    while((edge=pending.indexOf('\n\n'))!==-1){
     const frame=pending.slice(0,edge);pending=pending.slice(edge+2);
     if(frame.startsWith('event: field\n'))events[member].push(JSON.parse(frame.split('\ndata: ')[1]!) as SharedFieldView);
    }
   }
  })().catch(()=>{});
  return stop;
 }
 async function view(member:Member){
  const response=await request(member,'field');assert.equal(response.status,200);
  return (await response.json()).view as SharedFieldView;
 }
 async function send(member:Member,action:SharedFieldInput){
  const response=await request(member,'field',action);assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  return await response.json() as SharedFieldReply;
 }
 const station=async(member:Member,action:Extract<SharedFieldInput,{kind:'station'}>['action'],current?:SharedFieldView)=>send(member,{
  id:randomUUID(),kind:'station',revision:(current??await view(member)).state.revision,action,
 });
 const use=(current:SharedFieldView,action:'attack'|'brace'|'eat'='attack'):SharedFieldInput=>{
  assert.ok(current.encounter);
  return {kind:'combat',id:randomUUID(),revision:current.state.revision,encounter:current.encounter,turn:current.nextTurn,action};
 };
 async function move(member:Member,next:TownPosition){
  now+=145;
  const response=await request(member,'movement',next);
  const result=await response.json();
  if(response.ok&&next.room==='pumpworks')feet[member]=next.position;
  return {status:response.status,result};
 }
 async function walk(member:Member,to:Point){
  const route=routeTo('pumpworks',feet[member],to,worlds.pumpworks);
  assert.ok(route.length);
  for(const point of route){
   const prior=feet[member],count=Math.ceil(Math.hypot(point.x-prior.x,point.y-prior.y)/.64);
   for(let i=1;i<=count;i++){
    const placed=await move(member,{room:'pumpworks',position:{x:prior.x+(point.x-prior.x)*i/count,y:prior.y+(point.y-prior.y)*i/count}});
    assert.equal(placed.status,200,JSON.stringify(placed.result));
   }
  }
 }
 async function advance(member:Member,stop:(result:SharedFieldView)=>boolean){
  let current=await view(member);
  for(let i=0;i<65&&!stop(current);i++){
   const motion=await move(member,{room:'pumpworks',position:feet[member]});
   if(motion.result.position?.room==='pumpworks')feet[member]=motion.result.position.position;
   assert.ok(motion.status===200||motion.status===409);
   await delay(55);
   current=await view(member);
  }
  assert.ok(stop(current),'The verified field did not reach the expected phase.');
  return current;
 }
 try{
  if(nativeData&&new URL(target!).port==='56371'){
   const result=await pool.query<{directory:string}>('select current_setting(\'data_directory\') as directory');
   assert.equal(realpathSync(result.rows[0]!.directory),realpathSync(nativeData));
  }
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  for(const id of ids)await store.ensurePlayer(id);
  base='http://127.0.0.1:'+await app.listen();
  for(const id of ids)await login(id);
  assert.equal((await move('aster',{room:'pumpworks',position:PUMPWORKS_ENTRY})).status,409);
  assert.equal((await station('aster','issue')).ok,false);
  // Fresh process seats both fictional residents at a legal exterior approach.
  await app.close();
  for(const id of ids)await store.savePosition(id,{room:'square',position:PUMPWORKS_DOOR.point});
  app=start();base='http://127.0.0.1:'+await app.listen();
  for(const id of ids)await login(id);
  const aStream=await stream('aster');await stream('bea');
  for(const id of ids){
   const entry=await move(id,{room:'pumpworks',position:PUMPWORKS_ENTRY});
   assert.equal(entry.status,200,JSON.stringify(entry.result));
  }
  const aRoom=await view('aster'),bRoom=await view('bea');
  assert.ok(aRoom.encounter&&bRoom.encounter&&aRoom.encounter!==bRoom.encounter);
  assert.equal((await send('bea',use(aRoom))).ok,false);
  await walk('bea',{x:4.55,y:9.6});
  assert.equal((await station('bea','issue')).ok,true);
  assert.equal((await station('bea','borrow-bow')).ok,true);
  await walk('bea',{x:5.7,y:8.1});
  const bow=await send('bea',use(await view('bea')));
  assert.equal(bow.ok,true);
  assert.ok(bow.view.draw?.practice);
  await walk('bea',{x:6.25,y:8.1});
  const released=await advance('bea',entry=>entry.draw===null);
  assert.equal(released.shot,null);
  assert.equal(released.impact,null);
  assert.match(released.message,/Stand still before shooting/);
  assert.equal(released.state.weaponPractice,undefined);
  await walk('bea',{x:5.7,y:8.1});
  assert.ok((await send('bea',use(await view('bea')))).view.draw);
  const rang=await advance('bea',entry=>entry.impact?.kind==='bell');
  assert.ok(rang.shot);
  assert.equal(rang.state.weaponPractice,undefined);
  await walk('aster',{x:4.55,y:9.6});
  const issued=await station('aster','issue');assert.equal(issued.ok,true);
  assert.equal((await station('aster','borrow-vest')).ok,true);
  const before=await view('aster');
  assert.equal((await request('aster','field',{...use(before),damage:999})).status,400);
  assert.equal((await request('aster','field',{...use(before),action:'counter'})).status,400);
  await walk('aster',{x:5.7,y:8.1});
  const bell=await view('aster');
  assert.equal((await send('aster',use(bell))).ok,true);
  assert.deepEqual((await view('aster')).state,bell.state);
  await walk('aster',{x:15.7,y:9.1});
  const opening=await advance('aster',entry=>entry.hopper.phase==='recover');
  assert.ok(opening.state.health<8);
  assert.ok(events.aster.some(entry=>entry.hopper.phase==='windup'&&entry.hopper.aim));
  const strike=use(opening);
  const outcomes=await Promise.all([send('aster',strike),send('aster',strike)]);
  assert.equal(outcomes.filter(result=>result.ok&&!result.replayed).length,1);
  assert.equal(outcomes.filter(result=>result.ok&&result.replayed).length,1);
  const trained=await view('aster');
  assert.equal(trained.state.weaponPractice?.rod,2);
  assert.equal(trained.state.fight?.health,5);
  assert.equal((await view('bea')).state.weaponPractice,undefined);
  assert.ok(events.bea.every(entry=>entry.playerId==='bea'));
  aStream.abort();await delay(140);
  const retired=await view('aster');
  assert.equal(retired.state.fight,null);
  assert.equal(retired.state.weaponPractice?.rod,2);
  assert.notEqual(retired.encounter,trained.encounter);
  await stream('aster');
  assert.equal((await send('aster',{...strike,id:randomUUID(),revision:retired.state.revision})).ok,false);
  const defeated=await advance('aster',entry=>entry.state.recovering);
  assert.deepEqual(defeated.returnTo,PUMPWORKS_SAFE_BENCH);
  assert.deepEqual((await store.snapshot('aster')).position,{room:'pumpworks',position:PUMPWORKS_SAFE_BENCH});
  assert.equal((await station('aster','wake',defeated)).ok,true);
  assert.equal((await view('aster')).state.health,8);
  for(const s of streams)s.abort();
  await app.close();
  app=start();base='http://127.0.0.1:'+await app.listen();
  await login('aster');
  const restored=await view('aster');
  assert.equal(restored.state.weaponPractice?.rod,2);
  assert.equal(restored.state.satchel,'at-pump');
  const replay=await send('aster',strike);
  assert.equal(replay.ok,true);assert.equal(replay.replayed,true);
  assert.equal(replay.view.state.weaponPractice?.rod,2);
  assert.equal((await pool.query('select relrowsecurity from pg_class where oid=\'ih2.field_outings\'::regclass')).rows[0]?.relrowsecurity,true);
  assert.equal(app.metrics.fieldErrors,0);
  const previousWorkshop=(await store.snapshot('aster')).workshop;
  await stream('aster');
  feet.aster={...PUMPWORKS_SAFE_BENCH};
  assert.equal((await station('aster','start-forge')).ok,false);
  const forge=worlds.pumpworks.stops.find(stop=>stop.id==='pumpworks-forge')!;
  await walk('aster',forge.point);
  const forged=await station('aster','start-forge');
  assert.equal(forged.ok,true);
  assert.equal(forged.view.state.forge?.readyAt,now+FORGE_ORDER_MS);
  assert.equal(smithingRank(forged.view.state),0);
  assert.equal((await station('aster','start-stamp')).ok,false);
  assert.equal((await station('aster','collect-forge')).ok,false);
  now+=FORGE_ORDER_MS;
  const vest=await station('aster','collect-forge');
  assert.equal(vest.ok,true);
  assert.equal(smithingRank(vest.view.state),1);
  const brass={armor:'riveted',finish:'brass'} as const;
  const finish=async()=>send('aster',{kind:'station',id:randomUUID(),revision:(await view('aster')).state.revision,
   action:brass});
  assert.equal((await finish()).ok,false);
  const stamp=await station('aster','start-stamp');
  assert.equal(stamp.ok,true);
  assert.equal(stamp.view.state.stamp?.readyAt,now+FINISHING_MS);
  now+=FINISHING_MS-1;
  assert.equal((await station('aster','collect-stamp')).ok,false);
  now++;
  const collect:SharedFieldInput={kind:'station',id:randomUUID(),revision:stamp.view.state.revision,action:'collect-stamp'};
  const collected=await send('aster',collect);
  assert.equal(collected.ok,true);
  assert.equal((await send('aster',collect)).replayed,true);
  assert.equal(smithingRank(collected.view.state),2);
  assert.equal((await finish()).view.state.armorFinishes?.riveted,'brass');
  assert.deepEqual((await store.snapshot('aster')).workshop,previousWorkshop);
  assert.equal(smithingRank((await view('bea')).state),0);

  // A full second visit proves recovery, clearing, and the one-time seal
  // without giving a fixture combat results or placing it in the chamber.
  const gate=worlds.pumpworks.stops.find(stop=>stop.id==='pumpworks-report')!;
  assert.equal((await station('aster','report')).ok,false);
  await walk('aster',{x:15.7,y:9.1});
  for(let openingCount=0;openingCount<3;openingCount++){
   const warning=await advance('aster',entry=>entry.hopper.phase==='windup'&&entry.hopper.elapsed>=.65);
   assert.equal((await send('aster',use(warning,'brace'))).ok,true);
   const counter=await advance('aster',entry=>entry.hopper.phase==='recover');
   assert.equal((await send('aster',use(counter))).ok,true);
  }
  const cleared=await view('aster');
  assert.equal(cleared.state.cleared,true);
  assert.equal(cleared.state.reported,false);
  assert.notEqual(cleared.state.weaponPractice?.rod,trained.state.weaponPractice?.rod);
  await walk('aster',gate.point);
  const report:SharedFieldInput={kind:'station',id:randomUUID(),revision:(await view('aster')).state.revision,action:'report'};
  const seal=await send('aster',report);
  assert.equal(seal.view.state.reported,true);
  assert.equal((await send('aster',report)).replayed,true);
  assert.equal((await station('aster','report')).ok,false);
  assert.equal((await view('bea')).state.reported,false);
  for(const s of streams)s.abort();
  await delay(150);
  const retiredUpdates=app.metrics.fieldUpdates;
  await delay(150);
  assert.equal(app.metrics.fieldUpdates,retiredUpdates);
 }finally{for(const s of streams)s.abort();await app.close();await pool.end();}
});
