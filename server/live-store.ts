import {isFieldRoute} from '../src/game/lower-pumpworks-room.ts';
import {SEWING_TABLE,type Tailoring} from '../src/game/tailoring.ts';
import {tailoringFromRow,writeTailoring} from './tailoring.ts';
import {MOSSBANK_AWARDS,SURVEY_ACTIONS,mossbankFromAwards,surveyMossbank,type SurveyAction,type SurveyPlace} from '../src/game/mossbank.ts';
import {INKMINT_STATIONS,inkmintSchema,type Inkmint} from '../src/game/nursery-inkmint.ts';
import {writeInkmint} from './nursery-inkmint.ts';
import {headwearName} from '../src/art/headwear.ts';
import {INKWOOD_HOOD,EARNED_HEADWEAR,ownsHeadwear,townHeadwear,type TownHeadwear} from '../src/game/earned-headwear.ts';
import {WINDOWSILL_STOP} from '../src/game/home-windowsill.ts';
import {glasshousePlantSchema,type GlasshousePlant} from '../src/game/glasshouse-plants.ts';
import {displayGlasshousePlant,keepGlasshousePlant} from './glasshouse-plants.ts';
import {fundGlasshouse} from './glasshouse.ts';
import {glasshouseView,glasshouseSnapshot,type GlasshouseSnapshot} from '../src/game/glasshouse.ts';
import { earnedNaturalist, HOME_KEEPSAKE_IDS, type HomeKeepsakeProjection } from '../src/game/home-keepsake.ts';
import { earnedFieldCertificate } from '../src/game/outing.ts';
import { privateOuting } from './outing.ts';
import {atParcelShelf,lockSnackParcel,readSnackShelf,snackCommandSchema,snackSlotHeld,writeSnackParcel} from './snack-shelf.ts';
import {confirmOrchardAction,orchardSnapshot} from './orchard-command.ts';
import {orchardActionSchema,type OrchardPantry} from '../src/game/orchard.ts';
import{readSnapshotRows}from'./snapshot-rows.ts';
import{outingAction}from'./outing.ts';
import{outingSchema,createOuting,type OutingState}from'../src/game/outing.ts';
import{validPublicHouse,liveHousingAccount}from'../src/game/live-housing.ts';
import{housingWorld}from'../src/game/housing-world.ts';
import{housingAction,privateHousing,housingAccount}from'./housing.ts';
import{type Occupant,emptyYard}from'../src/design/housing-contract.ts';
import {cafePublic,type CafePublicState} from '../src/game/cafe-public.ts';
import {cafeProjectSchema,createCafeProject,serveCafeCandidate,type CafeProject} from '../src/game/cafe-candidate.ts';
/** Current shared store. server/store.ts remains the frozen v5 compatibility reference. */
import{addressForPlot,frontForPlot,districtExists,positionContextValid,TOWN_GATE,HOME_SITE_PREFIX}from'../src/game/neighborhood.ts';
import {HOME_SLOTS,homeAllocation,homeAllocationValid,isCurrentHomeLayout,applyHomeArrangement,type HomeLayout} from '../src/game/live-home-layout.ts';
import {collectionGrant,type CollectionGrant} from '../src/game/collection-receipt.ts';
import {commissionActionSchema,commissionLocation,MOTIFS,type LetterboxMotif} from '../src/game/commission.ts';
import {carpentryActionSchema,carpentryActionLocations,CARPENTRY_RULES,type NoticeboardState} from '../src/game/carpentry.ts';
import {surveyId} from '../src/game/fieldwork.ts';
import {gardenActionSchema,gardenActionLocations,MARKER_IDS,type MarkerId} from '../src/game/garden.ts';
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { applyWorkshop, createWorkshop, loadWorkshop, questStep, PROP_IDS, PLACEMENT_SLOTS, type WorkshopState } from '../src/game/live-workshop.ts';
import { canStand, worlds, INKWOOD_GLASSHOUSE, TRAIL_LANDMARK_IDS, type Point, type Room } from '../src/game/world.ts';
import { PLOT_CLAIM_KITS, PLOT_UPGRADE_KITS, MAINTENANCE_MS, MAINTENANCE_COST, BRIDGE_BUILD_MS, TRAIL_PENNANT_AWARD } from '../src/game/town-rules.ts';

export type TownPosition = { room: Room; position: Point; homePlotId?: string; districtId?:string };
export type TownPlot = { id: string; ownerId: string; ownerName: string; level: 1 | 2; placements: WorkshopState['placements'];workroomPlacements:HomeLayout['workroomPlacements']; pennantOwned:boolean;letterboxMotif:LetterboxMotif|null;planId?:string|null;yard?:ReturnType<typeof emptyYard>;construction?:string|null;housingRevision?:number;keepsake?:HomeKeepsakeProjection['keepsake'];wallDisplay?:HomeKeepsakeProjection['wallDisplay'];windowsillPlant?:GlasshousePlant;windowsillStriped?:true };
export type MaintenanceLesson={startedAt:number|null;readyAt:number|null;completed:boolean;redeemed:boolean;route:'construction'|'upkeep'|null;legacySatisfied:boolean};
export type TownSnapshot = {
  glasshouse?:GlasshouseSnapshot;
  glasshousePlant?:GlasshousePlant;
  inkmint?:Inkmint;
  plantWindowsill?:true;
  outing:OutingState;
  orchard?: OrchardPantry | 'unavailable' | null;
  housingSites:Array<{plotId:string;ownerId:string;ownerName:string;phase:'building'|'ready'}>;housing:Awaited<ReturnType<typeof privateHousing>>;cafe:CafePublicState;
  playerId: string; name: string; workshop: WorkshopState; position: TownPosition;
  quest: { contentVersion: 1; awarded: string[] };
  bridge: { contributed: number; target: number; restored: boolean;phase:'collecting'|'building'|'open';startedAt:number|null;readyAt:number|null;openedAt:number|null;grandfathered:boolean };
  projectJournal:Array<{id:string;kind:'opened'|'grandfathered';effectiveAt:number|null;recordedAt:number}>;
  trail:{stamps:string[];pennantOwned:boolean};
  headwear?:TownHeadwear;
  tailoring?:Tailoring|null;
  plot: TownPlot | null; plots: TownPlot[];
  noticeboard:NoticeboardState;
  commissionTown:{styles:Array<{ownerId:string;ownerName:string;motif:LetterboxMotif}>};
  gardenTown:{credits:number;target:6;markers:Array<{ownerId:string;ownerName:string;marker:MarkerId}>};
  lesson:MaintenanceLesson; lessonQuote:{route:'construction'|'upkeep';expectedBridgeContributed:number};
  seasonKey: string; scores: { playerId: string; name: string; points: number }[]; serverTime: number;
};
export type TownResult = { ok: boolean; message: string; replayed: boolean; revision: number; snapshot: TownSnapshot; publicChanged?:boolean;collection?:CollectionGrant;teapotAwarded?:boolean };
type Receipt = Omit<TownResult, 'snapshot' | 'replayed'>;
type PlayerRow = { id: string; name: string; workshop: WorkshopState; position: TownPosition; quest_content_version: number; orchard:unknown; worn_headwear:unknown };
const idSchema = z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const base = { id: idSchema, expectedRevision: z.number().int().min(0).max(1_000_000) };
const slotSchema = z.enum(HOME_SLOTS.map(s => s.id) as [string, ...string[]]);
const mossbankCommandSchema=z.object({
 ...base,
 kind:z.literal('mossbank-survey'),action:z.enum(SURVEY_ACTIONS),
}).strict();
const mossbankStation:Record<SurveyAction,SurveyPlace>={
 join:'mossbank-mill',windrow:'mossbank-windrow',flume:'mossbank-flume',finish:'mossbank-mill',
};
const specialSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('contribute') }).strict(),
  z.object({...base,kind:z.literal('stamp-trail'),landmarkId:z.enum(TRAIL_LANDMARK_IDS)}).strict(),
  z.object({...base,kind:z.literal('wear-headwear'),item:z.enum(EARNED_HEADWEAR).nullable()}).strict(),
  z.object({...base,kind:z.literal('enter-neighborhood'),districtId:z.string().regex(/^[1-9][0-9]{0,17}$/)}).strict(),
  z.object({ ...base, kind: z.literal('enter-home'), plotId:z.string().regex(/^[1-9][0-9]{0,17}$/) }).strict(),
  z.object({ ...base, kind:z.literal('start-lesson'), route:z.enum(['construction','upkeep']),expectedBridgeContributed:z.number().int().min(0).max(3) }).strict(),
  z.object({ ...base, kind:z.literal('complete-lesson') }).strict(),
  z.object({ ...base, kind:z.literal('redeem-lesson'),route:z.enum(['construction','upkeep']),expectedBridgeContributed:z.number().int().min(0).max(3) }).strict(),
  z.object({ ...base, kind: z.literal('claim-plot') }).strict(),
  z.object({ ...base, kind: z.literal('upgrade-plot'), plotId: z.string().regex(/^[1-9][0-9]{0,17}$/) }).strict(),
  z.object({...base,kind:z.literal('display-home-keepsake'),plotId:z.string().regex(/^[1-9][0-9]{0,17}$/),keepsake:z.enum(HOME_KEEPSAKE_IDS).nullable()}).strict(),
  z.object({ ...base, kind: z.literal('edit-plot'), plotId: z.string().regex(/^[1-9][0-9]{0,17}$/), action: z.enum(['place', 'remove']), slot: slotSchema, prop: z.enum(PROP_IDS).optional(), fromSlot: slotSchema.optional() }).strict()
]);
const orchardCommandSchema = z.object({...base,kind:z.literal('orchard'),expectedPlayerId:idSchema,action:orchardActionSchema}).strict();
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
function validPosition(value:TownPosition):boolean{return value.room!=='lodging'&&!!worlds[value.room]&&canStand(value.room,value.position,isFieldRoute(value.room)?worlds[value.room]:undefined)&&positionContextValid(value);}
export function canonicalHomePosition(value:TownPosition,plots:TownPlot[]):TownPosition{
 if(value.room==='lodging'||!positionContextValid(value))throw new Error('Invalid durable room context.');
 if(value.room==='neighborhood'&&!districtExists(value.districtId!,plots))throw new Error('Unknown durable neighborhood.');
 if(!isHome(value.room))return value;
 const plot=plots.find(p=>p.id===value.homePlotId);
 if(!plot)return {room:'square',position:{x:30,y:35.5}};
 const room=plot.level===2?'home-expanded':'home';return {room,homePlotId:plot.id,...(value.districtId?{districtId:addressForPlot(plot.id).block}:{}),position:canStand(room,value.position)?value.position:{x:9,y:11}};
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
export class GlasshouseClosed extends Error {}
export class MossbankClosed extends Error {}

export class TownStore {
  readonly pool: Pool;
  private now: () => number;private occupants:()=>readonly Occupant[];private roster?:ReadonlySet<string>;
  constructor(pool: Pool, options: { now?: () => number;occupants?:()=>readonly Occupant[]; roster?:readonly string[] } = {}) { this.roster=options.roster?new Set(options.roster):undefined;this.pool = pool; this.now = options.now ?? Date.now;this.occupants=options.occupants??(()=>[]); }
  private clock(): number {
    const now = this.now();
    if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - 86400_000) throw new Error('Invalid server clock.');
    return now;
  }
  async ensurePlayer(id: string, name = id, confirmedPosition?: () => TownPosition | undefined): Promise<TownSnapshot> {
    idSchema.parse(id); if (!name || name.length > 40) throw new Error('Invalid synthetic player name.');
    const now = this.clock();
    await this.pool.query('insert into ih2.players(id,name,workshop,position) values($1,$2,$3,$4) on conflict(id) do nothing', [id, name, createWorkshop(now), initialPosition]);
    await this.pool.query('insert into ih2.maintenance_lessons(player_id) values($1) on conflict do nothing',[id]);
    return this.snapshot(id,confirmedPosition);
  }
  private readState(row: PlayerRow, now: number): WorkshopState {
    const parsed = loadWorkshop(row.workshop, now);
    if (parsed.recovered) throw new Error('Stored workshop failed validation. Progress was not replaced.');
    return parsed.state;
  }
  async savePosition(id: string, position: TownPosition): Promise<void> {
    if (!(positionContextValid(position)&&(position.room==='neighborhood'?canStand(position.room,position.position,housingWorld((await this.pool.query('select id::text,plan_id as "planId" from ih2.plots')).rows,position.districtId!)):validPosition(position)))) throw new Error('Invalid server-validated position.');
    if((position.room==='trail'||position.room==='mossbank')&&(await this.snapshot(id)).bridge.phase!=='open'){
      if(position.room==='mossbank')throw new MossbankClosed('The restored Inkwood bridge leads to Mossbank.');
      throw new Error('The trail is not open.');
    }
    if(position.room==='glasshouse'&&!(await this.glasshouseOpen()))throw new GlasshouseClosed('The Glasshouse is still closed.');
    if(isHome(position.room)){const plot=(await this.pool.query('select level from ih2.plots where id=$1',[position.homePlotId])).rows[0];if(!plot||(plot.level===2?'home-expanded':'home')!==position.room)throw new Error('Home instance is not valid.');}
    await this.pool.query('update ih2.players set position=$2,updated_at=now() where id=$1', [id, position]);
  }
  private async glasshouseOpen():Promise<boolean>{
    const row=(await this.pool.query('select state from ih2.glasshouse_project where id=1')).rows[0];
    return glasshouseView(row?.state,this.clock())?.phase==='open';
  }
  private async settleBridge(client:PoolClient,now:number,includeCafe=true){
    const opened=await client.query("update ih2.bridge set phase='open',opened_at=ready_at where id=1 and phase='building' and ready_at<=$1 returning ready_at",[now]);
    await client.query("update ih2.noticeboard set phase='open',opened_at=ready_at where id=1 and phase='installing' and ready_at<=$1",[now]);
    if(opened.rows.length)await client.query("insert into ih2.project_events(id,kind,effective_at,recorded_at) values('bridge-opened-v2','opened',$1,$2) on conflict do nothing",[opened.rows[0].ready_at,now]);
    if(includeCafe)await client.query("update ih2.cafe_project set opened_at=ready_at,observed_at=greatest(observed_at,$1) where id=1 and ready_at<=$1 and opened_at is null",[now]);
  }
  private async fundBridge(client:PoolClient,now:number){
    await client.query("update ih2.bridge set contributed=contributed+1,phase=case when contributed+1=target then 'building' else phase end,started_at=case when contributed+1=target then $1 else started_at end,ready_at=case when contributed+1=target then $1+$2 else ready_at end where id=1",[now,BRIDGE_BUILD_MS]);
  }
  private async readSnapshot(client: PoolClient, id: string, now: number, confirmedPosition?: () => TownPosition | undefined): Promise<TownSnapshot> {
    const key=seasonKey(now),data=await readSnapshotRows(client,id,now,key);
    if(!data)throw new Error('Unknown synthetic player.');
    const player=data.player;
    const plots:TownPlot[] = data.plots.map(p => ({ id:p.id,ownerId:p.owner_id,ownerName:p.name,level:p.level as 1|2,placements:p.placements,workroomPlacements:p.workroom_placements,pennantOwned:p.pennant_owned,planId:p.plan_id,yard:p.yard,housingRevision:p.housing_revision,letterboxMotif:(MOTIFS as readonly unknown[]).includes(p.letterbox_motif)?p.letterbox_motif as LetterboxMotif:null }));
    const position=canonicalHomePosition(confirmedPosition?.()??player.position,plots);
    const visited=isHome(position.room)?plots.find(p=>p.id===position.homePlotId):undefined;
    const displayed=data.plots.find(p=>p.id===visited?.id)?.keepsake;
    if(visited&&displayed==='naturalist')visited.keepsake=displayed;
    if(visited&&(displayed==='woodland-certificate'||displayed==='alder-swatch'))visited.wallDisplay=displayed;

    const visiblePlant=z.object({plant:glasshousePlantSchema,striped:z.boolean()}).safeParse(data.plots.find(p=>p.id===visited?.id)?.windowsill_plant);
    if(visited&&visiblePlant.success){
      visited.windowsillPlant=visiblePlant.data.plant;
      if(visiblePlant.data.striped)visited.windowsillStriped=true;
    }
    if(plots.some(p=>!validPublicHouse(p)))throw new Error('Stored home layout failed validation. Progress was not replaced.');
    const bridgeRow = data.bridge;
    // Explicit projection only: never select other residents' private garden JSON.
    const displayRows=data.display_rows;
    const gardenTown:TownSnapshot['gardenTown']={credits:bridgeRow.welcome_credits,target:6,markers:displayRows.filter(row=>(MARKER_IDS as readonly unknown[]).includes(row.marker)).map(row=>({ownerId:row.id,ownerName:row.name,marker:row.marker as MarkerId}))};
    const commissionTown:TownSnapshot['commissionTown']={styles:displayRows.filter(row=>(MOTIFS as readonly unknown[]).includes(row.motif)).map(row=>({ownerId:row.id,ownerName:row.name,motif:row.motif as LetterboxMotif}))};
    const awarded = data.awards.map(r => r.quest_id);
    const lessonRow=data.lesson;
    const lesson:MaintenanceLesson={startedAt:lessonRow?.started_at===null||!lessonRow?null:Number(lessonRow.started_at),readyAt:lessonRow?.ready_at===null||!lessonRow?null:Number(lessonRow.ready_at),completed:!!lessonRow?.completed,redeemed:!!lessonRow?.redeemed,route:lessonRow?.route??null,legacySatisfied:!!lessonRow?.legacy_satisfied};
    const stamps=data.stamps.map(row=>row.landmark_id);
    const projectJournal=data.project_events.map(row=>({id:row.id,kind:row.kind as 'opened'|'grandfathered',effectiveAt:row.effective_at===null?null:Number(row.effective_at),recordedAt:Number(row.recorded_at)}));
    const scores = data.scores.map(r => ({ playerId: r.player_id, name: r.name, points: r.points }));
    const noticeboard:NoticeboardState={credits:bridgeRow.notice_credits,phase:bridgeRow.notice_phase,startedAt:bridgeRow.notice_started===null?null:Number(bridgeRow.notice_started),readyAt:bridgeRow.notice_ready===null?null:Number(bridgeRow.notice_ready),openedAt:bridgeRow.notice_opened===null?null:Number(bridgeRow.notice_opened)};
    const workshop=this.readState(player,now),own=plots.find(p=>p.ownerId===id);if(own&&!homeAllocationValid(workshop,own))throw new Error('Stored furniture allocation failed validation. Nothing was replaced.');
    const cafeRow=data.cafe;const cafe=cafePublic(this.readCafe(cafeRow));
    const keptPlant=glasshousePlantSchema.safeParse(data.glasshouse_plant);
    const inkmint=inkmintSchema.safeParse(data.inkmint);
    const glasshouse=glasshouseSnapshot(data.glasshouse,near(position,'trail',INKWOOD_GLASSHOUSE.id)?data.glasshouse_review:null,id,now);
    const housingSites=data.housing_sites,housing=data.housing;liveHousingAccount(id,workshop,own??null,housing.build);return {plantWindowsill:true,tailoring:tailoringFromRow(data.tailoring),...(glasshouse?{glasshouse}:{}),...(keptPlant.success?{glasshousePlant:keptPlant.data,...(inkmint.success?{inkmint:inkmint.data}:{})}:{}),orchard:orchardSnapshot(player.orchard),outing:data.outing?outingSchema.parse(data.outing.state):createOuting(),housingSites,housing,cafe,commissionTown,noticeboard,gardenTown, playerId: id, name: player.name, workshop, position, lesson:lesson,lessonQuote:{route:bridgeRow.contributed<bridgeRow.target?'construction':'upkeep',expectedBridgeContributed:bridgeRow.contributed}, quest: { contentVersion: 1, awarded }, projectJournal,trail:{stamps,pennantOwned:awarded.includes(TRAIL_PENNANT_AWARD)},headwear:townHeadwear(awarded.includes(TRAIL_PENNANT_AWARD),player.worn_headwear,workshop.carpentry.recorded>0),bridge: { contributed: bridgeRow.contributed, target: bridgeRow.target, restored: bridgeRow.phase==='open',phase:bridgeRow.phase,startedAt:bridgeRow.started_at===null?null:Number(bridgeRow.started_at),readyAt:bridgeRow.ready_at===null?null:Number(bridgeRow.ready_at),openedAt:bridgeRow.opened_at===null?null:Number(bridgeRow.opened_at),grandfathered:bridgeRow.grandfathered }, plot: plots.find(p => p.ownerId === id) ?? null, plots, seasonKey: key, scores, serverTime: now };
  }
  async snapshot(id: string, confirmedPosition?: () => TownPosition | undefined): Promise<TownSnapshot> {
    const client = await this.pool.connect();
    try { await client.query('begin');await this.settleBridge(client,this.clock());await client.query('commit');await client.query('begin isolation level repeatable read read only'); const result = await this.readSnapshot(client, id, this.clock(), confirmedPosition); await client.query('commit'); return result; }
    catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
  snackShelf(id:string) { return readSnackShelf(this.pool,id,this.clock(),this.roster?[...this.roster]:undefined); }
  private readCafe(row:Record<string,unknown>):CafeProject{return cafeProjectSchema.parse({version:1,credits:row.credits,observedAt:Number(row.observed_at),fundedAt:row.funded_at===null?null:Number(row.funded_at),readyAt:row.ready_at===null?null:Number(row.ready_at),openedAt:row.opened_at===null?null:Number(row.opened_at)});}
  async execute(id: string, raw: unknown, position: TownPosition): Promise<TownResult> {
    const envelope = envelopeSchema.safeParse(raw);
    if (!envelope.success) return { ok: false, message: 'Invalid command. Nothing changed.', replayed: false, revision: -1, snapshot: await this.snapshot(id) };
    const cmd = envelope.data;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("set local lock_timeout='3s'");
      const request=cmd.kind==='snack-parcel'?snackCommandSchema.safeParse(raw):null;
      const snack=request?.success && request.data.expectedPlayerId===id && atParcelShelf(position)?request.data.action:null;
      const recipient=snack?.kind==='leave' && snack.recipientId!==id && (!this.roster||this.roster.has(snack.recipientId))?snack.recipientId:null;
      // Only sending needs the recipient's foreign-key target. Match lock order
      // for crossed sends. Accept, decline and return lock the actor and parcel.
      const lockedPlayers=recipient===null
       ?await client.query<PlayerRow>('select * from ih2.players where id=$1 for update',[id])
       :await client.query<PlayerRow>('select * from ih2.players where id in ($1,$2) order by id for update',[id,recipient]);
      const player=lockedPlayers.rows.find(row=>row.id===id);
      if (!player) throw new Error('Unknown synthetic player.');
      const parcel=snack && 'parcelId' in snack?await lockSnackParcel(client,id,snack):null;
      let now = this.clock();
      let cafeRow:Record<string,unknown>|undefined,clockWentBack=false;
      if(cmd.kind==='cafe-serve'){
        // Keep the shared bridge -> noticeboard -> cafe lock order. Sample
        // after all three so a queued serve also settles openings at the
        // same observation time, rather than returning an overdue closed door.
        await client.query('select id from ih2.bridge where id=1 for update');
        await client.query('select id from ih2.noticeboard where id=1 for update');
        cafeRow=(await client.query('select * from ih2.cafe_project where id=1 for update')).rows[0];
        const afterLock=this.clock();clockWentBack=afterLock<now;
        if(!clockWentBack)now=afterLock;
      }
      await this.settleBridge(client,now,false);
      let state = this.readState(player, now);let authoritativePosition=position;
      let orchardUpdate:OrchardPantry|undefined;
      const prior = (await client.query('select payload_hash,result from ih2.command_receipts where player_id=$1 and command_id=$2', [id, cmd.id])).rows[0];
      if (prior) {
        const result: Receipt = prior.payload_hash === hash(raw) ? prior.result : { ok: false, message: 'That command ID was already used for a different request.', revision: state.revision };
        const snapshot = await this.readSnapshot(client, id, now); await client.query('commit');
        return { ...result, replayed: prior.payload_hash === hash(raw), snapshot };
      }
      let result: Receipt = { ok: false, message: '', revision: state.revision };
      const plotColumn = cmd.kind==='display-home-keepsake'?',keepsake':cmd.kind==='glasshouse-inkmint'?',glasshouse_plant_visible':'';
      const ownPlot = (await client.query('select id::text,owner_id,level,placements,workroom_placements,plan_id,yard'+plotColumn+' from ih2.plots where owner_id=$1 for update', [id])).rows[0];
      const ownLayout:(HomeLayout&{yard?:ReturnType<typeof emptyYard>})|null=ownPlot?{level:ownPlot.level,placements:ownPlot.placements,workroomPlacements:ownPlot.workroom_placements,yard:ownPlot.yard}:null;
      if(ownLayout&&(!isCurrentHomeLayout(ownLayout)||!homeAllocationValid(state,ownLayout)))throw new Error('Stored home layout failed validation. Nothing was replaced.');
      const special = specialSchema.safeParse(raw);
      const specialKinds = ['contribute', 'claim-plot', 'upgrade-plot', 'edit-plot','display-home-keepsake','enter-home','enter-neighborhood','start-lesson','complete-lesson','redeem-lesson','stamp-trail','wear-headwear'];
      const contextPlot=isHome(position.room)?(await client.query('select id::text,owner_id,level from ih2.plots where id=$1',[position.homePlotId])).rows[0]:null;
      const validContext=(!isHome(position.room)||!!contextPlot&&position.room===(contextPlot.level===2?'home-expanded':'home'))&&(position.room!=='neighborhood'||districtExists(position.districtId!, (await client.query('select id::text from ih2.plots')).rows))&&(position.room!=='trail'||(await client.query('select phase from ih2.bridge where id=1')).rows[0].phase==='open');
      const reject = (message: string) => { result = { ok: false, message, revision: state.revision }; };
      if (cmd.expectedRevision !== state.revision) reject('Your town state changed. Review the refreshed bag and try again.');
      else if (!(position.room==='neighborhood'?canStand(position.room,position.position,housingWorld((await client.query('select id::text,plan_id as "planId" from ih2.plots')).rows,position.districtId!)):validPosition(position))||!validContext) reject('A valid server position is required.');
      else if (clockWentBack || now < state.observedAt) reject('The server clock moved backwards. Your progress is unchanged.');
      else if (state.revision >= 1_000_000) reject('Prototype command limit reached. Your progress is unchanged.');
      else if(cmd.kind==='tailoring'){
        const decision=await writeTailoring(client,id,raw,near(position,'workshop',SEWING_TABLE.id),state.inventory.supplies,now);
        if(!decision.ok)reject(decision.message);
        else{
          state={...state,inventory:{...state.inventory,supplies:state.inventory.supplies-decision.cost},
            revision:state.revision+1,observedAt:now,lastMessage:decision.message};
          result={ok:true,message:decision.message,revision:state.revision};
        }
      }
      else if(cmd.kind==='mossbank-survey'){
        const submitted=mossbankCommandSchema.safeParse(raw);
        if(!submitted.success)reject('That route card request is invalid.');
        else{
          const action=submitted.data.action,station=mossbankStation[action];
          if(!near(position,'mossbank',station))reject('Walk to the right Mossbank station first.');
          else{
            const rows=await client.query<{quest_id:string}>(
              'select quest_id from ih2.quest_awards where player_id=$1 and quest_id=any($2::text[])',
              [id,Object.values(MOSSBANK_AWARDS)],
            );
            const survey=mossbankFromAwards(rows.rows.map(row=>row.quest_id));
            if(!survey)reject('The route card could not be read. It was kept unchanged.');
            else{
              const applied=surveyMossbank(survey,action,station);
              if(!applied.ok)reject(applied.message);
              else{
                const recorded=await client.query(
                  'insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing returning quest_id',
                  [id,MOSSBANK_AWARDS[action]],
                );
                if(!recorded.rowCount)reject('That observation is already saved.');
                else{
                  state={...state,revision:state.revision+1,observedAt:now,lastMessage:applied.message};
                  result={ok:true,message:applied.message,revision:state.revision,publicChanged:false};
                }
              }
            }
          }
        }
      }
      else if(cmd.kind==='glasshouse-inkmint'){
        const ownSill=isHome(position.room)&&!!ownPlot&&position.homePlotId===ownPlot.id&&
          Math.hypot(position.position.x-WINDOWSILL_STOP.point.x,position.position.y-WINDOWSILL_STOP.point.y)<=1.9;
        const decision=await writeInkmint(client,id,raw,{
          tray:near(position,'glasshouse',INKMINT_STATIONS.tray),
          pottery:near(position,'glasshouse',INKMINT_STATIONS.pottery),
          ownSill,
          shown:ownPlot?.glasshouse_plant_visible===true,
        },now);
        if(!decision.ok)reject(decision.message);
        else{
          state={...state,revision:state.revision+1,observedAt:now,lastMessage:decision.message};
          result={ok:true,message:decision.message,revision:state.revision,publicChanged:decision.publicChanged};
        }
      }
      else if(cmd.kind==='glasshouse-display-plant'){
        const atSill=isHome(position.room)&&Math.hypot(position.position.x-WINDOWSILL_STOP.point.x,position.position.y-WINDOWSILL_STOP.point.y)<=1.9;
        const decision=await displayGlasshousePlant(client,id,raw,position.homePlotId===ownPlot?.id?ownPlot?.id:undefined,atSill);
        if(!decision.ok)reject(decision.message);
        else{
          state={...state,revision:state.revision+1,observedAt:now,lastMessage:decision.message};
          result={ok:true,message:decision.message,revision:state.revision,publicChanged:true};
        }
      }
      else if(cmd.kind==='glasshouse-keep-plant'){
        const decision=await keepGlasshousePlant(client,id,raw,near(position,'glasshouse','glasshouse-keeper'),now);
        if(!decision.ok)reject(decision.message);
        else{
          state={...state,revision:state.revision+1,observedAt:now,lastMessage:decision.message};
          result={ok:true,message:decision.message,revision:state.revision,publicChanged:false};
        }
      }
      else if(cmd.kind==='glasshouse-review'||cmd.kind==='glasshouse-confirm'){
        const earliest=now;
        const action=await fundGlasshouse(client,id,raw,state,near(position,'trail',INKWOOD_GLASSHOUSE.id),()=>{
          const current=this.clock();
          return current<earliest?NaN:current;
        });
        if(!action.ok)reject(action.message);
        else{
          now=action.now;
          state=action.state;
          result={ok:true,message:action.message,revision:state.revision,publicChanged:action.publicChanged};
        }
      }
      else if(cmd.kind==='snack-parcel') {
        if(!request?.success)reject('That parcel request is invalid.');
        else if(request.data.expectedPlayerId!==id)reject('The active resident changed. No parcel was moved.');
        else if(!snack)reject('Walk to the café parcel shelf first.');
        else{
          const outcome=await writeSnackParcel(client,id,snack,orchardSnapshot(player.orchard),parcel,
            recipient!==null&&lockedPlayers.rows.some(row=>row.id===recipient),now);
          if(!outcome.ok)reject(outcome.message);
          else{
            orchardUpdate=outcome.pantry;
            state={...state,revision:state.revision+1,observedAt:now,lastMessage:outcome.message};
            result={ok:true,message:outcome.message,revision:state.revision};
          }
        }
      }
      else if(cmd.kind==='orchard'){
        const request=orchardCommandSchema.safeParse(raw);
        if(!request.success)reject('That orchard request is invalid.');
        else if(request.data.expectedPlayerId!==id)reject('The active resident changed. Nothing was picked or packed.');
        else {
          const pantry=orchardSnapshot(player.orchard);
          const needSlot=pantry && pantry!=='unavailable' && pantry.version===2 &&
            pantry.gifts.offered>pantry.gifts.returned && ['pack','collect'].includes(request.data.action.kind);
          const reservedSlot=!!needSlot && await snackSlotHeld(client,id);
          const applied=confirmOrchardAction(player.orchard,request.data.action,position,now,reservedSlot);
          if(!applied.ok)reject(applied.message);
          else {
            orchardUpdate=applied.state;
            state={...state,revision:state.revision+1,observedAt:now,lastMessage:applied.message};
            result={ok:true,message:applied.message,revision:state.revision};
          }
        }
      }
      else if(cmd.kind==='outing'){
        const shape=z.object({...base,kind:z.literal('outing'),outingAction:z.unknown()}).strict().safeParse(raw);
        if(!shape.success)reject('Invalid outing request. Nothing changed.');
        else try{const applied=await outingAction(client,id,shape.data.outingAction,now,position);if(!applied.ok)reject(applied.message);else{state={...state,revision:state.revision+1,observedAt:now,lastMessage:applied.message};result={ok:true,message:applied.message,revision:state.revision};}}catch(error){if(error instanceof z.ZodError)reject('Invalid outing choice. Nothing changed.');else throw error;}
      }
      else if(cmd.kind.startsWith('housing-')){
        const atHome=!!ownPlot&&isHome(position.room)&&position.homePlotId===ownPlot.id;
        const atYard=!!ownPlot&&position.room==='neighborhood'&&position.districtId===addressForPlot(ownPlot.id).block&&near(position,'neighborhood',HOME_SITE_PREFIX+addressForPlot(ownPlot.id).slot);
        if(!near(position,'square','plot')&&!atHome&&!atYard)reject('Visit the housing registry or your own home to manage housing.');
        else{try{const applied=await housingAction(client,id,state,ownPlot??null,raw,now,this.occupants());state=applied.state;result={ok:applied.ok,message:applied.message,revision:state.revision,publicChanged:applied.publicChanged};}catch(error){if(error instanceof z.ZodError)reject('This housing choice could not be confirmed. Refresh before continuing.');else if(error instanceof Error&&(/quote|plan|builders|address|space|clock|belongings/i).test(error.message))reject(error.message);else throw error;}}
      }
      else if(cmd.kind==='cafe-serve'){
        const action=z.object({...base,kind:z.literal('cafe-serve'),presentation:z.enum(['slices','soup','formal'])}).strict().safeParse(raw);
        if(!action.success)reject('Invalid tasting request. Nothing changed.');
        else if(!near(position,'square','cafe'))reject('Walk to the café counter before serving.');
        else{
          const project=this.readCafe(cafeRow!);
          const applied=serveCafeCandidate(state,project,{expectedRevision:action.data.expectedRevision,presentation:action.data.presentation},now);
          if(!applied.ok)reject(applied.message);
          else{state=applied.state;const p=applied.project;await client.query('update ih2.cafe_project set credits=$1,observed_at=$2,funded_at=$3,ready_at=$4,opened_at=$5 where id=1',[p.credits,p.observedAt,p.fundedAt,p.readyAt,p.openedAt]);result={ok:true,message:applied.message,revision:state.revision,teapotAwarded:applied.teapotAwarded,publicChanged:applied.publicChanged};}
        }
      }
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
          }else if(action.kind==='wear-headwear'){
            const earned=await client.query('select 1 from ih2.quest_awards where player_id=$1 and quest_id=$2',[id,TRAIL_PENNANT_AWARD]);
            const current=townHeadwear(earned.rows.length>0,player.worn_headwear,state.carpentry.recorded>0);
            if(action.item!==null&&!ownsHeadwear(current,action.item)){
              reject(action.item===INKWOOD_HOOD?'Record all three Inkwood discoveries to earn the hood.':'Record your first completed easel with Nella to earn the cap.');
            }
            else if(current.worn===action.item)reject('That headwear choice is already saved.');
            else{
              await client.query('update ih2.players set worn_headwear=$2 where id=$1',[id,action.item]);
              const message=action.item?headwearName[action.item]+' equipped. Nearby residents can see it.':'Headwear put away.';
              state={...state,revision:state.revision+1,observedAt:now,lastMessage:message};
              result={ok:true,message,revision:state.revision};
            }
          }else if(action.kind==='enter-neighborhood'){
            const plots=(await client.query('select id::text from ih2.plots')).rows;
            if(!near(position,'square','residential-gate')&&!near(position,'neighborhood','neighborhood-exit')&&!near(position,'neighborhood','neighborhood-directory'))reject('Walk to the neighborhood gate before choosing a street.');
            else if(!districtExists(action.districtId,plots))reject('That neighborhood has no homes yet.');
            else{authoritativePosition={room:'neighborhood',districtId:action.districtId,position:{...TOWN_GATE}};state.revision++;state.observedAt=now;state.lastMessage='Entered neighborhood '+action.districtId+'. Your neighbors have been advised to look busy.';result={ok:true,message:state.lastMessage,revision:state.revision};}
          }else if(action.kind==='enter-home'){
            const target=(await client.query('select id::text,level from ih2.plots where id=$1',[action.plotId])).rows[0];
            const address=addressForPlot(action.plotId),streetDoor=position.room==='neighborhood'&&position.districtId===address.block&&near(position,'neighborhood',HOME_SITE_PREFIX+address.slot);
            if(!streetDoor&&!near(position,'square','plot')&&!near(position,'square','home-front'))reject('Walk to the home entrance before entering.');
            else if(!target)reject('That home does not exist.');
            else{authoritativePosition={room:target.level===2?'home-expanded':'home',homePlotId:target.id,...(streetDoor?{districtId:address.block}:{}),position:{x:9,y:11}};state.revision++;state.observedAt=now;state.lastMessage='Entered home '+target.id+'. Visitors may look; only the owner may arrange it.';result={ok:true,message:state.lastMessage,revision:state.revision};}
          }else if(action.kind==='display-home-keepsake'){
            if(!ownPlot||ownPlot.id!==action.plotId||!isHome(position.room)||position.homePlotId!==ownPlot.id)
              reject('Only the owner can change the keepsake from inside this home.');
            else if(action.keepsake==='naturalist'&&!earnedNaturalist(state.sketches))
              reject('Record all three tree studies to earn the certificate.');
            else if(action.keepsake==='woodland-certificate'&&!earnedFieldCertificate((await privateOuting(client,id)).journal))
              reject('Record both woodland conditions to earn the field certificate.');
            else if(action.keepsake==='alder-swatch'&&!(await client.query(
              'select 1 from ih2.quest_awards where player_id=$1 and quest_id=$2',[id,MOSSBANK_AWARDS.finish],
            )).rowCount)reject('Finish Wren’s survey to earn the alder swatch.');
            else if(action.keepsake===ownPlot.keepsake)
              reject(action.keepsake==='alder-swatch'?'The alder swatch is already displayed.':action.keepsake?'This certificate is already displayed.':'The display is already empty.');
            else {
              await client.query('update ih2.plots set keepsake=$2 where owner_id=$1',[id,action.keepsake]);
              state.revision++;
              state.observedAt=now;
              state.lastMessage=action.keepsake==='alder-swatch'?'Alder swatch displayed for visitors.':
                action.keepsake?'Certificate displayed for visitors.':
                ownPlot.keepsake==='alder-swatch'?'Frame taken down. The swatch stays in Journal.':'Frame taken down. The certificate stays in Journal.';
              result={ok:true,message:state.lastMessage,revision:state.revision,publicChanged:true};
            }
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
          } else if(action.kind==='claim-plot'||action.kind==='upgrade-plot'){reject('Choose a home and review a construction quote. No immediate purchase was made.');
          } else {
            if (!ownPlot || ownPlot.id !== action.plotId) reject('Only the owner can arrange this plot.');
            else if (!near(position, 'square', 'plot')&&!(isHome(position.room)&&position.homePlotId===ownPlot.id)) reject('Walk to the housing notice or your own home to arrange furniture.');
            else if (action.action === 'place' && !action.prop) reject('Choose an owned furnishing to place.');
            else {
              const placement={id:action.id,expectedRevision:action.expectedRevision,action:action.action,slot:action.slot,...(action.prop?{prop:action.prop}:{}),...(action.fromSlot?{fromSlot:action.fromSlot}:{})};
              const applied=applyHomeArrangement(state,ownLayout!,placement,now);
              if (!applied.ok) reject(applied.message);
              else {
                await client.query('update ih2.plots set placements=$2,workroom_placements=$3 where owner_id=$1',[id,applied.layout.placements,applied.layout.workroomPlacements]);
                state=applied.state;
                result = { ok: true, message: applied.message, revision: state.revision };
              }
            }
          }
        }
      } else {
        let allowed = false;
        if(cmd.kind==='commission'){
          const action=commissionActionSchema.safeParse(cmd.commissionAction);
          allowed=action.success&&near(position,commissionLocation(action.data).room,commissionLocation(action.data).stopId);
        }else if(cmd.kind==='carpentry'){
          const action=carpentryActionSchema.safeParse(cmd.carpentryAction);
          // Equipping an owned tool is portable; earning and using it still require their stations.
          allowed=action.success&&(action.data.action==='equip-saw'||carpentryActionLocations(action.data).some(location=>near(position,location.room,location.stopId)));
        }else if(cmd.kind==='garden'){
          const action=gardenActionSchema.safeParse(cmd.gardenAction);
          allowed=action.success&&gardenActionLocations(action.data).some(location=>near(position,location.room,location.stopId));
        }else if(cmd.kind==='survey')allowed=typeof cmd.station==='string'&&!!surveyId(cmd.station)&&near(position,'square','survey-'+cmd.station);
        else if (cmd.kind === 'gather') allowed = typeof cmd.resource === 'string' && near(position, 'square', cmd.resource);
        else if (cmd.kind === 'craft' || cmd.kind === 'claim') allowed = near(position, 'workshop', 'bench');
        else if (cmd.kind === 'place' || cmd.kind === 'remove') allowed = position.room === 'workshop';
        if (!allowed) reject('Walk to the right place before using that action.');
        else {
          const virtual = structuredClone(state);
          const allocations=cmd.kind==='place'&&ownPlot?Object.fromEntries(PROP_IDS.map(prop=>[prop,homeAllocation(ownLayout!,prop)])):{};
          const applied = applyWorkshop(virtual, raw, now,allocations);
          if (!applied.ok) reject(applied.message);
          else {
            const owned = state.owned; state = applied.state;
            if (cmd.kind === 'place') state.owned = owned;
            if(cmd.kind==='commission'){
              const before=virtual.commission,after=state.commission;
              const visibleBefore=before.published||!!ownPlot&&homeAllocation(ownLayout!,'letterbox')>0;
              result.publicChanged=before.published!==after.published||before.motif!==after.motif&&(visibleBefore||after.published);
            }
            if(cmd.kind==='garden'){
              let publicChanged=state.garden.selectedMarker!==virtual.garden.selectedMarker;
              if((cmd.gardenAction as {action?:unknown})?.action==='submit-request'){
                const welcome=await client.query('update ih2.garden_welcome set credits=credits+1 where id=1 and credits<6 returning credits');
                publicChanged=welcome.rows.length>0;
                if(!publicChanged){applied.message='The welcome bed is already complete. Your personal request is recorded; no further public credit was needed.';state.lastMessage=applied.message;}
              }
              result.publicChanged=publicChanged;
            }
            if(cmd.kind==='carpentry'){
              result.publicChanged=false;
              if((cmd.carpentryAction as {action?:unknown})?.action==='record-easel'){
                const record=await client.query("update ih2.noticeboard set credits=credits+1,phase=case when credits+1=6 then 'installing' else phase end,started_at=case when credits+1=6 then $1 else started_at end,ready_at=case when credits+1=6 then $1+$2 else ready_at end where id=1 and credits<6 returning credits",[now,CARPENTRY_RULES.noticeMs]);
                result.publicChanged=record.rows.length>0;
                applied.message=result.publicChanged?'Craft recorded for the noticeboard. You keep your easel. Six records fund one twenty-four-hour installation.':'The noticeboard is already funded. Your personal craft record is kept; you retain the easel. No additional public credit was needed.';
                state.lastMessage=applied.message;
                const receipt=state.receipts.find(r=>r.id===cmd.id);if(receipt)receipt.message=applied.message;
              }
            }
            result = { ok: true, message: applied.message, revision: state.revision,...(cmd.kind==='gather'?{collection:collectionGrant(cmd.id,id,cmd.resource,virtual,state)}:{}),...(['garden','carpentry','commission'].includes(cmd.kind)?{publicChanged:result.publicChanged}: {}) };
          }
        }
      }
      if(result.ok){await housingAccount(client,id,state,(await client.query('select id::text,level,placements,workroom_placements,plan_id,yard from ih2.plots where owner_id=$1',[id])).rows[0]??null);}
      if (result.ok) {
        if (questStep(state).complete) await client.query('insert into ih2.quest_awards(player_id,quest_id,content_version) values($1,$2,1) on conflict do nothing', [id, 'orientation-v1']);
        if(orchardUpdate)await client.query('update ih2.players set workshop=$2,position=$3,quest_content_version=1,updated_at=now(),orchard=$4 where id=$1', [id,state,authoritativePosition,orchardUpdate]);
        else await client.query('update ih2.players set workshop=$2,position=$3,quest_content_version=1,updated_at=now() where id=$1', [id, state, authoritativePosition]);
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
