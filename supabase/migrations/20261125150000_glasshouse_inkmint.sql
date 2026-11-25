-- The private plant record owns a single trial tray and reusable cosmetic finish.
alter table ih2.glasshouse_plants
  add column inkmint_phase text not null default 'empty',
  add column inkmint_ready_at bigint,
  add constraint glasshouse_inkmint_phase_check check (
    (inkmint_phase = 'growing' and inkmint_ready_at is not null
      and inkmint_ready_at between 0 and 9007199254740991)
    or (inkmint_phase in ('empty', 'collected', 'mixed', 'applied') and inkmint_ready_at is null)
  );
