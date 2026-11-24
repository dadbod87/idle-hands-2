-- One private, permanent choice per resident and restoration.
create table ih2.glasshouse_plants (
  player_id text not null references ih2.players(id),
  project_revision smallint not null check (project_revision = 1),
  plant text not null check (plant in ('committee-fern', 'very-patient-sundew')),
  kept_at bigint not null check (kept_at between 0 and 9007199254740991),
  primary key(player_id, project_revision)
);

alter table ih2.glasshouse_plants enable row level security;
revoke all on ih2.glasshouse_plants from public;
