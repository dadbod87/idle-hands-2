# IH2-053 — a bridge that opens somewhere useful

2026-11-10. Branch feat/timed-bridge-trail, base b70e492472d61d6f1dc900ffe0b4e6ed0a23dac6 (PR#9). Separate private sequel, local fictional practice only. No original-game, real-account or hosted-release change.

## Playable slice

Newly funded bridges move collecting → building → open. The last ordinary kit or paid orientation credit starts one fixed six-real-hour deadline. Extra contributions, separate maintenance inspections, duplicate requests and weekly scores cannot reset or shorten it. Six hours is the provisional design default, not an owner-specified production balance. A due bridge settles in a write transaction before a repeatable-read snapshot or inside an existing command transaction, recording one permanent opening journal event. The client countdown is presentation; access and discovery remain server-authorized. No per-frame database/network work.

Forward migration 20261110234756 honors earlier completed bridges immediately and records a grandfathered journal event. Unknown historical opening times stay null. No established access is taken away and no retrospective wait is imposed.

The physical bridge opens one bounded Inkwood trail, with original ground, reused distinct tree families, an inspection stump, a retired wayfinding post and an extremely official birdwatching sign. Three personal, deterministic discoveries earn one permanent cosmetic home pennant. Each resident has their own notebook regardless of who repaired the bridge; it gives no currency, kit, materials, skill or production bonus. Re-reading and receipt replay cannot award another. The pennant appears in the correct owner's home and is visible to visitors. Newcomers also retain the once-only paid maintenance/upkeep path. This is one small safe trail, not a complete forest region, gathering expansion, combat or chat system.

Original ten-vector family covers ground, three landmarks, pennant world/icon and four bridge phases; all stages share authored foot coordinates at the actual doorway. Old before/after study art stays a comparison. Exact source/provenance brings original vectors to82. Night/weather treats trail as outdoors, home/workshop as interiors. Desktop centres the narrow trail; phones follow and pan. Exiting lands directly at the bridge threshold.

## Checks and findings

All103local domain/server/art/design tests pass with zero skips, including37authoritative checks. All41full browser cases pass in4.3minutes, including real shared/home/trail authority, forced early-snapshot ordering, monotonic opening, night and short200%text/journal UI. Strictbuild,48-entry catalog,18-task/10-test planner,40pinned files and diff checks pass. Actual PostgreSQL16.15container restart retains signed session, decorated home, queued job, opening journal and cosmetic. Actual final local desktop/phone/night/home/journal/short captures were inspected. [Check results](local-checks.json), [restart proof](database-restart.json), [build fingerprints](build-metrics.json) and [trail fixture disclosure](trail-authority.json) record methods and limits. The first focused browser run caught a concrete saved-resident bootstrap race: an early snapshot could unlock before Phaser finished, then the first frame re-locked without requiring another adoption. First-frame resync now explicitly re-adopts server state. A held-original-art / fast-snapshot intercepted regression proves this ordering without using a menu to unlock. Portal cleanup now uses the central guarded unlock rather than an obsolete transition generation after authoritative resync. No route, speed or input-lock assertion was removed.

Independent read-only frontend/authority review found no blocking issue in portal confirmation, server opening/reward gates, countdown scheduling, owner pennants or private home/stamp scope. The independent focused batch passed5cases; final full-suite results and actual images were separately reviewed.4175HTML matches the built artifact;4186was restarted after a non-destructive fictional preview backup and forward migration, preserving0/3collecting state.

## Disclosures

Server tests use isolated injected time and disposable PostgreSQL databases, including real migrations, races, rollback, dump/restore and RLS/grant catalog assertions. Hosted advisory CLI could connect locally only with TLS disabled but cannot complete its hosted lint on plain PostgreSQL lacking role anon; no hosted advisory success is claimed.

Trail browser test continues real isolated shared-town/home fixtures. Its sole SQL write shifts both bridge timestamps equally by six hours; actual server snapshot settles opening. It does not grant stock, stamps or property. Day/night study URLs only select cosmetic light. Separate readiness and stale-snapshot regressions intercept fictional API/EventSource/asset timing and are explicitly labeled. Emulated desktop/touch viewports are not physical-device proof. Wider accessibility, browser coverage, scale, costs and hosting remain later gates.

## Source gate and next section

Both required CI jobs must succeed on the exact final candidate; inspect actual CI screenshots/build fingerprints before merge. Exact candidate/run/merge and local preview proof belong to the PR closeout, not a claim from this pre-commit report. Next is IH2-050 integrated first-neighborhood acceptance, then IH2-060 isolated readiness/cost measurement within existing local authorization.

## Rejected CI candidate and bounded correction
Candidate98f99ea/PR#10/run42931080208: domain/build/restart passed, but browser job cancelled20min with28passed, one first-approach fixture failure and11uncompleted. The real trail case passed2.7min. Trace proves the intended retry sent its source position; a fixture that held the first two requests globally stranded that retry when the first approach used only one. The hold is now scoped to the first intent and a deterministic one-checkpoint variant retains the same actual inputs/authority/cancel/retry assertions. No runtime cancellation fix or deadline/assertion relaxation was needed for this finding.

Separate local software rendering probe measures25–28%lower mean frame interval when only WebGL context multisampling is disabled. SVG texture smoothing stays enabled. Actual reduced-motion day canvases differ by0.034/255mean RGB, with0.059%pixels differing bymorethan3; authored silhouettes remain. [Probe/method](renderer-probe.json) and [rejected CI](rejected-ci.json) are evidence, not proof of finalCI success or physical-phone performance. Final rebuilt41case local regression passes4.3min; actual context metadata confirms textureSmoothing:true/contextAntialias:false. Exact newcandidateCI remains pending until separately recorded.

Reproduce the bounded renderer measurement against the local built preview with `node tools/probe-renderer.mjs`; output goes to ignored test-results/renderer-probe.json. It explicitly sets context MSAA true/false so comparison remains valid after the default changes; loopback-only browser practice, no backend or real progress.

The committed diagnostic was also executed against the optimized artifact: native16.67ms; software single25.97→19.79ms, three-context means~83.3→59.6ms. Requested context attributes were verified in every case. [Reproduced raw sample](renderer-probe-reproduced.json). This corroborates the same-machine observation; it is not a hosted causal comparison.

## Closed source gate
PR#10 merged as7ee4700b719896e0560f35d4970d00b203ed30fe after exactcandidate17a88f9722c81392e92a16e1c0feb540522a89c4 /CI42935075216 passed103zero skips/41browser cases12.9min. Actual final CI images,9canopy samples(min98.5088%), build82SVGhashes and actual4175responses reviewed; merge tree equal/localmainclean. [Exact closeout](source-closeout.json). Later automaticmain run status is separate, not inferred from the PR. Next050owns integrated guidance; no hosted release.
