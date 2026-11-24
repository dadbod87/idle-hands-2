import assert from 'node:assert/strict';
import { test } from 'node:test';
import { database, migrate } from '../server/db.ts';
import { TownStore, type TownPosition, type TownResult } from '../server/live-store.ts';
import { createTownServer } from '../server/http.ts';
import { TOWN_SCHEMA } from '../src/game/protocol-version.ts';
import { setTimeout as pause } from 'node:timers/promises';
import { SURVEY_IDS, SURVEYS } from '../src/game/fieldwork.ts';
import { woodlandRepairs } from './helpers/woodland-keepsake.ts';

const target = process.env.IH2_TEST_DATABASE_URL;
if (target) {
 const url = new URL(target);
 const isolatedCI = process.env.CI === 'true' && url.port === '5432'
  && /^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER ?? '');
 const isolatedLocal = url.port === '55434' && process.env.IH2_PG_CONTAINER === 'idle-hands-2-cafe-candidate-pg';
 assert.ok(url.pathname === '/ih2_test' && (isolatedCI || isolatedLocal), 'Use the isolated disposable town database.');
}

for(const [variant,key] of [['naturalist','keepsake'],['woodland-certificate','wallDisplay']] as const)
test('shared home '+variant+' requires earned ownership and projects only to its current visitors', { skip: !target, timeout: 25000 }, async () => {
 const pool = database(target);
 try {
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const now = Date.UTC(2026, 10, 19, 22);
  const store = new TownStore(pool, { now: () => now });
  const owner = await store.ensurePlayer('keepsake-owner', 'Rowan');
  const guest = await store.ensurePlayer('keepsake-guest', 'Lin');
  await store.ensurePlayer('keepsake-outside', 'Cam');
  const plotId:string = (await pool.query(
   'insert into ih2.plots(owner_id,level,placements) values($1,1,$2) returning id::text',
   [owner.playerId, owner.workshop.placements],
  )).rows[0].id;
  const inside:TownPosition = { room:'home', homePlotId:plotId, position:{x:9,y:11} };
  const outside:TownPosition = { room:'square', position:{x:30,y:35.5} };
  await store.savePosition(owner.playerId, inside);
  await store.savePosition(guest.playerId, inside);
  const display = {kind:'display-home-keepsake', plotId, keepsake:variant};
  const denied = await store.execute(owner.playerId, {...display,id:'unearned',expectedRevision:0},inside);
  assert.equal(denied.ok,false);
  assert.match(denied.message,/earn the (field )?certificate/);
  assert.equal(Object.hasOwn(denied.snapshot.plot!,key),false);
  for (const station of SURVEY_IDS) {
   const state = await store.snapshot(owner.playerId);
   const result = await store.execute(owner.playerId, {
    kind:'survey', id:'survey-'+station, expectedRevision:state.workshop.revision, station, choice:SURVEYS[station].answer,
   }, { room:'square', position:SURVEYS[station].point });
   assert.equal(result.ok,true,result.message);
  }
  if(variant==='woodland-certificate'){
   const save=async(value:ReturnType<typeof woodlandRepairs>)=>pool.query(
    'insert into ih2.outings(player_id,state) values($1,$2) on conflict(player_id) do update set state=excluded.state',
    [owner.playerId,value],
   );
   const single=woodlandRepairs(now,1);
   await save(single);
   const revision=(await store.snapshot(owner.playerId)).workshop.revision;
   const singleDenied=await store.execute(owner.playerId,{...display,id:'one-condition',expectedRevision:revision},inside);
   assert.equal(singleDenied.ok,false);
   assert.equal(singleDenied.revision,revision);
   await save({...single,runs:2,journal:[...single.journal,{...single.journal[0],id:'same-condition-again'}]});
   const duplicateDenied=await store.execute(owner.playerId,{...display,id:'same-condition',expectedRevision:revision},inside);
   assert.equal(duplicateDenied.ok,false);
   assert.equal(duplicateDenied.revision,revision);
   await save(woodlandRepairs(now,2));
  }
  const enter = await store.execute(owner.playerId,{
   kind:'enter-home', id:'reenter', plotId, expectedRevision:(await store.snapshot(owner.playerId)).workshop.revision,
  },outside);
  assert.equal(enter.ok,true,enter.message);
  const before = enter.snapshot.workshop;
  const command = {...display,id:'hang',expectedRevision:before.revision};
  const app = createTownServer({
   pool, now:()=>now, port:0, secret:'isolated-keepsake-test-signature-not-shared',
   fixtureResidents:[{id:owner.playerId,name:'Rowan'},{id:guest.playerId,name:'Lin'},{id:'keepsake-outside',name:'Cam'}],
  });
  const abort = new AbortController();
  const pumps:Promise<void>[] = [];
  let hung:TownResult;
  try {
   const origin='http://127.0.0.1:'+await app.listen();
   const request=(path:string,cookie?:string,data?:Record<string,unknown>)=>fetch(origin+'/api/town/'+path,{
    headers:{'X-IH2-Schema':TOWN_SCHEMA,...(cookie?{Cookie:cookie}:{}),
     ...(data?{Origin:origin,'Content-Type':'application/json'}:{})},
    method:data?'POST':'GET',body:data?JSON.stringify(data):undefined,signal:abort.signal,
   });
   const login=async(fixtureId:string)=>{
    const response=await request('login',undefined,{fixtureId});
    assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie')!.split(';',1)[0];
    assert.equal((await response.json()).snapshot.homeKeepsakes,true);
    return cookie;
   };
   const [ownerCookie,guestCookie,otherCookie]=await Promise.all([
    login(owner.playerId),login(guest.playerId),login('keepsake-outside'),
   ]);
   const events=['',''];
   for(const [index,cookie] of [guestCookie,otherCookie].entries()){
    const response=await request('events',cookie);
    assert.equal(response.status,200);
    const reader=response.body!.getReader(), decoder=new TextDecoder();
    pumps.push((async()=>{
     try {
      for(;;){
       const chunk=await reader.read();
       if(chunk.done)return;
       events[index]+=decoder.decode(chunk.value,{stream:true});
      }
     } catch(error){if(!abort.signal.aborted)throw error;}
    })());
   }
   const response=await request('command',ownerCookie,command);
   assert.equal(response.status,200);
   const receipt=await response.json();
   assert.equal(receipt.snapshot.homeKeepsakes,true);
   hung=receipt as TownResult;
   for(let attempt=0;attempt<20&&!events[0].includes('event: invalidate');attempt++)await pause(10);
   assert.equal(events[0].match(/event: invalidate/g)?.length,1);
   assert.doesNotMatch(events[1],/event: invalidate/);
   // Simulate a snapshot reading the old checkpoint as the visitor leaves.
   const previous=await request('snapshot',guestCookie);
   const visiting=(await previous.json()).snapshot;
   assert.equal(visiting.homeKeepsakes,true);
   assert.equal(visiting.plots[0][key],variant);
   if(variant==='woodland-certificate'){
    assert.equal(visiting.homeKeepsakeChoices,true);
    assert.equal(Object.hasOwn(visiting.plots[0],'keepsake'),false);
    assert.equal(visiting.outing.journal.length,0);
   }
   const doorway={...inside,position:{x:9,y:12}};
   assert.equal((await request('movement',guestCookie,doorway)).status,200);
   assert.equal((await request('movement',guestCookie,outside)).status,200);
   await store.savePosition(guest.playerId,inside);
   const departed=(await (await request('snapshot',guestCookie)).json()).snapshot;
   assert.deepEqual(departed.position,outside);
   assert.equal(Object.hasOwn(departed.plots[0],key),false);
   const relogged=(await (await request('login',undefined,{fixtureId:guest.playerId})).json()).snapshot;
   assert.deepEqual(relogged.position,outside);
   assert.equal(Object.hasOwn(relogged.plots[0],key),false);
  } finally {
   abort.abort();
   try{await Promise.all(pumps);}finally{await app.close();}
  }
  assert.equal(hung.ok,true,hung.message);
  assert.equal(hung.publicChanged,true);
  assert.equal(hung.snapshot.plot?.[key],variant);
  for (const key of ['sketches','inventory','owned','job','bridgeKits','skills'] as const)
   assert.deepEqual(hung.snapshot.workshop[key],before[key],key);
  const replay = await store.execute(owner.playerId,command,inside);
  assert.equal(replay.replayed,true);
  assert.equal(replay.revision,hung.revision);
  const fresh = new TownStore(pool,{now:()=>now});
  const guests = await fresh.snapshot(guest.playerId);
  assert.equal(guests.plots[0][key],variant);
  assert.equal('sketches' in guests.plots[0],false);
  assert.deepEqual(guests.workshop.sketches,[]);
  assert.equal(Object.hasOwn((await fresh.snapshot('keepsake-outside')).plots[0],key),false);
  const remove = {...display, keepsake:null, id:'take-down',expectedRevision:hung.revision};
  const guestDenied = await store.execute(guest.playerId,{...remove,id:'guest-denied',expectedRevision:0},inside);
  const outsideDenied = await store.execute(owner.playerId,{...remove,id:'outside-denied'},outside);
  assert.equal(guestDenied.ok,false);
  assert.equal(outsideDenied.ok,false);

  await pool.query(`create function ih2.test_keep_receipt_failure() returns trigger language plpgsql as
   $$begin raise exception 'isolated keepsake receipt failure';end$$;
   create trigger test_keep_receipt_failure before insert on ih2.command_receipts
   for each row when (new.command_id='take-down') execute function ih2.test_keep_receipt_failure()`);
  try {
   await assert.rejects(store.execute(owner.playerId,remove,inside),/isolated keepsake receipt failure/);
   assert.equal((await fresh.snapshot(guest.playerId)).plots[0][key],variant);
   assert.equal((await fresh.snapshot(owner.playerId)).workshop.revision,hung.revision);
  } finally {
   await pool.query('drop function ih2.test_keep_receipt_failure() cascade');
  }
  const taken = await fresh.execute(owner.playerId,remove,inside);
  assert.equal(taken.ok,true,taken.message);
  assert.equal(Object.hasOwn(taken.snapshot.plot!,key),false);
  assert.deepEqual(taken.snapshot.workshop.sketches,before.sketches);
  if(variant==='woodland-certificate')assert.deepEqual(taken.snapshot.outing,woodlandRepairs(now,2));
  assert.equal(Object.hasOwn((await fresh.snapshot(guest.playerId)).plots[0],key),false);
 } finally {
  await pool.end();
 }
});
