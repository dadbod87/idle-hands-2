-- Separate private ledger: old workshop writers cannot erase outing progress.
create table ih2.outings (
 player_id text primary key references ih2.players(id),
 state jsonb not null check(jsonb_typeof(state)='object' and state->>'version'='1')
);
alter table ih2.outings enable row level security;
revoke all on ih2.outings from public;
