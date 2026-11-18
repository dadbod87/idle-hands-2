# Validation history and retained local timing misses

## Reproduction and focused correction

On accepted unchanged d406server, the first bounded probe failed on unrelated movement (doorway had not yet been attempted). A second concurrent probe recorded both independent movement and occupancy-protected doorway TimeoutError at1000ms while the actual raw body remained incomplete. SourceHTTPhash matched accepted main. Both logs remain retained. After the minimal correction, pinned server typecheck and all4focused cases passed, zero skips. The proof uses a valid zero-distance position acknowledgment, not a claimed5ms rendered walk. First peer ACK/protected refusal5.026/29.468ms are individual unloaded loopback observations.

Full local510ran once: **507pass/3reportedfail/0skip/0cancel**. There are two actual500ms timing misses: profiled20-client command506.304ms and rich26-home snapshot773.692ms; its failed parent accounts for the third reported failure. All four new body cases passed. The original full log and all server artifacts were archived before diagnostics. No non-timing failure was observed. Statements after the failed snapshot budget assertion were not reached; final-source CI must execute them successfully.

## Fixed comparison, not a green replacement

Two pairs were declared after those failures: accepted control,candidate,candidate,accepted control, each running unchanged profiling and snapshot test files with the same Node24.22.2, pool5, fixture and500ms limits. Shared runtime/art/migration bytes outsideHTTP and actualnode_modulesrealpath match.

| Order | Source | Profiled command p95 | Rich snapshot p95 |
|---|---|---:|---:|
| 1 | control | 233.891ms | 133.256ms |
| 2 | candidate | 474.085ms | 411.431ms |
| 3 | candidate | 805.420ms | 503.849ms |
| 4 | control | 257.736ms | 225.807ms |

Candidate-associated slower observations were investigated rather than dismissed. Four further snapshot probes and four profiled probes used the same candidate checkout, swapping only exact old/new HTTP bytes in a finally-restored sequence. Every outcome is retained.

| Order | HTTP version | Same-checkout rich snapshot | Same-checkout profiled command |
|---|---|---:|---:|
| 1 | old | 125.539ms | 411.802ms |
| 2 | new | 155.465ms | 274.806ms |
| 3 | new | 172.328ms | 483.788ms |
| 4 | old | 153.304ms | 197.555ms |

These same-checkout probes all met the unchanged500ms limit, but the small samples do not establish a unique cause, consistent overall speedup or absence of a performance cost. Local timing variability remains a limitation. Original full-suite misses and the two later misses are not replaced or relabelled. No additional full rerun was made just to obtain green. Exact finalPR/main510/193and original500ms gates remain mandatory.

Every profiled observation checked140unique/20replayed commands, expected stock, idle silence and cleanup before its budget assertion; all persisted and cleaned correctly even in the timing misses. The failed snapshot case records its p95 in the raw log but writes its JSON scope only after passing the budget. One stale earlier scope copied during a failed diagnostic was explicitly renamed NOT-current and excluded; its old bytes remain retained, and the reported failure uses the actual raw p95.

## Fixture and device scope

New incomplete-body tests use ordinary signed fictional residents and raw realHTTP. They do not intercept responses or grant stock/positions. All new server fixtures start with a fixed synthetic application clock; only the auth-expiry cases advance it. HTTP aborts and latency use real time. One actual store execution is paused to hold the shared lock deterministically, then the real result is used. Existing rich/legacy browser/domain fixtures include separately labelled stock/deadline preparation; full browser regressions use explicitly labelled intercepted-response cases, including five menu-status cases and home-entry/current-snapshot failures. None are normal or real-player data.

Full browser193/193passes against the corrected backend under the existing CI=1bundledChromium profile, zero failures/skips/flakes/report errors, not a physical phone/Safari/WAN/hosted acceptance. Build, tracker,40pinned-files and whitespace checks pass. All232compiled client files remain exact accepted122; no runtime installation has occurred.

All raw files and declared diagnostic plans remain under work/idle-hands-2-artifacts/movement-body-2026-11-18. CandidateHTTPbytes were restored exactly after each temporary control; no commit/push, browser run or normal runtime update used an old swapped file.

Evidence-label clarification: the initial raw focused/full JSON said the expiry cases alone used a synthetic clock. The actual setup fixes the application clock for all four tests and only advances it in expiry tests. Raw files remain unchanged; the published focused summary retains the original label and corrects it explicitly. Final test output uses the precise description. This changes metadata only, not any assertion, timer, measured value or behavior.

The initial focused JSON key pendingOwnReplies recorded zero completed replies before the held body was released. The final test labels this ownRepliesCompletedBeforeBodyRelease and records the three queued followers explicitly; assertions and behavior are unchanged.

## Deterministic shared-wait expiry barrier

After the full193browser pass, review strengthened the expiry/shared-wait fixture to wait for the server IncomingMessage end event and an event-loop turn before advancing its auth clock while the other real store call still holds the shared gate. Client end alone did not explicitly prove the body had been consumed. Backend/sourceHTTP, all browser specs and232client files are unchanged. This requires a new focused4andfull510Node execution for the stronger fixture; it is not a full rerun merely to replace timing misses. Every original full/control outcome remains retained.

The strengthened fixture focused4/4passed. Its necessary full execution reports510tests/509pass/1fail/0skip/0cancel: profiled command605.610ms exceeds unchanged500ms; rich26snapshot139.711ms passes, and all four new body cases pass. No other failure observed. Both full logs and complete server artifacts are archived separately before cleanup; no repeated run for green. Build/typecheck/plan/40pins/whitespace pass and232client bytes remain identical. Final exactPR/main all510/193must still pass.
