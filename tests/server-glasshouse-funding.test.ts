import assert from 'node:assert/strict';
import {test} from 'node:test';
import {database, migrate} from '../server/db.ts';
import {TownStore, type TownPosition} from '../server/live-store.ts';
import {GLASSHOUSE_RULES} from '../src/game/glasshouse.ts';
import {INKWOOD_GLASSHOUSE, TRAIL_LANDMARK_IDS, worlds} from '../src/game/world.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
if(target){
 const url=new URL(target);
 const ci=process.env.CI==='true'&&url.port==='5432'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
 const local=url.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
 assert.ok(url.pathname==='/ih2_test'&&(ci||local),'Use the disposable town database.');
}

test('Glasshouse funding commits one payer, rejects false presence, and replays the same receipt', {skip:!target,timeout:25000},async()=>{
 const pool=database(target);
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
