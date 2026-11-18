# IH2-120 — accepted profiling checkpoint

Profiling and measurements are implemented on `perf/shared-loop-profile`, over the accepted woodland closeout `ba10743`. Full exact-source acceptance and read-only saved-preview preservation are complete. The normal saved previews remain the accepted 119 client/API; no runtime optimization or production release is claimed.

The measurements support a focused next step: reduce sequential database round trips and how long they occupy the connection pool. They do not prove one cause for every reported slowdown, or a hosted player limit.

## What the measurements show

All 17 retained exploratory backend runs completed the same 20-client workload: 140 unique commands, 20 exact replays, real five-second first planter, unchanged twelve-hour queued job, conserved stock/receipts/private presence, ten seconds with zero idle SQL, and cleanup with zero active requests or streams. Five runs failed the unchanged 500 ms command target; none is reclassified as a pass.

| Sample set | Command p95 | Result against 500 ms |
|---|---:|---|
| Initial Node 24 baseline | 968 ms | Failed |
| Initial Node 24 profile | 633 ms | Failed |
| Three later Node 24 baselines | 139–346 ms | Passed |
| Three later Node 24 profiles | 187–329 ms | Passed |
| Three Node 26 baselines | 159–542 ms | One failed |
| Three Node 26 profiles | 262–287 ms | Passed |
| Latency experiment, direct | 219 ms | Passed |
| Latency experiment, 2 ms per chunk/direction | 1,480 ms | Failed |
| Latency experiment, 5 ms per chunk/direction | 1,834 ms | Failed |

The paired sets are sequential baseline/profile/profile/baseline/baseline/profile runs, not simultaneous controlled-host experiments. Background workstation activity, cache/scheduling and Docker conditions vary. Both Node versions show variability; the major version alone does not explain the failures. Three fresh processes each of Node 24, Node 26, host libpq and in-container libpq completed SELECT 1; this small warm-database set did not reproduce the earlier five-second connection timeout.

In the initial traced failure, the pool acquisition p95 was 463 ms. The slowest finite command spans spent roughly 300–488 ms acquiring a connection and 140–334 ms in database calls; unattributed application/scheduling time was about 2–4 ms in those specific requests. Each ordinary command made 27–28 database calls. SQL timings include network and callback scheduling, not pure database CPU; a `FOR UPDATE` query duration alone is not proof of lock contention. Sampled PostgreSQL backends were often awaiting the client, including inside transactions; sampled lock or disk waits were not dominant. Sparse samples can miss waits.

The synthetic latency proxy preserves opaque bytes and changes no SQL, stock or time. It adds a fixed delay to each TCP chunk in each direction; actual query RTT varies with chunking and backpressure. Those failures demonstrate sensitivity to database-link latency, not a real WAN benchmark. Durability remained enabled: fsync, full-page writes and synchronous commit were on. The ordinary pool remains five connections; the opt-in observer has one separate read-only connection, and submits no idle probes.

## Rendering is a separate measurement

One fresh offline fictional resident per viewport became ready in about 1.1–1.6 seconds and reloaded in 0.7–1.2 seconds, with no API calls or browser/network errors. Browser callback gap p95 during the comparable keyboard-driven movement window was about 16.7 ms at 2K/phone and 33.3 ms at 4K. These are callback intervals, not guaranteed presented-frame FPS. The game's mixed idle metrics deliberately include its 10 Hz idle cap.

The screenshot/interaction sample uses Chrome fine-pointer desktop and coarse-touch phone layout, with ArrowRight keyboard movement for a comparable render window. It is not physical touch-input timing, a physical phone, 20 rendered players, an established-player payload or hosted performance. [Terra's still review](TERRA_REVIEW.md) found no obvious visual blocker; its visual observations are separate from operator timing claims. [2K](desktop2k.png), [4K](desktop4k.png), [phone](phone360.png).

## What changed, and what did not

Opt-in diagnostic tooling records safe query categories, pool acquisition, async-request-linked HTTP spans, client-observed transaction durations, read-only PostgreSQL settings/wait/stat observations, raw failures and cleanup. A sequential driver runs matched samples and declared latency fixtures; a separate fresh-connection comparison and render probe keep different causes visible. No SQL values, request bodies, cookies, keys or connection URLs are written to profile records. Tests cover callback/promise preservation, error propagation, bounded traces, concurrent request context, opaque network bytes and protected-target refusal.

Client/server rules, all nine migrations, art, lockfile, protocol, economy, timers, home allocations and production capacity are unchanged. All 232 compiled game files exactly match accepted 119. Destructive test work is restricted to the dedicated 55434 `ih2_load`; normal services and protected PostgreSQL are untouched. The temporary offline 4290 preview was stopped after collection.

[Measurements](measurements.json), [fresh connections](connections.json), [render results](render-measurements.json), [method/reproduction](METHOD.md), [runtime preservation](runtime-preservation.json). Raw traces, stderr and failed reports are retained under `work/idle-hands-2-artifacts/performance-profile-2026-11-17`. No local failing run is a successful capacity claim.

## Acceptance and next step

[PR52](https://github.com/dadbod87/idle-hands-2/pull/52), candidate **10351259497400a3a5d84ddb004a6149bf4f2dc8**, merged as **1999f83b6a8b13e5fbdde81b003ba9af8b58bcc3**, identical tree. Exact PR **44209296179** and main **44215967092** each pass all four required jobs and raw **495 domain /188 browser cases (89 + 99)**, zero failures/skips/flakes/report errors. All188 previous browser cases remain present. Actual restart/restore/same-session, nine migration checksums, conservation/cleanup/idle and unchanged500ms load gates were independently inspected.

| Accepted run | Baseline command p95 | Profiled command p95 | Neighborhood snapshot p95 |
|---|---:|---:|---:|
| PR 44209296179 | 63.278ms | 68.271ms | 68.936ms |
| Main 44215967092 | 63.629ms | 68.868ms | 69.408ms |

The ordinary and profiled workloads each retain5620SQLcalls,140unique commands and20replays. These synthetic protocol results are neither hosted capacity nor proof that the workstation's intermittent stalls have one cause. Retained explorer/initial failures remain failures.

The initial full local domain run was494/495 with its original500ms load failure at564.302ms. The initial full local browser run was186/188 with two independently traced existing fixture races. The corrected five housing/residential cases pass locally; full corrected coverage passes on the exact PR/main. The test fixes wait for authoritative construction before their guarded six-hour advance, and confirmed position after synthetic visibility resume. Runtime, quote lifetime, timers, test timeouts, budgets and coverage are unchanged. [Race evidence](housing-fixture-race.json), [focused result](corrected-focused-result.json), [validation history](VALIDATION_HISTORY.md).

Initial f76 run44201751026 passed495domain and group2all93, but group1was cancelled at20minutes after90/95passes following a242-second browser installation (group2:23seconds). Its final group1report is unavailable and the aggregate failed. Corrected eeb1e3d run44205543243also reached the20minute group1cap after94/95passes withnormalsetup; domain495/group2all93passed, aggregatefailed. Three independent offline files/six cases (78.1logged seconds) were redistributed to2, preserving exact188case identities as89+99and ordered real-town family. Final1035125attempt1was also cancelled after85/89when Ubuntu's mirror took4min15sto fetch32.1MB (293second install). The confirmed infrastructure retry ran only affected checks on the identical SHA; exact-head domain/group2successes were reused. The final balanced candidate has its own complete checks; PR proof records actual execution IDs/attempts separately from GitHub's cloned logical job IDs. [Same-head retry](third-initial-ci-result.json). Initial run approximately42rounded standard public job-minutes, second43; final PR62, main40. Final PR minutes include all distinct actual executions across its attempts, excluding duplicate logical copies of reused successes. This is not an invoice or billing-cycle balance; no paid configuration changed. [Initial result](initial-ci-result.json).

Normal [practice](http://127.0.0.1:4175/?town=1) and [fictional Tour](http://localhost:4176/?town=1) retain the accepted119 frozen232-file client/API9. All17 tables/every field, nine migration rows, original0600keys and four process IDs are exact across this task. All464normal static responses and125historical-study responses are exact. No installation, API/PostgreSQL restart, migration, login, movement, stock grant, reset or reseed was needed or performed for120. Prior119 native session/visual limitations remain in its report; this read-only check does not retroactively expand them.

[IH2-121](../IH2-121/PLAN.md) is next and remains queued at this closeout: test a coherent batched snapshot read with same-clock field equivalence, populated homes, strict privacy/transactions and the retained load/latency matrices. Player benefit from120 is measurable evidence for that decision; no runtime speedup is claimed yet. Friction removed: pool pressure, query count, scheduling, rendering and injected latency have separate evidence. Remaining opportunity: fewer round trips, then actual representative-device and hosted validation at their later gates.

GitHub retained a same-name partial group1artifact from the cancelled attempt and a completed retry artifact. The initial by-name download lacked the HTML report, so raw verification correctly stopped. Explicit newest-created same-run/same-head IDs selected the completed report; old partial downloads remain archived. Verification now checks those IDs/head/attempt plus complete report contents. [PR artifact selection](pr-artifact-selections.json), [main selection](main-artifact-selections.json).

[Source closeout](source-closeout.json), [PR proof](pr-ci-verification.json), [main proof](main-ci-verification.json), [saved preservation](saved-preservation.json). This is local sequel source acceptance, with no original-game or hosted public release.
