# Guard current shared opening transactions

Status: candidate. Four focused cases pass. Full local run: **512/514 pass**, two retained existing command-p95 misses (710.601ms ordinary,1286.392ms profiled versus unchanged500ms), no skips/cancels or other observed failure. Build/typecheck, tracker/10checks,40pinned files and whitespace pass. All runtime/browser inputs and232compiled client bytes match accepted124; prior full local193browser coverage is connected by an explicit byte-identity proof, not claimed as a new local execution. Fresh exact PR/main514domain+193browser gates remain pending.

## Change and purpose

Only a new Node regression file is executable-source change. Four tests call the current live TownStore's public methods against real isolated PostgreSQL. They cover simultaneous bridge, noticeboard and café openings at the exact deadline; full rollback when a real trigger rejects the final café write; ordinary-command versus snapshot settlement with once-only replay; and unchanged latched timestamps/stored progress across late, fresh-store and backward observations.

Existing bridge-only deadline/rollback coverage in the legacy store and current café receipt coverage do not together establish this combined current-store behavior. The cases do not call a private helper or replace production queries. No bug or performance improvement is claimed by adding them. Their purpose is to prevent future query optimizations from opening a location early, partially publishing an opening, duplicating rewards/history or resetting progress.

Player benefit: retain predictable construction and progress when backend work changes. Friction removed: close a combined current-path regression gap before optimization. Remaining opportunity: measure public refresh fanout and investigate database waiting before introducing caches, changing pools or reducing settlement roundtrips.

## Fixture disclosure

Every case uses a fresh explicitly guarded disposable55434/ih2_test schema and all nine unchanged migrations; CI uses only its own explicit5432service container. Direct SQL prepares synthetic historical public-project funding, respecting the café monotone-credit trigger and lifecycle constraints. A synthetic application clock crosses deadlines. One real PostgreSQL fixture trigger injects a failure and is removed before retry. The ordinary gather/replay is tested through UUID/revision authority; these are trusted store calls, not new cookie/HTTP tests. No normal saved state or personal stock/position is granted or edited.

Protected/malformed target probes refuse before Pool and do not expose URL values. New tests are4/4both focused and in the full run. Both local timing failures are retained with raw logs/artifacts; unchanged runtime bytes do not justify labelling them passed. Existing500ms gates, all old tests, workflow/shards/caps/fixtures and authority remain intact. No replacement full run was made to obtain green.

## Browser and runtime scope

The source diff permits only documentation and tests/server-settlement.test.ts. Backend/client/art/browser specs/fixtures/configuration/dependencies and all232compiled client files are identical to accepted124. [Byte bridge](local-browser-byte-bridge.json) pins the prior raw full193report and exact HTTP/client identity. It is not fresh source-head CI evidence; exact PR and main must each pass all five required jobs, raw514domain/193browser, original500ms/rich26-home/recovery/nine metadata and the four new structured settlement samples.

Normal runtime remains accepted124API9/122client. No install/restart, hosting, original-game change or expense is included. Current124native16layouts/26PNGs/Terra are prior acceptance on these exact same game bytes, not new captures for this test commit. Chrome viewport/touch is not physical-device/Safari/WAN or human enjoyment acceptance. Complete read-only actual data/key/four-PID/PG/464current+125historical verification only after exact-source gates.

See [plan](PLAN.md), [method](METHOD.md), [focused](focused.json), [full structured cases](full-current-settlement.json), [full local counts](local-domain.json) and [byte bridge](local-browser-byte-bridge.json). Raw logs and archived server artifacts remain in work/idle-hands-2-artifacts/settlement-guard-2026-11-18. Save exact candidate/run/next-step pointers; if required checks remain pending at7AM, keep the candidate unaccepted and preserve the existing preview.
