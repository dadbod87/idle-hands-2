/** One statement, with the caller's transaction and clock. No cache or writes. */
import type {PoolClient} from 'pg';
import type {TownPosition,TownSnapshot} from './live-store.ts';
import type {privateHousing} from './housing.ts';
import type {WorkshopState} from '../src/game/live-workshop.ts';
import type {HomeKeepsake} from '../src/game/home-keepsake.ts';
import type {HomeLayout} from '../src/game/live-home-layout.ts';
import type {emptyYard} from '../src/design/housing-contract.ts';

type StoredTime=number|string|null;
type PlotRow={
 id:string;owner_id:string;name:string;level:1|2;
 placements:WorkshopState['placements'];workroom_placements:HomeLayout['workroomPlacements'];
 plan_id:string|null;yard:ReturnType<typeof emptyYard>;housing_revision:number;
 pennant_owned:boolean;letterbox_motif:unknown;keepsake:HomeKeepsake|null;
};
type BridgeRow={
 contributed:number;target:number;phase:TownSnapshot['bridge']['phase'];grandfathered:boolean;
 started_at:StoredTime;ready_at:StoredTime;opened_at:StoredTime;welcome_credits:number;
 notice_credits:number;notice_phase:TownSnapshot['noticeboard']['phase'];
 notice_started:StoredTime;notice_ready:StoredTime;notice_opened:StoredTime;
};
export type SnapshotRows={
 player:{id:string;name:string;workshop:WorkshopState;position:TownPosition;quest_content_version:number;orchard:unknown};
 plots:PlotRow[];bridge:BridgeRow;
 display_rows:Array<{id:string;name:string;marker:unknown;motif:unknown}>;
 awards:Array<{quest_id:string}>;
 lesson:{started_at:StoredTime;ready_at:StoredTime;completed:boolean;redeemed:boolean;route:'construction'|'upkeep'|null;legacy_satisfied:boolean}|null;
 stamps:Array<{landmark_id:string}>;
 project_events:Array<{id:string;kind:'opened'|'grandfathered';effective_at:StoredTime;recorded_at:number|string}>;
 scores:Array<{player_id:string;name:string;points:number}>;
 cafe:Record<string,unknown>;housing_sites:TownSnapshot['housingSites'];
 housing:Awaited<ReturnType<typeof privateHousing>>;
 outing:{state:unknown}|null;
 glasshouse:unknown;
 glasshouse_review:unknown;
 glasshouse_plant:unknown;
};

// Explicit public projections keep other residents' private JSON out of the result.
// Numeric ordering is retained before emitting text plot IDs. JSON timestamps still
// pass through the original Number conversions and domain validation in TownStore.
const query = `select /* coherent-town-snapshot */
 jsonb_build_object('id',resident.id,'name',resident.name,'workshop',resident.workshop,
   'position',resident.position,'quest_content_version',resident.quest_content_version,'orchard',resident.orchard) as player,
 coalesce((select jsonb_agg(to_jsonb(v)-'plot_order' order by v.plot_order) from (
   select p.id as plot_order,p.id::text as id,p.owner_id,p.level,p.placements,p.workroom_placements,
     p.plan_id,p.yard,p.housing_revision,u.name,
     case when p.keepsake='naturalist' and resident.position->>'homePlotId'=p.id::text
       and resident.position->>'room' in ('home','home-expanded')
       and (u.workshop->'sketches') ?& array['oak','birch','fruit']
       then p.keepsake else null end as keepsake,
     exists(select 1 from ih2.quest_awards q where q.player_id=p.owner_id and q.quest_id='trail-pennant-v1') as pennant_owned,
     case when u.workshop->'owned'->'letterbox'='1'::jsonb and u.workshop->'commission'->'madeCount'='1'::jsonb and
       (exists(select 1 from jsonb_each_text(p.placements) s where s.value='letterbox') or
        exists(select 1 from jsonb_each_text(p.workroom_placements) s where s.value='letterbox') or
        exists(select 1 from jsonb_each_text(p.yard) s where s.value='letterbox'))
       then u.workshop->'commission'->>'motif' else null end as letterbox_motif
   from ih2.plots p join ih2.players u on u.id=p.owner_id
 ) v),'[]'::jsonb) as plots,
 (select to_jsonb(v) from (
   select b.*,g.credits as welcome_credits,n.credits as notice_credits,n.phase as notice_phase,
     n.started_at as notice_started,n.ready_at as notice_ready,n.opened_at as notice_opened
   from ih2.bridge b cross join ih2.garden_welcome g cross join ih2.noticeboard n
   where b.id=1 and g.id=1 and n.id=1
 ) v) as bridge,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.id) from (
   select id,name,
     case when workshop->'garden'->'markers' ? (workshop->'garden'->>'selectedMarker') then workshop->'garden'->>'selectedMarker' else null end as marker,
     case when workshop->'owned'->'letterbox'='1'::jsonb and workshop->'commission'->'madeCount'='1'::jsonb and workshop->'commission'->'published'='true'::jsonb then workshop->'commission'->>'motif' else null end as motif
   from ih2.players where workshop->'garden'->'markers' ? (workshop->'garden'->>'selectedMarker')
     or (workshop->'owned'->'letterbox'='1'::jsonb and workshop->'commission'->'madeCount'='1'::jsonb and workshop->'commission'->'published'='true'::jsonb)
 ) v),'[]'::jsonb) as display_rows,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.quest_id) from (
   select quest_id from ih2.quest_awards where player_id=$1
 ) v),'[]'::jsonb) as awards,
 (select to_jsonb(v) from ih2.maintenance_lessons v where v.player_id=$1) as lesson,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.landmark_id) from (
   select landmark_id from ih2.trail_stamps where player_id=$1
 ) v),'[]'::jsonb) as stamps,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.recorded_at,v.id) from ih2.project_events v),'[]'::jsonb) as project_events,
 coalesce((select jsonb_agg(to_jsonb(v) order by v.points desc,v.player_id) from (
   select s.player_id,u.name,s.points from ih2.season_scores s join ih2.players u on u.id=s.player_id where s.season_key=$3
 ) v),'[]'::jsonb) as scores,
 (select to_jsonb(v) from ih2.cafe_project v where v.id=1) as cafe,
 coalesce((select jsonb_agg(to_jsonb(v)-'plot_order' order by v.plot_order) from (
   select b.plot_id as plot_order,b.plot_id::text as "plotId",b.owner_id as "ownerId",p.name as "ownerName",
     case when (b.build->>'readyAt')::bigint<=$2 then 'ready' else 'building' end as phase
   from ih2.housing_builds b join ih2.players p on p.id=b.owner_id where b.completed_at is null
 ) v),'[]'::jsonb) as housing_sites,
 jsonb_build_object(
   'build',(select build from ih2.housing_builds where owner_id=$1 and completed_at is null),
   'quote',(select quote from ih2.housing_quotes where owner_id=$1 order by ordinal desc limit 1),
   'nextPlotId',(select (greatest(coalesce((select max(id) from ih2.plots),0),coalesce((select max(plot_id) from ih2.housing_builds),0))+1)::text)
 ) as housing,
 (select jsonb_build_object('state',v.state) from ih2.outings v where v.player_id=$1) as outing,
 (select v.state from ih2.glasshouse_project v where v.id=1) as glasshouse,
 (select v.review from ih2.glasshouse_reviews v where v.player_id=$1) as glasshouse_review,
 (select v.plant from ih2.glasshouse_plants v where v.player_id=$1 and v.project_revision=1) as glasshouse_plant
 from ih2.players resident where resident.id=$1`;

export async function readSnapshotRows(client:PoolClient,id:string,now:number,key:string):Promise<SnapshotRows|undefined>{
 const {rows}=await client.query<SnapshotRows>(query,[id,now,key]);
 return rows[0];
}
