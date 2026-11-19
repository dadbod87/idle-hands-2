-- A reserved parcel is private to one sender and one recipient.
create table ih2.snack_parcels (
 id uuid primary key,
 sender_id text not null references ih2.players(id) on delete restrict,
 recipient_id text not null references ih2.players(id) on delete restrict,
 placed_at bigint not null check (placed_at >= 0),
 expires_at bigint not null check (expires_at = placed_at + 86400000),
 state text not null default 'waiting' check (state in ('waiting','declined','accepted','returned')),
 resolved_at bigint,
 check (sender_id <> recipient_id),
 check (
  (state = 'waiting' and resolved_at is null) or
  (state <> 'waiting' and resolved_at is not null and resolved_at >= placed_at)
 ),
 check (state not in ('accepted','declined') or resolved_at < expires_at)
);

create unique index snack_one_held_per_sender
 on ih2.snack_parcels(sender_id) where state in ('waiting','declined');
create index snack_waiting_by_recipient
 on ih2.snack_parcels(recipient_id, placed_at, id) where state = 'waiting';

alter table ih2.snack_parcels enable row level security;
revoke all on ih2.snack_parcels from public;
