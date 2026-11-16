-- IH2-115 CANDIDATE ONLY. Never a discovered migration; dedicated disposable DBs only.
create schema ih2_housing_candidate;
revoke all on schema ih2_housing_candidate from public;
create table ih2_housing_candidate.accounts (
 owner_id text primary key check(owner_id ~ '^[a-zA-Z0-9:_-]{1,80}$'),
 account jsonb not null,
 plot_id text generated always as (coalesce(account->'home'->>'plotId',account->'build'->>'plotId')) stored unique,
 check(jsonb_typeof(account)='object' and account->>'version'='1' and account->>'catalogVersion'='housing-v1' and account->>'ownerId'=owner_id),
 check(account ?& array['version','catalogVersion','ownerId','workshop','home','build']),
 check(plot_id is null or plot_id ~ '^[1-9][0-9]{0,17}$')
);
create table ih2_housing_candidate.quotes (
 id uuid primary key,owner_id text not null references ih2_housing_candidate.accounts(owner_id),
 quote jsonb not null,
 check(quote->>'id'=id::text and quote->>'ownerId'=owner_id and quote->>'version'='1' and quote->>'catalogVersion'='housing-v1')
);
create table ih2_housing_candidate.builds (
 id uuid primary key,owner_id text not null references ih2_housing_candidate.accounts(owner_id),
 quote_id uuid not null unique references ih2_housing_candidate.quotes(id),
 record jsonb not null, finished_at bigint,
 check(record->>'id'=id::text and record->>'quoteId'=quote_id::text),
 check((record->>'readyAt')::bigint=(record->>'startedAt')::bigint+21600000),
 check(finished_at is null or finished_at >= (record->>'readyAt')::bigint)
);
create table ih2_housing_candidate.receipts (
 owner_id text not null references ih2_housing_candidate.accounts(owner_id), id uuid not null,
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),result jsonb not null,
 primary key(owner_id,id)
);
create index housing_quotes_owner on ih2_housing_candidate.quotes(owner_id);
create index housing_builds_owner on ih2_housing_candidate.builds(owner_id);
create unique index housing_one_open_build on ih2_housing_candidate.builds(owner_id) where finished_at is null;
create function ih2_housing_candidate.guard_account() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if new.owner_id <> old.owner_id or
  (old.plot_id is not null and coalesce(new.account->'home'->>'plotId',new.account->'build'->>'plotId') is distinct from old.plot_id) or
  (new.account->'workshop'->>'revision')::int < (old.account->'workshop'->>'revision')::int or
  (new.account->'workshop'->>'observedAt')::bigint < (old.account->'workshop'->>'observedAt')::bigint or
  coalesce((new.account->'home'->'layout'->>'level')::int,0) < coalesce((old.account->'home'->'layout'->>'level')::int,0) or
  (old.account->'build' <> 'null'::jsonb and new.account->'build' <> 'null'::jsonb and new.account->'build' is distinct from old.account->'build')
 then raise exception 'Permanent home rights/address and paid construction history cannot be rewritten.'; end if;
 return new;
end $$;
create trigger guard_account before update on ih2_housing_candidate.accounts for each row execute function ih2_housing_candidate.guard_account();
create function ih2_housing_candidate.guard_build() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if new.id<>old.id or new.owner_id<>old.owner_id or new.quote_id<>old.quote_id or new.record is distinct from old.record or
  (old.finished_at is not null and new.finished_at is distinct from old.finished_at)
 then raise exception 'A paid build and its completion cannot be rewritten.'; end if;
 return new;
end $$;
create trigger guard_build before update on ih2_housing_candidate.builds for each row execute function ih2_housing_candidate.guard_build();
alter table ih2_housing_candidate.accounts enable row level security;
alter table ih2_housing_candidate.quotes enable row level security;
alter table ih2_housing_candidate.builds enable row level security;
alter table ih2_housing_candidate.receipts enable row level security;
revoke all on all tables in schema ih2_housing_candidate from public;
revoke all on all functions in schema ih2_housing_candidate from public;
