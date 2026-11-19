import test from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {migrate,localDatabaseUrl} from '../server/db.ts';
import {TownStore,type TownPosition} from '../server/live-store.ts';
import {ORCHARD_STOPS,PACK_SNACK_MS,type OrchardAction} from '../src/game/orchard.ts';
import {worlds} from '../src/game/world.ts';

const url=process.env.IH2_TEST_DATABASE_URL;
const positionFor=(id:string):TownPosition=>({
 room:'square',
 position:[...ORCHARD_STOPS,...worlds.square.stops].find(stop=>stop.id===id)!.point,
});
const low=positionFor('orchard-branch-low-branch');
const forks=positionFor('orchard-branch-two-forks');
const table=positionFor('commons-orchard');
const gather=positionFor('scrap');
const pick={kind:'pick',branch:'low-branch'} as const;

test('shared orchard persists one private pantry per resident and rolls back a failed receipt atomically',{skip:!url},async()=>{
 const target=new URL(localDatabaseUrl(url));
 assert.equal(target.pathname,'/ih2_test');
 assert.notEqual(target.port,'55432');
 assert.notEqual(target.port,'55434');
 const pool=new Pool({connectionString:target.href});
 let now=Date.UTC(2026,10,19,18);
 let store=new TownStore(pool,{now:()=>now});
 try{
  await pool.query('drop schema if exists ih2 cascade; drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const a=await store.ensurePlayer('aster'), b=await store.ensurePlayer('bea');
  assert.equal(a.orchard,null);
  assert.equal(b.orchard,null);
  const command=(id:string,expectedRevision:number,action:OrchardAction,expectedPlayerId='aster')=>({kind:'orchard',id,expectedRevision,expectedPlayerId,action});
  assert.equal((await store.execute('aster',command('from-a-different-tree',a.workshop.revision,pick),forks)).ok,false);

  assert.equal((await store.execute('bea',command('wrong-resident',b.workshop.revision,pick,'aster'),low)).ok,false);
  const request=command('first-apple',a.workshop.revision,pick);
  const repeated=[store.execute('aster',request,low),store.execute('aster',request,low)];
  const [first,replay,neighbor]=await Promise.all([...repeated,store.execute('bea',command('first-apple',b.workshop.revision,pick,'bea'),low)]);
  assert.ok(first.ok&&replay.ok&&neighbor.ok);
  assert.equal(Number(first.replayed)+Number(replay.replayed),1);
  assert.equal(neighbor.replayed,false);
  for(const saved of [first,replay,neighbor]){
   assert.ok(saved.snapshot.orchard&&saved.snapshot.orchard!=='unavailable');
   assert.equal(saved.snapshot.orchard.apples,1);
   assert.equal(saved.publicChanged,undefined);
  }
  const confirmed=first.snapshot;
  assert.equal(confirmed.workshop.revision,a.workshop.revision+1);
  for(const key of ['inventory','owned','stats','bridgeKits','job','garden','carpentry','commission'] as const){
   assert.deepEqual(confirmed.workshop[key],a.workshop[key]);
  }
  assert.deepEqual(confirmed.bridge,a.bridge);
  assert.deepEqual(confirmed.cafe,a.cafe);
  assert.deepEqual(confirmed.scores,a.scores);
  const swapped={...request,action:{kind:'pick',branch:'two-forks'}};
  assert.equal((await store.execute('aster',swapped,forks)).ok,false);
  assert.equal((await store.execute('aster',command('stale',a.workshop.revision,{kind:'pick',branch:'two-forks'}),forks)).ok,false);
  const second=await store.execute('aster',command('second-apple',confirmed.workshop.revision,{kind:'pick',branch:'two-forks'}),forks);
  assert.ok(second.ok);
  assert.deepEqual((await store.snapshot('bea')).orchard,neighbor.snapshot.orchard);
  const pack=command('pack',second.revision,{kind:'pack'});

  await pool.query(`create function ih2.refuse_test_orchard() returns trigger language plpgsql as
   $$begin raise exception 'test orchard update rolled back'; end$$;
   create trigger refuse_test_orchard before update of orchard on ih2.players
   for each row execute function ih2.refuse_test_orchard()`);
  await assert.rejects(store.execute('aster',pack,table),/test orchard update rolled back/);
  assert.deepEqual((await store.snapshot('aster')).orchard,second.snapshot.orchard);
  assert.equal((await pool.query("select 1 from ih2.command_receipts where player_id='aster' and command_id='pack'")).rowCount,0);
  await pool.query('drop function ih2.refuse_test_orchard() cascade');
  const packed=await store.execute('aster',pack,table);
  assert.ok(packed.ok);
  const parcel=packed.snapshot.orchard;
  assert.ok(parcel&&parcel!=='unavailable');
  assert.equal(parcel.apples,0);
  assert.equal(parcel.parcel?.readyAt,now+PACK_SNACK_MS);

  const ordinary=await store.execute('aster',{kind:'gather',id:'ordinary-work',expectedRevision:packed.revision,resource:'scrap'},gather);
  assert.ok(ordinary.ok);
  assert.deepEqual(ordinary.snapshot.orchard,parcel);
  store=new TownStore(pool,{now:()=>now});
  assert.deepEqual((await store.snapshot('aster')).orchard,parcel);
  now+=PACK_SNACK_MS-1;
  assert.equal((await store.execute('aster',command('too-soon',ordinary.revision,{kind:'collect'}),table)).ok,false);
  now++;
  const pickedUp=await store.execute('aster',command('collect',ordinary.revision,{kind:'collect'}),table);
  assert.ok(pickedUp.ok);
  assert.ok(pickedUp.snapshot.orchard&&pickedUp.snapshot.orchard!=='unavailable');
  assert.equal(pickedUp.snapshot.orchard.snacks,1);

  const unknown={...pickedUp.snapshot.orchard,version:2};
  await pool.query("update ih2.players set orchard=$1 where id='aster'",[unknown]);
  assert.equal((await store.snapshot('aster')).orchard,'unavailable');
  const refused=await store.execute('aster',command('taste-unknown',pickedUp.revision,{kind:'taste'}),table);
  assert.equal(refused.ok,false);
  assert.equal(refused.revision,pickedUp.revision);
  const ordinaryAfter=await store.execute('aster',{kind:'gather',id:'other-gather',expectedRevision:pickedUp.revision,resource:'timber'},positionFor('timber'));
  assert.ok(ordinaryAfter.ok);
  const saved=(await pool.query("select orchard from ih2.players where id='aster'")).rows[0].orchard;
  assert.deepEqual(saved,unknown);
 }finally{await pool.end();}
});
