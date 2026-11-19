import test from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {migrate,localDatabaseUrl} from '../server/db.ts';
import {TownStore,type TownPosition,type TownResult} from '../server/live-store.ts';
import {newOrchard,PACK_SNACK_MS,type OrchardPantry} from '../src/game/orchard.ts';
import {SNACK_OFFER_MS,snackShelfSchema,type SnackAction} from '../src/game/snack-shelf.ts';

const url=process.env.IH2_TEST_DATABASE_URL;
const shelfPosition:TownPosition={room:'square',position:{x:30,y:22}};
const orchardPosition:TownPosition={room:'square',position:{x:104,y:45}};
const away:TownPosition={room:'square',position:{x:24,y:25}};
const rosters=['sorrel','flint','jun','maple'];
const seasonStart=Date.UTC(2026,10,19,18);

async function fixture(run:(world:Awaited<ReturnType<typeof kitchen>>)=>Promise<void>){
 const target=new URL(localDatabaseUrl(url));
 assert.equal(target.pathname,'/ih2_test');
 assert.notEqual(target.port,'55432');
 assert.notEqual(target.port,'55434');
 const pool=new Pool({connectionString:target.href});
 try{
  await pool.query('drop schema if exists ih2 cascade; drop schema if exists ih2_meta cascade');
  await migrate(pool);
  const world=await kitchen(pool);
  await run(world);
 }finally{await pool.end();}
}

async function kitchen(pool:Pool){
 let now=seasonStart;
 const store=new TownStore(pool,{now:()=>now,roster:rosters});
 for(const id of [...rosters,'outside-roster']){
  await store.ensurePlayer(id,id==='jun'?'Jun':id);
 }
 const seedPouch=async(id:string,count:number,parcel=false)=>{
  const value={...newOrchard(),observedAt:now,packed:count,snacks:count,picked:2*(count+Number(parcel)),
   parcel:parcel?{startedAt:now-PACK_SNACK_MS,readyAt:now}:null};
  await pool.query('update ih2.players set orchard=$2 where id=$1',[id,value]);
 };
 const request=async(actor:string,id:string,action:SnackAction,expectedPlayerId=actor)=>{
  const snapshot=await store.snapshot(actor);
  return {kind:'snack-parcel',id,expectedRevision:snapshot.workshop.revision,expectedPlayerId,action};
 };
 const act=async(actor:string,id:string,action:SnackAction,position=shelfPosition)=>
  store.execute(actor,await request(actor,id,action),position);
 const view=async(actor:string)=>snackShelfSchema.parse(await store.snackShelf(actor));
 const inventory=async()=>{
  const rows=await pool.query<{id:string;orchard:OrchardPantry|null}>("select id,orchard from ih2.players order by id");
  const parcels=(await pool.query<{held:number}>("select count(*)::int as held from ih2.snack_parcels where state in ('waiting','declined')")).rows[0].held;
  return {
   total: rows.rows.reduce((sum,row)=>sum+(row.orchard?.snacks??0)+(row.orchard?.tasted??0),parcels),
   held:parcels,
  };
 };
 return{pool,store,seedPouch,request,act,view,inventory,clock:(time:number)=>{now=time;}};
}

function accepted(result:TownResult){
 assert.ok(result.ok,result.message);
 assert.equal(result.publicChanged,undefined);
 return result;
}

test('private snack shelf conserves stock, protects actor scope and rolls back an accepted parcel if the pantry cannot commit',{skip:!url},async()=>{
 await fixture(async({pool,store,seedPouch,request,act,view,inventory})=>{
  await seedPouch('sorrel',3,true);
  await seedPouch('flint',3);
  const before=await store.snapshot('sorrel');
  const leave={kind:'leave',recipientId:'flint'} as const;
  assert.equal((await act('sorrel','away',leave,away)).ok,false);
  assert.equal((await act('sorrel','outside',{kind:'leave',recipientId:'outside-roster'})).ok,false);
  assert.equal((await store.execute('sorrel',await request('sorrel','cookie-swap',leave,'flint'),shelfPosition)).ok,false);
  const sentRequest=await request('sorrel','first-offer',leave);
  const sent=accepted(await store.execute('sorrel',sentRequest,shelfPosition));
  const again=accepted(await store.execute('sorrel',sentRequest,shelfPosition));
  assert.equal(again.replayed,true);
  assert.equal(again.revision,sent.revision);
  assert.ok(sent.snapshot.orchard&&sent.snapshot.orchard!=='unavailable');
  assert.equal(sent.snapshot.orchard.snacks,2);
  assert.equal((await view('sorrel')).outgoing?.name,'flint');
  assert.equal((await view('flint')).incoming[0].name,'sorrel');
  assert.deepEqual((await view('jun')).incoming,[]);
  assert.ok(!(await view('jun')).neighbors.some(person=>person.id==='outside-roster'));
  const parcelId=(await view('sorrel')).outgoing!.id;
  const accept={kind:'accept',parcelId} as const;
  assert.equal((await act('jun','read-or-take',accept)).ok,false);
  assert.equal((await act('flint','full',accept)).ok,false);
  assert.equal((await store.execute('sorrel',{kind:'orchard',id:'collection',expectedRevision:sent.revision,expectedPlayerId:'sorrel',action:{kind:'collect'}},orchardPosition)).ok,false);
  assert.deepEqual(await inventory(),{total:6,held:1});
  accepted(await act('flint','taste',{kind:'taste'}));
  const pending=await request('flint','accepted',accept);
  await pool.query(`create function ih2.refuse_test_gift() returns trigger language plpgsql as
   $$begin raise exception 'test gift rollback'; end$$;
   create trigger refuse_test_gift before update of orchard on ih2.players
   for each row execute function ih2.refuse_test_gift()`);
  await assert.rejects(store.execute('flint',pending,shelfPosition),/test gift rollback/);
  assert.equal((await view('flint')).incoming[0].id,parcelId);
  assert.equal((await pool.query("select 1 from ih2.command_receipts where player_id='flint' and command_id='accepted'")).rowCount,0);
  await pool.query('drop function ih2.refuse_test_gift() cascade');
  const received=accepted(await store.execute('flint',pending,shelfPosition));
  assert.equal(received.revision,2);
  assert.ok(received.snapshot.orchard&&received.snapshot.orchard!=='unavailable');
  assert.equal(received.snapshot.orchard.snacks,3);
  assert.equal(received.snapshot.orchard.tasted,1);
  assert.equal((await view('sorrel')).outgoing,null);
  assert.deepEqual((await view('flint')).incoming,[]);
  assert.equal((await act('sorrel','returned-too-late',{kind:'reclaim',parcelId})).ok,false);
  assert.deepEqual(await inventory(),{total:6,held:0});
  const reopened=new TownStore(pool,{now:()=>seasonStart});
  assert.deepEqual((await reopened.snapshot('flint')).orchard,received.snapshot.orchard);
  assert.deepEqual(sent.snapshot.workshop.inventory,before.workshop.inventory);
  assert.deepEqual(sent.snapshot.cafe,before.cafe);
  assert.deepEqual(sent.snapshot.scores,before.scores);
  const privateTable=(await pool.query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='ih2' and relname='snack_parcels'")).rows[0];
  assert.equal(privateTable.relrowsecurity,true);
 });
});

test('crossed sends and competing accept or return make one atomic settlement, with exact expiry and safe reclamation',{skip:!url},async()=>{
 await fixture(async({store,seedPouch,request,act,view,inventory,clock})=>{
  await seedPouch('sorrel',1);
  await seedPouch('flint',1);
  const [sendA,sendB]=await Promise.all([
   request('sorrel','send-from-a',{kind:'leave',recipientId:'flint'}),
   request('flint','send-from-b',{kind:'leave',recipientId:'sorrel'}),
  ]);
  for(const result of await Promise.all([
   store.execute('sorrel',sendA,shelfPosition),
   store.execute('flint',sendB,shelfPosition),
  ]))accepted(result);
  assert.deepEqual(await inventory(),{total:2,held:2});
  const a=(await view('sorrel')).outgoing!.id;
  const b=(await view('flint')).outgoing!.id;
  const [taking,returning]=await Promise.all([
   request('flint','race-accept',{kind:'accept',parcelId:a}),
   request('sorrel','race-reclaim',{kind:'reclaim',parcelId:a}),
  ]);
  const one=await Promise.all([
   store.execute('flint',taking,shelfPosition),
   store.execute('sorrel',returning,shelfPosition),
  ]);
  assert.equal(one.filter(result=>result.ok).length,1);
  assert.deepEqual(await inventory(),{total:2,held:1});
  assert.equal((await view('sorrel')).incoming[0].id,b);
  clock(seasonStart+SNACK_OFFER_MS);
  assert.deepEqual((await view('sorrel')).incoming,[]);
  assert.equal((await act('sorrel','expiry',{kind:'accept',parcelId:b})).ok,false);
  assert.equal((await view('flint')).outgoing?.id,b);
  accepted(await act('flint','reclaim-expired',{kind:'reclaim',parcelId:b}));
  assert.deepEqual(await inventory(),{total:2,held:0});
 });
});
