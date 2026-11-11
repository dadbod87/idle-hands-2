import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {migrate} from '../server/db.ts';
import { Pool } from 'pg';
import { TownStore, seasonKey, type TownPosition, type TownSnapshot } from '../server/store.ts';
import { createWorkshop, type WorkshopState } from '../src/game/workshop.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS } from '../src/game/town-rules.ts';

const databaseUrl = process.env.IH2_TEST_DATABASE_URL;
const start = Date.UTC(2026, 10, 10, 18);
const square = (x: number, y: number): TownPosition => ({ room: 'square', position: { x, y } });
const bench: TownPosition = { room: 'workshop', position: { x: 5, y: 5 } };
const inside: TownPosition = { room: 'workshop', position: { x: 9, y: 11 } };
let serial = 0;

test('season keys follow Friday 4pm Pacific across DST without mutating persistent data', () => {
  assert.equal(seasonKey(Date.UTC(2026, 10, 6, 23, 59)), '2026-10-30');
  assert.equal(seasonKey(Date.UTC(2026, 10, 7, 0)), '2026-11-06');
  assert.equal(seasonKey(Date.UTC(2026, 6, 3, 22, 59)), '2026-06-26');
  assert.equal(seasonKey(Date.UTC(2026, 6, 3, 23)), '2026-07-03');
});

test('PostgreSQL authoritative town store (dedicated local synthetic database)', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl!);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Tests refuse a remote database.');
  assert.ok(/_test$/.test(url.pathname.slice(1)), 'Tests require a disposable database name ending _test.');
  const pool = new Pool({ connectionString: databaseUrl, max: 8 });
  let now = start;
  const store = new TownStore(pool, { now: () => now });
  const migration = await readFile(new URL('../supabase/migrations/20261110150647_durable_town.sql', import.meta.url), 'utf8');
  try {
    await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade'); await migrate(pool);
    async function reset() {
      now = start;
      await pool.query('truncate ih2.project_events,ih2.trail_stamps,ih2.command_receipts,ih2.bridge_contributions,ih2.quest_awards,ih2.season_scores,ih2.plots,ih2.players,ih2.bridge restart identity cascade');
      await pool.query('insert into ih2.bridge(id) values(1)');
    }
    async function actor(id = 'aster') { return store.ensurePlayer(id, id[0].toUpperCase() + id.slice(1)); }
    async function command(id: string, action: Record<string, unknown>, position = inside) {
      const snapshot = await store.snapshot(id);
      return store.execute(id, { id: `command-${++serial}`, expectedRevision: snapshot.workshop.revision, ...action }, position);
    }
    async function fixtureKits(id: string, kits: number) {
      await actor(id); const s = createWorkshop(now); s.bridgeKits = kits;
      await pool.query('update ih2.players set workshop=$2 where id=$1', [id, s]);
    }
    await t.test('fresh identities are independent and client progress cannot be imported', async () => {
      await reset(); const a = await actor(), b = await actor('bea');
      assert.equal(a.playerId, 'aster'); assert.equal(b.playerId, 'bea'); assert.deepEqual(a.workshop.inventory, { scrap: 0, timber: 0, supplies: 0 });
      const harvest = await command('aster', { kind: 'gather', resource: 'scrap' }, square(21, 30)); assert.ok(harvest.ok); assert.equal(harvest.snapshot.workshop.inventory.scrap, 6);
      assert.equal((await store.snapshot('bea')).workshop.inventory.scrap, 0);
      const forged = await command('bea', { kind: 'gather', resource: 'scrap', now: now + 1e10, inventory: { scrap: 100 } }, square(21, 30)); assert.equal(forged.ok, false);
      assert.equal((await store.snapshot('bea')).workshop.revision, 0);
    });
    await t.test('proximity and legal feet positions are checked before gathering/crafting/decorating', async () => {
      await reset(); await actor();
      const wrong = await command('aster', { kind: 'gather', resource: 'scrap' }, square(24, 25)); assert.equal(wrong.ok, false);
      const wall = await command('aster', { kind: 'gather', resource: 'scrap' }, square(20, 18)); assert.equal(wall.ok, false);
      const outside = await command('aster', { kind: 'place', prop: 'rug', slot: 'north-west' }, square(24, 25)); assert.equal(outside.ok, false);
      const farBench = await command('aster', { kind: 'craft', recipe: 'planter' }, inside); assert.equal(farBench.ok, false);
      assert.equal((await store.snapshot('aster')).workshop.revision, 0);
    });
    await t.test('duplicate IDs, mismatched payloads, concurrent commands and stale state are atomic', async () => {
      await reset(); await actor();
      const cmd = { id: 'harvest-once', expectedRevision: 0, kind: 'gather', resource: 'scrap' };
      const [a, b] = await Promise.all([store.execute('aster', cmd, square(21, 30)), store.execute('aster', cmd, square(21, 30))]);
      assert.ok(a.ok && b.ok); assert.equal([a, b].filter(r => r.replayed).length, 1); assert.equal(a.message, b.message); assert.equal(a.revision, b.revision);
      assert.equal((await store.snapshot('aster')).workshop.inventory.scrap, 6);
      const mismatch = await store.execute('aster', { ...cmd, resource: 'timber' }, square(23, 30)); assert.equal(mismatch.ok, false); assert.equal(mismatch.replayed, false);
      const stale = await store.execute('aster', { ...cmd, id: 'stale', resource: 'timber' }, square(23, 30)); assert.equal(stale.ok, false);
      const [one, two] = await Promise.all([
        store.execute('aster', { id: 'same-revision-a', expectedRevision: 1, kind: 'gather', resource: 'timber' }, square(23, 30)),
        store.execute('aster', { id: 'same-revision-b', expectedRevision: 1, kind: 'gather', resource: 'supplies' }, square(25, 30))
      ]); assert.equal([one, two].filter(r => r.ok).length, 1);
      assert.equal((await store.snapshot('aster')).workshop.revision, 2);
    });
    await t.test('production, tutorial awards and elapsed settlement survive store restart without duplicate output', async () => {
      await reset(); await actor();
      for (const [resource, x] of [['scrap', 21], ['timber', 23], ['supplies', 25]] as const) assert.ok((await command('aster', { kind: 'gather', resource }, square(x, 30))).ok);
      assert.ok((await command('aster', { kind: 'craft', recipe: 'planter' }, bench)).ok);
      assert.equal((await command('aster', { kind: 'claim' }, bench)).ok, false);
      now += 5000; assert.ok((await command('aster', { kind: 'claim' }, bench)).ok);
      assert.ok((await command('aster', { kind: 'place', prop: 'planter', slot: 'north-west' })).ok);
      assert.ok((await command('aster', { kind: 'craft', recipe: 'bridge-kit' }, bench)).ok);
      assert.deepEqual((await store.snapshot('aster')).quest.awarded, ['orientation-v1']);
      now += 30 * 86400_000;
      const restarted = new TownStore(pool, { now: () => now }); const before = await restarted.snapshot('aster');
      assert.ok(before.workshop.job); assert.equal(before.workshop.bridgeKits, 0); assert.equal(before.workshop.nodes.scrap.stock, 6);
      const collect = { id: 'after-restart', expectedRevision: before.workshop.revision, kind: 'claim' };
      const done = await restarted.execute('aster', collect, bench); assert.ok(done.ok); assert.equal(done.snapshot.workshop.bridgeKits, 1);
      const replay = await restarted.execute('aster', collect, square(24, 25)); assert.ok(replay.replayed); assert.equal(replay.snapshot.workshop.bridgeKits, 1);
      assert.equal((await pool.query("select count(*)::int as count from ih2.quest_awards where player_id='aster' and quest_id='orientation-v1'")).rows[0].count, 1);
    });
    await t.test('concurrent last bridge contributions charge exactly one player and award once', async () => {
      await reset(); await fixtureKits('aster', 2); await fixtureKits('bea', 2);
      await pool.query('update ih2.bridge set contributed=2 where id=1');
      const cmds = ['aster', 'bea'].map(id => ({ id: `${id}-finish`, expectedRevision: 0, kind: 'contribute' }));
      const results = await Promise.all(['aster', 'bea'].map((id, i) => store.execute(id, cmds[i], square(24, 13))));
      assert.equal(results.filter(r => r.ok).length, 1);
      const finalA = await store.snapshot('aster'), finalB = await store.snapshot('bea');
      assert.equal(finalA.bridge.restored,false);assert.equal(finalA.bridge.phase,'building');assert.equal(finalA.bridge.readyAt! - finalA.bridge.startedAt!,6*3600_000); assert.equal(finalA.bridge.contributed, 3); assert.equal(finalA.workshop.bridgeKits + finalB.workshop.bridgeKits, 3);
      assert.equal((await pool.query('select count(*)::int as count from ih2.bridge_contributions')).rows[0].count, 1);
      assert.equal((await pool.query('select count(*)::int as count from ih2.quest_awards')).rows[0].count, 1);
      const winnerIndex = results.findIndex(r => r.ok), winner = ['aster', 'bea'][winnerIndex];
      const replay = await store.execute(winner, cmds[winnerIndex], square(24, 13)); assert.ok(replay.replayed);
      const rejected = await command(winner, { kind: 'contribute' }, square(24, 13)); assert.equal(rejected.ok, false); assert.equal(rejected.snapshot.workshop.bridgeKits, 1);
      assert.equal(rejected.snapshot.scores.reduce((n, s) => n + s.points, 0), 1);
    });
    await t.test('insufficient contribution/plot costs never charge and failure retry stays the original result', async () => {
      await reset(); await actor();
      const cmd = { id: 'no-kit', expectedRevision: 0, kind: 'contribute' };
      const failed = await store.execute('aster', cmd, square(24, 13)); assert.equal(failed.ok, false);
      const noPlot = await command('aster', { kind: 'claim-plot' }, square(30, 29)); assert.equal(noPlot.ok, false); assert.equal(noPlot.snapshot.workshop.bridgeKits, 0); assert.equal(noPlot.snapshot.plot, null);
      await fixtureKits('aster', 2);
      const retry = await store.execute('aster', cmd, square(24, 13)); assert.equal(retry.ok, false); assert.ok(retry.replayed); assert.equal(retry.message, failed.message); assert.equal(retry.snapshot.workshop.bridgeKits, 2);
      assert.ok((await command('aster', { kind: 'contribute' }, square(24, 13))).ok);
    });
    await t.test('concurrent and newcomer plot claims allocate expandable private ownership with no duplicate charge', async () => {
      await reset(); await fixtureKits('aster', PLOT_CLAIM_KITS + PLOT_UPGRADE_KITS); await fixtureKits('bea', PLOT_CLAIM_KITS);
      const cmd = { id: 'claim-once', expectedRevision: 0, kind: 'claim-plot' };
      const [a, duplicate, b] = await Promise.all([store.execute('aster', cmd, square(30, 29)), store.execute('aster', cmd, square(30, 29)), store.execute('bea', { ...cmd, id: 'bea-claim' }, square(30, 29))]);
      assert.ok(a.ok && duplicate.ok && b.ok); assert.equal([a, duplicate].filter(r => r.replayed).length, 1);
      const owned = (await store.snapshot('aster')).plot!; assert.ok(owned); assert.equal((await store.snapshot('aster')).workshop.bridgeKits, PLOT_UPGRADE_KITS);
      assert.notEqual(owned.id, b.snapshot.plot!.id);
      await fixtureKits('casey', PLOT_CLAIM_KITS); const newcomer = await command('casey', { kind: 'claim-plot' }, square(30, 29)); assert.ok(newcomer.ok); assert.equal(newcomer.snapshot.plots.length, 3);
      const again = await command('aster', { kind: 'claim-plot' }, square(30, 29)); assert.equal(again.ok, false); assert.equal(again.snapshot.workshop.bridgeKits, PLOT_UPGRADE_KITS);
      const insufficientUpgrade = await command('bea', { kind: 'upgrade-plot', plotId: b.snapshot.plot!.id }, square(30, 29)); assert.equal(insufficientUpgrade.ok, false); assert.equal(insufficientUpgrade.snapshot.workshop.bridgeKits, 0);
      const visitor = await command('bea', { kind: 'upgrade-plot', plotId: owned.id }, square(30, 29)); assert.equal(visitor.ok, false);
      const edit = await command('bea', { kind: 'edit-plot', plotId: owned.id, action: 'place', prop: 'rug', slot: 'north-west' }, square(30, 29)); assert.equal(edit.ok, false);
      const upgrade = await command('aster', { kind: 'upgrade-plot', plotId: owned.id }, square(30, 29)); assert.ok(upgrade.ok); assert.equal(upgrade.snapshot.plot!.level, 2); assert.equal(upgrade.snapshot.workshop.bridgeKits, 0);
    });
    await t.test('plot/workshop placements share owned copies and upgrading preserves creative work', async () => {
      await reset(); await fixtureKits('aster', PLOT_CLAIM_KITS + PLOT_UPGRADE_KITS); const claimed = await command('aster', { kind: 'claim-plot' }, square(30, 29)); const plotId = claimed.snapshot.plot!.id;
      const place = await command('aster', { kind: 'edit-plot', plotId, action: 'place', prop: 'rug', slot: 'north-west' }, square(30, 29)); assert.ok(place.ok);
      const duplicate = await command('aster', { kind: 'place', prop: 'rug', slot: 'south-west' }); assert.equal(duplicate.ok, false);
      const other = await command('aster', { kind: 'place', prop: 'crate', slot: 'south-west' }); assert.ok(other.ok);
      const copy = await command('aster', { kind: 'edit-plot', plotId, action: 'place', prop: 'crate', slot: 'south-west' }, square(30, 29)); assert.equal(copy.ok, false);
      const upgrade = await command('aster', { kind: 'upgrade-plot', plotId }, square(30, 29)); assert.ok(upgrade.ok); assert.equal(upgrade.snapshot.plot!.placements['north-west'], 'rug'); assert.equal(upgrade.snapshot.workshop.placements['south-west'], 'crate');
      assert.equal(upgrade.snapshot.quest.awarded.length, 0, 'Plot decoration must not bypass orientation.');
      const removed = await command('aster', { kind: 'edit-plot', plotId, action: 'remove', slot: 'north-west' }, square(30, 29)); assert.ok(removed.ok);
      assert.ok((await command('aster', { kind: 'place', prop: 'rug', slot: 'south-middle' })).ok);
    });
    await t.test('season rollover and quest content migration preserve inventory, jobs, plots, bridge and stable rewards', async () => {
      await reset(); await fixtureKits('aster', PLOT_CLAIM_KITS + 4);
      await command('aster', { kind: 'contribute' }, square(24, 13)); const claimed = await command('aster', { kind: 'claim-plot' }, square(30, 29));
      await command('aster', { kind: 'edit-plot', plotId: claimed.snapshot.plot!.id, action: 'place', prop: 'rug', slot: 'north-west' }, square(30, 29));
      await pool.query("update ih2.players set quest_content_version=0 where id='aster'");
      const before = await store.snapshot('aster'); now += 7 * 86400_000;
      const after = await store.snapshot('aster'); assert.notEqual(after.seasonKey, before.seasonKey); assert.equal(after.scores.length, 0);
      assert.equal(after.workshop.bridgeKits, before.workshop.bridgeKits); assert.deepEqual(after.plot, before.plot); assert.deepEqual(after.bridge, before.bridge); assert.deepEqual(after.quest.awarded, before.quest.awarded);
      const migrated = await command('aster', { kind: 'gather', resource: 'scrap' }, square(21, 30)); assert.ok(migrated.ok);
      assert.equal((await pool.query("select quest_content_version from ih2.players where id='aster'")).rows[0].quest_content_version, 1);
      assert.deepEqual(migrated.snapshot.quest.awarded, before.quest.awarded);
      assert.equal((await pool.query("select count(*)::int as count from ih2.quest_awards where player_id='aster'")).rows[0].count, 1);
      assert.equal((await pool.query('select sum(points)::int as points from ih2.season_scores')).rows[0].points, 1);
    });
    await t.test('corrupt durable state fails closed instead of silently resetting a player', async () => {
      await reset(); await actor(); await pool.query("update ih2.players set workshop=jsonb_set(workshop,'{inventory,scrap}','-1') where id='aster'");
      await assert.rejects(() => store.snapshot('aster'), /failed validation/);
      const unchanged = (await pool.query("select workshop from ih2.players where id='aster'")).rows[0].workshop; assert.equal(unchanged.inventory.scrap, -1);
    });
    await t.test('a database error after resource updates rolls back every charge, award and shared change', async () => {
      await reset(); await fixtureKits('aster', 2);
      await pool.query(`create function ih2.test_receipt_failure() returns trigger language plpgsql as $$ begin if new.command_id='rollback-at-receipt' then raise exception 'injected local fixture failure'; end if; return new; end $$`);
      await pool.query('create trigger test_receipt_failure before insert on ih2.command_receipts for each row execute function ih2.test_receipt_failure()');
      const cmd = { id: 'rollback-at-receipt', expectedRevision: 0, kind: 'contribute' };
      try {
        await assert.rejects(() => store.execute('aster', cmd, square(24, 13)), /injected local fixture failure/);
        const after = await store.snapshot('aster'); assert.equal(after.workshop.bridgeKits, 2); assert.equal(after.workshop.revision, 0); assert.equal(after.bridge.contributed, 0); assert.equal(after.quest.awarded.length, 0); assert.equal(after.scores.length, 0);
        assert.equal((await pool.query('select count(*)::int as count from ih2.bridge_contributions')).rows[0].count, 0);
      } finally { await pool.query('drop trigger test_receipt_failure on ih2.command_receipts'); await pool.query('drop function ih2.test_receipt_failure()'); }
      const retry = await store.execute('aster', cmd, square(24, 13)); assert.ok(retry.ok); assert.equal(retry.snapshot.workshop.bridgeKits, 1); assert.equal(retry.snapshot.bridge.contributed, 1);
    });
    async function planter(id:string){await actor(id);for(const[resource,x]of [['scrap',21],['timber',23],['supplies',25]] as const)assert.ok((await command(id,{kind:'gather',resource},square(x,30))).ok);assert.ok((await command(id,{kind:'craft',recipe:'planter'},bench)).ok);now+=5000;assert.ok((await command(id,{kind:'claim'},bench)).ok);assert.ok((await command(id,{kind:'place',prop:'planter',slot:'north-west'})).ok);}
    await t.test('maintenance debits once independently from the unchanged ordinary twelve-hour job',async()=>{
      await reset();await planter('aster');const before=await store.snapshot('aster'),quote=before.lessonQuote;
      const wrongRoute=await command('aster',{kind:'start-lesson',route:'upkeep',expectedBridgeContributed:quote.expectedBridgeContributed},bench);assert.equal(wrongRoute.ok,false);assert.equal(wrongRoute.snapshot.lesson.startedAt,null);assert.deepEqual(wrongRoute.snapshot.workshop.inventory,before.workshop.inventory);
      const dto={kind:'start-lesson',...quote,id:'lesson-start',expectedRevision:before.workshop.revision};const begun=await store.execute('aster',dto,bench);assert.ok(begun.ok,begun.message);assert.deepEqual(begun.snapshot.workshop.inventory,{scrap:3,timber:3,supplies:4});assert.equal(begun.snapshot.workshop.bridgeKits,0);
      const replay=await store.execute('aster',dto,bench);assert.ok(replay.replayed);assert.deepEqual(replay.snapshot.workshop.inventory,begun.snapshot.workshop.inventory);
      assert.ok((await command('aster',{kind:'craft',recipe:'bridge-kit'},bench)).ok);const job=(await store.snapshot('aster')).workshop.job!;assert.equal(job.readyAt-job.startedAt,12*3600_000);
      now+=59_999;assert.equal((await command('aster',{kind:'complete-lesson'},bench)).ok,false);now++;const completed=await command('aster',{kind:'complete-lesson'},bench);assert.ok(completed.ok);assert.ok(completed.snapshot.lesson.completed);assert.deepEqual(completed.snapshot.workshop.job,job);assert.equal(completed.snapshot.workshop.bridgeKits,0);
      const credit=completed.snapshot;const redeemed=await command('aster',{kind:'redeem-lesson',...credit.lessonQuote},square(24,13));assert.ok(redeemed.ok,redeemed.message);assert.equal(redeemed.snapshot.bridge.contributed,1);assert.equal(redeemed.snapshot.lesson.route,'construction');assert.equal(redeemed.snapshot.workshop.bridgeKits,0);assert.deepEqual(redeemed.snapshot.workshop.inventory,{scrap:0,timber:1,supplies:3});assert.equal(redeemed.snapshot.scores.length,0);
      const again=await command('aster',{kind:'redeem-lesson',...redeemed.snapshot.lessonQuote},square(24,13));assert.equal(again.ok,false);assert.equal((await pool.query('select count(*)::int as n from ih2.maintenance_events')).rows[0].n,1);
      const restarted=new TownStore(pool,{now:()=>now});assert.deepEqual((await restarted.snapshot('aster')).lesson,redeemed.snapshot.lesson);
    });
    await t.test('ordinary participation after migration satisfies only unpaid lessons and preserves paid in-flight credit',async()=>{
      await reset();await planter('aster');let s=await store.snapshot('aster');s.workshop.bridgeKits=1;await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',s.workshop]);
      const donated=await command('aster',{kind:'contribute'},square(24,13));assert.ok(donated.ok);assert.equal(donated.snapshot.lesson.legacySatisfied,true);const inventory=structuredClone(donated.snapshot.workshop.inventory);
      const noCharge=await command('aster',{kind:'start-lesson',...donated.snapshot.lessonQuote},bench);assert.equal(noCharge.ok,false);assert.equal(noCharge.snapshot.lesson.startedAt,null);assert.deepEqual(noCharge.snapshot.workshop.inventory,inventory);
      await planter('bea');s=await store.snapshot('bea');assert.ok((await command('bea',{kind:'start-lesson',...s.lessonQuote},bench)).ok);const paid=await store.snapshot('bea');paid.workshop.bridgeKits=1;await pool.query('update ih2.players set workshop=$2 where id=$1',['bea',paid.workshop]);
      const afterDonation=await command('bea',{kind:'contribute'},square(24,13));assert.ok(afterDonation.ok);assert.equal(afterDonation.snapshot.lesson.legacySatisfied,false);assert.equal(afterDonation.snapshot.lesson.startedAt,paid.lesson.startedAt);assert.equal(afterDonation.snapshot.lesson.readyAt,paid.lesson.readyAt);assert.deepEqual(afterDonation.snapshot.workshop.inventory,paid.workshop.inventory);
      now+=60_000;const ready=await command('bea',{kind:'complete-lesson'},bench);assert.ok(ready.ok);const redeemed=await command('bea',{kind:'redeem-lesson',...ready.snapshot.lessonQuote},square(24,13));assert.ok(redeemed.ok);assert.equal(redeemed.snapshot.lesson.redeemed,true);assert.deepEqual(redeemed.snapshot.workshop.inventory,paid.workshop.inventory);assert.equal(redeemed.snapshot.workshop.bridgeKits,0);
    });
    await t.test('changed project quotes preserve paid credit and upkeep never changes restored totals',async()=>{
      await reset();await planter('aster');let s=await store.snapshot('aster');assert.ok((await command('aster',{kind:'start-lesson',...s.lessonQuote},bench)).ok);now+=60_000;assert.ok((await command('aster',{kind:'complete-lesson'},bench)).ok);s=await store.snapshot('aster');const inventory=structuredClone(s.workshop.inventory);
      await pool.query('update ih2.bridge set contributed=3,phase=\'open\',grandfathered=true where id=1');const stale=await command('aster',{kind:'redeem-lesson',...s.lessonQuote},square(24,13));assert.equal(stale.ok,false);assert.ok(stale.snapshot.lesson.completed&&!stale.snapshot.lesson.redeemed);assert.deepEqual(stale.snapshot.workshop.inventory,inventory);
      const upkeep=await command('aster',{kind:'redeem-lesson',...stale.snapshot.lessonQuote},square(24,13));assert.ok(upkeep.ok);assert.equal(upkeep.snapshot.lesson.route,'upkeep');assert.equal(upkeep.snapshot.bridge.contributed,3);assert.equal(upkeep.snapshot.workshop.bridgeKits,0);assert.deepEqual(upkeep.snapshot.workshop.inventory,inventory);
      assert.equal((await command('aster',{kind:'start-lesson',...upkeep.snapshot.lessonQuote},bench)).ok,false);assert.equal((await pool.query("select count(*)::int as n from ih2.quest_awards where quest_id='maintenance-v1'")).rows[0].n,1);
    });
    await t.test('concurrent final maintenance redemption preserves the losing paid credit for explicit upkeep re-quote',async()=>{
      await reset();await pool.query('update ih2.bridge set contributed=2 where id=1');
      for(const id of ['aster','bea']){await planter(id);const s=await store.snapshot(id);assert.ok((await command(id,{kind:'start-lesson',...s.lessonQuote},bench)).ok);}
      now+=60_000;for(const id of ['aster','bea'])assert.ok((await command(id,{kind:'complete-lesson'},bench)).ok);
      const snapshots=await Promise.all(['aster','bea'].map(id=>store.snapshot(id)));const outputs=await Promise.all(['aster','bea'].map((id,index)=>store.execute(id,{kind:'redeem-lesson',...snapshots[index].lessonQuote,id:'race-'+id,expectedRevision:snapshots[index].workshop.revision},square(24,13))));assert.equal(outputs.filter(r=>r.ok).length,1);
      const index=outputs.findIndex(r=>!r.ok),id=['aster','bea'][index];const losing=await store.snapshot(id);assert.ok(losing.lesson.completed&&!losing.lesson.redeemed);assert.deepEqual(losing.workshop.inventory,snapshots[index].workshop.inventory);assert.equal(losing.bridge.contributed,3);
      const upkeep=await command(id,{kind:'redeem-lesson',...losing.lessonQuote},square(24,13));assert.ok(upkeep.ok);assert.equal(upkeep.snapshot.lesson.route,'upkeep');assert.equal(upkeep.snapshot.bridge.contributed,3);assert.equal(upkeep.snapshot.bridge.phase,'building');assert.equal(upkeep.snapshot.bridge.readyAt,losing.bridge.readyAt);assert.equal(upkeep.snapshot.bridge.startedAt,losing.bridge.startedAt);assert.deepEqual((await pool.query('select route,count(*)::int as n from ih2.maintenance_events group by route order by route')).rows,[{route:'construction',n:1},{route:'upkeep',n:1}]);
    });
    await t.test('forward maintenance migration preserves old orientation and grandfathered bridge participation',async()=>{
      await reset();await actor('old-crafter');await actor('old-helper');await pool.query("insert into ih2.quest_awards(player_id,quest_id,content_version) values('old-crafter','orientation-v1',1),('old-helper','bridge-contributor-v1',1)");await pool.query('update ih2.bridge set contributed=3,phase=\'open\',grandfathered=true where id=1');const before=await store.snapshot('old-helper');
      const c=await pool.connect();try{await c.query('begin');await c.query('drop table ih2.maintenance_events,ih2.maintenance_lessons');await c.query(await readFile(new URL('../supabase/migrations/20261110225711_starter_homes_maintenance.sql',import.meta.url),'utf8'));const rows=(await c.query('select player_id,legacy_satisfied,started_at from ih2.maintenance_lessons order by player_id')).rows;assert.equal(rows.find(r=>r.player_id==='old-helper').legacy_satisfied,true);assert.equal(rows.find(r=>r.player_id==='old-crafter').legacy_satisfied,false);assert.ok(rows.every(r=>r.started_at===null));assert.deepEqual((await c.query("select workshop from ih2.players where id='old-helper'")).rows[0].workshop,before.workshop);assert.equal((await c.query('select contributed from ih2.bridge')).rows[0].contributed,3);}finally{await c.query('rollback');c.release();}
    });
    await t.test('home entry is authoritative, visitor edits fail, and expansion preserves six slots and instance across restart',async()=>{
      await reset();await fixtureKits('aster',36);await actor('bea');const claimed=await command('aster',{kind:'claim-plot'},square(30,29));const plotId=claimed.snapshot.plot!.id;
      const owner=await command('aster',{kind:'enter-home',plotId},square(30,35.5));assert.ok(owner.ok,owner.message);assert.deepEqual(owner.snapshot.position,{room:'home',homePlotId:plotId,position:{x:9,y:11}});
      const visitor=await command('bea',{kind:'enter-home',plotId},square(30,35.5));assert.ok(visitor.ok);const visiting=visitor.snapshot.position;
      assert.equal((await command('bea',{kind:'edit-plot',plotId,action:'place',prop:'rug',slot:'south-west'},visiting)).ok,false);
      assert.equal((await command('aster',{kind:'edit-plot',plotId,action:'place',prop:'rug',slot:'south-west'},{...owner.snapshot.position,homePlotId:'999999'})).ok,false);
      const placed=await command('aster',{kind:'edit-plot',plotId,action:'place',prop:'rug',slot:'south-west'},owner.snapshot.position);assert.ok(placed.ok);const slots=structuredClone(placed.snapshot.plot!.placements);
      const expanded=await command('aster',{kind:'upgrade-plot',plotId},owner.snapshot.position);assert.ok(expanded.ok);assert.equal(expanded.snapshot.position.room,'home-expanded');assert.deepEqual(expanded.snapshot.plot!.placements,slots);
      const restarted=new TownStore(pool,{now:()=>now});const guest=await restarted.snapshot('bea');assert.equal(guest.position.room,'home-expanded');assert.equal(guest.position.homePlotId,plotId);assert.deepEqual(guest.position.position,{x:9,y:11});assert.deepEqual((await restarted.snapshot('aster')).plot!.placements,slots);
    });
    await t.test('fixed construction opens exactly at its deadline once across concurrent snapshots and restart',async()=>{
      await reset();await fixtureKits('aster',1);await pool.query('update ih2.bridge set contributed=2 where id=1');const funded=await command('aster',{kind:'contribute'},square(24,13));assert.ok(funded.ok);assert.equal(funded.snapshot.bridge.phase,'building');assert.equal(funded.snapshot.bridge.restored,false);const ready=funded.snapshot.bridge.readyAt!;assert.equal(ready-now,6*3600_000);
      const held=funded.snapshot.workshop.bridgeKits;const extra=await command('aster',{kind:'contribute'},square(24,13));assert.equal(extra.ok,false);assert.equal(extra.snapshot.bridge.readyAt,ready);assert.equal(extra.snapshot.workshop.bridgeKits,held);
      now=ready-1;assert.equal((await store.snapshot('aster')).bridge.phase,'building');now=ready;const views=await Promise.all([store.snapshot('aster'),store.snapshot('aster'),new TownStore(pool,{now:()=>now}).snapshot('aster')]);for(const view of views){assert.equal(view.bridge.phase,'open');assert.ok(view.bridge.restored);assert.equal(view.bridge.openedAt,ready);assert.equal(view.projectJournal.length,1);assert.equal(view.projectJournal[0].effectiveAt,ready);}assert.equal((await pool.query('select count(*)::int as n from ih2.project_events')).rows[0].n,1);
    });
    await t.test('opening update and journal roll back together if event insertion fails',async()=>{
      await reset();await actor();await pool.query("update ih2.bridge set contributed=3,phase='building',started_at=$1,ready_at=$2 where id=1",[now,now+6*3600_000]);now+=6*3600_000;
      await pool.query("create function ih2.test_open_failure() returns trigger language plpgsql as $$ begin raise exception 'injected opening event failure'; end $$");await pool.query('create trigger test_open_failure before insert on ih2.project_events for each row execute function ih2.test_open_failure()');try{await assert.rejects(()=>store.snapshot('aster'),/injected opening event failure/);assert.equal((await pool.query('select phase from ih2.bridge')).rows[0].phase,'building');assert.equal((await pool.query('select count(*)::int as n from ih2.project_events')).rows[0].n,0);}finally{await pool.query('drop trigger test_open_failure on ih2.project_events');await pool.query('drop function ih2.test_open_failure()');}assert.equal((await store.snapshot('aster')).projectJournal.length,1);
    });
    await t.test('timed forward migration preserves partial work and grandfathers funded projects without invented history',async()=>{
      await reset();await actor();const original=(await store.snapshot('aster')).workshop;const sql=await readFile(new URL('../supabase/migrations/20261110234756_timed_bridge_trail.sql',import.meta.url),'utf8');for(const count of [0,2,3]){const c=await pool.connect();try{await c.query('begin');await c.query('drop table ih2.project_events,ih2.trail_stamps');await c.query('alter table ih2.bridge drop constraint bridge_lifecycle,drop column phase,drop column started_at,drop column ready_at,drop column opened_at,drop column grandfathered');await c.query('update ih2.bridge set contributed=$1',[count]);await c.query(sql);const row=(await c.query('select * from ih2.bridge')).rows[0];assert.equal(row.phase,count===3?'open':'collecting');assert.equal(row.grandfathered,count===3);assert.equal(row.started_at,null);assert.equal(row.ready_at,null);assert.equal(row.opened_at,null);const events=(await c.query('select * from ih2.project_events')).rows;assert.equal(events.length,count===3?1:0);if(events.length){assert.equal(events[0].kind,'grandfathered');assert.equal(events[0].effective_at,null);}assert.deepEqual((await c.query("select workshop from ih2.players where id='aster'")).rows[0].workshop,original);}finally{await c.query('rollback');c.release();}}
    });
    await t.test('personal trail stamps require open nearby landmarks and award only one permanent cosmetic',async()=>{
      await reset();await fixtureKits('aster',12);await actor('bea');const claimed=await command('aster',{kind:'claim-plot'},square(30,29));const plotId=claimed.snapshot.plot!.id;
      const trail=(x:number,y:number):TownPosition=>({room:'trail',position:{x,y}});assert.equal((await command('aster',{kind:'stamp-trail',landmarkId:'trailhead'},trail(6,18))).ok,false);await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");const before=await store.snapshot('aster');
      assert.equal((await command('aster',{kind:'stamp-trail',landmarkId:'lookout'},trail(9,22))).ok,false);assert.equal((await command('aster',{kind:'stamp-trail',landmarkId:'trailhead',playerId:'bea'},trail(6,18))).ok,false);
      assert.ok((await command('aster',{kind:'stamp-trail',landmarkId:'trailhead'},trail(6,18))).ok);assert.ok((await command('aster',{kind:'stamp-trail',landmarkId:'old-sign'},trail(12,12))).ok);const s=await store.snapshot('aster');const dto={kind:'stamp-trail',landmarkId:'lookout',id:'last-stamp',expectedRevision:s.workshop.revision};const results=await Promise.all([store.execute('aster',dto,trail(4,8)),store.execute('aster',dto,trail(4,8))]);assert.ok(results.every(r=>r.ok));assert.equal(results.filter(r=>r.replayed).length,1);const after=await store.snapshot('aster');assert.equal(after.trail.stamps.length,3);assert.ok(after.trail.pennantOwned);assert.equal(after.plots.find(p=>p.id===plotId)!.pennantOwned,true);for(const key of ['inventory','owned','placements','skills','stats','bridgeKits','job'] as const)assert.deepEqual(after.workshop[key],before.workshop[key]);assert.deepEqual(after.scores,before.scores);
      assert.equal((await command('aster',{kind:'stamp-trail',landmarkId:'lookout'},trail(4,8))).ok,false);assert.equal((await pool.query("select count(*)::int as n from ih2.quest_awards where quest_id='trail-pennant-v1'")).rows[0].n,1);assert.equal((await store.snapshot('bea')).trail.stamps.length,0);assert.ok((await command('bea',{kind:'stamp-trail',landmarkId:'trailhead'},trail(6,18))).ok);
      now+=7*86400_000;const resumed=await new TownStore(pool,{now:()=>now}).snapshot('aster');assert.deepEqual(resumed.trail,after.trail);assert.ok(resumed.plot!.pennantOwned);
    });
    await t.test('last trail stamp and its cosmetic award are one rollback-safe transaction',async()=>{
      await reset();await actor();await pool.query("update ih2.bridge set contributed=3,phase='open',grandfathered=true where id=1");await command('aster',{kind:'stamp-trail',landmarkId:'trailhead'},{room:'trail',position:{x:6,y:18}});await command('aster',{kind:'stamp-trail',landmarkId:'old-sign'},{room:'trail',position:{x:12,y:12}});const before=await store.snapshot('aster');const dto={kind:'stamp-trail',landmarkId:'lookout',id:'retry-last-stamp',expectedRevision:before.workshop.revision};
      await pool.query("create function ih2.test_pennant_failure() returns trigger language plpgsql as $$ begin if new.quest_id='trail-pennant-v1' then raise exception 'injected cosmetic failure'; end if; return new; end $$");await pool.query('create trigger test_pennant_failure before insert on ih2.quest_awards for each row execute function ih2.test_pennant_failure()');try{await assert.rejects(()=>store.execute('aster',dto,{room:'trail',position:{x:4,y:8}}),/injected cosmetic failure/);const failed=await store.snapshot('aster');assert.equal(failed.trail.stamps.length,2);assert.equal(failed.trail.pennantOwned,false);assert.equal(failed.workshop.revision,before.workshop.revision);}finally{await pool.query('drop trigger test_pennant_failure on ih2.quest_awards');await pool.query('drop function ih2.test_pennant_failure()');}assert.ok((await store.execute('aster',dto,{room:'trail',position:{x:4,y:8}})).snapshot.trail.pennantOwned);
    });
    await t.test('private schema, row security and database constraints remain closed to untrusted SQL roles', async () => {
      const tables = (await pool.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ih2' and c.relkind='r'")).rows;
      assert.ok(tables.length >= 11); assert.ok(tables.every(r => r.relrowsecurity)); assert.ok(['maintenance_lessons','maintenance_events','project_events','trail_stamps'].every(name=>tables.some(row=>row.relname===name)));
      const grants=(await pool.query("select c.relname,a.grantee from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a left join pg_roles r on r.oid=a.grantee where n.nspname='ih2' and c.relname in ('maintenance_lessons','maintenance_events','project_events','trail_stamps') and (a.grantee=0 or r.rolname in ('anon','authenticated'))")).rows; assert.deepEqual(grants,[],'New private tables expose no PUBLIC/anon/authenticated grants.');
      assert.equal((await pool.query("select has_schema_privilege('public','ih2','USAGE') as allowed")).rows[0].allowed, false);
      await assert.rejects(() => pool.query('update ih2.bridge set contributed=4 where id=1'), /check constraint/);
    });
  } finally { await pool.end(); }
});
