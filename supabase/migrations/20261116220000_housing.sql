-- Additive housing authority; historical plots retain their exact facade and maps.
alter table ih2.plots add column plan_id text;
alter table ih2.plots add column housing_revision integer not null default 0 check(housing_revision>=0);
alter table ih2.plots add column yard jsonb not null default '{"front-left":null,"front-right":null,"side-left":null,"side-right":null,"rear":null}';
create table ih2.housing_quotes(id uuid primary key, owner_id text not null references ih2.players(id), quote jsonb not null,ordinal bigserial unique);
create index housing_quotes_owner on ih2.housing_quotes(owner_id);
create table ih2.housing_builds(id uuid primary key,owner_id text not null references ih2.players(id),plot_id bigint not null,build jsonb not null,completed_at bigint);
create index housing_builds_owner on ih2.housing_builds(owner_id);
create unique index housing_one_open_owner on ih2.housing_builds(owner_id) where completed_at is null;
create unique index housing_one_reserved_plot on ih2.housing_builds(plot_id) where completed_at is null;
alter table ih2.housing_quotes enable row level security;
alter table ih2.housing_builds enable row level security;
revoke all on ih2.housing_quotes,ih2.housing_builds from public;

create function ih2.guard_housing_history() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Housing purchase history is permanent'; end if;
 if tg_table_name='housing_quotes' then raise exception 'Reviewed housing quotes are immutable'; end if;
 if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.plot_id is distinct from old.plot_id or new.build is distinct from old.build or old.completed_at is not null or new.completed_at is null or new.completed_at < (new.build->>'readyAt')::bigint then raise exception 'Housing paid history and deadlines are immutable'; end if;
 return new;
end $$;
create trigger immutable_housing_quote before update or delete on ih2.housing_quotes for each row execute function ih2.guard_housing_history();
create trigger immutable_housing_build before update or delete on ih2.housing_builds for each row execute function ih2.guard_housing_history();
