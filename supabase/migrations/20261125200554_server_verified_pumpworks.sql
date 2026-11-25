create table ih2.field_outings (
  player_id text primary key references ih2.players(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  receipts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(receipts) = 'array' and jsonb_array_length(receipts) <= 24)
);

alter table ih2.field_outings enable row level security;
revoke all on table ih2.field_outings from public;
