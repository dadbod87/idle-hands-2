/** Historical earned-stock setup ONLY inside the guarded disposable diagnostic. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import type {Pool} from 'pg';
import type {TownStore} from '../server/live-store.ts';
import {tastingFixture} from '../tests/helpers/playable-cafe.ts';
import {worlds} from '../src/game/world.ts';
import {BRIDGE_BUILD_MS} from '../src/game/town-rules.ts';
import {CAFE_RULES} from '../src/game/cafe-candidate.ts';

export async function preparePublicRefresh(pool: Pool, store: TownStore, roster: Array<{id: string; name: string}>) {
  assert.equal(roster.length, 20);
  for (const [index, resident] of roster.entries()) {
    await store.ensurePlayer(resident.id, resident.name);
    const state = tastingFixture(Date.now(), 0, 1).state;
    state.bridgeKits = index < 3 ? 1 : 0;
    const point = worlds.square.stops.find(s => s.id === (index < 3 ? 'bridge' : 'cafe'))!.point;
    await pool.query('update ih2.players set workshop=$2,position=$3 where id=$1',
      [resident.id, state, {room: 'square', position: point}]);
  }
}

export async function verifyPublicRefresh(pool: Pool, ids: string[]) {
  const rows = (await pool.query('select id,workshop,position from ih2.players order by id')).rows;
  assert.deepEqual(rows.map(r => r.id), ids);
  for (const [index, row] of rows.entries()) {
    const serving = index >= 3 && index < 15, worked = index < 15, s = row.workshop;
    assert.equal(s.revision, worked ? 1 : 0);
    assert.equal(s.bridgeKits, 0);
    assert.deepEqual(s.inventory, {scrap: 0, timber: 0, supplies: 0});
    assert.equal(s.garden.produce.radish, serving ? 0 : 1);
    assert.equal(s.garden.harvested.radish, 1);
    assert.equal(s.garden.consumed.cafe.radish, serving ? 1 : 0);
    assert.equal(s.cafe.totalServes, serving ? 1 : 0);
    if (serving) assert.equal(s.cafe.nextServeAt - s.cafe.lastServeAt, CAFE_RULES.cooldownMs);
    assert.equal(s.owned.teapot, 0);
    const point = worlds.square.stops.find(s => s.id === (index < 3 ? 'bridge' : 'cafe'))!.point;
    assert.deepEqual(row.position, {room: 'square', position: point});
  }
  const receipts = (await pool.query('select player_id,count(*)::int as n from ih2.command_receipts group by player_id order by player_id')).rows;
  assert.deepEqual(receipts.map(r => r.player_id), ids.slice(0, 15));
  assert.ok(receipts.every(r => r.n === 1));
  assert.equal((await pool.query('select count(*)::int as n from ih2.bridge_contributions')).rows[0].n, 3);
  const bridge = (await pool.query('select * from ih2.bridge where id=1')).rows[0];
  assert.equal(bridge.target, 3); assert.equal(bridge.contributed, 3); assert.equal(bridge.phase, 'building');
  assert.equal(Number(bridge.ready_at) - Number(bridge.started_at), BRIDGE_BUILD_MS); assert.equal(bridge.opened_at, null);
  const cafe = (await pool.query('select * from ih2.cafe_project where id=1')).rows[0];
  assert.equal(cafe.credits, 12); assert.equal(Number(cafe.ready_at) - Number(cafe.funded_at), CAFE_RULES.openingMs);
  assert.equal(cafe.opened_at, null);
  assert.equal((await pool.query('select count(*)::int as n from ih2.project_events')).rows[0].n, 0);
  const migrations = (await pool.query('select version,checksum from ih2_meta.migrations order by version')).rows;
  const dir = new URL('../supabase/migrations/', import.meta.url), expected = [];
  for (const version of (await readdir(dir)).filter(f => /^\d+_.+\.sql$/.test(f)).sort()) {
    expected.push({version, checksum: createHash('sha256').update(await readFile(new URL(version, dir))).digest('hex')});
  }
  assert.equal(expected.length, 10); assert.deepEqual(migrations, expected);
  const settings = (await pool.query("select name,setting from pg_settings where name in ('fsync','full_page_writes','synchronous_commit') order by name")).rows;
  assert.equal(settings.length, 3); assert.ok(settings.every(r => r.setting === 'on'));
  return {residents: 20, uniqueReceipts: 15, publicChanges: 15, consumedKits: 3, consumedRadishes: 12,
    remainingRadishes: 8, bridgeTarget: 3, cafeTarget: 12, originalDeadlinesExact: true,
    all9MetadataChecksumsExact: true, durability: settings};
}
