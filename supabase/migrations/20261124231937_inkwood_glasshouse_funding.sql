create table ih2.glasshouse_project (
  id smallint primary key check (id = 1),
  state jsonb not null check (jsonb_typeof(state) = 'object' and state->>'revision' = '1')
);
insert into ih2.glasshouse_project (id, state)
values (1, '{"revision":1,"work":{"entrance":null,"frame":null,"chart":null},"opensAt":null}'::jsonb);

-- One live quote per actor. Accepted and refused commands keep the ordinary receipt.
create table ih2.glasshouse_reviews (
  player_id text primary key references ih2.players(id),
  review jsonb not null check (jsonb_typeof(review) = 'object' and review->>'resident' = player_id)
);

alter table ih2.glasshouse_project enable row level security;
alter table ih2.glasshouse_reviews enable row level security;
revoke all on ih2.glasshouse_project, ih2.glasshouse_reviews from public;
