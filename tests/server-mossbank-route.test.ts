import assert from 'node:assert/strict';
import {test} from 'node:test';
import {realpathSync} from 'node:fs';
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore} from '../server/live-store.ts';
import {MOSSBANK_ENTRY,MOSSBANK_FRONT,MOSSBANK_INKWOOD_FRONT} from '../src/game/mossbank-room.ts';
import {PUMPWORKS_ENTRY} from '../src/game/pumpworks-room.ts';
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

test('Shared travel reaches Mossbank through the restored Inkwood road and checkpoints the exact return', {skip:!target,timeout:22000}, async()=>{
 const pool=database(target);
 let app:ReturnType<typeof createTownServer>|undefined;
 let now=Date.UTC(2026,10,25,18);
 const front={room:'trail',position:MOSSBANK_INKWOOD_FRONT} as const;
 const arrival={room:'mossbank',position:MOSSBANK_ENTRY} as const;
 const orchard={room:'square',position:MOSSBANK_FRONT} as const;
 try{
  if(disposable&&new URL(target!).port==='56371'){
   const verified=await pool.query("select current_setting('data_directory') as directory, current_database() as name");
   assert.equal(verified.rows[0].name,'ih2_test');
   assert.equal(realpathSync(verified.rows[0].directory),realpathSync(disposable));
  }
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
