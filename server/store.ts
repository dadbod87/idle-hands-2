import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { applyWorkshop, createWorkshop, loadWorkshop, questStep, PROP_IDS, PLACEMENT_SLOTS, type WorkshopState } from '../src/game/workshop.ts';
import { canStand, worlds, type Point, type Room } from '../src/game/world.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS } from '../src/game/town-rules.ts';

export type TownPosition = { room: Room; position: Point };
export type TownPlot = { id: string; ownerId: string; ownerName: string; level: 1 | 2; placements: WorkshopState['placements'] };
export type TownSnapshot = {
  playerId: string; name: string; workshop: WorkshopState; position: TownPosition;
  quest: { contentVersion: 1; awarded: string[] };
  bridge: { contributed: number; target: number; restored: boolean };
  plot: TownPlot | null; plots: TownPlot[];
  seasonKey: string; scores: { playerId: string; name: string; points: number }[]; serverTime: number;
};
export type TownResult = { ok: boolean; message: string; replayed: boolean; revision: number; snapshot: TownSnapshot };
type Receipt = Omit<TownResult, 'snapshot' | 'replayed'>;
type PlayerRow = { id: string; name: string; workshop: WorkshopState; position: TownPosition; quest_content_version: number };
const idSchema = z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const base = { id: idSchema, expectedRevision: z.number().int().min(0).max(1_000_000) };
const slotSchema = z.enum(PLACEMENT_SLOTS.map(s => s.id) as [string, ...string[]]);
const specialSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('contribute') }).strict(),
  z.object({ ...base, kind: z.literal('claim-plot') }).strict(),
  z.object({ ...base, kind: z.literal('upgrade-plot'), plotId: z.string().regex(/^[1-9][0-9]{0,17}$/) }).strict(),
  z.object({ ...base, kind: z.literal('edit-plot'), plotId: z.string().regex(/^[1-9][0-9]{0,17}$/), action: z.enum(['place', 'remove']), slot: slotSchema, prop: z.enum(PROP_IDS).optional(), fromSlot: slotSchema.optional() }).strict()
]);
const envelopeSchema = z.object({ ...base, kind: z.string().max(30) }).passthrough();
const initialPosition: TownPosition = { room: 'square', position: { x: 24, y: 25 } };
function emptyPlacements(): WorkshopState['placements'] { return Object.fromEntries(PLACEMENT_SLOTS.map(s => [s.id, null])) as WorkshopState['placements']; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
function hash(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
function validPosition(value: TownPosition): boolean { return (value.room === 'square' || value.room === 'workshop') && canStand(value.room, value.position); }
function near(p: TownPosition, room: Room, stopId: string): boolean {
  const stop = worlds[room].stops.find(s => s.id === stopId);
  return !!stop && p.room === room && Math.hypot(p.position.x - stop.point.x, p.position.y - stop.point.y) <= 1.4;
}
// A UTC date identifying the Friday 16:00 America/Los_Angeles season. No DB session timezone dependency.
export function seasonKey(now: number): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  const day = Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day')));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  let back = (weekday - 5 + 7) % 7;
  if (back === 0 && Number(get('hour')) < 16) back = 7;
  return new Date(day - back * 86400_000).toISOString().slice(0, 10);
}

/** Trusted server boundary only. Caller authenticates synthetic identity and validates movement/rate before execute. */
export class TownStore {
  readonly pool: Pool;
  private now: () => number;
  constructor(pool: Pool, options: { now?: () => number } = {}) { this.pool = pool; this.now = options.now ?? Date.now; }
  private clock(): number {
    const now = this.now();
    if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - 86400_000) throw new Error('Invalid server clock.');
    return now;
  }
  async ensurePlayer(id: string, name = id): Promise<TownSnapshot> {
    idSchema.parse(id); if (!name || name.length > 40) throw new Error('Invalid synthetic player name.');
    const now = this.clock();
    await this.pool.query('insert into ih2.players(id,name,workshop,position) values($1,$2,$3,$4) on conflict(id) do nothing', [id, name, createWorkshop(now), initialPosition]);
    return this.snapshot(id);
  }
  private readState(row: PlayerRow, now: number): WorkshopState {
    const parsed = loadWorkshop(row.workshop, now);
    if (parsed.recovered) throw new Error('Stored workshop failed validation. Progress was not replaced.');
    return parsed.state;
  }
  async savePosition(id: string, position: TownPosition): Promise<void> {
    if (!validPosition(position)) throw new Error('Invalid server-validated position.');
    await this.pool.query('update ih2.players set position=$2,updated_at=now() where id=$1', [id, position]);
  }
  private async readSnapshot(client: PoolClient, id: string, now: number): Promise<TownSnapshot> {
    const { rows } = await client.query<PlayerRow>('select id,name,workshop,position,quest_content_version from ih2.players where id=$1', [id]);
    const player = rows[0]; if (!player) throw new Error('Unknown synthetic player.');
    const plots = (await client.query('select p.id::text,p.owner_id,p.level,p.placements,u.name from ih2.plots p join ih2.players u on u.id=p.owner_id order by p.id')).rows.map(p => ({ id: p.id, ownerId: p.owner_id, ownerName: p.name, level: p.level as 1 | 2, placements: p.placements }));
    const bridgeRow = (await client.query('select contributed,target from ih2.bridge where id=1')).rows[0];
    const awarded = (await client.query('select quest_id from ih2.quest_awards where player_id=$1 order by quest_id', [id])).rows.map(r => r.quest_id);
    const key = seasonKey(now);
    const scores = (await client.query('select s.player_id,u.name,s.points from ih2.season_scores s join ih2.players u on u.id=s.player_id where s.season_key=$1 order by s.points desc,s.player_id', [key])).rows.map(r => ({ playerId: r.player_id, name: r.name, points: r.points }));
    return { playerId: id, name: player.name, workshop: this.readState(player, now), position: player.position, quest: { contentVersion: 1, awarded }, bridge: { contributed: bridgeRow.contributed, target: bridgeRow.target, restored: bridgeRow.contributed >= bridgeRow.target }, plot: plots.find(p => p.ownerId === id) ?? null, plots, seasonKey: key, scores, serverTime: now };
  }
  async snapshot(id: string): Promise<TownSnapshot> {
    const client = await this.pool.connect();
    try { await client.query('begin isolation level repeatable read read only'); const result = await this.readSnapshot(client, id, this.clock()); await client.query('commit'); return result; }
    catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
  async execute(id: string, raw: unknown, position: TownPosition): Promise<TownResult> {
    const envelope = envelopeSchema.safeParse(raw);
    if (!envelope.success) return { ok: false, message: 'Invalid command. Nothing changed.', replayed: false, revision: -1, snapshot: await this.snapshot(id) };
    const cmd = envelope.data;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("set local lock_timeout='3s'");
      const now = this.clock();
      const player = (await client.query<PlayerRow>('select * from ih2.players where id=$1 for update', [id])).rows[0];
      if (!player) throw new Error('Unknown synthetic player.');
      let state = this.readState(player, now);
      const prior = (await client.query('select payload_hash,result from ih2.command_receipts where player_id=$1 and command_id=$2', [id, cmd.id])).rows[0];
      if (prior) {
        const result: Receipt = prior.payload_hash === hash(raw) ? prior.result : { ok: false, message: 'That command ID was already used for a different request.', revision: state.revision };
        const snapshot = await this.readSnapshot(client, id, now); await client.query('commit');
        return { ...result, replayed: prior.payload_hash === hash(raw), snapshot };
      }
      let result: Receipt = { ok: false, message: '', revision: state.revision };
      const ownPlot = (await client.query('select id::text,owner_id,level,placements from ih2.plots where owner_id=$1 for update', [id])).rows[0];
      const special = specialSchema.safeParse(raw);
      const specialKinds = ['contribute', 'claim-plot', 'upgrade-plot', 'edit-plot'];
      const reject = (message: string) => { result = { ok: false, message, revision: state.revision }; };
      if (cmd.expectedRevision !== state.revision) reject('Your town state changed. Review the refreshed bag and try again.');
      else if (!validPosition(position)) reject('A valid server position is required.');
      else if (now < state.observedAt) reject('The server clock moved backwards. Your progress is unchanged.');
      else if (state.revision >= 1_000_000) reject('Prototype command limit reached. Your progress is unchanged.');
      else if (specialKinds.includes(cmd.kind)) {
        if (!special.success) reject('Invalid town request. Nothing changed.');
        else {
          const action = special.data;
          if (action.kind === 'contribute') {
            if (!near(position, 'square', 'bridge')) reject('Walk to the bridge committee before contributing.');
            else {
              const bridge = (await client.query('select * from ih2.bridge where id=1 for update')).rows[0];
              if (bridge.contributed >= bridge.target) reject('The bridge is already restored. Keep your kit for what comes next.');
              else if (state.bridgeKits < 1) reject('You need one completed bridge kit. Nothing was spent.');
              else {
                state.bridgeKits--; state.revision++; state.observedAt = now;
                state.lastMessage = 'Contributed one bridge kit. The committee has recorded actual progress.';
                await client.query('update ih2.bridge set contributed=contributed+1 where id=1');
                await client.query('insert into ih2.bridge_contributions(player_id,command_id) values($1,$2)', [id, cmd.id]);
                await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing', [id, 'bridge-contributor-v1']);
                await client.query('insert into ih2.season_scores(player_id,season_key,points) values($1,$2,1) on conflict(player_id,season_key) do update set points=ih2.season_scores.points+1', [id, seasonKey(now)]);
                result = { ok: true, message: state.lastMessage, revision: state.revision };
              }
            }
          } else if (action.kind === 'claim-plot') {
            if (!near(position, 'square', 'plot')) reject('Walk to the housing notice before claiming a plot.');
            else if (ownPlot) reject('You already have a plot. Nobody needs a second mailbox yet.');
            else if (state.bridgeKits < PLOT_CLAIM_KITS) reject(`A plot requires ${PLOT_CLAIM_KITS} bridge kits. Nothing was spent.`);
            else {
              state.bridgeKits -= PLOT_CLAIM_KITS; state.revision++; state.observedAt = now; state.lastMessage = 'Your own plot is reserved. Persistent roots. Provisional paperwork.';
              await client.query('insert into ih2.plots(owner_id,placements) values($1,$2)', [id, emptyPlacements()]);
              result = { ok: true, message: state.lastMessage, revision: state.revision };
            }
          } else if (action.kind === 'upgrade-plot') {
            if (!ownPlot || ownPlot.id !== action.plotId) reject('Only the owner can upgrade this plot.');
            else if (!near(position, 'square', 'plot')) reject('Walk to the housing notice before upgrading.');
            else if (ownPlot.level >= 2) reject('This proof includes one home upgrade. Your furnishings remain safe.');
            else if (state.bridgeKits < PLOT_UPGRADE_KITS) reject(`The home upgrade requires ${PLOT_UPGRADE_KITS} additional bridge kits. Nothing was spent.`);
            else {
              state.bridgeKits -= PLOT_UPGRADE_KITS; state.revision++; state.observedAt = now; state.lastMessage = 'Home upgraded. Your furniture was not restructured.';
              await client.query('update ih2.plots set level=2 where owner_id=$1', [id]);
              result = { ok: true, message: state.lastMessage, revision: state.revision };
            }
          } else {
            if (!ownPlot || ownPlot.id !== action.plotId) reject('Only the owner can arrange this plot.');
            else if (!near(position, 'square', 'plot')) reject('Walk to the housing notice to arrange your plot.');
            else if (action.action === 'place' && !action.prop) reject('Choose an owned furnishing to place.');
            else {
              const original = structuredClone(state);
              const virtual = structuredClone(state); virtual.placements = ownPlot.placements;
              for (const prop of PROP_IDS) virtual.owned[prop] -= Object.values(original.placements).filter(p => p === prop).length;
              const placement = action.action === 'place' ? { id: action.id, expectedRevision: action.expectedRevision, kind: 'place', prop: action.prop, slot: action.slot, ...(action.fromSlot ? { fromSlot: action.fromSlot } : {}) } : { id: action.id, expectedRevision: action.expectedRevision, kind: 'remove', slot: action.slot };
              const applied = applyWorkshop(virtual, placement, now);
              if (!applied.ok) reject(applied.message);
              else {
                await client.query('update ih2.plots set placements=$2 where owner_id=$1', [id, applied.state.placements]);
                state = applied.state; state.placements = original.placements; state.owned = original.owned;
                // Plot decoration cannot bypass the workshop orientation requirement.
                state.stats.planterPlacedAfterCraft = original.stats.planterPlacedAfterCraft;
                result = { ok: true, message: applied.message, revision: state.revision };
              }
            }
          }
        }
      } else {
        let allowed = false;
        if (cmd.kind === 'gather') allowed = typeof cmd.resource === 'string' && near(position, 'square', cmd.resource);
        else if (cmd.kind === 'craft' || cmd.kind === 'claim') allowed = near(position, 'workshop', 'bench');
        else if (cmd.kind === 'place' || cmd.kind === 'remove') allowed = position.room === 'workshop';
        if (!allowed) reject('Walk to the right place before using that action.');
        else {
          const virtual = structuredClone(state);
          if (cmd.kind === 'place' && ownPlot) for (const prop of PROP_IDS) virtual.owned[prop] -= Object.values(ownPlot.placements).filter(p => p === prop).length;
          const applied = applyWorkshop(virtual, raw, now);
          if (!applied.ok) reject(applied.message);
          else {
            const owned = state.owned; state = applied.state;
            if (cmd.kind === 'place') state.owned = owned;
            result = { ok: true, message: applied.message, revision: state.revision };
          }
        }
      }
      if (result.ok) {
        if (questStep(state).complete) await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing', [id, 'orientation-v1']);
        await client.query('update ih2.players set workshop=$2,position=$3,quest_content_version=1,updated_at=now() where id=$1', [id, state, position]);
      } else if (player.quest_content_version === 0) {
        // Content migration changes metadata only; stable award IDs survive and no reward is reissued.
        await client.query('update ih2.players set quest_content_version=1 where id=$1', [id]);
      }
      await client.query('insert into ih2.command_receipts(player_id,command_id,payload_hash,result) values($1,$2,$3,$4)', [id, cmd.id, hash(raw), result]);
      const snapshot = await this.readSnapshot(client, id, now);
      await client.query('commit'); return { ...result, replayed: false, snapshot };
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
}
