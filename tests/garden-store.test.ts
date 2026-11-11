import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {migrate} from '../server/db.ts';
import {TownStore,type TownPosition} from '../server/store.ts';
import {STAKE_IDS,STAKE_STUDIES,settleGarden,GARDEN_HOUR as H,GARDEN_DAY as D,type GardenAction} from '../src/game/garden.ts';
import {loadWorkshop,createWorkshop} from '../src/game/workshop.ts';
import {worlds} from '../src/game/world.ts';
const url=process.env.IH2_TEST_DATABASE_URL;
const at=(room:'square'|'garden'|'workshop',stop:string):TownPosition=>({room,position:{...worlds[room].stops.find(s=>s.id===stop)!.point}});
test('legacy workshop migration is deterministic and preserves old jobs, stock and receipts',()=>{
 const old=createWorkshop(100);delete (old as any).garden;old.inventory={scrap:4,timber:3,supplies:2};old.job={recipe:'bridge-kit',startedAt:100,readyAt:100+12*H};
 assert.equal(settleGarden(loadWorkshop(old,2*D).state.garden,2*D).rested.available,5);assert.equal(settleGarden(loadWorkshop(old,2*D+100).state.garden,2*D+100).rested.available,6);
 const a=loadWorkshop(old,3*D),b=loadWorkshop(old,3*D+100);assert.equal(a.recovered,false);assert.equal(b.recovered,false);assert.deepEqual(a.state.inventory,old.inventory);assert.deepEqual(a.state.job,old.job);assert.deepEqual(a.state.receipts,old.receipts);assert.equal(settleGarden(a.state.garden,3*D).rested.available,6);assert.equal(settleGarden(b.state.garden,3*D+100).rested.available,6);assert.equal(a.state.garden.firstRadishUsed,false);assert.equal(a.state.garden.planted,0);assert.equal(Object.hasOwn(old,'garden'),false);
});
test('isolated PostgreSQL garden authority, privacy and atomicity',{skip:!url},async t=>{
 const parsed=new URL(url!);assert.ok(['localhost','127.0.0.1'].includes(parsed.hostname));assert.equal(parsed.pathname,'/ih2_test');
 const pool=new Pool({connectionString:url,max:8});const start=Date.UTC(2026,10,10,18);let now=start,serial=0,store:TownStore;
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);now=start;serial=0;store=new TownStore(pool,{now:()=>now});await store.ensurePlayer('aster','Aster');await store.ensurePlayer('bea','Bea');});
 async function command(id:string,action:Record<string,unknown>,position:TownPosition){const before=await store.snapshot(id);return store.execute(id,{id:'garden-test-'+(++serial),expectedRevision:before.workshop.revision,...action},position);}
 async function garden(id:string,action:GardenAction,position=at('garden','garden-beds')){return command(id,{kind:'garden',gardenAction:action},position);}
 async function planted(id:string){for(const [bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']] as const)assert.equal((await garden(id,{action:'plant',bed,crop})).ok,true);}
 async function harvested(id:string){for(let bed=0;bed<3;bed++)assert.equal((await garden(id,{action:'harvest',bed})).ok,true);}
 try{
  await t.test('strict location/owner boundary, legal world anchors and private garden presence context',async()=>{
   for(const room of ['square','garden'] as const)for(const stop of worlds[room].stops.filter(s=>s.id.startsWith('garden-')||s.id.startsWith('stake-')||s.id==='allotment'))assert.ok(worlds[room].width>stop.point.x&&worlds[room].height>stop.point.y);
   const before=(await store.snapshot('aster')).workshop;
   assert.equal((await garden('aster',{action:'plant',bed:0,crop:'radish'},at('square','scrap'))).ok,false);
   assert.equal((await command('aster',{kind:'garden',gardenAction:{action:'plant',bed:0,crop:'radish',ownerId:'bea'}},at('garden','garden-beds'))).ok,false);
   assert.equal((await garden('aster',{action:'make-marker',marker:'sunburst'})).ok,false);
   assert.equal((await garden('aster',{action:'accept-errand'},at('garden','garden-desk'))).ok,true);
   assert.equal((await garden('aster',{action:'inspect-stake',station:'striped',choice:'paint-mark'},at('square','stake-forked'))).ok,false);
   const after=(await store.snapshot('aster')).workshop;assert.deepEqual(after.inventory,before.inventory);assert.deepEqual(after.owned,before.owned);assert.deepEqual(after.garden.produce,before.garden.produce);assert.deepEqual((await store.snapshot('bea')).workshop.garden.produce,{radish:0,marigold:0});
  });
  await t.test('ordinary twelve-hour job and earned stock remain exact through garden progress, replay and an eight-day return',async()=>{
   for(const resource of ['scrap','timber','supplies'])assert.equal((await command('aster',{kind:'gather',resource},at('square',resource))).ok,true);
   assert.equal((await command('aster',{kind:'craft',recipe:'planter'},at('workshop','bench'))).ok,true);now+=5000;assert.equal((await command('aster',{kind:'claim'},at('workshop','bench'))).ok,true);
   assert.equal((await command('aster',{kind:'place',prop:'planter',slot:'north-west'},{room:'workshop',position:{x:9,y:11}})).ok,true);
   assert.equal((await command('aster',{kind:'craft',recipe:'bridge-kit'},at('workshop','bench'))).ok,true);
   const base=(await store.snapshot('aster')).workshop;await planted('aster');now+=4*H;
   const s=await store.snapshot('aster'),payload={id:'once-only-harvest',expectedRevision:s.workshop.revision,kind:'garden',gardenAction:{action:'harvest',bed:0}};
   const results=await Promise.all([store.execute('aster',payload,at('garden','garden-beds')),store.execute('aster',payload,at('garden','garden-beds'))]);assert.equal(results.filter(r=>r.replayed).length,1);assert.ok(results.every(r=>r.ok));
   const first=await store.snapshot('aster');assert.equal(first.workshop.garden.produce.radish,1);assert.equal(first.workshop.garden.practice,2);
   const conflicting=await store.execute('aster',{...payload,gardenAction:{action:'harvest',bed:1}},at('garden','garden-beds'));assert.equal(conflicting.ok,false);
   now+=8*D;store=new TownStore(pool,{now:()=>now});const returned=await store.snapshot('aster');
   for(const key of ['inventory','owned','placements','job','skills','stats','bridgeKits'] as const)assert.deepEqual(returned.workshop[key],base[key],key);
   assert.deepEqual(returned.workshop.garden.produce,{radish:1,marigold:0});assert.equal(returned.workshop.garden.firstRadishUsed,true);assert.equal(settleGarden(returned.workshop.garden,now).rested.available,6);assert.notEqual(returned.seasonKey,first.seasonKey);
  });
  await t.test('only explicit owned display choices appear in another resident snapshot with exact owner IDs',async()=>{
   assert.equal((await garden('aster',{action:'make-marker',marker:'sunburst'},at('square','garden-field'))).ok,true);
   assert.deepEqual((await store.snapshot('bea')).gardenTown.markers,[]);
   const selected=await garden('aster',{action:'display-marker',marker:'sunburst'},at('square','garden-registry'));assert.equal(selected.publicChanged,true);
   assert.equal((await garden('bea',{action:'make-marker',marker:'leaf-fan'},at('square','garden-field'))).ok,true);assert.equal((await garden('bea',{action:'display-marker',marker:'leaf-fan'},at('garden','garden-desk'))).ok,true);
   const view=(await store.snapshot('bea')).gardenTown.markers;assert.deepEqual(view,[{ownerId:'aster',ownerName:'Aster',marker:'sunburst'},{ownerId:'bea',ownerName:'Bea',marker:'leaf-fan'}]);for(const row of view)assert.deepEqual(Object.keys(row).sort(),['marker','ownerId','ownerName']);
   const removed=await garden('aster',{action:'display-marker',marker:null},at('garden','garden-desk'));assert.equal(removed.publicChanged,true);assert.deepEqual((await store.snapshot('aster')).gardenTown.markers,[{ownerId:'bea',ownerName:'Bea',marker:'leaf-fan'}]);
   const privilege=(await pool.query("select relrowsecurity,not exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where a.grantee=0) as private from pg_class where oid='ih2.garden_welcome'::regclass")).rows[0];assert.equal(privilege.relrowsecurity,true);assert.equal(privilege.private,true);
  });
  await t.test('concurrent first quest awards and UUID replay produce one fourth marker without stock or XP charges',async()=>{
   await garden('aster',{action:'accept-errand'},at('garden','garden-desk'));
   for(const station of STAKE_IDS)assert.equal((await garden('aster',{action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer},at('square','stake-'+station))).ok,true);
   const before=await store.snapshot('aster');const a={id:'assembly-a',expectedRevision:before.workshop.revision,kind:'garden',gardenAction:{action:'assemble-marker'}},b={...a,id:'assembly-b'};
   const results=await Promise.all([store.execute('aster',a,at('garden','garden-desk')),store.execute('aster',b,at('garden','garden-desk'))]);assert.equal(results.filter(r=>r.ok).length,1);const chosen=results[0].ok?a:b;
   const replay=await store.execute('aster',chosen,at('garden','garden-desk'));assert.equal(replay.replayed,true);assert.equal(replay.ok,true);assert.deepEqual(replay.snapshot.workshop.garden.markers,['almost-straight']);assert.equal(replay.snapshot.workshop.garden.selectedMarker,null);assert.equal(replay.snapshot.workshop.garden.practice,0);assert.deepEqual(replay.snapshot.workshop.inventory,before.workshop.inventory);assert.deepEqual((await store.snapshot('bea')).gardenTown.markers,[]);
  });
  await t.test('last two simultaneous mixed requests cap welcome credit at six and preserve both personal records',async()=>{
   for(let n=0;n<7;n++){const id='helper-'+n;await store.ensurePlayer(id,'Helper '+n);await planted(id);}now+=4*H;for(let n=0;n<7;n++)await harvested('helper-'+n);
   for(let n=0;n<5;n++){const r=await garden('helper-'+n,{action:'submit-request'},at('garden','garden-desk'));assert.equal(r.ok,true);assert.equal(r.publicChanged,true);}
   const last=await Promise.all([garden('helper-5',{action:'submit-request'},at('garden','garden-desk')),garden('helper-6',{action:'submit-request'},at('garden','garden-desk'))]);assert.ok(last.every(r=>r.ok));assert.equal(last.filter(r=>r.publicChanged).length,1);
   assert.equal((await store.snapshot('aster')).gardenTown.credits,6);for(const id of ['helper-5','helper-6']){const s=await store.snapshot(id);assert.equal(s.workshop.garden.requests,1);assert.deepEqual(s.workshop.garden.produce,{radish:1,marigold:0});assert.equal((await garden(id,{action:'submit-request'},at('garden','garden-desk'))).ok,false);}
   await assert.rejects(()=>pool.query('update ih2.garden_welcome set credits=7 where id=1'));
  });
  await t.test('injected save failure rolls back produce debit, shared credit and UUID receipt; same request then retries once',async()=>{
   await planted('aster');now+=4*H;await harvested('aster');const before=await store.snapshot('aster');const raw={id:'rollback-request',expectedRevision:before.workshop.revision,kind:'garden',gardenAction:{action:'submit-request'}};
   await pool.query("create function ih2.reject_garden_save() returns trigger language plpgsql as $$ begin raise exception 'isolated garden save failure'; end $$;create trigger reject_garden_save before update of workshop on ih2.players for each row execute function ih2.reject_garden_save()");
   await assert.rejects(()=>store.execute('aster',raw,at('garden','garden-desk')),/isolated garden/);const failed=await store.snapshot('aster');assert.deepEqual(failed.workshop.garden.produce,before.workshop.garden.produce);assert.equal(failed.workshop.revision,before.workshop.revision);assert.equal(failed.gardenTown.credits,0);assert.equal((await pool.query("select count(*)::int as n from ih2.command_receipts where command_id='rollback-request'")).rows[0].n,0);
   await pool.query('drop function ih2.reject_garden_save() cascade');const retry=await store.execute('aster',raw,at('garden','garden-desk'));assert.equal(retry.ok,true);assert.equal(retry.snapshot.gardenTown.credits,1);assert.equal(retry.snapshot.workshop.garden.requests,1);assert.equal((await store.execute('aster',raw,at('garden','garden-desk'))).replayed,true);
  });
 }finally{await pool.end();}
});
