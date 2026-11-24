-- A consent flag, independent of furniture stock and the permanent plant.
alter table ih2.plots
  add column glasshouse_plant_visible boolean not null default false;
