import {surveyId} from '../src/game/fieldwork.ts';
import {gardenActionSchema,gardenActionLocations,MARKER_IDS,type MarkerId} from '../src/game/garden.ts';
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { applyWorkshop, createWorkshop, loadWorkshop, questStep, PROP_IDS, PLACEMENT_SLOTS, type WorkshopState } from '../src/game/workshop.ts';
import { canStand, worlds, TRAIL_LANDMARK_IDS, type Point, type Room } from '../src/game/world.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS, MAINTENANCE_MS, MAINTENANCE_COST, BRIDGE_BUILD_MS, TRAIL_PENNANT_AWARD } from '../src/game/town-rules.ts';

export type TownPosition = { room: Room; position: Point; homePlotId?: string };
export type TownPlot = { id: string; ownerId: string; ownerName: string; level: 1 | 2; placements: WorkshopState['placements']; pennantOwned:boolean };
export type MaintenanceLesson={startedAt:number|null;readyAt:number|null;completed:boolean;redeemed:boolean;route:'construction'|'upkeep'|null;legacySatisfied:boolean};
export type TownSnapshot = {
  playerId: string; name: string; workshop: WorkshopState; position: TownPosition;
  quest: { contentVersion: 1; awarded: string[] };
  bridge: { contributed: number; target: number; restored: boolean;phase:'collecting'|'building'|'open';startedAt:number|null;readyAt:number|null;openedAt:number|null;grandfathered:boolean };
  projectJournal:Array<{id:string;kind:'opened'|'grandfathered';effectiveAt:number|null;recordedAt:number}>;
  trail:{stamps:string[];pennantOwned:boolean};
  plot: TownPlot | null; plots: TownPlot[];
  gardenTown:{credits:number;target:6;markers:Array<{ownerId:string;ownerName:string;marker:MarkerId}>};
  lesson:MaintenanceLesson; lessonQuote:{route:'construction'|'upkeep';expectedBridgeContributed:number};
  seasonKey: string; scores: { playerId: string; name: string; points: number }[]; serverTime: number;
};
export type TownResult = { ok: boolean; message: string; replayed: boolean; revision: number; snapshot: TownSnapshot; publicChanged?:boolean };
type Receipt = Omit<TownResult, 'snapshot' | 'replayed'>;
type PlayerRow = { id: string; name: string; workshop: WorkshopState; position: TownPosition; quest_content_version: number };
const idSchema = z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const base = { id: idSchema, expectedRevision: z.number().int().min(0).max(1_000_000) };
const slotSchema = z.enum(PLACEMENT_SLOTS.map(s => s.id) as [string, ...string[]]);
const specialSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('contribute') }).strict(),
  z.object({...base,kind:z.literal('stamp-trail'),landmarkId:z.enum(TRAIL_LANDMARK_IDS)}).strict(),
  z.object({ ...base, kind: z.literal('enter-home'), plotId:z.string().regex(/^[1-9][0-9]{0,17}$/) }).strict(),
  z.object({ ...base, kind:z.literal('start-lesson'), route:z.enum(['construction','upkeep']),expectedBridgeContributed:z.number().int().min(0).max(3) }).strict(),
  z.object({ ...base, kind:z.literal('complete-lesson') }).strict(),
  z.object({ ...base, kind:z.literal('redeem-lesson'),route:z.enum(['construction','upkeep']),expectedBridgeContributed:z.number().int().min(0).max(3) }).strict(),
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
export function isHome(room:Room):boolean{return room==='home'||room==='home-expanded';}
function validPosition(value: TownPosition): boolean { return !!worlds[value.room] && canStand(value.room,value.position) && (isHome(value.room)?!!value.homePlotId&&/^[1-9][0-9]{0,17}$/.test(value.homePlotId):value.homePlotId===undefined); }
export function canonicalHomePosition(value:TownPosition,plots:TownPlot[]):TownPosition{
 if(!isHome(value.room))return value;
 const plot=plots.find(p=>p.id===value.homePlotId);
 if(!plot)return {room:'square',position:{x:30,y:35.5}};
 const room=plot.level===2?'home-expanded':'home';return {room,homePlotId:plot.id,position:canStand(room,value.position)?value.position:{x:9,y:11}};
}
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
    await this.pool.query('insert into ih2.maintenance_lessons(player_id) values($1) on conflict do nothing',[id]);
    return this.snapshot(id);
  }
  private readState(row: PlayerRow, now: number): WorkshopState {
    const parsed = loadWorkshop(row.workshop, now);
    if (parsed.recovered) throw new Error('Stored workshop failed validation. Progress was not replaced.');
    return parsed.state;
  }
  async savePosition(id: string, position: TownPosition): Promise<void> {
    if (!validPosition(position)) throw new Error('Invalid server-validated position.');
    if(position.room==='trail'&&(await this.snapshot(id)).bridge.phase!=='open')throw new Error('The trail is not open.');
    if(isHome(position.room)){const plot=(await this.pool.query('select level from ih2.plots where id=$1',[position.homePlotId])).rows[0];if(!plot||(plot.level===2?'home-expanded':'home')!==position.room)throw new Error('Home instance is not valid.');}
    await this.pool.query('update ih2.players set position=$2,updated_at=now() where id=$1', [id, position]);
  }
  private async settleBridge(client:PoolClient,now:number){
    const opened=await client.query("update ih2.bridge set phase='open',opened_at=ready_at where id=1 and phase='building' and ready_at<=$1 returning ready_at",[now]);
    if(opened.rows.length)await client.query("insert into ih2.project_events(id,kind,effective_at,recorded_at) values('bridge-opened-v2','opened',$1,$2) on conflict do nothing",[opened.rows[0].ready_at,now]);
  }
  private async fundBridge(client:PoolClient,now:number){
    await client.query("update ih2.bridge set contributed=contributed+1,phase=case when contributed+1=target then 'building' else phase end,started_at=case when contributed+1=target then $1 else started_at end,ready_at=case when contributed+1=target then $1+$2 else ready_at end where id=1",[now,BRIDGE_BUILD_MS]);
  }
  private async readSnapshot(client: PoolClient, id: string, now: number): Promise<TownSnapshot> {
    const { rows } = await client.query<PlayerRow>('select id,name,workshop,position,quest_content_version from ih2.players where id=$1', [id]);
    const player = rows[0]; if (!player) throw new Error('Unknown synthetic player.');
    const plots = (await client.query('select p.id::text,p.owner_id,p.level,p.placements,u.name,exists(select 1 from ih2.quest_awards q where q.player_id=p.owner_id and q.quest_id=\'trail-pennant-v1\') as pennant_owned from ih2.plots p join ih2.players u on u.id=p.owner_id order by p.id')).rows.map(p => ({ id: p.id, ownerId: p.owner_id, ownerName: p.name, level: p.level as 1 | 2, placements: p.placements,pennantOwned:p.pennant_owned }));
    const bridgeRow = (await client.query('select b.*,g.credits as welcome_credits from ih2.bridge b cross join ih2.garden_welcome g where b.id=1 and g.id=1')).rows[0];
    // Explicit projection only: never select other residents' private garden JSON.
    const markerRows=(await client.query("select id,name,workshop->'garden'->>'selectedMarker' as marker from ih2.players where workshop->'garden'->'markers' ? (workshop->'garden'->>'selectedMarker') order by id")).rows;
    const gardenTown:TownSnapshot['gardenTown']={credits:bridgeRow.welcome_credits,target:6,markers:markerRows.filter(row=>(MARKER_IDS as readonly string[]).includes(row.marker)).map(row=>({ownerId:row.id,ownerName:row.name,marker:row.marker as MarkerId}))};
    const awarded = (await client.query('select quest_id from ih2.quest_awards where player_id=$1 order by quest_id', [id])).rows.map(r => r.quest_id);
    const lessonRow=(await client.query('select * from ih2.maintenance_lessons where player_id=$1',[id])).rows[0];
    const lesson:MaintenanceLesson={startedAt:lessonRow?.started_at===null||!lessonRow?null:Number(lessonRow.started_at),readyAt:lessonRow?.ready_at===null||!lessonRow?null:Number(lessonRow.ready_at),completed:!!lessonRow?.completed,redeemed:!!lessonRow?.redeemed,route:lessonRow?.route??null,legacySatisfied:!!lessonRow?.legacy_satisfied};
    const stamps=(await client.query('select landmark_id from ih2.trail_stamps where player_id=$1 order by landmark_id',[id])).rows.map(row=>row.landmark_id);
    const projectJournal=(await client.query('select * from ih2.project_events order by recorded_at,id')).rows.map(row=>({id:row.id,kind:row.kind as 'opened'|'grandfathered',effectiveAt:row.effective_at===null?null:Number(row.effective_at),recordedAt:Number(row.recorded_at)}));
    const key = seasonKey(now);
    const scores = (await client.query('select s.player_id,u.name,s.points from ih2.season_scores s join ih2.players u on u.id=s.player_id where s.season_key=$1 order by s.points desc,s.player_id', [key])).rows.map(r => ({ playerId: r.player_id, name: r.name, points: r.points }));
    return {gardenTown, playerId: id, name: player.name, workshop: this.readState(player, now), position: canonicalHomePosition(player.position,plots), lesson:lesson,lessonQuote:{route:bridgeRow.contributed<bridgeRow.target?'construction':'upkeep',expectedBridgeContributed:bridgeRow.contributed}, quest: { contentVersion: 1, awarded }, projectJournal,trail:{stamps,pennantOwned:awarded.includes(TRAIL_PENNANT_AWARD)},bridge: { contributed: bridgeRow.contributed, target: bridgeRow.target, restored: bridgeRow.phase==='open',phase:bridgeRow.phase,startedAt:bridgeRow.started_at===null?null:Number(bridgeRow.started_at),readyAt:bridgeRow.ready_at===null?null:Number(bridgeRow.ready_at),openedAt:bridgeRow.opened_at===null?null:Number(bridgeRow.opened_at),grandfathered:bridgeRow.grandfathered }, plot: plots.find(p => p.ownerId === id) ?? null, plots, seasonKey: key, scores, serverTime: now };
  }
  async snapshot(id: string): Promise<TownSnapshot> {
    const client = await this.pool.connect();
    try { await client.query('begin');await this.settleBridge(client,this.clock());await client.query('commit');await client.query('begin isolation level repeatable read read only'); const result = await this.readSnapshot(client, id, this.clock()); await client.query('commit'); return result; }
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
      await this.settleBridge(client,now);
      let state = this.readState(player, now);let authoritativePosition=position;
      const prior = (await client.query('select payload_hash,result from ih2.command_receipts where player_id=$1 and command_id=$2', [id, cmd.id])).rows[0];
      if (prior) {
        const result: Receipt = prior.payload_hash === hash(raw) ? prior.result : { ok: false, message: 'That command ID was already used for a different request.', revision: state.revision };
        const snapshot = await this.readSnapshot(client, id, now); await client.query('commit');
        return { ...result, replayed: prior.payload_hash === hash(raw), snapshot };
      }
      let result: Receipt = { ok: false, message: '', revision: state.revision };
      const ownPlot = (await client.query('select id::text,owner_id,level,placements from ih2.plots where owner_id=$1 for update', [id])).rows[0];
      const special = specialSchema.safeParse(raw);
      const specialKinds = ['contribute', 'claim-plot', 'upgrade-plot', 'edit-plot','enter-home','start-lesson','complete-lesson','redeem-lesson','stamp-trail'];
      const contextPlot=isHome(position.room)?(await client.query('select id::text,owner_id,level from ih2.plots where id=$1',[position.homePlotId])).rows[0]:null;
      const validContext=(!isHome(position.room)||!!contextPlot&&position.room===(contextPlot.level===2?'home-expanded':'home'))&&(position.room!=='trail'||(await client.query('select phase from ih2.bridge where id=1')).rows[0].phase==='open');
      const reject = (message: string) => { result = { ok: false, message, revision: state.revision }; };
      if (cmd.expectedRevision !== state.revision) reject('Your town state changed. Review the refreshed bag and try again.');
      else if (!validPosition(position)||!validContext) reject('A valid server position is required.');
      else if (now < state.observedAt) reject('The server clock moved backwards. Your progress is unchanged.');
      else if (state.revision >= 1_000_000) reject('Prototype command limit reached. Your progress is unchanged.');
      else if (specialKinds.includes(cmd.kind)) {
        if (!special.success) reject('Invalid town request. Nothing changed.');
        else {
          const action = special.data;
          if(action.kind==='stamp-trail'){
            const bridge=(await client.query('select phase from ih2.bridge where id=1')).rows[0];
            if(bridge.phase!=='open'||!near(position,'trail',action.landmarkId))reject('Walk to this landmark on the open trail before stamping your journal.');
            else{
              const stamp=await client.query('insert into ih2.trail_stamps(player_id,landmark_id,command_id,stamped_at) values($1,$2,$3,$4) on conflict do nothing returning landmark_id',[id,action.landmarkId,action.id,now]);
              if(!stamp.rows.length)reject('This landmark is already in your permanent trail journal.');
              else{const count=(await client.query('select count(*)::int as n from ih2.trail_stamps where player_id=$1',[id])).rows[0].n;if(count===TRAIL_LANDMARK_IDS.length)await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing',[id,TRAIL_PENNANT_AWARD]);state.revision++;state.observedAt=now;state.lastMessage=count===TRAIL_LANDMARK_IDS.length?'All three landmarks recorded. Your permanent clipboard pennant is earned.':'Landmark recorded in your permanent trail journal.';result={ok:true,message:state.lastMessage,revision:state.revision};}
            }
          }else if(action.kind==='enter-home'){
            const target=(await client.query('select id::text,level from ih2.plots where id=$1',[action.plotId])).rows[0];
            if(!near(position,'square','plot')&&!near(position,'square','home-front'))reject('Walk to the home entrance before entering.');
            else if(!target)reject('That home does not exist.');
            else{authoritativePosition={room:target.level===2?'home-expanded':'home',homePlotId:target.id,position:{x:9,y:11}};state.revision++;state.observedAt=now;state.lastMessage='Entered home '+target.id+'. Visitors may look; only the owner may arrange it.';result={ok:true,message:state.lastMessage,revision:state.revision};}
          }else if(action.kind==='start-lesson'||action.kind==='complete-lesson'||action.kind==='redeem-lesson'){
            await client.query('insert into ih2.maintenance_lessons(player_id) values($1) on conflict do nothing',[id]);
            const lesson=(await client.query('select * from ih2.maintenance_lessons where player_id=$1 for update',[id])).rows[0];
            if(lesson.legacy_satisfied)reject('Your earlier bridge participation is already recorded. No new lesson or charge is needed.');
            else if(action.kind==='start-lesson'){
              const bridge=(await client.query('select * from ih2.bridge where id=1 for update')).rows[0],route=bridge.contributed<bridge.target?'construction':'upkeep';
              if(!near(position,'workshop','bench'))reject('Walk to your work bench to start the lesson.');
              else if(lesson.started_at!==null)reject('This lesson has already started. Its materials are paid once.');
              else if(!state.stats.planterPlacedAfterCraft)reject('Make and place your first planter before starting maintenance.');
              else if(action.route!==route||action.expectedBridgeContributed!==bridge.contributed)reject('The project changed. Review the new lesson route; no materials were spent.');
              else if(Object.keys(MAINTENANCE_COST).some(key=>state.inventory[key as keyof typeof MAINTENANCE_COST]<1))reject('The lesson needs one scrap, one timber and one supplies. Nothing was spent.');
              else{for(const key of Object.keys(MAINTENANCE_COST) as Array<keyof typeof MAINTENANCE_COST>)state.inventory[key]-=MAINTENANCE_COST[key];await client.query('update ih2.maintenance_lessons set started_at=$2,ready_at=$3 where player_id=$1',[id,now,now+MAINTENANCE_MS]);state.revision++;state.observedAt=now;state.lastMessage='Maintenance lesson started: one of each material paid once. Ready in one minute; ordinary bench work keeps its own timer.';result={ok:true,message:state.lastMessage,revision:state.revision};}
            }else if(action.kind==='complete-lesson'){
              if(!near(position,'workshop','bench'))reject('Collect the lesson credit at your work bench.');
              else if(lesson.started_at===null||now<Number(lesson.ready_at))reject('The lesson is not ready yet.');
              else if(lesson.completed)reject('The lesson credit has already been collected.');
              else{await client.query('update ih2.maintenance_lessons set completed=true where player_id=$1',[id]);state.revision++;state.observedAt=now;state.lastMessage='Lesson complete. One paid maintenance credit is ready for the bridge committee; it is not a kit or currency.';result={ok:true,message:state.lastMessage,revision:state.revision};}
            }else{
              const bridge=(await client.query('select * from ih2.bridge where id=1 for update')).rows[0],route=bridge.contributed<bridge.target?'construction':'upkeep';
              if(!near(position,'square','bridge'))reject('Walk to the bridge committee to record your maintenance.');
              else if(!lesson.completed||lesson.redeemed)reject('You do not have an unused maintenance credit.');
              else if(action.route!==route||action.expectedBridgeContributed!==bridge.contributed)reject('The project changed. Your paid credit is safe; review its new route before recording it.');
              else{if(route==='construction')await this.fundBridge(client,now);await client.query('insert into ih2.maintenance_events(player_id,command_id,route,recorded_at) values($1,$2,$3,$4)',[id,action.id,route,now]);await client.query('update ih2.maintenance_lessons set redeemed=true,route=$2 where player_id=$1',[id,route]);await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing',[id,'maintenance-v1']);state.revision++;state.observedAt=now;state.lastMessage=route==='construction'?'Maintenance recorded toward the bridge. No kit or currency was created.':'Your upkeep inspection is recorded. No extra materials were charged.';result={ok:true,message:state.lastMessage,revision:state.revision};}
            }
          }else if (action.kind === 'contribute') {
            if (!near(position, 'square', 'bridge')) reject('Walk to the bridge committee before contributing.');
            else {
              const bridge = (await client.query('select * from ih2.bridge where id=1 for update')).rows[0];
              if (bridge.contributed >= bridge.target) reject('The bridge is fully funded. Keep your kit; construction or opening needs no extra payment.');
              else if (state.bridgeKits < 1) reject('You need one completed bridge kit. Nothing was spent.');
              else {
                state.bridgeKits--; state.revision++; state.observedAt = now;
                state.lastMessage = 'Contributed one bridge kit. The committee has recorded actual progress.';
                await this.fundBridge(client,now);
                await client.query('insert into ih2.bridge_contributions(player_id,command_id) values($1,$2)', [id, cmd.id]);
                await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing', [id, 'bridge-contributor-v1']);
                // Participation satisfies an unpaid lesson, but never consumes or cancels an already-paid credit.
                await client.query('insert into ih2.maintenance_lessons(player_id,legacy_satisfied) values($1,true) on conflict(player_id) do update set legacy_satisfied=true where ih2.maintenance_lessons.started_at is null',[id]);
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
            else if (!near(position, 'square', 'plot')&&!(isHome(position.room)&&position.homePlotId===ownPlot.id)) reject('Walk to the housing notice or your own home before upgrading.');
            else if (ownPlot.level >= 2) reject('This proof includes one home upgrade. Your furnishings remain safe.');
            else if (state.bridgeKits < PLOT_UPGRADE_KITS) reject(`The home upgrade requires ${PLOT_UPGRADE_KITS} additional bridge kits. Nothing was spent.`);
            else {
              state.bridgeKits -= PLOT_UPGRADE_KITS; state.revision++; state.observedAt = now; state.lastMessage = 'Home upgraded. Your furniture was not restructured.';
              await client.query('update ih2.plots set level=2 where owner_id=$1', [id]);
              result = { ok: true, message: state.lastMessage, revision: state.revision };
            }
          } else {
            if (!ownPlot || ownPlot.id !== action.plotId) reject('Only the owner can arrange this plot.');
            else if (!near(position, 'square', 'plot')&&!(isHome(position.room)&&position.homePlotId===ownPlot.id)) reject('Walk to the housing notice or your own home to arrange furniture.');
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
        if(cmd.kind==='garden'){
          const action=gardenActionSchema.safeParse(cmd.gardenAction);
          allowed=action.success&&gardenActionLocations(action.data).some(location=>near(position,location.room,location.stopId));
        }else if(cmd.kind==='survey')allowed=typeof cmd.station==='string'&&!!surveyId(cmd.station)&&near(position,'square','survey-'+cmd.station);
        else if (cmd.kind === 'gather') allowed = typeof cmd.resource === 'string' && near(position, 'square', cmd.resource);
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
            if(cmd.kind==='garden'){
              let publicChanged=state.garden.selectedMarker!==virtual.garden.selectedMarker;
              if((cmd.gardenAction as {action?:unknown})?.action==='submit-request'){
                const welcome=await client.query('update ih2.garden_welcome set credits=credits+1 where id=1 and credits<6 returning credits');
                publicChanged=welcome.rows.length>0;
                if(!publicChanged){applied.message='The welcome bed is already complete. Your personal request is recorded; no further public credit was needed.';state.lastMessage=applied.message;}
              }
              result.publicChanged=publicChanged;
            }
            result = { ok: true, message: applied.message, revision: state.revision,...(cmd.kind==='garden'?{publicChanged:result.publicChanged}: {}) };
          }
        }
      }
      if (result.ok) {
        if (questStep(state).complete) await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing', [id, 'orientation-v1']);
        await client.query('update ih2.players set workshop=$2,position=$3,quest_content_version=1,updated_at=now() where id=$1', [id, state, authoritativePosition]);
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
