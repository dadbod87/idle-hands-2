-- One fixed build phase for future funding. Already repaired bridges remain open.
alter table ih2.bridge add column phase text not null default 'collecting' check(phase in ('collecting','building','open')),
 add column started_at bigint, add column ready_at bigint, add column opened_at bigint,
 add column grandfathered boolean not null default false;
update ih2.bridge set phase='open',grandfathered=true where contributed>=target;
alter table ih2.bridge add constraint bridge_lifecycle check (
 (phase='collecting' and contributed<target and started_at is null and ready_at is null and opened_at is null and not grandfathered)
 or (phase='building' and contributed=target and started_at is not null and started_at>=0 and ready_at is not null and ready_at=started_at+21600000 and opened_at is null and not grandfathered)
 or (phase='open' and contributed=target and (
   (grandfathered and started_at is null and ready_at is null and opened_at is null)
   or (not grandfathered and started_at is not null and started_at>=0 and ready_at is not null and ready_at=started_at+21600000 and opened_at is not null and opened_at=ready_at)))
);
create table ih2.project_events (
 id text primary key check(id in ('bridge-opened-v2','bridge-grandfathered-v2')),
 kind text not null check(kind in ('opened','grandfathered')),
 effective_at bigint,
 recorded_at bigint not null check(recorded_at>=0),
 check((kind='opened' and effective_at is not null) or(kind='grandfathered' and effective_at is null))
);
insert into ih2.project_events(id,kind,effective_at,recorded_at)
 select 'bridge-grandfathered-v2','grandfathered',null,(extract(epoch from clock_timestamp())*1000)::bigint from ih2.bridge where grandfathered;
create table ih2.trail_stamps (
 player_id text not null references ih2.players(id) on delete cascade,
 landmark_id text not null check(landmark_id in ('trailhead','old-sign','lookout')),
 command_id text not null,
 stamped_at bigint not null check(stamped_at>=0),
 primary key(player_id,landmark_id)
);
alter table ih2.project_events enable row level security;
alter table ih2.trail_stamps enable row level security;
revoke all on ih2.project_events,ih2.trail_stamps from public;
alter table ih2.quest_awards drop constraint quest_awards_quest_id_check;
alter table ih2.quest_awards add constraint quest_awards_quest_id_check check(quest_id in ('orientation-v1','bridge-contributor-v1','maintenance-v1','trail-pennant-v1'));
