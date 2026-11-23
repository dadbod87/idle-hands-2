-- A second earned style uses the same single headwear slot.
alter table ih2.players
  drop constraint players_worn_headwear_check,
  add constraint players_worn_headwear_check
    check (worn_headwear in ('inkwood', 'clerk'));
