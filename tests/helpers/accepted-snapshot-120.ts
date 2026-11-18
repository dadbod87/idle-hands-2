/** Frozen multi-query reference from accepted1999f83 (IH2-120).
 * Retain its independent SQL/mapping for same-clock comparison with the batched reader.
 * Original method SHA256: 82b724b58dda11789547dacc699b1b1c44c563f532949b8cfdb304f597d1a419
 * Not imported by game runtime. Update only for an explicitly reviewed baseline change.
 */
import type {PoolClient} from 'pg';
import {canonicalHomePosition,seasonKey,type TownSnapshot,type TownPosition,type MaintenanceLesson} from '../../server/live-store.ts';
import {privateHousing} from '../../server/housing.ts';
import {privateOuting} from '../../server/outing.ts';
import {validPublicHouse,liveHousingAccount} from '../../src/game/live-housing.ts';
import {homeAllocationValid} from '../../src/game/live-home-layout.ts';
import {loadWorkshop,type WorkshopState} from '../../src/game/live-workshop.ts';
import {cafePublic} from '../../src/game/cafe-public.ts';
import {cafeProjectSchema,type CafeProject} from '../../src/game/cafe-candidate.ts';
import {MOTIFS,type LetterboxMotif} from '../../src/game/commission.ts';
import {MARKER_IDS,type MarkerId} from '../../src/game/garden.ts';
import type {NoticeboardState} from '../../src/game/carpentry.ts';
import {TRAIL_PENNANT_AWARD} from '../../src/game/town-rules.ts';
type PlayerRow={id:string;name:string;workshop:WorkshopState;position:TownPosition;quest_content_version:number};
function readState(row:PlayerRow,now:number):WorkshopState{const parsed=loadWorkshop(row.workshop,now);if(parsed.recovered)throw new Error('Stored workshop failed validation. Progress was not replaced.');return parsed.state;}
function readCafe(row:Record<string,unknown>):CafeProject{return cafeProjectSchema.parse({version:1,credits:row.credits,observedAt:Number(row.observed_at),fundedAt:row.funded_at===null?null:Number(row.funded_at),readyAt:row.ready_at===null?null:Number(row.ready_at),openedAt:row.opened_at===null?null:Number(row.opened_at)});}
export async function acceptedSnapshot120(client: PoolClient, id: string, now: number): Promise<TownSnapshot> {
    const { rows } = await client.query<PlayerRow>('select id,name,workshop,position,quest_content_version from ih2.players where id=$1', [id]);
    const player = rows[0]; if (!player) throw new Error('Unknown synthetic player.');
    // A visitor sees the selected appearance only when the one owned box is
    // actually placed in this home. Register consent is a separate projection.
    const plots = (await client.query(`select p.id::text,p.owner_id,p.level,p.placements,p.workroom_placements,p.plan_id,p.yard,p.housing_revision,u.name,
      exists(select 1 from ih2.quest_awards q where q.player_id=p.owner_id and q.quest_id='trail-pennant-v1') as pennant_owned,
      case when u.workshop->'owned'->'letterbox'='1'::jsonb and u.workshop->'commission'->'madeCount'='1'::jsonb and
        (exists(select 1 from jsonb_each_text(p.placements) s where s.value='letterbox') or exists(select 1 from jsonb_each_text(p.workroom_placements) s where s.value='letterbox') or exists(select 1 from jsonb_each_text(p.yard) s where s.value='letterbox'))
        then u.workshop->'commission'->>'motif' else null end as letterbox_motif
      from ih2.plots p join ih2.players u on u.id=p.owner_id order by p.id`)).rows.map(p => ({ id:p.id,ownerId:p.owner_id,ownerName:p.name,level:p.level as 1|2,placements:p.placements,workroomPlacements:p.workroom_placements,pennantOwned:p.pennant_owned,planId:p.plan_id,yard:p.yard,housingRevision:p.housing_revision,letterboxMotif:(MOTIFS as readonly string[]).includes(p.letterbox_motif)?p.letterbox_motif as LetterboxMotif:null }));
    if(plots.some(p=>!validPublicHouse(p)))throw new Error('Stored home layout failed validation. Progress was not replaced.');
    const bridgeRow = (await client.query('select b.*,g.credits as welcome_credits,n.credits as notice_credits,n.phase as notice_phase,n.started_at as notice_started,n.ready_at as notice_ready,n.opened_at as notice_opened from ih2.bridge b cross join ih2.garden_welcome g cross join ih2.noticeboard n where b.id=1 and g.id=1 and n.id=1')).rows[0];
    // Explicit projection only: never select other residents' private garden JSON.
    const displayRows=(await client.query(`select id,name,
      case when workshop->'garden'->'markers' ? (workshop->'garden'->>'selectedMarker') then workshop->'garden'->>'selectedMarker' else null end as marker,
      case when workshop->'owned'->'letterbox'='1'::jsonb and workshop->'commission'->'madeCount'='1'::jsonb and workshop->'commission'->'published'='true'::jsonb then workshop->'commission'->>'motif' else null end as motif
      from ih2.players where workshop->'garden'->'markers' ? (workshop->'garden'->>'selectedMarker')
        or (workshop->'owned'->'letterbox'='1'::jsonb and workshop->'commission'->'madeCount'='1'::jsonb and workshop->'commission'->'published'='true'::jsonb) order by id`)).rows;
    const gardenTown:TownSnapshot['gardenTown']={credits:bridgeRow.welcome_credits,target:6,markers:displayRows.filter(row=>(MARKER_IDS as readonly string[]).includes(row.marker)).map(row=>({ownerId:row.id,ownerName:row.name,marker:row.marker as MarkerId}))};
    const commissionTown:TownSnapshot['commissionTown']={styles:displayRows.filter(row=>(MOTIFS as readonly string[]).includes(row.motif)).map(row=>({ownerId:row.id,ownerName:row.name,motif:row.motif as LetterboxMotif}))};
    const awarded = (await client.query('select quest_id from ih2.quest_awards where player_id=$1 order by quest_id', [id])).rows.map(r => r.quest_id);
    const lessonRow=(await client.query('select * from ih2.maintenance_lessons where player_id=$1',[id])).rows[0];
    const lesson:MaintenanceLesson={startedAt:lessonRow?.started_at===null||!lessonRow?null:Number(lessonRow.started_at),readyAt:lessonRow?.ready_at===null||!lessonRow?null:Number(lessonRow.ready_at),completed:!!lessonRow?.completed,redeemed:!!lessonRow?.redeemed,route:lessonRow?.route??null,legacySatisfied:!!lessonRow?.legacy_satisfied};
    const stamps=(await client.query('select landmark_id from ih2.trail_stamps where player_id=$1 order by landmark_id',[id])).rows.map(row=>row.landmark_id);
    const projectJournal=(await client.query('select * from ih2.project_events order by recorded_at,id')).rows.map(row=>({id:row.id,kind:row.kind as 'opened'|'grandfathered',effectiveAt:row.effective_at===null?null:Number(row.effective_at),recordedAt:Number(row.recorded_at)}));
    const key = seasonKey(now);
    const scores = (await client.query('select s.player_id,u.name,s.points from ih2.season_scores s join ih2.players u on u.id=s.player_id where s.season_key=$1 order by s.points desc,s.player_id', [key])).rows.map(r => ({ playerId: r.player_id, name: r.name, points: r.points }));
    const noticeboard:NoticeboardState={credits:bridgeRow.notice_credits,phase:bridgeRow.notice_phase,startedAt:bridgeRow.notice_started===null?null:Number(bridgeRow.notice_started),readyAt:bridgeRow.notice_ready===null?null:Number(bridgeRow.notice_ready),openedAt:bridgeRow.notice_opened===null?null:Number(bridgeRow.notice_opened)};
    const workshop=readState(player,now),own=plots.find(p=>p.ownerId===id);if(own&&!homeAllocationValid(workshop,own))throw new Error('Stored furniture allocation failed validation. Nothing was replaced.');
    const cafeRow=(await client.query('select * from ih2.cafe_project where id=1')).rows[0];const cafe=cafePublic(readCafe(cafeRow));
    const housingSites=(await client.query("select b.plot_id::text as \"plotId\",b.owner_id as \"ownerId\",p.name as \"ownerName\",case when (b.build->>'readyAt')::bigint<=$1 then 'ready' else 'building' end as phase from ih2.housing_builds b join ih2.players p on p.id=b.owner_id where b.completed_at is null order by b.plot_id",[now])).rows;const housing=await privateHousing(client,id);liveHousingAccount(id,workshop,own??null,housing.build);return {outing:await privateOuting(client,id),housingSites,housing,cafe,commissionTown,noticeboard,gardenTown, playerId: id, name: player.name, workshop, position: canonicalHomePosition(player.position,plots), lesson:lesson,lessonQuote:{route:bridgeRow.contributed<bridgeRow.target?'construction':'upkeep',expectedBridgeContributed:bridgeRow.contributed}, quest: { contentVersion: 1, awarded }, projectJournal,trail:{stamps,pennantOwned:awarded.includes(TRAIL_PENNANT_AWARD)},bridge: { contributed: bridgeRow.contributed, target: bridgeRow.target, restored: bridgeRow.phase==='open',phase:bridgeRow.phase,startedAt:bridgeRow.started_at===null?null:Number(bridgeRow.started_at),readyAt:bridgeRow.ready_at===null?null:Number(bridgeRow.ready_at),openedAt:bridgeRow.opened_at===null?null:Number(bridgeRow.opened_at),grandfathered:bridgeRow.grandfathered }, plot: plots.find(p => p.ownerId === id) ?? null, plots, seasonKey: key, scores, serverTime: now };
  }
