import assert from 'node:assert/strict';
import {test} from 'node:test';
import {realpathSync} from 'node:fs';
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore} from '../server/live-store.ts';
import {MOSSBANK_ENTRY,MOSSBANK_FRONT,MOSSBANK_INKWOOD_FRONT,MOSSBANK_STOPS} from '../src/game/mossbank-room.ts';
import {PUMPWORKS_ENTRY} from '../src/game/pumpworks-room.ts';
import {MOSSBANK_AWARDS,mossbankFromAwards} from '../src/game/mossbank.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
const disposable=process.env.IH2_GLASSHOUSE_TEMP_DATA;
if(target){
 const url=new URL(target);
 const ci=url.port==='5432'&&process.env.CI==='true'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
 const local=url.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
 const native=url.port==='56371'&&disposable&&/^\/(?:private\/)?tmp\/ih2-new-db\.[a-zA-Z0-9]+\/data$/.test(disposable);
 assert.ok(url.hostname==='127.0.0.1'&&url.pathname==='/ih2_test'&&!url.search&&!url.hash&&(ci||local||native),
  'Use the dedicated disposable town test database.');
}

async function disposablePool(){
 const pool=database(target);
 try{
  if(disposable&&new URL(target!).port==='56371'){
   const verified=await pool.query("select current_setting('data_directory') as directory, current_database() as name");
   assert.equal(verified.rows[0].name,'ih2_test');
   assert.equal(realpathSync(verified.rows[0].directory),realpathSync(disposable));
  }
  return pool;
 }catch(error){await pool.end();throw error;}
}
test('Shared travel reaches Mossbank through the restored Inkwood road and checkpoints the exact return', {skip:!target,timeout:22000}, async()=>{
 const pool=await disposablePool();
 let app:ReturnType<typeof createTownServer>|undefined;
 let now=Date.UTC(2026,10,25,18);
 const front={room:'trail',position:MOSSBANK_INKWOOD_FRONT} as const;
 const arrival={room:'mossbank',position:MOSSBANK_ENTRY} as const;
 const orchard={room:'square',position:MOSSBANK_FRONT} as const;
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const store=new TownStore(pool,{now:()=>now});
  await store.ensurePlayer('aster','Aster');
  await assert.rejects(store.savePosition('aster',arrival),/restored Inkwood bridge/);
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  await store.ensurePlayer('bea','Bea');
  await store.savePosition('aster',front);
  await store.savePosition('bea',orchard);
  app=createTownServer({pool,secret:'isolated-mossbank-road-synthetic-signing-key',now:()=>now,port:0});
  const origin='http://127.0.0.1:'+await app.listen();
  const headers={Origin:origin,'X-IH2-Schema':TOWN_SCHEMA,'Content-Type':'application/json'};
  const request=(path:string,body:unknown,cookie?:string)=>fetch(origin+'/api/town/'+path,{
   method:'POST',headers:{...headers,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),
  });
  async function login(fixtureId:string){
   const response=await request('login',{fixtureId});
   assert.equal(response.status,200);
   return response.headers.get('set-cookie')!.split(';',1)[0];
  }
  const aster=await login('aster'),bea=await login('bea');
  assert.equal((await request('movement',arrival,bea)).status,409);
  assert.deepEqual((await store.snapshot('bea')).position,orchard);
  assert.equal((await request('movement',{...arrival,position:{x:9,y:22}},aster)).status,409);
  assert.equal((await request('movement',{room:'pumpworks',position:PUMPWORKS_ENTRY},aster)).ok,false);
  assert.deepEqual((await store.snapshot('aster')).position,front);
  const enter=await request('movement',arrival,aster);
  assert.equal(enter.status,200);
  assert.deepEqual((await enter.json()).position,arrival);
  assert.deepEqual((await store.snapshot('aster')).position,arrival);
  assert.equal((await request('movement',front,aster)).status,409);
  now+=250;
  assert.equal((await request('movement',{room:'mossbank',position:{x:4,y:27.4}},aster)).status,200);
  assert.equal((await request('movement',front,aster)).status,200);
  assert.deepEqual((await store.snapshot('aster')).position,front);
  assert.equal(app.metrics.positionCheckpoints,2);
 }finally{
  await app?.close();
  await pool.end();
 }
});

test('The shared survey grants one private swatch with revision, station and replay checks', {skip:!target,timeout:22000},async()=>{
 const pool=await disposablePool();
 const now=Date.UTC(2026,10,25,18);
 const store=new TownStore(pool,{now:()=>now});
 const marker=(id:string)=>({room:'mossbank',position:MOSSBANK_STOPS.find(stop=>stop.id===id)!.point} as const);
 const mill=marker('mossbank-mill'),flume=marker('mossbank-flume'),windrow=marker('mossbank-windrow');
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');
  await migrate(pool);
  await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");
  const first=await store.ensurePlayer('aster','Aster');
  await store.ensurePlayer('bea','Bea');
  const plotId:string=(await pool.query('insert into ih2.plots(owner_id,level,placements) values($1,1,$2) returning id::text',
   ['aster',first.workshop.placements])).rows[0].id;
  const inside={room:'home',homePlotId:plotId,position:{x:9,y:11}} as const;
  const display={kind:'display-home-keepsake',keepsake:'alder-swatch',plotId};
  const unearned=await store.execute('aster',{...display,id:'unearned-swatch',expectedRevision:0},inside);
  assert.equal(unearned.ok,false);
  assert.match(unearned.message,/Finish Wren’s survey/);
  const dto=(id:string,action:string,expectedRevision:number)=>({id,kind:'mossbank-survey',action,expectedRevision});
  const bad=await store.execute('aster',dto('survey-too-far','join',0),{room:'square',position:MOSSBANK_FRONT});
  assert.equal(bad.ok,false);
  const join=dto('survey-join','join',0);
  const accepted=await store.execute('aster',join,mill);
  assert.equal(accepted.ok,true);
  assert.equal((await store.execute('aster',join,mill)).replayed,true);
  assert.equal((await store.execute('aster',dto('survey-before-notes','finish',accepted.revision),mill)).ok,false);
  const concurrent=await Promise.all([
   store.execute('aster',dto('survey-flume-1','flume',accepted.revision),flume),
   store.execute('aster',dto('survey-flume-2','flume',accepted.revision),flume),
  ]);
  assert.equal(concurrent.filter(entry=>entry.ok).length,1);
  const written=concurrent.find(entry=>entry.ok)!;
  assert.equal((await store.execute('aster',dto('survey-wrong-marker','windrow',written.revision),flume)).ok,false);
  const noted=await store.execute('aster',dto('survey-windrow','windrow',written.revision),windrow);
  assert.equal(noted.ok,true);
  const finish=dto('survey-finish','finish',noted.revision);
  const complete=await store.execute('aster',finish,mill);
  assert.equal(complete.ok,true);
  assert.equal((await store.execute('aster',finish,mill)).replayed,true);
  assert.equal((await store.execute('aster',dto('second-swatch','finish',complete.revision),mill)).ok,false);
  assert.equal(mossbankFromAwards(complete.snapshot.quest.awarded)?.finished,true);
  assert.deepEqual(complete.snapshot.workshop.inventory,first.workshop.inventory);
  assert.deepEqual(complete.snapshot.workshop.owned,first.workshop.owned);
  const elsewhere=await new TownStore(pool,{now:()=>now}).snapshot('aster');
  assert.equal(mossbankFromAwards(elsewhere.quest.awarded)?.finished,true);
  assert.equal(mossbankFromAwards((await store.snapshot('bea')).quest.awarded)?.joined,false);
  const exact=await pool.query('select count(*)::int as count from ih2.quest_awards where player_id=$1 and quest_id=$2',['aster',MOSSBANK_AWARDS.finish]);
  assert.equal(exact.rows[0].count,1);
  await store.savePosition('aster',inside);
  const mounted=await store.execute('aster',{...display,id:'display-swatch',expectedRevision:complete.revision},inside);
  assert.equal(mounted.ok,true,mounted.message);
  assert.equal(mounted.snapshot.plot?.wallDisplay,'alder-swatch');
  assert.equal((await store.snapshot('bea')).plots.find(plot=>plot.id===plotId)?.wallDisplay,undefined);
  await store.savePosition('bea',inside);
  assert.equal((await store.snapshot('bea')).plots.find(plot=>plot.id===plotId)?.wallDisplay,'alder-swatch');
  assert.equal(mossbankFromAwards((await store.snapshot('bea')).quest.awarded)?.finished,false);
  const cannotRemove=await store.execute('bea',{...display,keepsake:null,id:'guest-take-frame',expectedRevision:0},inside);
  assert.equal(cannotRemove.ok,false);
  const removed=await store.execute('aster',{...display,keepsake:null,id:'owner-take-frame',expectedRevision:mounted.revision},inside);
  assert.equal(removed.ok,true,removed.message);
  assert.equal((await store.snapshot('bea')).plots.find(plot=>plot.id===plotId)?.wallDisplay,undefined);
  assert.equal(mossbankFromAwards(removed.snapshot.quest.awarded)?.finished,true);
 }finally{await pool.end();}
});
