alter table ih2.tailored_kerchiefs
  add column edging_started_at bigint,
  add column edging_ready_at bigint,
  add column edging_collected_at bigint,
  add column gold_edge boolean not null default false,
  add constraint tailored_gold_edging_lifecycle check (
    (edging_started_at is null and edging_ready_at is null
      and edging_collected_at is null and not gold_edge)
    or
    (collected_at is not null and edging_started_at is not null and edging_ready_at is not null
      and edging_started_at >= collected_at and edging_ready_at = edging_started_at + 900000
      and (edging_collected_at is null or edging_collected_at >= edging_ready_at)
      and (not gold_edge or edging_collected_at is not null))
  );
