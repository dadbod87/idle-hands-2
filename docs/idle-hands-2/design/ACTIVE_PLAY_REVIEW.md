# Useful play while the workshop is busy

November 16, 2026. Independent audit of source `161be1e83f1e11e37a3e6136829fc2587bfdf040`, the draft [home update, PR49](https://github.com/dadbod87/idle-hands-2/pull/49). This does not accept or release that candidate. Its saved-game preview gate is still outstanding. No game rules, saves, prices, art or production deadlines change in this review.

## Finding

The game has several connected activities now, but an established resident can still exhaust the immediate progression choices while both crafting jobs and all crops are running. More house styles, an elaborate backpack or a larger skill list would not fill that particular gap.

This is a demonstrated state, not a retention prediction. Free decorating, selecting existing styles, walking, conversations and visits remain available. The probe below samples specific progression commands; it is not a census of everything the player can do. Shared housing, town events, multiplayer enjoyment and the separate browser-only practice must not be conflated.

## Reproducible evidence

[Rule observations](../../evidence/active-play-2026-11-16/eligibility.json) and [browser observations](../../evidence/active-play-2026-11-16/browser.json) record the actual outcomes. The pure fixture builder uses the registered current rules and legal actions to gather, plant, harvest, make a planter, equip a saw, finish the free post route, make its letterbox, complete the three sketches/four markers, and serve twelve local tastings. Historical timestamps simulate elapsed days; this is not a real-time or fresh-player speed test. The returning fixture translates that entire synthetic history one day earlier and settles at the actual observation time. All four snapshots pass the current save schema; each probe runs independently against an unchanged snapshot.

| Profile | Sampled progression commands available | What the current rules show |
|---|---:|---|
| Fresh | 8 of 24 | Materials, saw lesson, three sketches and accepting Pip's route are available. Other actions require their normal prerequisites. |
| Established, before starting work | 7 of 24 | Bench/rack work, a hamper, a produce request and three once-per-plant inspections are available. Produce and carried pine are full. |
| Established, after using those choices | 0 of 24 | Bench and rack each have a twelve-hour job; radishes take thirty minutes and the flower four hours. Already-used inspections, cooldowns, full stores and completed one-time errands refuse the sampled actions without spending. |
| Returning after a synthetic day | 7 of 24 | Both jobs can be collected; three crops can be harvested; hamper/request are eligible again. Ready work stays safe. |

The separate café probe refuses further servings after the local twelve-credit project and personal teapot are complete. In shared practice, three personal tastings plus a fully funded town project also ends that service for the resident. This is a bounded opening chapter, not an endless restaurant activity.

Nine actual Chromium walkthroughs cover fresh/busy/returning saves at 1440×900, 360×640 touch emulation and 844×390 with 200% text. They use actual journal/menu clicks, keyboard input, the labelled **Walk to the beds** route and canvas rendering. Observed checks cover modal movement lock, no page errors/failed requests/horizontal overflow, preserved jobs/materials/beds/rack and reload of owned items. They do not certify real phones, Safari, shared transactions, accessibility as a whole, human enjoyment or live elapsed waiting.

Two harness errors were corrected: opening the allotment notebook was initially mistaken for walking there, and an initial returning fixture put its observation clock in the future. The former timed out; the latter produced inconsistent clock-dependent panels. Neither is counted as a passing gameplay result. Final captures wait for the actual garden renderer and presented frames, not only the session's requested room.

Reproduce from this source with installed pinned dependencies and a current build:

```sh
node --experimental-strip-types tools/audit-active-play.ts
npm run preview -- --port 4198 --strictPort
# In another terminal, while that local preview is running:
node tools/audit-active-play-browser.mjs
```

Outputs go to the ignored `test-results/active-play-audit` directory. These tools use browser-only synthetic saves and the fixed local preview address. They do not log into shared practice or change a shared database. Audit scripts are observations, not additions to the mandatory regression suite.

## Small clarity fixes to carry forward

1. **Stop recommending an exhausted collection.** The busy allotment leads with “Make a marker at the field” even when all four markers are owned. The corresponding make command refuses another copy. Condition this suggestion on an unowned design and enough clippings; an existing display change should be named as a display change. If no activity is eligible, use a truthful waiting/creative-choice message rather than promising a new reward.
2. **Show current work before completed orientation.** On a 360×640 phone, the completed orientation paragraph uses much of the initial journal view and pushes the work-bench action partly below it. Keep useful fresh guidance; shorten or demote the completed lesson once current work is available.
3. **Shorten activity introductions at large text sizes.** The pine introduction occupies almost the whole short-landscape panel at 200% text. Controls remain scrollable, but reaching the next useful action takes more searching than it should.

Independent Terra6.1 review of six actual-game captures agreed on these priorities. It assessed the visible recommendation and hierarchy, not whether an unseen action was mechanically eligible. Rule probes independently establish the already-owned marker refusal. This review makes no new implementation or full-regression claim.

The final corrected returning phone capture correctly offers **Review ready harvest** and shows three ready beds. Terra rechecked that capture and the returning desktop journal; the misleading marker recommendation is scoped to the busy state. Representative captures: [busy journal](../../evidence/active-play-2026-11-16/busy-phone-notebook.png), [busy allotment](../../evidence/active-play-2026-11-16/busy-desktop-garden.png), [returning harvest](../../evidence/active-play-2026-11-16/returning-phone-garden.png).

## Next gameplay direction

Prefer one small **woodland outing** over more menus or parallel timers. Prototype a three-to-five-minute route with two meaningful path choices and a few visible interactions: find the damaged waymarker, choose a route around an obstruction, and return with a clear result. Use a small existing outskirts area first. A readable route home and an immediate visible response matter more than another settlement.

Start with an isolated interaction rehearsal. Compare two route variants and a second visit before choosing durable rewards. It must remain available with both production jobs busy, full pine/produce stores and all introductory errands complete. Do not spend the last orientation materials to enter. A person playing alone must be able to finish; a later cooperative version may let coworkers take complementary roles without requiring simultaneous attendance. No public identity, chat, combat or destructive loss is implied by this prototype.

Keep existing resources and caps when a later accepted outing pays materials. Replaying an action must not award extra stock. If storage is full, show the outcome before acceptance and keep the result safely; never silently discard it. A new keepsake, mastery milestone or shared restoration needs its own ownership, retry, capacity and persistence contract. Do not invent an unlimited practice-to-money conversion to make the outing seem useful.

The first outing is an experiment, not a promise of endless content. If its second route is just the same known-answer quiz with different text, revise the interaction before producing more assets. A small office playtest should observe voluntary replay, understood choices, confusion and return visits; agent completion times cannot establish those outcomes.

## What to borrow from UO

Keep the [UO influence proposals](UO_INFLUENCE.md) distinct from shipped systems. A paperdoll helps once there are earned clothes/tools worth showing. The illustrated Bag already has a useful foundation; flat categories and explicit available/placed/equipped counts fit phone play better than overlapping nested bags. Learn-by-doing should eventually unlock a recognizable choice or tool through varied useful actions. Existing gathering/making/carpentry practice records alone do not establish a full skill tree. Avoid macro repetition, decay and chance-based loss of scarce inputs.

The strongest fit is the connection between exploration, useful work, personal equipment, permanent homes and stories shared with coworkers. Importing old art or an emulator is not required to test that connection. No proprietary UO assets or code are included.

## Safe progression and validation

Only one implementation section may be active. Complete applicable tests, actual visual review and exact-final-head CI/artifact gates before accepting it or advancing its dependency. Keep reviewable GitHub checkpoints and distinguish candidate code from the saved preview and any future hosted game. Stop for failed required checks, uncertainty about saved progress, conflicting edits or an authorization barrier.

While PR49's saved-preview acceptance is unavailable, independent read-only audit/design may proceed; dependent game implementation and task closure remain held. This branch records that independent work without changing the task tracker to claim acceptance. Do not change the original Idle Hands game, real accounts, saved progress, paid services or hosting.

Success is a demonstrated playable benefit with clear desktop/phone controls, preserved progress and matching validation evidence. For the audit, success is narrower: reproduce the quiet state, identify a truthful next improvement and preserve a useful implementation brief. Remaining opportunity is an enjoyable repeatable outing and a human playtest, not a larger catalog.

The audit tools executed successfully; all nine browser records satisfy their explicitly listed checks. Build, design validation, plan checks (including ten tracker tests), forty pinned skill files and whitespace checks passed. The existing 479-domain/180-browser regression result belongs to PR49's exact source head, not to this later audit branch. No fresh full suite, hosted CI or merge is claimed for the audit checkpoint.
