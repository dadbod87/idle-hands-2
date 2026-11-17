# IH2-120 — performance profiling candidate

Profiling and measurements are implemented on `perf/shared-loop-profile`, over the accepted woodland closeout `ba10743`. Full exact-source acceptance is pending. The normal saved previews remain the accepted 119 client/API; no runtime optimization or production release is claimed.

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

Four focused unit tests, typechecking, build/byte equality and exploratory measurement collection pass. The complete local domain run executed 495 tests: 494 passed, one failed, zero skipped. Its sole failure is the original 500 ms load target at 564.302 ms; the new profiled load case and all other authority/conservation/recovery checks passed. Both complete raw load cases and the full log are retained separately from the 17 exploratory samples. No failed local run is called a pass. Full browser and exact PR/main/raw gates remain pending; this task is still active. No GitHub run has been requested for this candidate yet.

After this task is accepted, [IH2-121](../IH2-121/PLAN.md) should test a coherent batched snapshot read, preserving same-clock fields and strict transaction semantics. The user benefit would be quicker confirmed actions under database latency. The friction this task removes is guesswork: pool pressure, query count, scheduling, rendering and injected latency now have separate evidence. The remaining opportunity is fewer round trips and a populated-home workload, not a larger pool or weaker durability.
