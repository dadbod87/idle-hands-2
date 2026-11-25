import {INKMINT_GROW_MS,INKMINT_STATIONS} from '../src/game/nursery-inkmint.ts';
import {WINDOWSILL_STOP} from '../src/game/home-windowsill.ts';
import assert from 'node:assert/strict';
import {realpathSync} from 'node:fs';
import {test} from 'node:test';
import {createTownServer} from '../server/http.ts';
import {GLASSHOUSE_ENTRY, GLASSHOUSE_FRONT, GLASSHOUSE_ROOM} from '../src/game/glasshouse-room.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {database, migrate} from '../server/db.ts';
import {TownStore, type TownPosition} from '../server/live-store.ts';
import {GLASSHOUSE_RULES} from '../src/game/glasshouse.ts';
import {INKWOOD_GLASSHOUSE, TRAIL_LANDMARK_IDS, worlds} from '../src/game/world.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
const nativeData=process.env.IH2_GLASSHOUSE_TEMP_DATA;
if(target){
 const url=new URL(target);
 const ci=process.env.CI==='true'&&url.port==='5432'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
 const local=url.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
 const native=url.hostname==='127.0.0.1'&&url.port==='56371'&&nativeData!==undefined&&
  /^\/(?:private\/)?tmp\/ih2-new-db\.[a-zA-Z0-9]+\/data$/.test(nativeData);
 assert.ok(url.pathname==='/ih2_test'&&(ci||local||native),'Use the disposable town database.');
}
async function glasshouseTestPool(){
 const pool=database(target);
 if(nativeData&&new URL(target!).port==='56371'){
  try{
   const row=(await pool.query("select current_setting('data_directory') as folder, current_database() as name")).rows[0];
   assert.equal(row.name,'ih2_test');
   assert.equal(realpathSync(row.folder),realpathSync(nativeData),'Wrong temporary PostgreSQL cluster.');
  }catch(error){
   await pool.end();
   throw error;
  }
 }
 return pool;
}

test('Glasshouse funding commits one payer, rejects false presence, and replays the same receipt', {skip:!target,timeout:25000},async()=>{
 const pool=await glasshouseTestPool();
 let now=Date.UTC(2026,10,24,23);
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const store=new TownStore(pool,{now:()=>now});
  const residents=['team-entrance','team-pine-one','team-pine-two','team-chart','team-late'];
  for(const resident of residents)await store.ensurePlayer(resident,resident);
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  const door:TownPosition={room:'trail',position:INKWOOD_GLASSHOUSE.point};
  const town:TownPosition={room:'square',position:{x:24,y:25}};
  const square=(id:string):TownPosition=>({room:'square',position:worlds.square.stops.find(stop=>stop.id===id)!.point});
  async function request(resident:string,id:string,data:Record<string,unknown>,position:TownPosition=door){
   const {workshop}=await store.snapshot(resident);
   return store.execute(resident,{id,expectedRevision:workshop.revision,...data},position);
  }
  for(const resident of residents.slice(1,3)){
   for(const [index,carpentryAction] of [
    {action:'learn-saw'}, {action:'equip-saw',equipped:true}, {action:'gather-pine',station:'crooked'},
   ].entries()){
    const result=await request(resident,'woods-'+index,{kind:'carpentry',carpentryAction},square(index===2?'pine-crooked':'carpentry-desk'));
    assert.ok(result.ok,result.message);
   }
  }
  assert.equal((await request(residents[0],'outside-review',{kind:'glasshouse-review',task:'entrance'},town)).ok,false);
  const cleared=await request(residents[0],'review-entrance',{kind:'glasshouse-review',task:'entrance'});
  assert.ok(cleared.ok,cleared.message);
  assert.ok(cleared.snapshot.glasshouse?.review);
  const entranceId=cleared.snapshot.glasshouse.review.id;
  const stolen=await request(residents[4],'foreign-review',{kind:'glasshouse-confirm',reviewId:entranceId});
  assert.equal(stolen.ok,false);
  assert.ok((await request(residents[0],'confirm-entrance',{kind:'glasshouse-confirm',reviewId:entranceId})).ok);
  const quote1=await request(residents[1],'review-frame',{kind:'glasshouse-review',task:'frame'});
  const quote2=await request(residents[2],'review-frame',{kind:'glasshouse-review',task:'frame'});
  const confirm=(quote:typeof quote1,id:string)=>({
   kind:'glasshouse-confirm',id,expectedRevision:quote.revision,reviewId:quote.snapshot.glasshouse!.review!.id,
  });
  assert.ok(quote1.ok&&quote2.ok);
  const first=confirm(quote1,'frame-one'),second=confirm(quote2,'frame-two');
  await pool.query(`create function ih2.test_glasshouse_receipt_failure() returns trigger language plpgsql as
   $$begin raise exception 'isolated Glasshouse receipt failure';end$$;
   create trigger test_glasshouse_receipt_failure before insert on ih2.command_receipts
   for each row when (new.command_id='frame-one') execute function ih2.test_glasshouse_receipt_failure()`);
  try{
   await assert.rejects(store.execute(residents[1],first,door),/isolated Glasshouse receipt failure/);
   const after=await store.snapshot(residents[1]);
   assert.equal(after.workshop.carpentry.pine.carried,6);
   assert.equal(after.glasshouse?.project.frame,false);
   assert.equal(after.glasshouse?.review?.id,first.reviewId);
  }finally{
   await pool.query('drop function ih2.test_glasshouse_receipt_failure() cascade');
  }
  const attempts=await Promise.all([store.execute(residents[1],first,door),store.execute(residents[2],second,door)]);
  assert.equal(attempts.filter(result=>result.ok).length,1);
  const winner=attempts[0].ok?0:1;
  const ledger=(await Promise.all(residents.slice(1,3).map(id=>store.snapshot(id)))).map(s=>s.workshop.carpentry);
  assert.equal(ledger[winner].pine.carried,4);
  assert.equal(ledger[winner].glasshousePine,2);
  assert.equal(ledger[1-winner].pine.carried,6);
  const replay=await store.execute(residents[winner+1],[first,second][winner],door);
  assert.equal(replay.replayed,true);
  assert.equal(replay.snapshot.workshop.carpentry.pine.carried,4);
  assert.equal((await request(residents[3],'missing-notes',{kind:'glasshouse-review',task:'chart'})).ok,false);
  for(const id of TRAIL_LANDMARK_IDS){
   const landmark=worlds.trail.stops.find(stop=>stop.id===id)!;
   const stamp=await request(residents[3],'stamp-'+id,{kind:'stamp-trail',landmarkId:id},{room:'trail',position:landmark.point});
   assert.ok(stamp.ok,stamp.message);
  }
  const chart=await request(residents[3],'review-chart',{kind:'glasshouse-review',task:'chart'});
  assert.ok(chart.ok,chart.message);
  const funded=await store.execute(residents[3],confirm(chart,'confirm-chart'),door);
  assert.ok(funded.ok,funded.message);
  assert.equal(funded.snapshot.glasshouse?.project.opensAt,now+GLASSHOUSE_RULES.buildMs);
  assert.deepEqual(funded.snapshot.trail.stamps,[...TRAIL_LANDMARK_IDS].sort());
  now=funded.snapshot.glasshouse!.project.opensAt!-1;
  assert.equal((await store.snapshot(residents[4])).glasshouse?.project.phase,'under-repair');
  now++;
  const returned=await new TownStore(pool,{now:()=>now}).snapshot(residents[4]);
  assert.equal(returned.glasshouse?.project.phase,'open');
  assert.equal(returned.glasshouse?.project.opensAt,now);
  assert.equal(returned.glasshouse?.review,null);
 }finally{
  await pool.end();
 }
});

test('Glasshouse door validates its own exact threshold and writes only confirmed room changes', {skip:!target,timeout:25000},async()=>{
 const pool=await glasshouseTestPool();
 let now=Date.UTC(2026,10,24,23);
 let app:ReturnType<typeof createTownServer>|undefined;
 const front={room:'trail',position:GLASSHOUSE_FRONT};
 const arrival={room:'glasshouse',position:GLASSHOUSE_ENTRY};
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const store=new TownStore(pool,{now:()=>now});
  await store.ensurePlayer('aster','Aster');
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  await store.savePosition('aster',front as TownPosition);
  const work={resident:'aster',at:now};
  const opensAt=now+GLASSHOUSE_RULES.buildMs;
  await pool.query('update ih2.glasshouse_project set state=$1 where id=1',[
   {revision:1,work:{entrance:work,frame:work,chart:work},opensAt},
  ]);
  app=createTownServer({pool,secret:'isolated-glasshouse-room-http-proof-key',now:()=>now,port:0});
  const base='http://127.0.0.1:'+await app.listen();
  const headers={Origin:base,'X-IH2-Schema':TOWN_SCHEMA,'Content-Type':'application/json'};
  // The synthetic sign-in remains valid across the simulated opening.
  const login=await fetch(base+'/api/town/login',{method:'POST',headers,body:JSON.stringify({fixtureId:'aster'})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie')!.split(';',1)[0];
  const move=(where:unknown)=>fetch(base+'/api/town/movement',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(where)});
  now=opensAt-1;
  assert.equal((await move(arrival)).status,409);
  assert.deepEqual((await store.snapshot('aster')).position,front);
  now++;
  assert.equal((await move({...arrival,position:{x:9,y:10}})).status,409);
  assert.equal((await move(arrival)).status,200);
  assert.deepEqual((await store.snapshot('aster')).position,arrival);
  now+=250;
  const door=GLASSHOUSE_ROOM.stops.find(stop=>stop.id==='glasshouse-exit')!;
  assert.equal((await move({room:'glasshouse',position:door.point})).status,200);
  assert.equal((await move(front)).status,200);
  assert.deepEqual((await store.snapshot('aster')).position,front);
  assert.equal(app.metrics.positionCheckpoints,2);
 }finally{
  await app?.close();
  await pool.end();
 }
});

test('a late visitor keeps one private plant with the ordinary atomic command receipt', {skip:!target,timeout:25000},async()=>{
 const pool=await glasshouseTestPool();
 const time=Date.UTC(2026,10,24,23),openAt=time-GLASSHOUSE_RULES.buildMs;
 const store=new TownStore(pool,{now:()=>time});
 const keeper:TownPosition={room:'glasshouse',position:GLASSHOUSE_ROOM.stops.find(stop=>stop.id==='glasshouse-keeper')!.point};
 const front:TownPosition={room:'trail',position:GLASSHOUSE_FRONT};
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const original=await store.ensurePlayer('aster','Aster');
  await store.ensurePlayer('bea','Bea');
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  const work={resident:'aster',at:openAt};
  await pool.query('update ih2.glasshouse_project set state=$1 where id=1',[
   {revision:1,work:{entrance:work,frame:work,chart:work},opensAt:time},
  ]);
  const pick={kind:'glasshouse-keep-plant',id:'fern',expectedRevision:original.workshop.revision,plant:'committee-fern'};
  assert.equal((await store.execute('aster',{...pick,id:'outside'},front)).ok,false);
  await pool.query(`create function ih2.test_greenery_receipt_failure() returns trigger language plpgsql as
   $$begin raise exception 'isolated greenery receipt failure';end$$;
   create trigger test_greenery_receipt_failure before insert on ih2.command_receipts
   for each row when (new.command_id='fern') execute function ih2.test_greenery_receipt_failure()`);
  try{
   await assert.rejects(store.execute('aster',pick,keeper),/isolated greenery receipt failure/);
   assert.equal((await store.snapshot('aster')).glasshousePlant,undefined);
  }finally{
   await pool.query('drop function ih2.test_greenery_receipt_failure() cascade');
  }
  const results=await Promise.all([
   store.execute('aster',pick,keeper),
   store.execute('aster',{...pick,id:'alternate',plant:'very-patient-sundew'},keeper),
  ]);
  assert.equal(results.filter(r=>r.ok).length,1);
  const winner=results.find(r=>r.ok)!;
  const plant=winner.snapshot.glasshousePlant!;
  assert.ok(plant&&winner.publicChanged===false);
  assert.deepEqual(winner.snapshot.workshop.inventory,original.workshop.inventory);
  assert.deepEqual(winner.snapshot.workshop.carpentry,original.workshop.carpentry);
  assert.equal((await store.snapshot('bea')).glasshousePlant,undefined);
  const repeated=await store.execute('aster',plant==='committee-fern'?pick:{...pick,id:'alternate',plant},front);
  assert.ok(repeated.ok&&repeated.replayed);
  assert.equal(repeated.snapshot.glasshousePlant,plant);
  assert.equal((await store.execute('aster',{...pick,id:'second',expectedRevision:winner.revision,plant:'very-patient-sundew'},keeper)).ok,false);
  assert.equal((await new TownStore(pool,{now:()=>time}).snapshot('aster')).glasshousePlant,plant);
 }finally{
  await pool.end();
 }
});

test('a private plant is visible only in the consenting owner’s exact home', {skip:!target,timeout:25000},async()=>{
 const pool=await glasshouseTestPool();
 const time=Date.UTC(2026,10,24,23);
 const store=new TownStore(pool,{now:()=>time});
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const owner=await store.ensurePlayer('aster','Aster');
  const guest=await store.ensurePlayer('bea','Bea');
  const outside={room:'square',position:{x:24,y:25}} as const;
  const {id:plotId}=(await pool.query(
   'insert into ih2.plots(owner_id,level,placements) values($1,1,$2) returning id::text',
   [owner.playerId,owner.workshop.placements],
  )).rows[0];
  const inside:TownPosition={room:'home',homePlotId:plotId,position:WINDOWSILL_STOP.point};
  const action={kind:'glasshouse-display-plant',id:'show',expectedRevision:0,plotId,display:true};
  await store.savePosition(owner.playerId,inside);
  await store.savePosition(guest.playerId,inside);
  assert.equal((await store.execute(owner.playerId,{...action,id:'unearned'},inside)).ok,false);
  await pool.query("insert into ih2.glasshouse_plants values($1,1,'committee-fern',$2)",[owner.playerId,time]);
  assert.equal((await store.snapshot(guest.playerId)).plots[0].windowsillPlant,undefined);
  assert.equal((await store.execute(owner.playerId,{...action,id:'outside'},outside)).ok,false);
  assert.equal((await store.execute(guest.playerId,{...action,id:'guest'},inside)).ok,false);
  const response=await store.execute(owner.playerId,action,inside);
  assert.ok(response.ok&&response.publicChanged);
  assert.equal(response.snapshot.plot?.windowsillPlant,'committee-fern');
  assert.deepEqual(response.snapshot.workshop.owned,owner.workshop.owned);
  assert.equal((await store.snapshot(guest.playerId)).glasshousePlant,undefined);
  assert.equal((await store.snapshot(guest.playerId)).plots[0].windowsillPlant,'committee-fern');
  assert.equal((await store.snapshot(guest.playerId,()=>outside)).plots[0].windowsillPlant,undefined);
  assert.equal((await store.execute(owner.playerId,action,outside)).replayed,true);
  const removal=await store.execute(owner.playerId,{...action,id:'hide',display:false,expectedRevision:response.revision},inside);
  assert.ok(removal.ok&&removal.publicChanged);
  assert.equal(removal.snapshot.glasshousePlant,'committee-fern');
  assert.equal((await store.snapshot(guest.playerId)).plots[0].windowsillPlant,undefined);
 }finally{
  await pool.end();
 }
});

test('an Inkmint finish finishes exactly once and never exposes the tray to visitors',{skip:!target,timeout:25000},async()=>{
 const pool=await glasshouseTestPool();
 let now=Date.UTC(2026,10,25,15);
 const store=new TownStore(pool,{now:()=>now});
 const station=(name:string):TownPosition=>({
  room:'glasshouse',position:GLASSHOUSE_ROOM.stops.find(stop=>stop.id===name)!.point,
 });
 const tray=station(INKMINT_STATIONS.tray),pottery=station(INKMINT_STATIONS.pottery);
 const ink=(id:string,action:string,expectedRevision:number)=>({kind:'glasshouse-inkmint',id,action,expectedRevision});
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const owner=await store.ensurePlayer('aster','Aster');
  await store.ensurePlayer('bea','Bea');
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  const work={resident:'aster',at:now-GLASSHOUSE_RULES.buildMs};
  await pool.query('update ih2.glasshouse_project set state=$1 where id=1',[
   {revision:1,work:{entrance:work,frame:work,chart:work},opensAt:now},
  ]);
  assert.equal((await store.execute('aster',ink('no-plant','plant',0),tray)).ok,false);
  const choice=await store.execute('aster',{
   kind:'glasshouse-keep-plant',id:'choose',expectedRevision:0,plant:'very-patient-sundew',
  },station('glasshouse-keeper'));
  assert.ok(choice.ok,choice.message);
  const start=await store.execute('aster',ink('start','plant',choice.revision),tray);
  assert.ok(start.ok,start.message);
  const due=now+INKMINT_GROW_MS;
  assert.deepEqual(start.snapshot.inkmint,{phase:'growing',readyAt:due});
  now=due-1;
  assert.equal((await store.execute('aster',ink('early','collect',start.revision),tray)).ok,false);
  now++;
  const claims=['claim-one','claim-two'].map(id=>ink(id,'collect',start.revision));
  const race=await Promise.all(claims.map(action=>store.execute('aster',action,tray)));
  const winner=race.findIndex(result=>result.ok);
  assert.equal(race.filter(result=>result.ok).length,1);
  assert.equal((await store.execute('aster',claims[winner],pottery)).replayed,true);
  const mixed=await store.execute('aster',ink('mix','mix',race[winner].revision),pottery);
  assert.ok(mixed.ok,mixed.message);
  const plotId=(await pool.query('insert into ih2.plots(owner_id,level,placements) values($1,1,$2) returning id::text',[
   'aster',owner.workshop.placements,
  ])).rows[0].id;
  const sill:TownPosition={room:'home',homePlotId:plotId,position:WINDOWSILL_STOP.point};
  await store.savePosition('aster',sill);
  await store.savePosition('bea',sill);
  assert.equal((await store.execute('bea',ink('guest-apply','apply',0),sill)).ok,false);
  const applied=await store.execute('aster',ink('apply','apply',mixed.revision),sill);
  assert.ok(applied.ok,applied.message);
  assert.equal(applied.publicChanged,false);
  assert.equal((await store.snapshot('bea')).plots[0].windowsillStriped,undefined);
  const displayed=await store.execute('aster',{
   kind:'glasshouse-display-plant',id:'show',expectedRevision:applied.revision,plotId,display:true,
  },sill);
  assert.ok(displayed.ok,displayed.message);
  const guest=await store.snapshot('bea');
  assert.equal(guest.inkmint,undefined);
  assert.equal(guest.plots[0].windowsillStriped,true);
  assert.equal((await store.snapshot('bea',()=>tray)).plots[0].windowsillStriped,undefined);
  const restored=await store.execute('aster',ink('restore','remove',displayed.revision),sill);
  assert.ok(restored.ok&&restored.publicChanged);
  assert.equal(restored.snapshot.inkmint?.phase,'mixed');
  assert.deepEqual(restored.snapshot.workshop.inventory,owner.workshop.inventory);
  assert.deepEqual(restored.snapshot.workshop.owned,owner.workshop.owned);
  assert.equal((await store.snapshot('bea')).plots[0].windowsillStriped,undefined);
 }finally{
  await pool.end();
 }
});
