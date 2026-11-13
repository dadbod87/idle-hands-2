# Decision log

Keep direct user requirements distinct from agent-selected defaults. Supersede an ID with a dated reason; never silently rewrite history. Evidence and feasibility checks may reopen technical choices.

| ID | Date | Status / authority | Decision and reason |
|---|---|---|---|
| D-001 | 2026-11-09 | User-approved | Separate sequel, current game remains independent. |
| D-002 | 2026-11-09 | User-approved | Town and creative work persist. |
| D-003 | 2026-11-09 | User-approved | Renew weekly competition without wiping persistent world. Exact season rewards are not yet set. |
| D-004 | 2026-11-09 | User-approved | Deliberate design/early art/systems; prove a neighborhood before expanding. |
| D-005 | 2026-11-09 | User-approved | Research reusable graphics/systems to save effort, checking licenses. |
| D-006 | 2026-11-09 | User-approved | Keep the game free if possible; no paid assets. Free/open-source tools and original or CC0 art default. No asset spending authorized; see D-008 for hosting clarification. |
| D-007 | 2026-11-09 | User-approved | Agent makes routine choices, designs a staged build/continuity system and proceeds in bounded prompts with minimal upfront questions. |
| D-008 | 2026-11-09 | User-directed | Prefer GitHub, Vercel and Supabase where appropriate. Modest additional hosting may be funded by the business if needed; obtain a concrete cost decision before provisioning, not a blanket zero-hosting constraint. |
| D-009 | 2026-11-09 | User-directed | Progress materially slower than 1.0, with humor, in-depth systems and teamwork central. Active play should not collapse long-term progression into click farming. |
| D-010 | 2026-11-09 | User-requested priority | Personal house plots to acquire, homes to design/upgrade and interiors/exteriors to decorate; persistent long-term personal investment. |
| D-011 | 2026-11-09 | User-requested direction | Personal and town/group quests, gathering/crafting and skills should provide depth and focus; restoring discovered areas should make the town feel alive over time. Item/town upgrades, rare decorative drops and unlockable/hired NPC services are candidate systems to integrate coherently, not all immediate scope. |
| D-012 | 2026-11-09 | User-directed; movement accepted after preview | Movement should feel natural and free, rather than completing visible tile steps. Continuous keyboard/diagonal motion and precise pointer movement, immediate turning/stopping, retained collision. |
| D-013 | 2026-11-09 | User-directed | Clicking the workshop door should walk into range and enter automatically, without a second Enter click. Keep manual/keyboard alternatives and cancel queued entry when the player changes intent. Character animation/graphics will later make accepted movement feel more alive. |
| A-001 | 2026-11-09 | Agent-selected; pilot required | Phaser 4.2.1 / TypeScript / Vite / DOM UI, browser-first top-down 2D. See ENGINE_DECISION for tradeoffs and source-level evidence. |
| A-002 | 2026-11-09 | Agent-selected | Local separate sequel repository at engine pilot; copy planning authority and leave pointer here. Separate cloud resources/identities when later approved, never piggyback on 1.0. |
| A-003 | 2026-11-09 | Agent-selected | PostgreSQL authoritative domain transactions, with separate Supabase a preferred candidate for database/auth/storage, Vercel for web delivery and GitHub for source/CI. Select the command runtime at shared-loop milestone. Colyseus remains a conditional room/presence transport only if needed; no dedicated room host until measured. This supersedes the earlier unconditional Node/Colyseus default under D-008. |
| A-004 | 2026-11-09 | Agent-selected | Invite-only office-sized first neighborhood; three resources/two recipes/one shared project, no commerce/PvP/large map initially. See EXPERIENCE_BRIEF. |
| A-005 | 2026-11-09 | Agent-selected; art test required | Compare original illustrated vs coherent CC0 pixel samples; pick readability/coherence, not pack size. No purchased LimeZu assets. |
| A-006 | 2026-11-09 | Agent-selected | No mandatory monetization, ads, paid advantages or subscriptions in first release. Hosting free-tier feasibility is unproven; never promise permanent zero operating costs. |
| A-007 | 2026-11-09 | Agent-selected | Start with local-only fixtures and no external runtime calls; cloud/real auth after permissions, cost and backup gate. No automatic account import. |

## Later decisions — autonomous session

2026-11-09: Nick explicitly authorized continued active work while away, focused agent review, shared-system reuse independently of art, and a stop at about 10% remaining weekly usage. Bounded target/rules: [AUTONOMOUS_SESSION_2026-11-09](../AUTONOMOUS_SESSION_2026-11-09.md). Actual read initially 69% remaining; no reset/credit/spending/publication authorized. Distinct identity and phone-first direct interaction are priorities.

A-008 (agent-selected): original illustrated company-town kit, not the Kenney comparison, with four facing directions and distance-based walk poses. Source/license comparison and concrete dimensions in [ART_DIRECTION](../ART_DIRECTION.md). Selection is a reversible art decision, not a public release.

A-009 (agent-selected after independent review): retain Phaser; borrow RPGJS separation/storage/event patterns, adopt exact-pinned Zod validation for the upcoming loop when installed/reviewed, defer XState until branching/parallel behavior warrants it. [System source review](SYSTEMS_REUSE_REVIEW.md). No engine-system code copied in this visual milestone.

## Reconsider only when evidence warrants it

Engine: pilot fails phone input/loading/rendering budgets or standard RPG plumbing dominates. Art: silhouette/scale/license coverage fails. Multiplayer: server memory/event volume or reconnect semantics fail. Cost: invited pilot does not fit a measured free option; prepare reduced scope/hosting alternatives for Nick instead of adding a bill. Product: feedback shows the small loop lacks visible personal/community progress. Record new evidence and superseding decision before changing direction.

## A010 — local workshop rules and phone-first input (2026-11-09)
Agent-selected reversible tuning under Nick’s autonomous authorization: initial depots6each to complete first visit; regeneration1/4h up to6,24h recovery cap,60 material bag,99 item cap. First planter5s once, later8h, bridge kit12h; no repeated click income/auto queue. Six authored furniture nooks, free preview/cancel/moves, nonblocking cosmetic view. Single-writer browser save, visible failure and typed validation. XP/levels are persistent practice progress without yield multipliers. These are local tuning choices, not final economy or server authority. Pacing simulations use housing kit equivalents only. Revisit waiting/content balance in neighborhood polish.

## 2026-11-10 — shared proof and owner art feedback
- D-014 (user accepted): the current illustrated preview looks great; preserve its visual family and natural controls.
- D-015 (user requested): varied trees and people, distinct building shapes/sizes/roofs and land/building materials, plus restrained ambient motion. IH2-045 is the next concrete art gate, including safe saved-position recovery if geometry changes.
- A-011 (agent selected): isolated Node HTTP command adapter + PostgreSQL16.15, private schema, atomic receipts and locks. Standard parameterized store is independent of the rendering engine. Supabase-compatible database/auth/transaction-pool boundaries reviewed; no hosted project or real JWT auth claimed.
- A-012 (agent selected): plot rights12 kits, level2 upgrade24 additional kits, matching12/36 cumulative pacing proxies. Values are shared by client/server; no new production multiplier or starter-kit grant. Automated fixtures explicitly seed48 kits/2 planters only in ih2_browser.
- A-013 (agent selected): ephemeral square presence via batched5Hz SSE, client movement~6.7Hz/server cap10Hz, no animation database writes. Personal workshop rooms are private. Position checkpoints at room transitions/commands; process boot marker and reconnect resync are local-single-process proof semantics, not a multi-instance/cloud lease design.
- A-014 (agent selected): keep browser-only saves and shared practice identities separate. No trusting imported browser balances. Local fictional HMAC sessions stand in for future verified identity; replace this adapter before hosted testing.
- A-015 (verified recovery choice): use PostgreSQL16 backup tools from the same pinned container. Host18 pg_restore produced an unsupported transaction_timeout setting against16; matching tools passed the actual restore drill. Supabase advisor local-stack connection was unavailable; executed private-schema/RLS/privilege/transaction checks on the actual database instead.

## A016 — restrained original variation (2026-11-10)
Agent-selected implementation of D-015: original layered tree SVGs and four compact directional pose sheets; new building silhouettes within existing collision/threshold geometry; future-house sample stays explicitly non-buildable. Keep stable resident identity mapping, passive local decorative people separate from server presence, and view-only reduced/hidden/offscreen-aware motion. No asset dependencies or schema/economy changes. Physical-device performance and larger NPC systems remain later gates.

## 2026-11-10 — deeper systems and town rhythm
- D-016 (user requested): keep gradually designing distinct woods/resources, plants/fruit, purchases, individual clothing/equipment, deep home expansion/decorating and shared town building; harvesting fruit, chopping, planting and other actions should eventually have their own animations. Add at least day/night, with a simple weather system considered.
- A-017 (agent selected, reversible prototype):48-real-minute cosmetic day, deterministic clear/overcast/light-drizzle segments, global timestamp-derived phases, warm windows and readable blue night. No production/crop/weekly modifier, storm loss or closed-at-night destination. Shared view anchors to snapshot time; QA phases change presentation only.
- A-018 (agent selected under bounded-work protocol): split the broad parent IH2-050 into051 rhythm/conversations/plan,052 starter housing/first-session/returns and053 restored trail/discovery, then original050 integrated acceptance. Preserve all parent acceptance; no unimplemented systems are marked done by the split.

## 2026-11-10 — expanded-world foundation (IH2-054)
- D-017 (owner direction): art for every item/buildable; distinct gathering/harvesting/planting actions, restrained door transitions and notable location opening animations. Preserve item identity through finishes.
- D-018 (owner direction): construction combines contributed/crafted materials and real elapsed opening timers. A bridge is an example; duration is not owner-set.
- D-019 (owner direction): overhead chat and a timestamped readable journal; private messages considered where fitting. Audience enforcement, retention and reporting are release requirements, not solved by an invite-only label.
- D-020 (owner direction): forests between towns, monsters, rare resources, distinct cities/services/housing plots, small dungeons, equippable/swingable weapons and edible food. Later depth, not all first-neighborhood scope.
- D-021 (owner direction): helpful resources, buffs and friendly reversible jokes/pranks between players. Avoid destructive or involuntary loss mechanics.
- D-022 (owner direction): readable health, death returning to a town bed, a time-limited corpse carrying dropped items; character design/name/flavor backstory before waking in a starting bed. Exact corpse time, equipped-item loss and expiry outcomes remain unsettled.
- D-023 (owner-approved creative direction): humorous development teaser v2 accepted; concept visuals are aspirational and are not a claim of finished gameplay/art. Latest instruction authorizes continued careful design.
- A-019 (reversible design): browser-first, installable PWA later, optional native wrapper only after measured need. No app-store or installation work in054.
- A-020 (candidate design): Ledgerwick/Inkwood/Pumpworks/Mossbank/Bellwether Quay form a five-region concept with safe routes between towns and optional PvE pockets/dungeon. Names, geography and quantities are proposals, not implemented regions.
- A-021 (model-supported candidate): a once-only paid maintenance lesson (1 each current material,60s, nontradeable contribution recognition) teaches the verb without generating a fast inventory kit or consuming the stock needed to queue the normal12h recipe. Post-completion upkeep ledger gives late arrivals useful recognition without reopening construction. Implement only with tested quest migration/receipts in052/053; numerical tuning remains provisional.
- A-022 (candidate): material-complete construction records one immutable readyAt, then opening is claimable on any later visit; no attendance window or pay-to-skip. Existing restored bridges must be grandfathered.6h/12h are simulation samples, not approved runtime prices/times.
- A-023 (open release policy):30-minute corpse is a test candidate, not a settled promise. Interrupted-phone/outage experiments show hard expiry can be unfair; equipped loss, expiry destination, outage grace and recovery fees require explicit reconciliation before combat ships. Current model includes exact-deadline recovery; final behavior remains open.
- A-024 (bounded work):054 is design/tools/tests/docs only and gates052.053 uses the existing three-resource/two-recipe catalog, one timed bridge, safe trail and cosmetic discovery. New species/tools/recipes follow integrated050 acceptance. No combat/chat/auth/public hosting is silently added.

## IH2-052 implementation and sequential run (2026-11-10)
- D-024 (owner instruction): continue through successive sections while away. Supersedes the per-prompt stop for this active run, preserving one active task and full checks/CI/closeout before each next section. Prior approximately10% weekly-remaining stop retained; no reset credits, spending or public release implied.
- A-025 (reversible prototype): one shared frontage routes to distinct plot-owned18×16 starter /24×16 expanded interiors. Existing12/24-kit purchases, six placement IDs and owned-copy allocation remain; the expansion adds continuous right-side floor. A whole street, more plots/cities, furniture slots and creator/bed opening are later work.
- A-026 (implements A-021 in bounded052): paid1/1/1,60s maintenance uses separate start/completion/redemption receipts and explicit construction/upkeep quotes; no inventory kit/currency. Preserve completed bridges and old participation, including ordinary donations after migration. Preserve paid credit if the bridge fills or a normal donation occurs later. Ordinary production remains12h/8h.
- A-027 (view-only summary): per-resident bounded device baseline plus latest confirmed snapshot, optional journal access, current ready-to-collect status and explicit missing-history wording. No auto-awards or new per-second network polling.
- A-028 (test reliability): a prior identical-runtime main run hit20min while31cases had passed, versus12.2min for its green PR. Keep job/test deadlines and all authored visual assertions. Disable continuous diagnostic trace screencast only, retaining DOM/action/source trace and failure PNGs; close no-longer-used shared browser contexts. Intentional isolated failure verifies diagnostic artifacts. ActualCIgain remains to be measured.

## 2026-11-10 — timed bridge and useful trail (IH2-053)
- A-029 (agent-selected provisional runtime default): new three-credit bridge funding starts one fixed six-real-hour construction/inspection deadline. No acceleration, reset or attendance window. Authoritative later snapshot/command opens it once; old completed bridges stay open with unknown historical times left unknown. This selects the6h bridge sample from A-022, not its future personal construction waits.
- A-030 (bounded cosmetic discovery): one safe18×26trail, three personal landmark stamps, one permanent clipboard pennant displayed in its owner’s home. Deterministic, no luck gate, material/kit/currency/skill or production reward. Late residents can complete it independently and retain paid upkeep participation. The proposed rare-PvE source for this first pennant is superseded; other rare decor remains future.
- A-031 (input recovery): initial saved-resident load must explicitly resynchronize after render bootstrap; transition cleanup uses the central panel/resync/pending-request lock guard. A fast accepted snapshot must not leave a permanent input lock.
- A-032 (measured renderer choice): retain smooth SVG textures (`antialias:true`, `pixelArt:false`), disable only WebGL context multisampling (`antialiasGL:false`). Local same-machine SwiftShader probe reduces mean frame interval25–28%; real image comparison preserves authored forms with0.034/255mean RGB difference. No claim that this alone solves CI/device performance; full visual/remote gates remain. Reproducible loopback-only diagnostic in tools/probe-renderer.mjs.

## 2026-11-10 — integrated neighborhood (IH2-050)
- A-033 (presentation contract): one current shared objective feeds Bag, field guide and authored clerk/café clues. Keep queued ordinary work distinct from paid maintenance preparation/credit/recording; server awards and economic progression are unchanged. A confirmed return summary describes held work without collecting it. Café remains exterior-only, not an implied new service.
- A-034 (isolated validation): preserve the ordinary selectable three-resident roster. A validated, bounded, copied/frozen optional synthetic roster supports fresh-stock and later twenty-client local tools; it is not account registration or hosted authentication. Drew is created only at test login with ordinary defaults and no grants. Real5s/60s automated first-visit timing is mechanical evidence, not human reading, retention or physical-device proof.

- A-035 (measured modal presentation): pause the noninteractive Phaser backdrop between1Hzrefreshes, with2framesafterresize; DOM/authority clocks remain real and independent. Resume/resetheldkeysandframegap onclose; do not pause initial boot or include menu gaps in active-play latency. Local softwaremenu probe54–55→16.7ms; exactCIgain remains separately measured. Actual resize screenshot caught a blank backdrop that functional bounds missed; retain PNGpixel proof and all existing assertions/deadlines.

- A-036 (local recovery): bounded16retired boot IDs plus dispatch/stream provenance allow older recovered state while preserving sameboot stale guards and exact pending UUID/revision/payload. Truthful recovery notice; not a multi-instance lease protocol.
- A-037 (local transport): fixed/validated-key request/stream budgets, monotonic admission clock, inclusive session expiry afterqueued/body waits,64KiB/falsewrite teardown and per-stream unchanged-presence suppression. Authority costs/timers unchanged.
- A-038 (readiness):20ordinary protocol clients/dedicatedih2_load with legal movement, realfirst5s and12hqueue; no inventory/time/positiongrants. Measure exactquery/event/bodybyte/CPU/RSS/storage scopes and idlework, not20renderedbrowsers/hostedcapacity. Reject DBquery/fragment overrides beforePool.
- A-039 (proposed hosting, owner gate): Vercelstatic+separateSupabaseDB/Auth+onepersistentNode authority. ExistingorgProverified, otherbilling/accessunverified. Conditional17/monthfirstconfiguration/cap25proposal; re-quoteifworkspace orhostingplanaddsfees. No provisioning/invites/publicrelease until concrete approval and actual070verification.

## A040 — reconnect permanently closed native streams

2026-11-10. Native EventSource treats a non-200 response such as HTTP429 as a failed CLOSED connection, rather than the CONNECTING reconnect state. Schedule exactly one explicit 5/10/20/30-second bounded backoff only for CLOSED, reset after open, and cancel obsolete timers on identity, boot, visibility, explicit connect and close. Preserve uncertain commands and existing notices. Deterministic timer tests and an observed native Chromium/real-clock fixture cover this boundary. [WHATWG processing model](https://html.spec.whatwg.org/multipage/server-sent-events.html). The earlier e0c981c CI run is superseded, not accepted.

## A041 — owner-authorized independent activity layer

November11: owner explicitly authorized continued local content and asked for useful activities during long work; this supersedes the older 'no independent ready task' stop for local content, not the070hosting/access/cost gate. IH2-062 is bounded to square-tree observation, original illustrated collection pages, strict persistent completion and a non-economic journal keepsake. No recipe/cost/time/XP/output/score changes. Old saves default an empty sketchbook without a reset. This finite chapter does not claim to occupy a twelve-hour wait.

## A042 — parallel progress and social expression

Owner explicitly makes humor, teamwork, solo progress and visible homes/equipment central. Official game references and agent-selected adaptation/next-lane plan are in ACTIVITY_DEPTH. Favor multiple verbs and independent capacities, clear ingredient/unlock chains, recognizable earned art and shared projects with newcomer roles. No proprietary code/art, monetization, punishment for absence or forced co-op schedule is adopted. Garden/trophy/wardrobe work is planned, not implemented by062.

## A043 — starter garden before earned housing

November11, agent-selected candidate under the owner’s depth/teamwork/solo/expression direction. Three rented beds with two radish/one marigold bound seed entitlements, independent produce stacks, safe held harvests, no ordinary resource/bench cost or crop-to-kit conversion. Seed recovery counts active plants. Every harvest earns base practice; a replenishing rested bank adds a bonus and never gates activity. Reject shared produce storage and bank-only XP. A solo-completable public request goal preserves newcomer recognition; only an explicitly chosen marker is shared. See design/GARDEN_LOOP.md for exact modeled limits and unresolved active-play gaps. No gardening implemented by064.

## A044 — controlled aggregate test scheduling

November11. Run Node test files with --test-concurrency=1 so analytical design simulations and database dump/restore workers do not overlap the twenty-client load measurement. All cases, assertions, budgets and intentional within-case concurrency remain intact; CI workflow and its deadlines are unchanged. This isolates a measurement, not a runtime speed improvement. Node documents this option as the maximum number of test files executed concurrently: https://nodejs.org/docs/latest-v24.x/api/test.html.

## A045 — private allotments and chosen public registry

November11, IH2-065 agent refinement. One personal18x18garden instance at a shared square gate; existing private-room presence filtering excludes it. Public registry rows project only persistent ownerID/name plus a selected owned marker. This deliberately replaces064candidate at-plot display: do not draw twenty patches across the phone square or reuse own-or-firsthouse selection for another resident’s marker. The registry is labelled as a registry, not physical plot placement. Housing routes/ownership remain independent.

## A046 — additive progress and versioned local save boundary

Reuse workshop revision/UUID/transaction and immutable crop deadlines. New GardenState is private JSON with strict conservation; one private SQL welcome row caps at6. Postfunding requests retain personal recognition and spend the disclosed produce but emit no new public credit/invalidation. Raw bank timestamps support derived UI; rendering never awards output. Legacy epoch uses last confirmed workshop timestamp; capped banks keep no hidden fractional reserve while full.

Localkeyv2migration uses the same writer lock, reads legacyv1only whilev2absent and never writesv1. Unsupportedcurrentdata is read-only and retained. This prevents a cachedolderclient’s strictschema/recovery path overwriting new progress. Simulated older-writer protocol and explicit raw fixtures are disclosed, not called execution of the old compiled app.

## A047 — independent finite verbs, not an hours-of-content claim

Garden adds two crop families, three hand-made markers, one finite three-comparison stakes errand/fourthmarker and solo-completable shared welcome bed. No old-currency/kit conversion or universal output multiplier. Preview/status controls keep their space; no action waits for its animation. Thirty-one original SVGs and96four-facing action frames reuse original resident identities/feet. More ingredient uses/practical quests require IH2-066activity audit and bounded resource/tool plan; the current lanes can still saturate.

## A048 — one useful pine family, explicit goals and retained-item town help

IH2-066 agent-selected candidate, not runtime economy. Actual fresh/returning/saturated agent audits and36policy/schedule/absence cohorts select a bound equipped hand saw, one personal pine pool, a kept pressed-flower easel on an independent finishing rack, optional produce hampers and anonymous opt-in craft recording for one fixed-deadline noticeboard. Existing timber/crop/bench/property rules remain unchanged until067's versioned implementation. The modelled bundle reserves a craft AND stops voluntary welcome requests after six; it does not isolate reservation-only effects or propose a runtime request limit. This addresses daily-request-first personal-craft starvation; it is a visible planning aid, not hidden inventory locks or automatic spending. Kept-item recording has no unique-helper gate and reveals no private owner counts. Literal prices/errors/cooldowns stay separate from authored punchlines. Models do not establish human enjoyment or hours of activity.

## A049 — dated runtime coverage and measured phone friction

The48-entry candidate catalog is not a complete runtime inventory. CURRENT_RUNTIME_COVERAGE dates accepted065's117originalSVGs/131buildfiles and explicit remaining gear/species/ingredient/art gaps;054baseline text remains historical. Nine actual agent viewport cases preserve old jobs/materials/skills/properties. Phone panels have excess blank status/intro space and the guide requires an extra Inspect at the workshop; record these as focused usability work, not failed production authority or permission to silently rewrite the current task. New family controls must start action-first with stable44pxtargets/feedback.


## A050 — explicit ownership, private equipment and additive shared progress

IH2-067 implements the selected pine family with one private supply across three stations, a separate finishing job and produced/owned conservation. Trusted allocations across home/workshop never subtract actual owned copies. Recording an earned easel retains it; anonymous public credits cap at six with one immutable 24-hour opening deadline. Rendering and animation never award or settle production. Current shared schema2 rejects cached unversioned clients before login, mutation or stream allocation. Unsupported local saves remain intact/read-only. Original saw carry follows the actual wrist; action atlases use two rows within a 2048px maximum axis, with all256frames bounded and raster-reviewed. This is local/CI scope, not physical-device or hosted acceptance.


## A051 — bounded idle redraw and self-only activity textures

IH2-067 CI hit its unchanged20minbudget after57browserpasses; no acceptance from a timeout. Keep every assertion and deadline. Load the current rig’s3activity/equipment sheets rather than all12, warm keyed sheets on identity change, cache them and retain ordinary-rig fallback. Failed loads exhaust Phaser’s existing two retries once per scene; never enqueue on every frame. Reload/scene restart can recover. Independent gallery coverage still paints all256frames.

A still world redraws at10Hz for gentle scenery; native input immediately restores the normal loop, and keys, routes, bounded actions and opening reveal keep it active. DOM/server clocks and rules remain independent. Use installed Phaser4.2setFPSLimit after the current RAF stack. Existing1Hzlocked-modal redraw remains. Frame metrics include deliberate idle intervals and must be labelled mixed-policy, not active-only. Controlled three-view software diagnostics improve browser cadence and retain actual movement/scenery; no cloud/physical-phone/whole-process CPU claim. A slower measuredCanvasfallback was rejected. See067presentation-cost.json.

## 2026-11-12 — IH2-069 optional courier commission (agent-selected design)

Based on068's finite-content/flower-choice audit, prototype one optional addressed NPC delivery chapter with unique receipt/order-card flavor, then an optional physical letterbox. Prefer2pine/1harvestedradish/noextrawait over a flower fee or another cosmetic timer, subject to final design/source gates. Free card/plan is distinct from physical ownership. First branch ignores ordinary capacity/bench/house/bridge/helper constraints; paid crafting has explicit stock/goal warnings and no hidden reservation. Three fixed free motifs preserve the one item's silhouette; publication is an opt-in style projection, not extra owned copies or player mail. Model results are conditional strategy arithmetic, not human enjoyment/actual authority. Runtime migration, transaction/proximity/retry/owned-copy proof and truthful NPC guidance belong to a subsequent bounded task. No current-game, hosted, messaging or economy change in069.

## 2026-11-12 — combined audit before another expansion

IH2-072 audits the exact accepted071 game without changing rates, art or runtime. Current-rule coupled schedules make optional material tradeoffs explicit and distinguish cumulative housing budgets from actual SQL purchases. Actual layouts show current actions buried under completed story and inactive controls, especially on phones. The recommended next bounded task is returning Pip/full-or-busy garden action hierarchy, preserving collectible stories, humor, all authority and costs. House arrangement capacity/value, stale housing labels and ordinary material-depot art remain separate findings. Candidate catalog coverage is not a game-completion percentage; timed agent paths and waiting are not human enjoyment or retention. Audit/source gates remain required before starting the recommendation.

## 2026-11-12 — IH2-073 current actions first

Agent-selected under sequential local-build authorization, from accepted072audit: completed Pip history becomes an explicit revisit disclosure, retaining card/art/humor. Current motif/status/navigation comes first. Full/busy beds reuse existing truthful service/field routes; ready crops require explicit harvest. Inactive planting quotes collapse, but paid receipts retain space until explicit close/selection. Keyboard-only uncover preserves held pointer targets; rejected retry must never fabricate a paid receipt. Short200 at-Pip motif controls need distinct coverage because proximity hides Walk navigation. No costs, timers, owned items, server rules, assets or hosting change. Exact acceptance remains in073evidence/closeout rather than inferred from this decision.

## 2026-11-12 — IH2-074 existing resource identity
Agent-selected after accepted072audit and073layout acceptance: give the three existing ordinary depots recognizable original static silhouettes. Preserve geometry/IDs/rules, use the existing exact provenance system, keep labels inside their original targets and validate initial short200visibility. No extra animation or stock-state drawing; the existing inspector remains authoritative. This closes a bounded art gap, not the whole future item catalog. Home workroom value/placement remains separate.


## 2026-11-12 — IH2-075 useful permanent workroom
Agent-selected under sequential local-build authorization after accepted072capacity finding/074art. Two extra furnishing positions make the already paid level2workroom useful without changing housing prices, production or ownership. A separate strict plot map preserves original six-slot personal saves and old home positions. New protocol4fails closed for cached3clients. Owned copies are conserved across rental6/home6/workroom2 under locked transactions; original APIs/controls retain their semantics. Existing room art and traversal stay unchanged. Source/CI and protected migration gates are distinct; keep accepted074runtime until all pass.


## 2026-11-12 — IH2-076 inside-home arranging
Agent-selected after accepted075and072phone findings. Inside owner home, current furnishing choices precede property/expansion history; outside, entering/claiming remains primary. Preserve chosen prop/slot through save/reject/refresh and reserve passive Refresh space so a held pointer cannot retarget another control. Scope async results to the original connected panel; retry keeps its exact original DTO. No server/domain/art/economy change. Native select truncation at enlarged text remains a documented platform behavior, with full accessible/picker options. Acceptance requires full source/CI/artifact and protected-preview gates.


## 2026-11-12 — IH2-077 art before collection integration
Agent-selected under owner animation/art direction after076acceptance. Prove one original rig/three hand-prop silhouettes before bulk art or runtime hooks. Reuse guarded original body/feet/base arms, author a clearer recovery tuck after review, retain exact source provenance and tolerant native alpha-position checks rather than all-channel raster equality. Other rigs and current modal/receipt visibility remain separate gates. No new playable collection behavior is implied by the study.

## 2026-11-12 — IH2-078 identities before runtime integration

Complete the proven collection art for Bea/Casey/Devon through one reusable original-rig builder. Preserve eight accepted Aster asset bytes and make the catalog-only source-provenance refresh explicit. A separate four-character gallery uses short essential labels and optional full sheets so character/material choices remain usable on narrow/enlarged views. Exact foot geometry and tolerant native raster bounds are separate gates. Independent Terra6.1review supports this bounded family; subtle tiny grips remain refinement, not proof of perceptual continuity. Do not add hidden world animation behind the current modal or change control/production timing to display it. Confirmed once-only visible receipt integration remains a separate bounded task.

## 2026-11-12 — IH2-079 visible original receipts before runtime hooks

Choose a reserved modal illustration rather than a hidden world animation or auto-closing the current form. Keep Collect/Retry dimensions and focus stable, keyboard-only uncover after ordinary focus, and explicit safe focus on reopen. Literal exact confirmation is independent of art/timing and live-announced once. Bind it to original command/player/material/panel/rig; current shared snapshot differences and message strings cannot prove quantity after replay/subscription races. Future authority must persist an optional exact grant with the original result; legacy receipts stay text-only.079implements this only as an explicit synthetic prototype, preserving game bytes. Selected-sheet loading/fallback is bounded; late decode shows a still, never another reward replay. Measure variable CIwall time without removing meaningful checks or enlarging its deadline.


## 2026-11-12 — IH2-081 actual receipt authority

Owner explicitly requests playable integration of accepted079. Persist optional original gather metadata inside the existing locked receipt JSON; legacy results stay text-only, with no new schema/rules/queries/writes. Pair each transport promise with its exact result rather than mutable global last-result fields. Local pure action exposes actual persist success; failed saves retain recovery warnings. A disposable fixed DOM view scopes presentation to original owner/rig/material/panel/intent, lazily decodes exact accepted art, and never drives production or request timing. Preserve reserved Retry geometry and pointer targets, keyboard-only uncover and explicit reopen focus. Both exact-headCI jobs, actual artifacts and quiescent practice-preserving local update remain required. No hosting/current-game/account/expense authorization inferred.


## 2026-11-12 — IH2-082 existing activities before another economy

Owner explicitly delegates the next useful section. Select a compact returning-player notebook in existing Bag & journal: current bench/rack/crop readiness and capacity, fixed links to existing inspectors, then independent sketch/Pip/wood routes. This addresses long parallel waits without another currency, recipe or reward. Projection is presentation only using existing private state/server clock, never a command, implicit harvest or settlement source. Preserve useful holdings/arranging/quests and stable controls under passive updates. No new HUD, polling, save schema or backend changes. Actual Terra desktop/mobile review and all acceptance gates remain required.

## November12 — a visible bag over the existing inventory

Owner requests illustrated carried items with stack badges now. IH2-083 reuses existing authoritative held fields rather than introducing inventory slots/capacity as a new rule. Furniture availability subtracts workshop and house placement while ownership remains visible. Seeds and produce remain distinct; protected equipped tools/displayed markers are labelled kept entitlements. Readiness alone never claims a craft. A CSS satchel and existing original item illustrations keep the visual family consistent. Drag/drop, trading and broader equipment/container systems remain separate future decisions. Exact acceptance is recorded in083evidence.

## November12 — separate RPG-style personal tools

Owner finds combined Bag & journal cluttered and wants an eventual little RPG/MMO-lite feel. IH2-084 makes Bag and Journal independent: inventory and disclosed arrangement versus current goal, work/activity/progress notes. Keep both directly reachable with labelled controls and guarded play-only shortcuts; cross-switches focus the new dialog and retain input lock. Preserve direct Arrange routes and all useful old activities. This is a navigation foundation, not new combat/equipment/chat/hosting scope. Exact acceptance is in084evidence.

2026-11-12 owner direction: continue consecutive bounded local sections while away, near10%shared usage reserve. Prioritize first-city capacity/coherent layouts, visible/enterable neighbors, purposeful art/life and clear crafting/menus; Terra audit explicitly requested. Agent candidate:24-address expandable residential blocks with stable plot-ID-derived addresses, compact service center and separate safe residential routes. See design/FIRST_CITY_LAYOUT; design is not implementation or hosted authorization.

2026-11-12 — Accepted089implements the owner's action-first menu direction: canonical item names, exact output/material/time/pocket, brief truthful reasons and optional rules/flavor. Readiness never claims output. Explicit collection retains a stable action slot with visible completion/Bag; async focus respects closed/changed panels and other chosen controls, and resize preserves the focused action. Places captures useful priorities at open and groups every retained destination once. Costs, clocks, progress and server authority stay unchanged. Exact acceptance in089closeout;088must extend these patterns for residential streets rather than add a flat25-home menu.


2026-11-12 — Local draft092keeps crop decisions compact: one selected-bed facts block uses the actual planted crop/deadline; empty beds use the next seed. Full playful names remain in the selected summary/accessibility while short seed labels keep initial phone actions visible. Move secondary produce counts into existing growing notes; retain all previous controls/explanations and meaningful geometry checks. Late feedback and successful-result scroll are scoped to the original open panel/resident/focus. No new economy or server work. Draft is independent of held091and requires the same successful exact-headCI/actual acceptance gates; no billing workaround.
