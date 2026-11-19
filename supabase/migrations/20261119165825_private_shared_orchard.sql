-- The existing private player row owns the pantry and its command lock.
-- An absent pantry is the empty first visit. Ordinary workshop writers leave it alone.
alter table ih2.players
 add column orchard jsonb
 check (orchard is null or jsonb_typeof(orchard) = 'object');
