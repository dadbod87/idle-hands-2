# Guard current shared opening transactions

Status: complete. [PR58](https://github.com/dadbod87/idle-hands-2/pull/58) merged **6c150fb6f10df6ac6decd2377cd96448e8c6d028** with an identical tested candidate tree. Exact PR/main all-five/raw514-domain/193-browser, original500ms/recovery and read-only actual-preservation gates pass. The two local timing failures below remain recorded. No runtime/gameplay change or install.

## Change and purpose

Only a new Node regression file is executable-source change. Four tests call the current live TownStore's public methods against real isolated PostgreSQL. They cover simultaneous bridge, noticeboard and café openings at the exact deadline; full rollback when a real trigger rejects the final café write; ordinary-command versus snapshot settlement with once-only replay; and unchanged latched timestamps/stored progress across late, fresh-store and backward observations.

Existing bridge-only deadline/rollback coverage in the legacy store and current café receipt coverage do not together establish this combined current-store behavior. The cases do not call a private helper or replace production queries. No bug or performance improvement is claimed by adding them. Their purpose is to prevent future query optimizations from opening a location early, partially publishing an opening, duplicating rewards/history or resetting progress.

Player benefit: retain predictable construction and progress when backend work changes. Friction removed: close a combined current-path regression gap before optimization. Remaining opportunity: measure public refresh fanout and investigate database waiting before introducing caches, changing pools or reducing settlement roundtrips.

## Fixture disclosure

Every case uses a fresh explicitly guarded disposable55434/ih2_test schema and all nine unchanged migrations; CI uses only its own explicit5432service container. Direct SQL prepares synthetic historical public-project funding, respecting the café monotone-credit trigger and lifecycle constraints. A synthetic application clock crosses deadlines. One real PostgreSQL fixture trigger injects a failure and is removed before retry. The ordinary gather/replay is tested through UUID/revision authority; these are trusted store calls, not new cookie/HTTP tests. No normal saved state or personal stock/position is granted or edited.

Protected/malformed target probes refuse before Pool and do not expose URL values. New tests are4/4both focused and in the full run. Both local timing failures are retained with raw logs/artifacts; unchanged runtime bytes do not justify labelling them passed. Existing500ms gates, all old tests, workflow/shards/caps/fixtures and authority remain intact. No replacement full run was made to obtain green.

## Browser and runtime scope

The source diff permits only documentation and tests/server-settlement.test.ts. Backend/client/art/browser specs/fixtures/configuration/dependencies and all232compiled client files are identical to accepted124. [Byte bridge](local-browser-byte-bridge.json) pins the prior raw full193report and exact HTTP/client identity. It is not fresh source-head CI evidence; exact PR and main must each pass all five required jobs, raw514domain/193browser, original500ms/rich26-home/recovery/nine metadata and the four new structured settlement samples.

Normal runtime remains accepted124API9/122client. No install/restart, hosting, original-game change or expense is included. Current124native16layouts/26PNGs/Terra are prior acceptance on these exact same game bytes, not new captures for this test commit. Chrome viewport/touch is not physical-device/Safari/WAN or human enjoyment acceptance. Completed read-only actual data/key/four-PID/PG/464current+125historical verification after the exact-source gates; no restart or new cookie-survival execution.

See [plan](PLAN.md), [method](METHOD.md), [focused](focused.json), [full structured cases](full-current-settlement.json), [full local counts](local-domain.json) and [byte bridge](local-browser-byte-bridge.json). Raw logs and archived server artifacts remain in work/idle-hands-2-artifacts/settlement-guard-2026-11-18. Exact source/run/next-step pointers are saved in the closeout and dated handoff; the existing preview remains intact.

## Final exact-source and saved-preview acceptance

PR [run 44320434511](https://github.com/dadbod87/idle-hands-2/actions/runs/44320434511) passes all five jobs and raw514domain/193browser (73+66+54), zero failures/skips/flakes/report errors, attempt1. Original500ms p95 ordinary/profiled command 91.497/76.635ms; rich26-home snapshot 86.383ms. Pinned artifact IDs/ZIP hashes verify all new structured cases, all232client/226art files, recovery/durability and nine migration checksums.

Main [run 44323217023](https://github.com/dadbod87/idle-hands-2/actions/runs/44323217023) passes all five jobs and raw514domain/193browser (73+66+54), zero failures/skips/flakes/report errors, attempt1. Original500ms p95 ordinary/profiled command 104.585/87.959ms; rich26-home snapshot 73.213ms. Pinned artifact IDs/ZIP hashes verify all new structured cases, all232client/226art files, recovery/durability and nine migration checksums.

Read-only actual verification preserves every17-table field/nine metadata/original0600key/four service PIDs/protectedPG start and464current+125historical responses. Existing124API9/122client are byte-equivalent to accepted126runtime; movement-body active-services.json remains the service authority. No normal data write, process install/restart, new account, grant, key copy or original-game/hosted release. Prior12416-layout/26-PNG/Terra acceptance remains prior evidence on identical game bytes, not new126captures or cookie tests. Approximately87summed rounded standard-public job-minutes, 0CI retries; not an invoice/billing balance, no paid configuration. [Closeout](source-closeout.json), [PR proof](pr-source.json), [main proof](main-source.json), [saved proof](saved-preservation.json).

## Morning handoff

The [morning review](../../idle-hands-2/handoffs/2026-11-18-morning-review.md) provides the short player-facing outcome, local preview links and limits. The [development home](../../idle-hands-2/README.md) now points to the current handoff instead of its stale November12/private-source wording. These are documentation updates only; accepted runtime and CI source remain pinned above.
