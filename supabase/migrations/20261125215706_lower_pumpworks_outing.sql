create table ih2.lower_pumpworks_outings (
  player_id text primary key references ih2.players(id) on delete cascade,
  progress jsonb not null check (jsonb_typeof(progress) = 'object')
);

alter table ih2.lower_pumpworks_outings enable row level security;
revoke all on table ih2.lower_pumpworks_outings from public;
