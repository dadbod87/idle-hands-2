alter table ih2.quest_awards
  drop constraint quest_awards_quest_id_check,
  add constraint quest_awards_quest_id_check check (quest_id in (
    'orientation-v1', 'bridge-contributor-v1', 'maintenance-v1', 'trail-pennant-v1',
    'mossbank-route-v1', 'mossbank-windrow-v1', 'mossbank-flume-v1', 'mossbank-swatch-v1'
  ));

alter table ih2.plots
  drop constraint plots_keepsake_check,
  add constraint plots_keepsake_check
    check (keepsake in ('naturalist', 'woodland-certificate', 'alder-swatch'));
