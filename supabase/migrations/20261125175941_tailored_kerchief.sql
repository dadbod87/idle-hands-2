create table ih2.tailored_kerchiefs (
  player_id text primary key references ih2.players(id) on delete cascade,
  started_at bigint not null check (started_at >= 0),
  ready_at bigint not null check (ready_at = started_at + 600000),
  collected_at bigint check (collected_at >= ready_at),
  worn text not null default 'none' check (worn in ('none','clay','fern','indigo')),
  check (collected_at is not null or worn = 'none')
);

alter table ih2.tailored_kerchiefs enable row level security;
revoke all on ih2.tailored_kerchiefs from public;
