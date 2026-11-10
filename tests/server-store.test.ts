import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    if (!(await pool.query("select to_regnamespace('ih2') as name")).rows[0].name) await pool.query(migration);
    async function reset() {
      now = start;
      await pool.query('truncate ih2.command_receipts,ih2.bridge_contributions,ih2.quest_awards,ih2.season_scores,ih2.plots,ih2.players,ih2.bridge restart identity cascade');
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
      assert.ok(finalA.bridge.restored); assert.equal(finalA.bridge.contributed, 3); assert.equal(finalA.workshop.bridgeKits + finalB.workshop.bridgeKits, 3);
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
    await t.test('private schema, row security and database constraints remain closed to untrusted SQL roles', async () => {
      const tables = (await pool.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ih2' and c.relkind='r'")).rows;
      assert.ok(tables.length >= 7); assert.ok(tables.every(r => r.relrowsecurity));
      assert.equal((await pool.query("select has_schema_privilege('public','ih2','USAGE') as allowed")).rows[0].allowed, false);
      await assert.rejects(() => pool.query('update ih2.bridge set contributed=4 where id=1'), /check constraint/);
    });
  } finally { await pool.end(); }
});
