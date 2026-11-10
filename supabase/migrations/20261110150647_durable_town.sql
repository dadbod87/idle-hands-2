-- Isolated synthetic sequel proof. Private schema: no browser/Data API grants.
create schema ih2;
revoke all on schema ih2 from public;
alter default privileges in schema ih2 revoke all on tables from public;
alter default privileges in schema ih2 revoke all on sequences from public;

create table ih2.players (
  id text primary key check (id ~ '^[a-zA-Z0-9:_-]{1,80}$'),
  name text not null check (length(name) between 1 and 40),
  workshop jsonb not null check (jsonb_typeof(workshop) = 'object'),
  position jsonb not null check (jsonb_typeof(position) = 'object'),
  quest_content_version integer not null default 1 check (quest_content_version between 0 and 1),
  updated_at timestamptz not null default now()
);
create table ih2.command_receipts (
  player_id text not null references ih2.players(id) on delete cascade,
  command_id text not null check (command_id ~ '^[a-zA-Z0-9:_-]{1,80}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  primary key (player_id,command_id)
);
create table ih2.bridge (
  id integer primary key check (id=1),
  contributed integer not null default 0 check (contributed>=0 and contributed<=target),
  target integer not null default 3 check (target=3)
);
insert into ih2.bridge(id) values(1);
create table ih2.bridge_contributions (
  player_id text not null references ih2.players(id) on delete restrict,
  command_id text not null,
  created_at timestamptz not null default now(),
  primary key (player_id,command_id)
);
create table ih2.plots (
  id bigint generated always as identity primary key,
  owner_id text not null unique references ih2.players(id) on delete restrict,
  level integer not null default 1 check (level between 1 and 2),
  placements jsonb not null check (jsonb_typeof(placements)='object')
);
create table ih2.quest_awards (
  player_id text not null references ih2.players(id) on delete cascade,
  quest_id text not null check (quest_id in ('orientation-v1','bridge-contributor-v1')),
  content_version integer not null default 1 check (content_version=1),
  awarded_at timestamptz not null default now(),
  primary key(player_id,quest_id)
);
create table ih2.season_scores (
  player_id text not null references ih2.players(id) on delete cascade,
  season_key text not null check (season_key ~ '^\d{4}-\d{2}-\d{2}$'),
  points integer not null default 0 check (points between 0 and 1000000),
  primary key(player_id,season_key)
);
create index season_scores_season on ih2.season_scores(season_key,points desc);

-- Defense in depth. Only the private server's table-owner connection can use these tables.
-- No anon/authenticated grants, no SECURITY DEFINER helpers, no public views.
alter table ih2.players enable row level security;
alter table ih2.command_receipts enable row level security;
alter table ih2.bridge enable row level security;
alter table ih2.bridge_contributions enable row level security;
alter table ih2.plots enable row level security;
alter table ih2.quest_awards enable row level security;
alter table ih2.season_scores enable row level security;
