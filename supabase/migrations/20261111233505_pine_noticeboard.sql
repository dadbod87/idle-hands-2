-- Separate synthetic sequel. Additive, private, no player reset or Data API grant.
create table ih2.noticeboard (
 id integer primary key check(id=1),
 credits integer not null default 0 check(credits between 0 and 6),
 phase text not null default 'collecting' check(phase in ('collecting','installing','open')),
 started_at bigint check(started_at between 0 and 9007199168340991),
 ready_at bigint check(ready_at between 0 and 9007199254740991),
 opened_at bigint check(opened_at between 0 and 9007199254740991),
 check((credits<6 and phase='collecting' and started_at is null and ready_at is null and opened_at is null)
   or (credits=6 and started_at is not null and ready_at is not null and ready_at-started_at=86400000
     and ((phase='installing' and opened_at is null) or (phase='open' and opened_at is not null and opened_at=ready_at))))
);
insert into ih2.noticeboard(id) values(1);
alter table ih2.noticeboard enable row level security;
revoke all on ih2.noticeboard from public;
