-- Forward-only: existing workshop JSON, repaired bridge totals and plot placements stay intact.
create table ih2.maintenance_lessons (
 player_id text primary key references ih2.players(id) on delete cascade,
 started_at bigint,
 ready_at bigint,
 completed boolean not null default false,
 redeemed boolean not null default false,
 route text check (route in ('construction','upkeep')),
 legacy_satisfied boolean not null default false,
 check ((started_at is null and ready_at is null) or (started_at is not null and ready_at is not null and started_at >= 0 and ready_at = started_at + 60000)),
 check (not completed or started_at is not null),
 check (not redeemed or completed),
 check ((route is null) = (not redeemed))
);
insert into ih2.maintenance_lessons(player_id,legacy_satisfied)
 select p.id,exists(select 1 from ih2.quest_awards q where q.player_id=p.id and q.quest_id='bridge-contributor-v1') from ih2.players p;
create table ih2.maintenance_events (
 player_id text primary key references ih2.players(id) on delete cascade,
 command_id text not null,
 route text not null check(route in ('construction','upkeep')),
 recorded_at bigint not null check(recorded_at>=0)
);
alter table ih2.maintenance_lessons enable row level security;
alter table ih2.maintenance_events enable row level security;
revoke all on ih2.maintenance_lessons,ih2.maintenance_events from public;
alter table ih2.quest_awards drop constraint quest_awards_quest_id_check;
alter table ih2.quest_awards add constraint quest_awards_quest_id_check check (quest_id in ('orientation-v1','bridge-contributor-v1','maintenance-v1'));
