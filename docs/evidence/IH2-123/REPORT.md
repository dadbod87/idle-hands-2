# Bounded session performance study

Status: complete. [PR56](https://github.com/dadbod87/idle-hands-2/pull/56) merged **d4068f33fc9f3241d005013c9e62489a93a07ce6** with an identical candidate tree; exact PR/main five-job/raw506-domain/193-browser and read-only saved-preview gates pass. Profiling remains opt-in; timing misses below are retained. No gameplay speedup or normal-runtime installation is claimed.

## What this adds

The opt-in `npm run profile:sessions` diagnostic measures the ordinary API in a separate Node process from20HTTP/SSE protocol players. It exercises real first-lesson gathering/crafting, five reconnect/retry waves, five sign-out/sign-ins and a30second idle window during each fixed300second run. This makes server CPU/memory and connection health independently observable before choosing another optimization. The game, art, server rules, migrations, pool5, original500ms tests and progression remain unchanged.

Player benefit: performance decisions can follow repeatable evidence without risking saved progress. Friction removed: mixed server/test-driver resource attribution and an initially weak connection monitor. Remaining opportunity: investigate measured waiting with a controlled workload, then verify any improvement in the actual client. This tooling itself does not make the town faster or more engaging.

## Final-tool observations

All three planned runs at **e09216195cec3b68777ab1a462da2f61e9a8bd60** completed correctly; every attempt is retained. Command/replay/snapshot targets remain500ms and server event-loop target50ms. A p95 is the time within which95%of those measured requests completed.

| Run | Command p95 | Identical replay p95 | Snapshot p95 | Server loop p95 |
|---|---:|---:|---:|---:|
| 1 | 774.220ms | 758.596ms | 485.819ms | 23.609ms |
| 2 | 276.041ms | 187.525ms | 318.073ms | 22.856ms |
| 3 | 275.831ms | 413.696ms | 523.102ms | 22.856ms |

Run1missed command/replay targets; run3missed snapshot. Run2met all targets. These completed timing misses exited2as designed and were not rerun to obtain green. All three event-loop targets passed. The first run's load-phase connection acquisition p95 was581.939ms; overlapping pool/SQL/HTTP spans cannot be added as elapsed time or treated as a unique cause. Variability and observer overhead prevent a universal capacity, leak or speedup conclusion.

| Run | Server mean CPU, one core | Driver mean CPU, one core | Server sampled RSS peak | Driver sampled RSS peak |
|---|---:|---:|---:|---:|
| 1 | 1.222% | 0.826% | 119.73MiB | 130.50MiB |
| 2 | 1.138% | 0.797% | 119.36MiB | 110.22MiB |
| 3 | 1.107% | 0.781% | 118.70MiB | 119.86MiB |

Means include deliberate quiet intervals. RSS is sampled once per second, not an unsampled peak. Event-loop resolution20ms; measurements start after module imports and retain setup/work/idle/verification/cleanup. Server figures include the detailed observer(max1connection), retained traces and sampler in addition to the unchanged max5application pool. PostgreSQL and rendered-browser resources are excluded; no overhead claim without a control.

## Correctness and preservation

Each run used20distinct zero-progress fictional players,140unique receipts and100same-UUIDreplays. Players earned expected stock through ordinary actions, crafted/placed one planter and queued a real12hour kit. No stock, positions or economic clocks were granted/advanced. All17disposable tables matched the post-teaching checkpoint field-for-field, all9migration checksums and durability were valid. Five waves made120total stream connections; all20final connections were present at both idle bookends and each received actual heartbeats. Idle application SQL, observer submissions, unchanged presence, unexpected EOF, policy closures and cleanup streams/requests were0. Separate child processes exited normally, with no forced termination or dropped trace/resource samples.

The normal saved preview remained unchanged:17tables/everyfield,9metadata records, original keys/modes, four service PIDs and protected PostgreSQL start exactly matched baseline after the study. The diagnostic never restarts PostgreSQL; required repository recovery tests may restart only the named disposable55434candidate. Protected55432/idle-hands-2-pg and normal signing keys are never reset, migrated, copied or regenerated.

## Validation and limits

Stronger focused3/3 and pinned server typecheck pass. All193browser cases pass under the existing CI=1bundledChromium profile, zero failures/skips/flakes/report errors; collection identity equals executed identity. All232compiled files and src/server/public/browser specs/config/lockfile remain exact accepted122. Full browser execution bridges the tool-only observation change by those unchanged bytes; final local506/506domain, build, tracker and40pinned-file checks pass, with ordinary/profiled original burst p95 369.278/464.933ms under500ms. Exact final PR/main506/193also pass; see the source acceptance section below. The initial505domain regression passed before the additional monitor test; it is not relabelled506.

Initial smoke failures and pinned-runtime syntax diagnosis remain in [method](METHOD.md). Three earlier f245observations remain [initial results](INITIAL_OBSERVATIONS.md); review found a silent-EOF/aggregate-heartbeat observation gap, not an actual diagnosed game disconnect. Stronger final monitoring and these three separate runs supersede their observational scope without deleting history. Browser regressions retain the five existing intercepted HTTP menu-status cases and separately labelled stock/elapsed fixtures. The three timed studies use ordinary earned stock, real clocks and unmodified HTTP/SSE, without interception or grants; normal verification is read-only.

This is20protocol identities in a private first-lesson workload, not20rendered clients, public-construction invalidation/TownClient coalescing, physical phones, WAN, hosted capacity or a continuous15minute soak. Normal preview/gameplay is not updated by a tool-only source merge. No original Idle Hands game, real accounts, Supabase cloud, hosting or paid resource changes. Terra's accepted122visual review and the unchanged full193browser checks remain relevant; no new visual change requires a duplicate art review.

## Next useful investigation

After this task's exact source/main and read-only saved-preview gates close, reproduce whether a slow movement request body can hold the shared presence gate and delay another player. Read-only source inspection suggests that possibility; it is not yet a reproduced bug or an explanation of reported freezes. A follow-up must preserve per-player ordering, bounded queues, session checks, movement/occupancy authority and current saved positions before considering a runtime change. Public snapshot coalescing and rendered multi-player profiling remain separate future work.

See [declared plan](PLAN.md), [reproduction](REPRODUCE.md), [connection review](CONNECTION_REVIEW.md), [final compact data](measurements.json) and the dated handoff. Raw reports, traces, controllers and hashes remain under work/idle-hands-2-artifacts/session-churn-2026-11-18; keys/cookies/raw connection strings are not serialized.

## Exact source and saved-preview acceptance

PR [run44284738458](https://github.com/dadbod87/idle-hands-2/actions/runs/44284738458) passes all five jobs and raw506system/193browser(73+66+54), zero failures/skips/flakes/report errors, attempt1. All232compiled files/226art files, recovery/durability/nine migrations and rich26-home snapshots verified by artifact IDs/ZIP hashes. Original burst p95 ordinary/profiled 58.391/61.231ms; rich snapshot 62.101ms.

Main [run44287636906](https://github.com/dadbod87/idle-hands-2/actions/runs/44287636906) passes all five jobs and raw506system/193browser(73+66+54), zero failures/skips/flakes/report errors, attempt1. All232compiled files/226art files, recovery/durability/nine migrations and rich26-home snapshots verified by artifact IDs/ZIP hashes. Original burst p95 ordinary/profiled 78.305/132.824ms; rich snapshot 70.409ms.

Read-only actual-preview verification preserves all17saved-table fields/nine metadata rows/original0600keys/four service PIDs/protectedPGstart, all464normal game and125historical-study responses. No runtime restart/install was needed because the game/backend bytes are unchanged. Approximately97summed rounded standard-public job-minutes across both runs; 0CIreruns, no paid configuration, not an invoice/current billing balance. See [source closeout](source-closeout.json), [PR proof](pr-source.json), [main proof](main-source.json) and [saved proof](saved-preservation.json).
