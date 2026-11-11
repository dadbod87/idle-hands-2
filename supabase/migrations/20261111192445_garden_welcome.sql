-- Separate local sequel only. No browser/Data API access and no existing player reset.
create table ih2.garden_welcome (
 id integer primary key check(id=1),
 credits integer not null default 0 check(credits between 0 and 6)
);
insert into ih2.garden_welcome(id) values(1);
alter table ih2.garden_welcome enable row level security;
revoke all on ih2.garden_welcome from public;
