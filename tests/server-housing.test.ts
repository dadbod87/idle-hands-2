import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {migrate,localDatabaseUrl} from '../server/db.ts';
import {HousingContractCandidate} from '../server/housing-contract-candidate.ts';
import {HOUSING_CATALOG_VERSION,housingAccountSchema,publicHousing,type HousingAccount} from '../src/design/housing-contract.ts';
import {earnedHousingFixture} from '../tools/earned-housing-fixture.ts';
import {housingFixture,HOUSING_FIXTURE_TIME} from '../tools/housing-contract-fixture.ts';
const base=process.env.IH2_TEST_DATABASE_URL;
const candidateUrl=process.env.IH2_HOUSING_TEST_DATABASE_URL??(base?(()=>{const u=new URL(localDatabaseUrl(base));u.pathname='/ih2_housing_test';return u.href;})():undefined);
const H=3_600_000,start=HOUSING_FIXTURE_TIME;
const command=(a:HousingAccount,extra:Record<string,unknown>)=>({version:1,catalogVersion:HOUSING_CATALOG_VERSION,id:randomUUID(),expectedRevision:a.workshop.revision,...extra});
const choice=(a:HousingAccount,target='pocket-cottage-2',plotId=a.home?.plotId??'1')=>({version:1,catalogVersion:HOUSING_CATALOG_VERSION,target,plotId,expectedRevision:a.workshop.revision});

test('housing candidate guards fail closed for protected/remote/override pools and remain unregistered',async()=>{
 for(const name of ['ih2_preview','ih2_neighborhood_tour','ih2_test','ih2_cafe_test']){const p=new Pool({host:'127.0.0.1',database:name});assert.throws(()=>new HousingContractCandidate(p));await p.end();}
 for(const url of ['postgres://ih2@example.com/ih2_housing_test','postgres://ih2@127.0.0.1/ih2_housing_test?host=example.com','postgres://ih2@localhost/ih2_housing_test#override','postgres://ih2@127.0.0.1:55432/ih2_housing_test'])assert.throws(()=>HousingContractCandidate.databaseUrl(url));
 const remote=new Pool({connectionString:'postgres://ih2@localhost/ih2_housing_test',host:'example.com'});assert.throws(()=>new HousingContractCandidate(remote));await remote.end();
 for(const f of ['src/main.ts','server/http.ts','server/index.ts','server/live-store.ts','src/game/live-session.ts'].filter(f=>f!=='src/game/live-session.ts'))assert.doesNotMatch(await readFile(f,'utf8'),/housing-contract-candidate|HousingContractCandidate|ih2_housing_candidate/);
});

test('isolated PostgreSQL housing quote, ownership, allocation and construction durability',{skip:!candidateUrl},async t=>{
 const url=HousingContractCandidate.databaseUrl(candidateUrl!),u=new URL(url);u.pathname='/ih2_test';const admin=new Pool({connectionString:u.href,max:1});
 for(const name of ['ih2_housing_test','ih2_housing_restore'])if(!(await admin.query('select 1 from pg_database where datname=$1',[name])).rowCount)await admin.query('create database '+name);await admin.end();
 const pool=new Pool({connectionString:url,max:8,connectionTimeoutMillis:5000,statement_timeout:7000});let now=start,store=new HousingContractCandidate(pool,{now:()=>now});
 const fingerprint=async()=> (await pool.query("select (select jsonb_agg(to_jsonb(a) order by owner_id) from ih2_housing_candidate.accounts a) as accounts,(select jsonb_agg(to_jsonb(q) order by id) from ih2_housing_candidate.quotes q) as quotes,(select jsonb_agg(to_jsonb(b) order by id) from ih2_housing_candidate.builds b) as builds,(select jsonb_agg(to_jsonb(r) order by owner_id,id) from ih2_housing_candidate.receipts r) as receipts")).rows[0];
 const migrations=async()=> (await pool.query('select version,checksum from ih2_meta.migrations order by version')).rows;
 async function quote(id='aster',target='pocket-cottage-2',plotId?:string){const a=await store.snapshot(id);return store.quote(id,choice(a,target,plotId??a.home?.plotId??'1'));}
 async function confirm(id='aster',target='pocket-cottage-2'){const a=await store.snapshot(id),q=await quote(id,target),cmd=command(a,{kind:'confirm',quoteId:q.id});const r=await store.command(id,cmd);assert.ok(r.ok,r.message);return{r,q,cmd};}
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2_housing_candidate cascade;drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);now=start;store=new HousingContractCandidate(pool,{now:()=>now});await store.install();await store.importAccount(housingFixture());await store.importAccount(housingFixture('bea',0));});
 try{
  await t.test('legacy import and read-only projection retain every source field and all seven immutable migration checksums',async()=>{
   const a=await store.snapshot('aster'),before=await fingerprint(),hashes=await migrations();assert.deepEqual(a,housingFixture());assert.equal(hashes.length,10);await store.publicStreet();await store.snapshot('bea');assert.deepEqual(await fingerprint(),before);assert.deepEqual(await migrations(),hashes);
   const pub=(await store.publicStreet())[0];assert.deepEqual(Object.keys(pub!).sort(),Object.keys(publicHousing(a,now)!).sort());assert.equal(JSON.stringify(pub).includes('bridgeKits'),false);assert.equal(JSON.stringify(pub).includes('produce'),false);await assert.rejects(store.importAccount(a));
  });
  await t.test('atomic forward import copies real current schema rows, exact facade/creative rights and fails without partial migration',async()=>{
   const earned=earnedHousingFixture();earned.home!.layout.workroomPlacements['workroom-north']='letterbox';earned.workshop.commission.published=false;housingAccountSchema.parse(earned);await pool.query('delete from ih2_housing_candidate.accounts');
   await pool.query('insert into ih2.players(id,name,workshop,position) values($1,$1,$2,$3)',['earned',earned.workshop,{room:'square',position:{x:30,y:29}}]);
   await pool.query('insert into ih2.plots(id,owner_id,level,placements,workroom_placements) overriding system value values(25,$1,2,$2,$3)',['earned',earned.home!.layout.placements,earned.home!.layout.workroomPlacements]);
   await pool.query("insert into ih2.quest_awards(player_id,quest_id,content_version) values('earned','trail-pennant-v1',1)");const awards=(await pool.query('select * from ih2.quest_awards')).rows;
   const before=(await pool.query('select to_jsonb(p) as player,to_jsonb(h) as plot from ih2.players p join ih2.plots h on h.owner_id=p.id')).rows,hashes=await migrations();assert.equal(await store.importLegacyTown(),1);assert.deepEqual(await store.snapshot('earned'),earned);const appearance=(await store.publicStreet())[0]!;assert.equal(appearance.pennantOwned,true);assert.equal(appearance.letterboxMotif,earned.workshop.commission.motif);assert.equal('published'in appearance,false);assert.deepEqual((await pool.query('select * from ih2.quest_awards')).rows,awards);assert.deepEqual((await pool.query('select to_jsonb(p) as player,to_jsonb(h) as plot from ih2.players p join ih2.plots h on h.owner_id=p.id')).rows,before);assert.deepEqual(await migrations(),hashes);
   await pool.query('delete from ih2_housing_candidate.accounts');await pool.query('insert into ih2.players(id,name,workshop,position) values($1,$1,$2,$3)',['unsupported',{version:999},{room:'square',position:{x:30,y:29}}]);await assert.rejects(store.importLegacyTown());assert.equal((await pool.query('select * from ih2_housing_candidate.accounts')).rowCount,0);assert.deepEqual((await pool.query('select to_jsonb(p) as player,to_jsonb(h) as plot from ih2.players p join ih2.plots h on h.owner_id=p.id')).rows,before);
  });
  await t.test('same UUID confirmation charges exactly once; conflicting reuse cannot change paid history',async()=>{
   const before=await store.snapshot('aster'),{r,q,cmd}=await confirm();const [a,b]=await Promise.all([store.command('aster',cmd),store.command('aster',cmd)]);assert.ok(a.ok&&b.ok&&a.replayed&&b.replayed);assert.equal(a.account.workshop.bridgeKits,before.workshop.bridgeKits-q.totalKits);assert.equal((await pool.query('select * from ih2_housing_candidate.builds')).rowCount,1);assert.equal((await pool.query('select * from ih2_housing_candidate.receipts')).rowCount,1);const conflict=await store.command('aster',command(r.account,{id:cmd.id,kind:'finish',buildId:r.account.build!.id}));assert.equal(conflict.ok,false);assert.deepEqual(await store.snapshot('aster'),r.account);
  });
  await t.test('two same-owner tabs spend once; two different buyers for one parcel have one winner and no loser debit',async()=>{
   const a=await store.snapshot('aster'),qa=await quote(),qb=await quote('aster','porch-house-2');const results=await Promise.all([store.command('aster',command(a,{kind:'confirm',quoteId:qa.id})),store.command('aster',command(a,{kind:'confirm',quoteId:qb.id}))]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal((await store.snapshot('aster')).workshop.bridgeKits,24);
   await store.importAccount(housingFixture('cy',0));const bea=await store.snapshot('bea'),cy=await store.snapshot('cy'),q1=await store.quote('bea',choice(bea,'pocket-cottage-1','2')),q2=await store.quote('cy',choice(cy,'porch-house-1','2'));
   const two=await Promise.all([store.command('bea',command(bea,{kind:'confirm',quoteId:q1.id})),store.command('cy',command(cy,{kind:'confirm',quoteId:q2.id}))]);assert.equal(two.filter(r=>r.ok).length,1);for(const r of two)assert.equal(r.account.workshop.bridgeKits,r.ok?36:48);assert.equal((await pool.query("select * from ih2_housing_candidate.accounts where plot_id='2'")).rowCount,1);
  });
  await t.test('foreign quote, expired quote, unsupported cache and forged price cannot spend or change home',async()=>{
   const original=await store.snapshot('aster'),q=await quote();now=q.expiresAt;const expired=await store.command('aster',command(original,{kind:'confirm',quoteId:q.id}));assert.equal(expired.ok,false);assert.deepEqual(expired.account,original);
   const bea=await store.snapshot('bea'),foreign=await store.command('bea',command(bea,{kind:'confirm',quoteId:q.id}));assert.equal(foreign.ok,false);assert.deepEqual(foreign.account,bea);
   const before=await fingerprint();for(const extra of [{version:0},{catalogVersion:'old'},{price:0},{ownerId:'bea'}]){const r=await store.command('aster',{...command(original,{kind:'confirm',quoteId:q.id}),...extra});assert.equal(r.ok,false);}assert.deepEqual(await fingerprint(),before);
  });
  await t.test('receipt write failure rolls back debit, reservation and construction; same request safely retries',async()=>{
   const a=await store.snapshot('aster'),q=await quote(),cmd=command(a,{kind:'confirm',quoteId:q.id}),before=await fingerprint();
   await pool.query("create function ih2_housing_candidate.fixture_fail() returns trigger language plpgsql as $$begin raise exception 'synthetic receipt interruption';end$$;create trigger fixture_fail before insert on ih2_housing_candidate.receipts for each row execute function ih2_housing_candidate.fixture_fail()");
   await assert.rejects(store.command('aster',cmd),/synthetic receipt/);assert.deepEqual(await fingerprint(),before);await pool.query('drop trigger fixture_fail on ih2_housing_candidate.receipts;drop function ih2_housing_candidate.fixture_fail()');assert.ok((await store.command('aster',cmd)).ok);
  });
  await t.test('paid deadline survives re-instantiation; building allows existing-home arranging; occupied geometry waits safely',async()=>{
   const {r}=await confirm();const ready=r.account.build!.readyAt;store=new HousingContractCandidate(pool,{now:()=>now});assert.deepEqual((await store.snapshot('aster')).build,r.account.build);
   const a=await store.snapshot('aster'),m=await store.command('aster',command(a,{kind:'arrange',arrangement:{version:1,catalogVersion:HOUSING_CATALOG_VERSION,expectedRevision:a.workshop.revision,action:'place',prop:'stool',from:{area:'indoor',slot:'north-west'},to:{area:'rental',slot:'north-west'}}}));assert.ok(m.ok,m.message);assert.equal(m.account.build!.readyAt,ready);assert.equal(m.account.home!.legacyExterior,a.home!.legacyExterior);
   now=ready-1;assert.equal((await store.command('aster',command(m.account,{kind:'finish',buildId:a.build!.id}))).ok,false);now=ready+7*24*H;
   const inside={districtId:'1',point:{x:9,y:8}};const blocked=await store.command('aster',command(m.account,{kind:'finish',buildId:a.build!.id}),[inside]);assert.equal(blocked.ok,false);assert.deepEqual(blocked.account,m.account);
   const cmd=command(m.account,{kind:'finish',buildId:a.build!.id}),done=await store.command('aster',cmd);assert.ok(done.ok,done.message);assert.equal(done.account.home!.layout.level,2);assert.equal(done.account.workshop.placements['north-west'],'stool');assert.equal(done.account.home!.layout.placements['north-west'],null);assert.ok((await store.command('aster',cmd)).replayed);assert.equal((await pool.query('select finished_at from ih2_housing_candidate.builds')).rows[0].finished_at,String(now));
  });
  await t.test('SQL guards protect address, rights and fixed build history; no public policies/grants exist',async()=>{
   const {r}=await confirm(),a=structuredClone(r.account);a.build!.readyAt++;await assert.rejects(pool.query('update ih2_housing_candidate.accounts set account=$2 where owner_id=$1',['aster',a]),/history/);
   const moved=structuredClone(r.account);moved.home!.plotId='5';await assert.rejects(pool.query('update ih2_housing_candidate.accounts set account=$2 where owner_id=$1',['aster',moved]),/address/);
   await assert.rejects(pool.query("update ih2_housing_candidate.builds set record=jsonb_set(record,'{readyAt}',to_jsonb((record->>'readyAt')::bigint+1))"),/rewritten/);
   const rows=(await pool.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ih2_housing_candidate' and c.relkind='r'")).rows;assert.equal(rows.length,4);assert.ok(rows.every(r=>r.relrowsecurity));assert.equal((await pool.query("select * from pg_policies where schemaname='ih2_housing_candidate'")).rowCount,0);
  });
  await t.test('fresh child process and pg_dump/restore keep raw paid state, quotes, receipts and seven old checksums exact',async()=>{
   const {cmd}=await confirm(),expected=await fingerprint(),hashes=await migrations();
   const child=spawnSync(process.execPath,['--experimental-strip-types','tools/prove-housing-process.ts'],{cwd:process.cwd(),env:{...process.env,IH2_HOUSING_TEST_DATABASE_URL:url},encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.deepEqual(await fingerprint(),expected);
   const container=process.env.IH2_PG_CONTAINER??'idle-hands-2-pg';if(!/^[a-zA-Z0-9_-]+$/.test(container))throw Error('Invalid fixture container');
   const inspect=JSON.parse(spawnSync('docker',['inspect',container],{encoding:'utf8'}).stdout)[0];assert.equal(inspect.NetworkSettings.Ports['5432/tcp'][0].HostPort,new URL(url).port);assert.equal(new URL(url).pathname,'/ih2_housing_test');
   const dump=spawnSync('docker',['exec',container,'pg_dump','-U','ih2','--no-owner','--no-acl','ih2_housing_test'],{encoding:'utf8'});assert.equal(dump.status,0,dump.stderr);assert.ok(dump.stdout.includes('CREATE TABLE ih2_housing_candidate.builds'));
   const restore=new URL(url);restore.pathname='/ih2_housing_restore';const p=new Pool({connectionString:restore.href});await p.query('drop schema if exists ih2_housing_candidate cascade;drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');const restored=spawnSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','ih2','-d','ih2_housing_restore'],{input:dump.stdout,encoding:'utf8'});assert.equal(restored.status,0,restored.stderr);
   const restoredStore=new HousingContractCandidate(p,{now:()=>now});assert.deepEqual(await restoredStore.snapshot('aster'),await store.snapshot('aster'));const replay=await restoredStore.command('aster',cmd);assert.ok(replay.ok&&replay.replayed);assert.deepEqual((await p.query('select version,checksum from ih2_meta.migrations order by version')).rows,hashes);await p.end();
   await mkdir('test-results/server',{recursive:true});await writeFile('test-results/server/housing-candidate.sql',dump.stdout);await writeFile('test-results/server/housing-candidate.json',JSON.stringify({classification:'Isolated housing candidate, synthetic preexisting48kits and home only; no active migration/HTTP/auth registration.',database:'ih2_housing_test',restoreDatabase:'ih2_housing_restore',freshProcessPreserved:true,dumpRestoreAndReceiptReplayPreserved:true,all7MigrationChecksumsExact:true,fingerprint:createHash('sha256').update(JSON.stringify(expected)).digest('hex')},null,2)+'\n');
  });
 }finally{await pool.end();}
});
