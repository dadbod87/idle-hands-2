# Incomplete movement requests and shared responsiveness

Status: complete. [PR57](https://github.com/dadbod87/idle-hands-2/pull/57) merged **816d2b89479c1318ebe05b67339f3b71b1efcf92** with an identical tested candidate tree. Exact PR/main five-job/raw510-domain/193-browser and actual saved-preview gates pass. Local timing failures below remain retained.

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

## Saved-preview safety contract (subsequently completed below)

After exact-source/main gates, freeze immutable accepted source and compare actual confirmed feet to the normalized durable checkpoint **before** any API stop. Read raw saved positions/plot IDs/levels through SELECT-only and apply the unchanged pure canonicalHomePosition function. Ordinary pre-update sign-ins use only already-existing fictional residents with existing lesson rows; verify all stored fields remain unchanged. Hold installation if feet differ; never rewind or grant a position to make acceptance pass.

Only the two known local API processes may update. The client/art bytes and static processes stay intact, original signing keys remain in place, and protected PostgreSQL is never restarted/reset/migrated. Verify the same in-memory signed sessions across restart/reload with changed server instances and no post-update login, normal clock projection, native desktop/phone/short-screen menus, all 17 saved-table fields / nine metadata, and 464 current + 125 historical responses. Private populated backups use read-only database access; rollback is limited to known service commands.

Headless viewport/touch checks do not establish physical-phone/Safari/WAN/hosted or human enjoyment acceptance. No hosted release, original Idle Hands account/game or paid-resource change is included. Normal preview now uses accepted122client/124API9 after the completed gates below. Finish report/tracker/dated handoff and push a verified documentation closeout before choosing another section.

See [plan](PLAN.md), [implementation](IMPLEMENTATION.md), [baseline](baseline.json), [initial focused proof](focused.json), [strengthened focused proof](focused-current.json), [full browser proof](local-browser.json), [local result](local-domain.json) and [validation history](VALIDATION_HISTORY.md). Raw logs, fixed diagnostic plans and immutable artifacts remain in work/idle-hands-2-artifacts/movement-body-2026-11-18.

## Remaining measured waiting

The retained strengthened local profiled run observed pool-acquisition p95 433.47ms and snapshot-query p95 39.41ms; the accepted PR observed34.79/4.52ms respectively. These are different host/setup executions, not a controlled causal comparison or grounds to change pool5. Long-lived HTTP events spans include the intended open-stream lifetime and are not ten-second request stalls. Overlapping span sums must not be added as wall time. Public-refresh amplification is still unmeasured by the private-first-lesson protocol workload and remains a useful bounded follow-up.

## Final source and saved-preview acceptance

PR [run 44305545886](https://github.com/dadbod87/idle-hands-2/actions/runs/44305545886) passed all five jobs and raw510domain/193browser (73+66+54), zero failures/skips/flakes/report errors, attempt1. Original500ms gates: ordinary/profiled command p95 56.021/52.440ms; rich26-home snapshot 58.214ms. All232client/226art bytes, new body tests, recovery, durability and nine migration checksums independently verified from pinned artifact IDs and ZIP hashes.

Main [run 44308040580](https://github.com/dadbod87/idle-hands-2/actions/runs/44308040580) passed all five jobs and raw510domain/193browser (73+66+54), zero failures/skips/flakes/report errors, attempt1. Original500ms gates: ordinary/profiled command p95 58.025/62.573ms; rich26-home snapshot 61.192ms. All232client/226art bytes, new body tests, recovery, durability and nine migration checksums independently verified from pinned artifact IDs and ZIP hashes.

Updated only the two known local APIs to immutable accepted main. Three fresh pre-update existing-fictional sessions first matched their normalized durable feet, then retained the same RAM cookies across changed server instances and reload with no post-update login. Native16layouts/26PNGs verify desktop2K/4K, phones320/360 and short200%-text menus. No actual-view HTTP interception, movement, economic commands, grants or synthetic clock. All17table fields/nine metadata/original0600keys/staticPIDs/protectedPG start and464current+125historical responses preserved. [Saved proof](saved-preservation.json), [actual native proof](actual-saved.json), [desktop](actual-practice-desktop2k-world.png), [phone](actual-practice-touch-phone360-world.png), [short menu footer](actual-practice-touch-short200-bag-footer.png).

Approximately 93 summed rounded standard-public job-minutes, 0 CI retries; no paid configuration. This is not an invoice or current billing balance. [Source closeout](source-closeout.json), [PR proof](pr-source.json), [main proof](main-source.json). No hosted or original-game release. Terra6.1reviewed all26current stills with no apparent visual blocker; immediate-touch gray rectangles disappear in later pairs (cause/duration/input impact unestablished), while Registry sign and Journal discovery remain future UX opportunities. [Terra review](terra-actual-saved.md).
