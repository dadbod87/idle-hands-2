-- Additive: old six placements, ownership, prices and all personal progress are unchanged.
alter table ih2.plots add column workroom_placements jsonb not null
  default '{"workroom-north":null,"workroom-south":null}'::jsonb;
alter table ih2.plots add constraint plots_workroom_shape check (
  case when jsonb_typeof(workroom_placements)='object' then
    workroom_placements ?& array['workroom-north','workroom-south']
    and (workroom_placements-'workroom-north'-'workroom-south')='{}'::jsonb
    and (workroom_placements->'workroom-north'='null'::jsonb or workroom_placements->>'workroom-north'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox']))
    and (workroom_placements->'workroom-south'='null'::jsonb or workroom_placements->>'workroom-south'=any(array['planter','stool','rug','lamp','crate','shelf','easel','letterbox']))
  else false end
);
alter table ih2.plots add constraint plots_workroom_level check (
  level=2 or workroom_placements='{"workroom-north":null,"workroom-south":null}'::jsonb
);
-- ih2 remains private; existing table RLS/revoked public privileges cover the added column.
