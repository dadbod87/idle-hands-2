# IH2-030 — local workshop loop

Local acceptance package for the separate private Idle Hands 2 repository. Exact-head GitHub domain-build-plan and browser-playtest remain the merge gate; inspect the PR attached to feat/workshop-loop for final SHA/status. Not a production release.

## Playable result
Tap three material depots in the square to approach/open/collect. Walk to and tap the workshop door; tap its bench to start the one-time 5-second planter. Collect it, open Bag & journal, preview a nook, cancel freely or place it. Five donated starter furnishings plus the crafted planter provide six kinds of decoration; move/remove owned furniture without charges. Queue12-hour bridge supplies before leaving. Subsequent planters take 8 hours. Inventory, job, quest, skills and placements persist in this browser across reload.

Rules are pure serializable TypeScript, independent of Phaser. Three resources, two recipes, six bounded legal placement nooks and one bench job. Resource nodes refill 1 per4h to6, with24h maximum recovery per absence; material bag60, owned item/output 99. Completed queued jobs wait indefinitely for explicit collection; no repeat queue, per-frame income or weekly erasure. The starter full depots are a one-time onboarding provision. Timer text updates each second without per-frame save writes.

Personal orientation: gather required materials→craft/claim→place planter→queue committee supplies. Gathering/making accumulate bounded XP/levels 1–5; no undisclosed production multiplier. Local command IDs/expected revisions, retained receipts and atomic invariant checks reject duplicate/stale/invalid requests without partial costs. Known-version Zod schemas validate saves/commands; bad saves recover to a disclosed fresh practice workshop.

## Reuse decision
Adopted exact Zod 4.6.7 (MIT) for validation; copied its notice and lock integrity. Phaser remains the renderer. RPGJS inventory was reviewed but its engine/map/reactive mixins make extraction unsuitable for this small framework-independent loop; useful definitions/owned-quantity/storage boundaries were adopted as patterns. XState deferred until branching/parallel quest complexity warrants it. No borrowed game art or RPGJS code was imported. Original art plus newly authored procedural depot/furniture drawings retain one style. See SYSTEMS_REUSE_REVIEW.

## Verification
Required 24 domain/art checks, strict TypeScript/Vite build, planning validator+10 tracker tests,40 pinned skill integrity checks and diff whitespace checks. Full browser suite covers15 cases:4 movement/doors/layout/reload,4 visual/reduced-motion,3 direct first-session loops (desktop1440×900,narrow360×640 touch,short844×390), isolated elapsed-time fixture, competing tabs, forced save failure and cache lifecycle. Final outcome recorded in the checked PR; no pending result is a success claim.

Actual input first-session cases use no Places directory. They gather all bins, check exact material deltas/disabled controls, craft/claim exactly once, cancel placement without changing state, place/move furniture, reopen a saved12-hour job, inspect200% text and capture screenshots. Isolated fixture advances a queued kit13 hours using its injected save, then claims once/reloads. This is intercepted fixture data only in a new local browser context, never a real account. Save-failure test intercepts Storage.setItem for that isolated context. Cache lifecycle uses explicitly synthetic browser events. No external requests, credentials or hosted services.

Independent review findings/fixes are in INDEPENDENT_REVIEW.md. Axe scans cover DOM menus/art study, with zero automated violations in checked runs and incomplete items preserved in JSON; canvas/manual/device coverage is limited. Build and per-viewport frame evidence record methods; payload is an estimate, frame sampling is headless Chrome, not representative device performance.

## Six-week pacing experiment
The committed simulation runs actual pure commands with an injected deterministic clock. Once-daily idle visits complete41 kits; twice-daily regular82; four daily active82. Active/regular ratio1.0, maximum material stock54/60. Housing equivalents are planning proxies: first workshop improvement~1.5–2.38 days, starter home~6.83–12.38 days, upgrade~18.83–36.38 days. No purchases/house ownership implemented. A missed week preserves belongings/job while reducing further production; no streak penalty.

The120-kit expansion proxy is not reached in six weeks and exceeds the present99 held-kit cap; future shared contributions/cumulative credit must be designed before that can become a real milestone. The experiment does not establish released-game fun/retention. One long recipe alone is insufficient content: future neighborhood work needs exploration, NPCs and useful choices while jobs run. No exponential click income.

## Limits / next boundary
Local files are editable and not secure, backed up to no account. Single-writer tabs depend on Web Locks/secure context; unsupported browsers are read-only. Furniture is cosmetic/nonblocking in this pilot. Placement uses authored nooks, not free rotation or arbitrary collision geometry. No real shared bridge, trading, auth, housing purchase, server command authority or cloud provisioning. No physical phone/Safari/Firefox test. Existing live Idle Hands remains untouched. Next task IH2-040 is an isolated durable two-player proof; do not silently provision a billed resource or deploy publicly.

Local execution record:24/24 domain checks passed; full15-case browser run passed in2.2m before the final container-resize fix; final4 visual/reduced-motion cases passed in6.4s with the new bounds assertion. Final exact-head GitHub full-suite result is required before merge and will be attached to the PR closeout. All local planning/integrity/diff gates passed.
