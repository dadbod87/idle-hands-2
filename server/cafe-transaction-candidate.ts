import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Pool, PoolClient} from 'pg';
import {z} from 'zod';
import {
  CAFE_PRESENTATIONS, cafeProjectSchema, createCafeProject, migrateCafeCandidate,
  projectCafeCandidate, serveCafeCandidate, settleCafeProject,
  type CafeProject, type CafeWorkshopCandidate
} from '../src/game/cafe-candidate.ts';
import {settleCafeWorkshopCandidate} from '../src/game/cafe-commands-candidate.ts';
import {GARDEN_TIME_MAX} from '../src/game/garden.ts';
import {PROP_IDS} from '../src/game/workshop.ts';
import {homeAllocation, isCurrentHomeLayout, type HomeLayout} from '../src/game/home-layout.ts';
import {canStand} from '../src/game/world.ts';
import {localDatabaseUrl} from './db.ts';
import type {TownPosition} from './store.ts';

/** No HTTP registration, production authentication, or real counter geometry.
 * A later coherent integration must validate a reachable counter and all new
 * home prop maps. This isolated target is deliberately the existing spawn point. */
export const CAFE_CANDIDATE_TARGET = {room: 'square', point: {x: 24, y: 25}, radius: 1.4} as const;
const names = ['ih2_cafe_test', 'ih2_cafe_restore'];
const identity = z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const clock = z.number().int().min(0).max(GARDEN_TIME_MAX);
const command = z.object({
  id: z.uuid(), expectedRevision: z.number().int().min(0).max(1_000_000),
  kind: z.literal('cafe-serve-candidate'), presentation: z.enum(CAFE_PRESENTATIONS)
}).strict();
function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonical(x)).join(',') + '}';
  return JSON.stringify(v);
}
const hash = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
export type CafeTransactionSnapshot = {
  playerId: string; workshop: CafeWorkshopCandidate; project: CafeProject;
  private: ReturnType<typeof projectCafeCandidate>['private'];
  public: {credits: number; phase: 'collecting' | 'opening' | 'open'; readyAt: number | null};
  serverTime: number;
};
type Receipt = {ok: boolean; message: string; revision: number; teapotAwarded: boolean; publicChanged: boolean};
export type CafeTransactionResult = Receipt & {replayed: boolean; snapshot: CafeTransactionSnapshot};

/** Trusted local server caller supplies identity, never a field in the command.
 * Reuses real player rows and UUID receipts, ONLY in explicitly named isolated
 * loopback databases. Stored server position owns proximity. No fixture grant. */
export class CafeTransactionCandidate {
  readonly pool: Pool;
  private readonly now: () => number;
  constructor(pool: Pool, options: {now?: () => number} = {}) {
    // Check before any connection, including URL query-option/host overrides.
    const o = pool.options;
    if (o.connectionString) CafeTransactionCandidate.databaseUrl(o.connectionString);
    if ((o.host !== undefined && !['127.0.0.1', 'localhost'].includes(o.host))
      || (o.database !== undefined && !names.includes(o.database))
      || (!o.connectionString && (!o.host || !o.database)) || o.stream) throw new Error('Café candidate requires its dedicated loopback test/restore database.');
    this.pool = pool; this.now = options.now ?? Date.now;
  }
  static databaseUrl(value: string) {
    localDatabaseUrl(value);
    if (!names.includes(new URL(value).pathname.slice(1))) throw new Error('Café candidate refuses protected databases.');
    return value;
  }
  private async guard(client: PoolClient) {
    const actual = (await client.query('select current_database() as name')).rows[0].name;
    if (!names.includes(actual)) throw new Error('Café candidate refuses this database.');
  }
  private time() {return clock.parse(this.now());}
  /** Explicit candidate installer, no active migration or checksum modification. */
  async install() {
    const client = await this.pool.connect();
    try {
      await this.guard(client); await client.query('begin');
      await client.query(await readFile(new URL('./candidates/cafe-project.sql', import.meta.url), 'utf8'));
      const p = createCafeProject(this.time());
      await client.query('insert into ih2.cafe_candidate_project(id,observed_at) values(1,$1)', [p.observedAt]);
      await client.query('commit');
    } catch (e) {await client.query('rollback'); throw e;} finally {client.release();}
  }
  private project(row: Record<string, unknown>): CafeProject {
    const n = (x: unknown) => x === null ? null : Number(x);
    return cafeProjectSchema.parse({version: 1, credits: row.credits, observedAt: n(row.observed_at), fundedAt: n(row.funded_at), readyAt: n(row.ready_at), openedAt: n(row.opened_at)});
  }
  private state(raw: unknown) {
    const parsed = migrateCafeCandidate(raw);
    if (!parsed.ok) throw new Error(parsed.reason);
    return parsed.state;
  }
  private async read(client: PoolClient, id: string, now: number): Promise<CafeTransactionSnapshot> {
    const player = (await client.query('select workshop from ih2.players where id=$1', [id])).rows[0];
    if (!player) throw new Error('Unknown synthetic player.');
    const workshop = this.state(player.workshop);
    const project = this.project((await client.query('select * from ih2.cafe_candidate_project where id=1')).rows[0]);
    const view = projectCafeCandidate(workshop, project, now);
    return {playerId: id, workshop, project, private: view.private,
      // Read-only snapshots never silently persist or pretend to persist a latch.
      public: {credits: project.credits, readyAt: project.readyAt, phase: project.openedAt !== null ? 'open' : project.fundedAt !== null ? 'opening' : 'collecting'}, serverTime: now};
  }
  async snapshot(id: string) {
    identity.parse(id); const client = await this.pool.connect();
    try {
      await this.guard(client); await client.query('begin isolation level repeatable read read only');
      const result = await this.read(client, id, this.time()); await client.query('commit'); return result;
    } catch (e) {await client.query('rollback'); throw e;} finally {client.release();}
  }
  /** Phase-only writer takes only the café row. Never holds café then player.
   * Call explicitly before the later read-only projection, no per-frame poll. */
  async settleOpening(): Promise<{changed: boolean; project: CafeProject}> {
    const client = await this.pool.connect();
    try {
      await this.guard(client); await client.query('begin'); await client.query("set local lock_timeout='3s'");
      const before = this.project((await client.query('select * from ih2.cafe_candidate_project where id=1 for update')).rows[0]);
      const next = settleCafeProject(before, this.time()), changed = before.openedAt !== next.openedAt;
      if (changed) await this.saveProject(client, next);
      await client.query('commit'); return {changed, project: changed ? next : before};
    } catch (e) {await client.query('rollback'); throw e;} finally {client.release();}
  }
  private async saveProject(client: PoolClient, p: CafeProject) {
    cafeProjectSchema.parse(p);
    await client.query('update ih2.cafe_candidate_project set credits=$1,observed_at=$2,funded_at=$3,ready_at=$4,opened_at=$5 where id=1', [p.credits, p.observedAt, p.fundedAt, p.readyAt, p.openedAt]);
  }
  async serve(id: string, raw: unknown): Promise<CafeTransactionResult> {
    identity.parse(id); const parsed = command.safeParse(raw);
    if (!parsed.success) {
      const snapshot = await this.snapshot(id);
      return {ok: false, message: 'Invalid café request. Nothing changed.', revision: snapshot.workshop.revision, teapotAwarded: false, publicChanged: false, replayed: false, snapshot};
    }
    const cmd = parsed.data, client = await this.pool.connect();
    try {
      await this.guard(client); await client.query('begin'); await client.query("set local lock_timeout='3s'");
      const player = (await client.query('select workshop,position from ih2.players where id=$1 for update', [id])).rows[0];
      if (!player) throw new Error('Unknown synthetic player.');
      // Same forward order as existing writers: player -> bridge -> own plot -> café.
      await client.query('select id from ih2.bridge where id=1 for update');
      const plot = (await client.query('select level,placements,workroom_placements from ih2.plots where owner_id=$1 for update', [id])).rows[0];
      const project = this.project((await client.query('select * from ih2.cafe_candidate_project where id=1 for update')).rows[0]);
      const now = this.time(), state = this.state(player.workshop);
      const snapshot = () => this.read(client, id, now);
      const prior = (await client.query('select payload_hash,result from ih2.command_receipts where player_id=$1 and command_id=$2', [id, cmd.id])).rows[0];
      const refusal = (message: string): Receipt => ({ok: false, message, revision: state.revision, teapotAwarded: false, publicChanged: false});
      if (prior) {
        const same = prior.payload_hash === hash(cmd);
        const result: Receipt = same ? prior.result : refusal('That command ID was already used for a different request.');
        const current = await snapshot(); await client.query('commit'); return {...result, replayed: same, snapshot: current};
      }
      if (plot) {
        const layout: HomeLayout = {level: plot.level, placements: plot.placements, workroomPlacements: plot.workroom_placements};
        if (!isCurrentHomeLayout(layout) || PROP_IDS.some(p => homeAllocation(layout, p) + Object.values(state.placements).filter(v => v === p).length > state.owned[p])) throw new Error('Stored furniture allocation failed validation. Nothing was replaced.');
        // Teapot not permitted in current home SQL maps. Extending these maps is
        // deliberately a coherent-integration gate, not an unproved projection.
      }
      const p = player.position as TownPosition;
      const near = p?.room === CAFE_CANDIDATE_TARGET.room && !p.homePlotId && !p.districtId
        && p.position && canStand(p.room, p.position)
        && Math.hypot(p.position.x - CAFE_CANDIDATE_TARGET.point.x, p.position.y - CAFE_CANDIDATE_TARGET.point.y) <= CAFE_CANDIDATE_TARGET.radius;
      let result: Receipt;
      if (!near) result = refusal('Walk to the candidate tasting station before serving.');
      else {
        // Settlement is pure; a refusal never writes it or migrates the legacy row.
        const settled = settleCafeWorkshopCandidate(state, now);
        const applied = serveCafeCandidate(settled, project, {expectedRevision: cmd.expectedRevision, presentation: cmd.presentation}, now);
        result = {ok: applied.ok, message: applied.message, revision: applied.state.revision, teapotAwarded: applied.teapotAwarded, publicChanged: applied.publicChanged};
        if (applied.ok) {
          await client.query('update ih2.players set workshop=$2,updated_at=now() where id=$1', [id, applied.state]);
          await this.saveProject(client, applied.project);
        }
      }
      await client.query('insert into ih2.command_receipts(player_id,command_id,payload_hash,result) values($1,$2,$3,$4)', [id, cmd.id, hash(cmd), result]);
      const current = await snapshot(); await client.query('commit');
      return {...result, replayed: false, snapshot: current};
    } catch (e) {await client.query('rollback'); throw e;} finally {client.release();}
  }
}
