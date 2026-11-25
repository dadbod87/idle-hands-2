-- One optional cosmetic choice. The existing Inkwood discovery award owns entitlement.
alter table ih2.players
  add column worn_headwear text check (worn_headwear = 'inkwood');
