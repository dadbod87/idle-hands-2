alter table ih2.tailored_kerchiefs
  add column tie text not null default 'knot'
  check (tie in ('knot','wrap') and (dye != 'none' or tie = 'knot'));
