alter table ih2.tailored_kerchiefs
  add column dye text not null default 'none';

update ih2.tailored_kerchiefs
  set dye = worn
  where worn != 'none';

alter table ih2.tailored_kerchiefs
  add constraint tailored_kerchief_dye check (
    dye in ('none','clay','fern','indigo')
    and (collected_at is not null or dye = 'none')
    and (worn = 'none' or worn = dye)
  );
