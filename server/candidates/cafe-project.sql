-- IH2-110 CANDIDATE ONLY. Not a migration and never auto-discovered.
-- Apply only after the six existing migrations in ih2_cafe_test/ih2_cafe_restore.
-- No browser/Data API grants, functions with elevated privileges, or live wiring.
create table ih2.cafe_candidate_project (
  id integer primary key check (id = 1),
  credits integer not null default 0 check (credits between 0 and 12),
  observed_at bigint not null check (observed_at between 0 and 9007199168340991),
  funded_at bigint, ready_at bigint, opened_at bigint,
  constraint cafe_candidate_lifecycle check (
    (credits < 12 and funded_at is null and ready_at is null and opened_at is null)
    or (credits = 12 and funded_at is not null and funded_at >= 0
      and funded_at <= observed_at and ready_at is not null
      and ready_at = funded_at + 14400000
      and (opened_at is null or (opened_at = ready_at and opened_at <= observed_at)))
  )
);
alter table ih2.cafe_candidate_project enable row level security;
revoke all on ih2.cafe_candidate_project from public;
-- Defense against accidental re-funding/re-timing by later writers. Invoker only.
create function ih2.guard_cafe_candidate() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.credits < old.credits or new.credits > old.credits + 1
    or new.observed_at < old.observed_at
    or (old.funded_at is not null and
      (new.funded_at is distinct from old.funded_at or new.ready_at is distinct from old.ready_at))
    or (old.opened_at is not null and new.opened_at is distinct from old.opened_at)
  then raise exception 'Café candidate history is monotone and its deadline is fixed.'; end if;
  return new;
end $$;
revoke all on function ih2.guard_cafe_candidate() from public;
create trigger guard_cafe_candidate before update on ih2.cafe_candidate_project
for each row execute function ih2.guard_cafe_candidate();
