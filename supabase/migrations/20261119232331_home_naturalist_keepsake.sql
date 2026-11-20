-- The owner may display one earned certificate. Existing homes start clear.
alter table ih2.plots
  add column keepsake text check (keepsake = 'naturalist');
