-- Additive registered café project; previous migration files and player JSON remain untouched.
create table ih2.cafe_project (
  id integer primary key check (id = 1),
  credits integer not null default 0 check (credits between 0 and 12),
  observed_at bigint not null check (observed_at between 0 and 9007199168340991),
  funded_at bigint, ready_at bigint, opened_at bigint,
  constraint cafe_project_lifecycle check (
    (credits < 12 and funded_at is null and ready_at is null and opened_at is null)
    or (credits = 12 and funded_at is not null and funded_at >= 0
      and funded_at <= observed_at and ready_at is not null
      and ready_at = funded_at + 14400000
      and (opened_at is null or (opened_at = ready_at and opened_at <= observed_at)))
  )
);
alter table ih2.cafe_project enable row level security;
revoke all on ih2.cafe_project from public;
-- Defense against accidental re-funding/re-timing by later writers. Invoker only.
create function ih2.guard_cafe_project() returns trigger
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
revoke all on function ih2.guard_cafe_project() from public;
create trigger guard_cafe_project before update on ih2.cafe_project
for each row execute function ih2.guard_cafe_project();

insert into ih2.cafe_project(id,observed_at) values(1,0);
alter table ih2.plots drop constraint plots_workroom_shape;
alter table ih2.plots add constraint plots_workroom_shape check (
  case when jsonb_typeof(workroom_placements)='object' then
    workroom_placements ?& array['workroom-north','workroom-south']
    and (workroom_placements-'workroom-north'-'workroom-south')='{}'::jsonb
    and (workroom_placements->'workroom-north'='null'::jsonb or workroom_placements->>'workroom-north'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot']))
    and (workroom_placements->'workroom-south'='null'::jsonb or workroom_placements->>'workroom-south'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot']))
  else false end
);
alter table ih2.plots add constraint plots_original_nooks check (jsonb_typeof(placements)='object' and placements ?& array['north-west','north-middle','north-east','south-west','south-middle','south-east'] and (placements - array['north-west','north-middle','north-east','south-west','south-middle','south-east'])='{}'::jsonb and (placements->'north-west'='null'::jsonb or placements->>'north-west'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])) and (placements->'north-middle'='null'::jsonb or placements->>'north-middle'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])) and (placements->'north-east'='null'::jsonb or placements->>'north-east'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])) and (placements->'south-west'='null'::jsonb or placements->>'south-west'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])) and (placements->'south-middle'='null'::jsonb or placements->>'south-middle'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])) and (placements->'south-east'='null'::jsonb or placements->>'south-east'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox','teapot'])));
