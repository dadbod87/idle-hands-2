# Measurement method and reproduction

Use the pinned Node 24.22.2 runtime. The comparison also used the already-installed Node 26.7.0 without changing system defaults. Set `IH2_LOAD_DATABASE_URL` to the explicit disposable `ih2_load` database on dedicated port 55434 and `IH2_PG_CONTAINER=idle-hands-2-cafe-candidate-pg`. Do not use protected 55432, a real account or a remote database. The tools refuse protected routing; no proxy can rewrite SQL or forward to protected 55432.

Run sequentially, without rendering probes or other test suites in parallel:

```sh
npm run profile:shared -- paired
npm run profile:shared -- latency
```

`IH2_PROFILE_OUT` chooses an external artifact folder. Six paired runs preserve the original workload, five-connection pool, 20 clients, real waits, 500 ms target and 120-second case bound. Each child has an owned process group; a timed-out child is killed and reported, never called a successful final report. TCP fixtures are loopback-only, bounded, byte-preserving and fully drained. A failed original workload retains its stderr and completed or partial trace. An absent final report stays absent.

`python3 tools/profile-connections.py OUTPUT` requires `IH2_PRIMARY_NODE` pointing at the existing Node 24 binary and the normal installed Node/psql. It makes only SELECT 1 calls in fresh processes. Node connection-plus-query time excludes module startup; parent wall time includes it and shutdown. libpq query timing excludes most startup; Docker exec adds CLI/container scheduling. These are warm-database connection samples, not cold-machine equivalence. No global configuration or statistic reset is performed.

`python3 tools/analyze-shared-profile.py ARTIFACT_ROOT` reads retained reports. Unique server commands are recognized by their traced receipt write, without reading payloads. All profiled complete runs have 140 such commands and 20 replays, zero dropped raw samples and no unmatched transaction beginnings. The analyzer separates pool acquisition, SQL elapsed and unattributed server span time; the last includes application work and scheduling, not pure CPU. BEGIN→COMMIT/ROLLBACK spans are client-observed time, not exact lock occupancy.

Instrumentation is opt-in to `tools/load-town.ts`. The default required baseline remains unchanged apart from an additional protected-port safety guard. The observer uses one separate connection and samples only during load; it makes no idle submissions. Its work and possible observer effect are disclosed. SQL timings include PostgreSQL execution, network and Node callback scheduling. No query text/parameters, bodies, cookies, keys or URLs are in the trace. PostgreSQL cumulative counters may lag about a second and include observer/background work; wait snapshots can miss brief waits. See the [PostgreSQL 16 statistics documentation](https://www.postgresql.org/docs/16/monitoring-stats.html). No extension, setting change, stat reset or disabled durability is used to manufacture a pass.

The offline render probe is `tools/profile-browser.ts`, accepting only a separate loopback preview on 4290. It uses one fresh isolated context per size, no API, no injected clock/state/position, native four-second ArrowRight motion, readiness checks at the existing 15-second post-navigation bound, and reload. Browser RAF gaps are separate from game draw-frame metrics; long tasks include startup as recorded. Density and physical hardware are not a calibrated mobile benchmark. Existing full browser tests still own functional desktop/touch/short/200% coverage.

The host is not a dedicated benchmark machine. Source/typechecking work and other applications may affect OS/Docker scheduling; raw host load, Node CPU/event-loop/RSS, Docker samples and failures remain visible. Sequential measured differences do not uniquely identify a cause or quantify zero instrumentation overhead. Both runtime-version and latency comparisons are diagnostics, not substitutes for the required full source/main gates or real-device/hosted validation.

PostgreSQL cumulative before/after counters cover setup through cleanup, not a load-only delta. The default harness no longer guesses a protected container for Docker CPU samples: missing explicit container selection yields an unavailable sample. The comparative driver requires the matching disposable container. Current retained runs all used that explicit target; their query/workload timings are unchanged by this safety correction.
