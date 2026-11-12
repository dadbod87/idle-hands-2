import{execFileSync}from'node:child_process';import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{Pool}from'pg';import{migrate,localDatabaseUrl}from'../server/db.ts';import{TownStore,type TownPosition}from'../server/store.ts';import{createWorkshop}from'../src/game/workshop.ts';import{collectionGrant,collectionGrantSchema}from'../src/game/collection-receipt.ts';
const url=process.env.IH2_TEST_DATABASE_URL,at=(resource:string):TownPosition=>({room:'square',position:{x:resource==='scrap'?21:resource==='timber'?23:25,y:30}});
test('collection grant accepts only a positive original operation delta and exact promoted art',()=>{
 const before=createWorkshop(1000),after=structuredClone(before);after.inventory.scrap=3;after.revision=1;assert.deepEqual(collectionGrant('one','aster','scrap',before,after),{commandId:'one',playerId:'aster',resource:'scrap',quantity:3,revision:1});assert.equal(collectionGrant('one','aster','scrap',after,after),undefined);assert.equal(collectionGrant('one','aster','unknown',before,after),undefined);assert.equal(collectionGrantSchema.safeParse({commandId:'one',playerId:'aster',resource:'scrap',quantity:7,revision:1}).success,false);
 execFileSync('python3',['tools/promote-collection-art.py','--check'],{stdio:'pipe'});const catalog=JSON.parse(readFileSync('public/art/collection/catalog.json','utf8'));assert.equal(catalog.assets.length,12);for(const asset of catalog.assets){const bytes=readFileSync('public/art/collection/'+asset.file);assert.deepEqual(bytes,readFileSync(asset.source));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
});
test('isolated collection grants retain exact original quantities across authority and replay',{skip:!url},async t=>{
 assert.equal(new URL(localDatabaseUrl(url!)).pathname,'/ih2_test');const pool=new Pool({connectionString:url,max:4});let store:TownStore;
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);store=new TownStore(pool,{now:()=>1000});await store.ensurePlayer('aster','Aster');});
 const command=async(id:string,resource:string)=>{const s=await store.snapshot('aster');return store.execute('aster',{kind:'gather',resource,id,expectedRevision:s.workshop.revision},at(resource));};
 try{
  await t.test('full and capacity-limited grants use the locked actual delta; failed requests have none',async()=>{
   const full=await command('full','scrap');assert.deepEqual(full.collection,{commandId:'full',playerId:'aster',resource:'scrap',quantity:6,revision:1});
   const s=(await store.snapshot('aster')).workshop;s.inventory={scrap:20,timber:20,supplies:19};await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',s]);const partial=await command('partial','timber');assert.equal(partial.collection?.quantity,1);assert.equal(partial.snapshot.workshop.inventory.timber,21);assert.deepEqual(partial.snapshot.workshop.job,s.job);assert.deepEqual(partial.snapshot.workshop.placements,s.placements);
   const rejected=await command('full-bag','supplies');assert.equal(rejected.ok,false);assert.equal(rejected.collection,undefined);assert.deepEqual(rejected.snapshot.workshop,partial.snapshot.workshop);
  });
  await t.test('replay keeps original grant despite intervening spend and current snapshot',async()=>{
   const first=await command('original','scrap');await command('timber','timber');await command('supplies','supplies');let s=await store.snapshot('aster');await store.execute('aster',{kind:'craft',recipe:'planter',id:'spend',expectedRevision:s.workshop.revision},{room:'workshop',position:{x:5,y:5}});s=await store.snapshot('aster');assert.equal(s.workshop.inventory.scrap,4);
   const replay=await store.execute('aster',{kind:'gather',resource:'scrap',id:'original',expectedRevision:0},at('scrap'));assert.equal(replay.replayed,true);assert.deepEqual(replay.collection,first.collection);assert.equal(replay.collection?.quantity,6);assert.deepEqual(replay.snapshot.workshop,s.workshop);
  });
  await t.test('legacy receipts and mismatched payloads cannot invent metadata; client grant fields are refused',async()=>{
   await command('legacy','scrap');await pool.query("update ih2.command_receipts set result=result-'collection' where player_id='aster' and command_id='legacy'");const replay=await store.execute('aster',{kind:'gather',resource:'scrap',id:'legacy',expectedRevision:0},at('scrap'));assert.equal(replay.replayed,true);assert.equal(replay.collection,undefined);
   const wrong=await store.execute('aster',{kind:'gather',resource:'timber',id:'legacy',expectedRevision:0},at('timber'));assert.equal(wrong.ok,false);assert.equal(wrong.collection,undefined);const s=await store.snapshot('aster');const forged=await store.execute('aster',{kind:'gather',resource:'timber',id:'forged',expectedRevision:s.workshop.revision,collection:{quantity:6}},at('timber'));assert.equal(forged.ok,false);assert.equal(forged.collection,undefined);assert.deepEqual(forged.snapshot.workshop,s.workshop);
  });
 }finally{await pool.end();}
});
