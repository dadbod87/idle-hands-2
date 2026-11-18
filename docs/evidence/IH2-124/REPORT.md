# Incomplete movement requests and shared responsiveness

Status: candidate. Focused 4/4 and typecheck pass. First full local 510: 507 pass / 3 reported failures (two actual 500 ms timing misses plus a failed parent). After strengthening the server-body-consumption barrier, current full510:509pass/1fail, profiled command605.610ms versus unchanged500ms; rich snapshot139.711ms passes. Zero skips/cancels; all four new cases pass in both. Fixed comparison results and every miss are retained. Build/plan/40 pinned-file / 232 client-byte checks pass; full 193/193 browser checks pass with zero failures/skips/flakes/report errors. Final exact-source/main/actual-preview gates remain pending.

## Player behavior and implementation

An incomplete movement request from one signed fictional resident held the shared presence exclusion. A different resident's movement and a third resident's occupancy-sensitive doorway request both waited and hit their1,000 ms test abort, even though their own requests were complete. The bounded ordinary-HTTP baseline confirms this on accepted server code before modification.

The correction keeps the first resident's own queue acquired while reading its body. Once ready, it acquires the existing shared exclusion, rechecks session expiry, validates against current geometry/confirmed feet, updates position and performs any room checkpoint. Other occupancy-sensitive commands use the same shared exclusion. Queue 4, movement 10/sec, command 30/min, protocol 9, pool 5, collision/speed/portal/home rules and all store/economy/migration calculations remain unchanged. The fix adds no HTTP requests or database queries.

Player benefit: a slow connection can wait on its own avatar while other residents continue using the town. Friction removed: an unrelated incomplete packet no longer occupies the shared position/occupancy gate. Remaining opportunity: broader local latency variability and public-update/rendered-client load still need separate evidence. This is the demonstrated slow-body path, without a general throughput/FPS/WAN/capacity claim.

## Focused proof

| Scenario | Observation |
|---|---|
| Accepted server, incomplete body held | Both unrelated requests time out at declared1,000 ms |
| Corrected server, same held-body proof | Position ACK 5.026 ms, authoritative doorway refusal 29.468 ms; both finish before body release |
| Same resident's own ordering | Three followers wait; fifth request attempt refuses 429 under the unchanged four-request cap |
| Malformed or aborted body | Queue releases; valid requests recover; malformed JSON 400 and unchanged progress |
| Expiry during body or shared-lock wait | 401, confirmed feet preserved, no movement accepted |

The movement probe is a valid zero-distance acknowledgment, not a claimed 5 ms rendered walk. These are unloaded loopback observations. The server tests initialize a fixed synthetic application clock; only expiry cases advance it. HTTP deadlines and measured latency use real time. The expiry/shared-lock case pauses a real store call and then uses its real result. No HTTP response interception, stock or position grants are used in these new cases. They run only in the explicitly guarded disposable HTTP fixture.

## Retained timing results and required gates

First full local Node regression reports 510 tests: 507 pass / 3 fail / 0 skip / 0 cancel. Actual failures are profiled 20-player command p95 **506.304ms** and rich 26-home snapshot p95 **773.692ms** against unchanged 500 ms limits; the latter's parent is the third reported failure. No non-timing failure was observed. Assertions after the failed snapshot time check were not reached in that attempt and must pass in final-source CI.

Two fixed accepted/candidate pairs and two four-probe same-checkout sequences investigate the slower candidate-associated samples. All data remain in [validation history](VALIDATION_HISTORY.md). The same-checkout probes met 500 ms, but the small samples do not isolate a unique cause, establish a general speedup or rule out a performance cost. Local timing variability remains a limitation. Original full-suite misses and later misses are not replaced or relabelled. A necessary fixture revision waits for actual server body completion before advancing auth expiry; its focused4/4and full509/510results are separate in [current local result](local-domain-current.json). Its sole miss is profiled command605.610ms; rich snapshot139.711ms passes. No full rerun was made merely to obtain green, and no cap, assertion, runner, dependency or fixture authority was relaxed.

Required final acceptance remains: complete local193browser coverage, exact final PR and main all five jobs with raw 510 domain / 193 browser cases, original500 ms burst/rich-snapshot gates, recovery/durability/nine migration checksums and all 232 unchanged compiled client files / 226 art files. Source backup is separate from source/runtime acceptance.

Full regression fixtures include explicitly labelled intercepted-response cases, including five menu-status cases and home-entry/current-snapshot failures, plus stock/deadline fixtures. They are separate from normal saved state. Actual-preview acceptance is planned with no HTTP interception, stock/position grants or synthetic clock.

## Planned saved-preview update

After exact-source/main gates, freeze immutable accepted source and compare actual confirmed feet to the normalized durable checkpoint **before** any API stop. Read raw saved positions/plot IDs/levels through SELECT-only and apply the unchanged pure canonicalHomePosition function. Ordinary pre-update sign-ins use only already-existing fictional residents with existing lesson rows; verify all stored fields remain unchanged. Hold installation if feet differ; never rewind or grant a position to make acceptance pass.

Only the two known local API processes may update. The client/art bytes and static processes stay intact, original signing keys remain in place, and protected PostgreSQL is never restarted/reset/migrated. Verify the same in-memory signed sessions across restart/reload with changed server instances and no post-update login, normal clock projection, native desktop/phone/short-screen menus, all 17 saved-table fields / nine metadata, and 464 current + 125 historical responses. Private populated backups use read-only database access; rollback is limited to known service commands.

Headless viewport/touch checks do not establish physical-phone/Safari/WAN/hosted or human enjoyment acceptance. No hosted release, original Idle Hands account/game or paid-resource change is included. Current normal preview remains accepted 122 client / 121 API 9 until the gated update passes. Finish report/tracker/dated handoff and push a verified documentation closeout before choosing another section.

See [plan](PLAN.md), [implementation](IMPLEMENTATION.md), [baseline](baseline.json), [initial focused proof](focused.json), [strengthened focused proof](focused-current.json), [full browser proof](local-browser.json), [local result](local-domain.json) and [validation history](VALIDATION_HISTORY.md). Raw logs, fixed diagnostic plans and immutable artifacts remain in work/idle-hands-2-artifacts/movement-body-2026-11-18.
