import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {migrate,localDatabaseUrl} from '../server/db.ts';
import {TownStore,type TownPosition} from '../server/store.ts';
import {worlds,canStand,routeTo} from '../src/game/world.ts';
import {loadWorkshop,createWorkshop,applyWorkshop,type WorkshopState} from '../src/game/workshop.ts';
import {carpentryActionLocations,type CarpentryAction} from '../src/game/carpentry.ts';
import {GARDEN_HOUR as H,GARDEN_DAY as D} from '../src/game/garden.ts';
const url=process.env.IH2_TEST_DATABASE_URL;
const at=(room:'square'|'garden'|'workshop',stop:string):TownPosition=>({room,position:{...worlds[room].stops.find(s=>s.id===stop)!.point}});
test('root carpentry receipts, exact kept ownership, cross-use conservation and trusted allocation preserve old jobs',()=>{
 let s=createWorkshop(0),serial=0,now=0;
 const act=(a:Record<string,unknown>,allocations={})=>{const raw={id:'root-'+(++serial),expectedRevision:s.revision,...a},r=applyWorkshop(s,raw,now,allocations);assert.equal(r.ok,true,r.message);s=r.state;return raw;};
 for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});act({kind:'craft',recipe:'planter'});now=5000;act({kind:'claim'});act({kind:'place',prop:'planter',slot:'north-west'});act({kind:'craft',recipe:'bridge-kit'});const old=structuredClone(s);
 const c=(action:CarpentryAction)=>act({kind:'carpentry',carpentryAction:action});
 c({action:'learn-saw'});c({action:'equip-saw',equipped:true});c({action:'gather-pine',station:'crooked'});act({kind:'garden',gardenAction:{action:'plant',bed:2,crop:'marigold'}});now+=4*H;act({kind:'garden',gardenAction:{action:'harvest',bed:2}});const raw=c({action:'start-easel'}),paid=structuredClone(s);assert.equal(applyWorkshop(s,raw,now).replayed,true);assert.deepEqual(s,paid);
 now+=12*H;c({action:'claim-easel'});c({action:'record-easel'});assert.equal(s.owned.easel,1);assert.equal(s.carpentry.recorded,1);for(const key of ['inventory','job','stats','skills','bridgeKits']as const)assert.deepEqual(s[key],old[key],key);
 const denied=applyWorkshop(s,{id:'double-allocated',expectedRevision:s.revision,kind:'place',prop:'easel',slot:'north-middle'},now,{easel:1});assert.equal(denied.ok,false);assert.equal(denied.state,s);
 act({kind:'place',prop:'easel',slot:'north-middle'});assert.equal(s.owned.easel,s.carpentry.produced);act({kind:'place',prop:'easel',slot:'south-middle',fromSlot:'north-middle'});assert.equal(s.placements['south-middle'],'easel');act({kind:'remove',slot:'south-middle'});assert.equal(s.owned.easel,1);
 for(const bad of [{...s,owned:{...s.owned,easel:0}},{...s,owned:{...s.owned,easel:2}},{...s,carpentry:{...s.carpentry,started:0}},{...s,garden:{...s.garden,consumed:{easels:{radish:0,marigold:0},hampers:{radish:0,marigold:0}}}}])assert.equal(loadWorkshop(bad,now).recovered,true);
 for(const allocations of [{easel:-1},{easel:2},{easel:.5},{easel:NaN},{unknown:1}])assert.equal(applyWorkshop(s,{id:'bad-allocation',expectedRevision:s.revision,kind:'place',prop:'easel',slot:'south-east'},now,allocations).ok,false);
});
test('actual old root defaults add carpentry and zero easel without resetting old inventory, garden history or production',()=>{
 const current=createWorkshop(100),legacy=JSON.parse(JSON.stringify(current));delete legacy.carpentry;delete legacy.owned.easel;legacy.garden.version=1;delete legacy.garden.consumed;
 const before=JSON.stringify(legacy),loaded=loadWorkshop(legacy,100);assert.equal(loaded.recovered,false);assert.deepEqual(loaded.state.carpentry,current.carpentry);assert.equal(loaded.state.owned.easel,0);assert.deepEqual(loaded.state.inventory,legacy.inventory);assert.deepEqual(loaded.state.job,legacy.job);assert.equal(JSON.stringify(legacy),before);
 const unknown=structuredClone(legacy);unknown.carpentry={version:9};assert.equal(loadWorkshop(unknown,100).recovered,true);
});
test('carpentry stations have legal reachable feet and retain original workshop threshold',()=>{
 for(const room of ['square','workshop']as const)for(const stop of worlds[room].stops.filter(s=>s.id.startsWith('pine-')||s.id==='carpentry-desk'||s.id==='finishing-rack')){assert.ok(canStand(room,stop.point),stop.id);assert.ok(routeTo(room,room==='square'?{x:24,y:25}:{x:9,y:11},stop.point).length,stop.id);}
 assert.deepEqual(worlds.workshop.stops.find(s=>s.id==='door')!.arrival,{x:19.5,y:22.3});
});
test('isolated PostgreSQL carpentry authority, separate rack and anonymous kept-craft project',{skip:!url},async t=>{
 const parsed=new URL(url!);assert.ok(['localhost','127.0.0.1'].includes(parsed.hostname));assert.equal(parsed.pathname,'/ih2_test');
 const pool=new Pool({connectionString:localDatabaseUrl(url),max:8});let now=0,serial=0,store:TownStore;
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);now=0;serial=0;store=new TownStore(pool,{now:()=>now});await store.ensurePlayer('aster','Aster');await store.ensurePlayer('bea','Bea');});
 async function command(id:string,action:Record<string,unknown>,position:TownPosition){const s=await store.snapshot(id);return store.execute(id,{id:'carpentry-'+(++serial),expectedRevision:s.workshop.revision,...action},position);}
 async function c(id:string,action:CarpentryAction){const location=carpentryActionLocations(action)[0];return command(id,{kind:'carpentry',carpentryAction:action},at(location.room,location.stopId));}
 async function grown(id:string){for(const[bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']]as const)assert.equal((await command(id,{kind:'garden',gardenAction:{action:'plant',bed,crop}},at('garden','garden-beds'))).ok,true);}
 async function harvest(id:string){for(let bed=0;bed<3;bed++)assert.equal((await command(id,{kind:'garden',gardenAction:{action:'harvest',bed}},at('garden','garden-beds'))).ok,true);}
 async function setup(id:string){for(const action of [{action:'learn-saw'},{action:'equip-saw',equipped:true},{action:'gather-pine',station:'crooked'}]as CarpentryAction[])assert.equal((await c(id,action)).ok,true);await grown(id);}
 async function finished(id:string){assert.equal((await c(id,{action:'start-easel'})).ok,true);}
 try{
  await t.test('location, forged-owner, private supply and strict service actions cannot act on another resident',async()=>{
   const before=await store.snapshot('bea');assert.equal((await command('aster',{kind:'carpentry',carpentryAction:{action:'learn-saw'}},at('square','scrap'))).ok,false);
   assert.equal((await command('aster',{kind:'carpentry',carpentryAction:{action:'learn-saw',ownerId:'bea'}},at('square','carpentry-desk'))).ok,false);await setup('aster');
   assert.equal((await c('aster',{action:'gather-pine',station:'forked'})).ok,false);assert.equal((await c('bea',{action:'gather-pine',station:'forked'})).ok,false);assert.deepEqual((await store.snapshot('bea')).workshop,before.workshop);
   assert.equal((await command('aster',{kind:'carpentry',carpentryAction:{action:'start-easel'}},at('workshop','bench'))).ok,false);
   assert.deepEqual(Object.keys((await store.snapshot('bea')).noticeboard).sort(),['credits','openedAt','phase','readyAt','startedAt']);
   const privilege=(await pool.query("select relrowsecurity,not exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where a.grantee=0) as private from pg_class where oid='ih2.noticeboard'::regclass")).rows[0];assert.equal(privilege.relrowsecurity,true);assert.equal(privilege.private,true);
  });
  await t.test('concurrent start/claim/replay debit once, independent old job persists and a restored process keeps outputs',async()=>{
   await setup('aster');now=4*H;await harvest('aster');const s=await store.snapshot('aster'),payload={id:'same-easel-start',expectedRevision:s.workshop.revision,kind:'carpentry',carpentryAction:{action:'start-easel'}};
   const starts=await Promise.all([store.execute('aster',payload,at('workshop','finishing-rack')),store.execute('aster',payload,at('workshop','finishing-rack'))]);assert.ok(starts.every(r=>r.ok));assert.equal(starts.filter(r=>r.replayed).length,1);assert.equal(starts[0].snapshot.workshop.garden.consumed.easels.marigold,1);assert.equal(starts[0].snapshot.workshop.carpentry.pine.spent,4);
   const conflicting=await store.execute('aster',{...payload,carpentryAction:{action:'deliver-hamper'}},at('square','carpentry-desk'));assert.equal(conflicting.ok,false);
   now=16*H;const ready=await store.snapshot('aster'),a={id:'claim-a',expectedRevision:ready.workshop.revision,kind:'carpentry',carpentryAction:{action:'claim-easel'}},b={...a,id:'claim-b'};const claims=await Promise.all([store.execute('aster',a,at('workshop','finishing-rack')),store.execute('aster',b,at('workshop','finishing-rack'))]);assert.equal(claims.filter(r=>r.ok).length,1);assert.equal((await store.snapshot('aster')).workshop.owned.easel,1);
   store=new TownStore(pool,{now:()=>now});assert.equal((await store.snapshot('aster')).workshop.carpentry.produced,1);assert.equal((await c('aster',{action:'record-easel'})).ok,true);const view=await store.snapshot('bea');assert.equal(view.noticeboard.credits,1);assert.equal((await store.snapshot('aster')).workshop.owned.easel,1);
  });
  await t.test('failed job save and failed civic save roll back both ingredients/credit and UUID; the exact payload retries once',async()=>{
   await setup('aster');now=4*H;await harvest('aster');let s=await store.snapshot('aster');const payload={id:'rollback-start',expectedRevision:s.workshop.revision,kind:'carpentry',carpentryAction:{action:'start-easel'}};
   const inject=()=>pool.query("create function ih2.reject_carpentry_save() returns trigger language plpgsql as $$ begin raise exception 'isolated carpentry failure'; end $$;create trigger reject_carpentry_save before update of workshop on ih2.players for each row execute function ih2.reject_carpentry_save()");
   await inject();await assert.rejects(()=>store.execute('aster',payload,at('workshop','finishing-rack')),/isolated carpentry/);assert.deepEqual((await store.snapshot('aster')).workshop,s.workshop);assert.equal((await pool.query("select count(*)::int n from ih2.command_receipts where command_id='rollback-start'")).rows[0].n,0);
   await pool.query('drop function ih2.reject_carpentry_save() cascade');assert.equal((await store.execute('aster',payload,at('workshop','finishing-rack'))).ok,true);assert.equal((await store.execute('aster',payload,at('workshop','finishing-rack'))).replayed,true);
   now=16*H;assert.equal((await c('aster',{action:'claim-easel'})).ok,true);s=await store.snapshot('aster');const record={id:'rollback-record',expectedRevision:s.workshop.revision,kind:'carpentry',carpentryAction:{action:'record-easel'}};await inject();await assert.rejects(()=>store.execute('aster',record,at('square','carpentry-desk')),/isolated carpentry/);assert.deepEqual((await store.snapshot('aster')).workshop,s.workshop);assert.equal((await store.snapshot('bea')).noticeboard.credits,0);
   await pool.query('drop function ih2.reject_carpentry_save() cascade');const retry=await store.execute('aster',record,at('square','carpentry-desk'));assert.equal(retry.ok,true);assert.equal(retry.publicChanged,true);assert.equal((await store.execute('aster',record,at('square','carpentry-desk'))).replayed,true);assert.equal((await store.snapshot('bea')).noticeboard.credits,1);
  });
  await t.test('simultaneous house/workshop placement cannot duplicate the sole kept easel; removal and moves preserve ownership',async()=>{
   await setup('aster');now=4*H;await harvest('aster');await finished('aster');now=16*H;await c('aster',{action:'claim-easel'});const before=await store.snapshot('aster');
   // Declared isolated owned-plot fixture, only to exercise cross-instance
   // allocation. Plot purchase pricing is tested by the ordinary town suite.
   const plot=(await pool.query('insert into ih2.plots(owner_id,placements) values($1,$2) returning id::text',['aster',before.workshop.placements])).rows[0];
   const workshop={id:'race-workshop',expectedRevision:before.workshop.revision,kind:'place',prop:'easel',slot:'south-middle'},house={id:'race-house',expectedRevision:before.workshop.revision,kind:'edit-plot',plotId:plot.id,action:'place',prop:'easel',slot:'north-middle'};
   const results=await Promise.all([store.execute('aster',workshop,at('workshop','finishing-rack')),store.execute('aster',house,at('square','plot'))]);assert.equal(results.filter(r=>r.ok).length,1);let saved=await store.snapshot('aster');const count=(values:Record<string,unknown>)=>Object.values(values).filter(v=>v==='easel').length;assert.equal(count(saved.workshop.placements)+count(saved.plot!.placements),1);assert.equal(saved.workshop.owned.easel,1);assert.equal(saved.workshop.carpentry.produced,1);
   if(count(saved.workshop.placements))assert.equal((await command('aster',{kind:'remove',slot:'south-middle'},at('workshop','finishing-rack'))).ok,true);else assert.equal((await command('aster',{kind:'edit-plot',plotId:plot.id,action:'remove',slot:'north-middle'},at('square','plot'))).ok,true);
   assert.equal((await command('aster',{kind:'edit-plot',plotId:plot.id,action:'place',prop:'easel',slot:'north-middle'},at('square','plot'))).ok,true);assert.equal((await command('aster',{kind:'place',prop:'easel',slot:'south-east'},at('workshop','finishing-rack'))).ok,false);assert.equal((await command('aster',{kind:'edit-plot',plotId:plot.id,action:'place',prop:'easel',slot:'north-east',fromSlot:'north-middle'},at('square','plot'))).ok,true);
   store=new TownStore(pool,{now:()=>now});saved=await store.snapshot('aster');assert.equal(saved.plot!.placements['north-east'],'easel');assert.equal(count(saved.workshop.placements),0);assert.equal(count(saved.plot!.placements),1);assert.equal(saved.workshop.owned.easel,1);assert.equal(saved.workshop.carpentry.produced,1);
  });
  await t.test('last simultaneous kept-craft records cap public credit, set one deadline and leave postfunding records truthful',async()=>{
   for(let n=0;n<7;n++){const id='helper-'+n;await store.ensurePlayer(id,id);await setup(id);}now=4*H;for(let n=0;n<7;n++){await harvest('helper-'+n);await finished('helper-'+n);}now=16*H;for(let n=0;n<7;n++)assert.equal((await c('helper-'+n,{action:'claim-easel'})).ok,true);
   for(let n=0;n<5;n++)assert.equal((await c('helper-'+n,{action:'record-easel'})).publicChanged,true);
   const last=await Promise.all([c('helper-5',{action:'record-easel'}),c('helper-6',{action:'record-easel'})]);assert.ok(last.every(r=>r.ok));assert.equal(last.filter(r=>r.publicChanged).length,1);assert.ok(last.find(r=>!r.publicChanged)!.message.includes('No additional public credit'));
   const board=(await store.snapshot('aster')).noticeboard;assert.deepEqual(board,{credits:6,phase:'installing',startedAt:16*H,readyAt:40*H,openedAt:null});for(let n=0;n<7;n++){const own=(await store.snapshot('helper-'+n)).workshop;assert.equal(own.owned.easel,1);assert.equal(own.carpentry.recorded,1);}
   now=40*H-1;assert.deepEqual((await store.snapshot('aster')).noticeboard,board);now=8*D;store=new TownStore(pool,{now:()=>now});assert.deepEqual((await store.snapshot('aster')).noticeboard,{...board,phase:'open',openedAt:40*H});assert.equal((await store.snapshot('helper-6')).workshop.owned.easel,1);
   await assert.rejects(()=>pool.query('update ih2.noticeboard set credits=7 where id=1'));await assert.rejects(()=>pool.query('update ih2.noticeboard set ready_at=ready_at+1 where id=1'));
  });
 }finally{await pool.end();}
});
