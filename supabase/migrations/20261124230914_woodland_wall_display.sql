-- Keep a single chosen frame. No existing plot or certificate is rewritten.
alter table ih2.plots
  drop constraint plots_keepsake_check,
  add constraint plots_keepsake_check
    check (keepsake in ('naturalist', 'woodland-certificate'));
