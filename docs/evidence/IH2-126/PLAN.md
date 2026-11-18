# IH2-126 — current shared-opening regression guard

Declared after125six-trial evidence was verified and its documentation pushed ef604454f876917fc878bb05f44d296a7f05a15a. This is test-only coverage; no runtime optimization or gameplay change is selected. Source starts from that complete handoff over accepted124main816d2b89479c1318ebe05b67339f3b71b1efcf92.

## Gap and player benefit

Existing legacy-store tests cover bridge-only deadline/event rollback, and current café tests cover serving receipts. Add observable coverage through the current live TownStore for simultaneous bridge, noticeboard and café settlement. Future performance changes must not open locations early, partially publish an opening, duplicate its history or alter personal progress. Do not test a private helper or mirror its SQL. Keep current source untouched.

## Four focused cases

1. Just-before versus exact shared deadline: concurrent current-store snapshots and independent store instances open all three once, with exact ready/open/event timestamps and unchanged saved personal progress.
2. A real isolated PostgreSQL trigger rejects the final café opening write. The entire current snapshot transaction must roll back all shared changes/history and every unrelated saved row; remove the fault and retry successfully once.
3. An ordinary revision-checked command settles the bridge/noticeboard while preserving the deliberately separate café-opening path; replay remains once-only. A subsequent snapshot opens the due café normally. Do not modify its authority or merge those semantics in an optimization.
4. Later snapshots/fresh stores preserve latched opening timestamps and personal stored data, with no duplicate events, including a bounded backward observation after opening if current invariants permit it. Retain failures; correct fixtures before interpreting a rejected fixture as a game bug.

Use only explicit matching loopback55434candidate/ih2_test, or CItrue/5432hexservicecontainer. Guard before Pool; malformed URLs must not expose their contents. Fresh9-migration synthetic fixtures may construct historical project deadlines and use a synthetic application clock; disclose both. No normal saved data, stock/position grants, HTTP interception or protected55432/key operations. Injected faults and direct fixture preparation are not production observations.

## Acceptance and source freshness

Focused four cases, full current514domain/build/plan/40pins/whitespace, all232compiled client bytes and every runtime/config/browser-spec/fixture/dependency input identical to accepted124. The full local193browser run already executed against these exact unchanged backend/client/spec bytes; record a precise byte-identity bridge rather than falsely claiming a new local run or repeating it without a browser-relevant change. Final exact PR and main still require fresh all-five/raw514domain+193browser, unchanged500ms/rich26/recovery/nine checksums and new current-settlement artifacts. No skipped coverage, caps, runner or fixture authority changes.

After source gates, read-only actual verification preserves17tables/nine metadata/original keys/four PIDs/protectedPG and464current+125historical responses. No runtime install or new cookie-survival claim is needed for test-only source. Current124native16layouts/26PNGs/Terra remain explicitly prior evidence on identical runtime bytes, not new captures of this test commit.

Update report/tracker/dated handoff and push verified closeout before another section. Source backup is not merge/acceptance. Stop byNov18 15:00UTC/7AM Pacific or roughly90%weekly use; latest21%used. If checks are still pending at deadline, save a clean exact resume point without merging or weakening gates. No paid/cloud/original-game change.
