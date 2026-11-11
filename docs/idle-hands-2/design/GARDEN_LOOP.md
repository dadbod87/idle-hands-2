# A small patch with ambitions

IH2-064, November 11, 2026. **Selected design candidate; gardening is not implemented.** This package adds a reproducible design experiment and original concept art. It adds no game commands, resource grants, database migration, production clock, shop, public display or hosted service. The playable preview remains IH2-062. Read [ACTIVITY_DEPTH](../ACTIVITY_DEPTH.md) for the researched comparisons and remaining activity gaps.

Current implementation is documented in [GARDEN_RUNTIME](../GARDEN_RUNTIME.md). IH2-065 refines the display location to an owner-labelled public registry and makes full-bank refill semantics explicit; this historical thirty-six-cohort model remains separate from integration or human play evidence.

## The point of the garden

Humor, teamwork, satisfying solo progress and visible personal expression are equally important. A player should be able to finish a small useful visit alone, help a town project without requiring a particular coworker, and choose something distinctive to display. Avoid optimizing everything into one income multiplier. Planting is one lane alongside exploration, making things and decorating; three countdowns cannot supply a full evening of play.

The town rents each resident a three-bed allotment before they earn a house. No kit, scrap, timber, supplies or bench slot is required. Rental is narrative, with no recurring payment or eviction. The starter patch persists through absence and weekly competition. Growing uses real server time, independent of the cosmetic day/night or weather. Ready plants wait safely; no withering, missed attendance window or penalty for returning late.

## First crop family

| Candidate | Normal growth | Initial entitlement | Useful direction |
|---|---|---|---|
| Radish with ambitions | 30 real minutes | Two bound seeds | Mixed produce request; later café ingredient |
| Out-of-office marigold | Four real hours | One bound seed | Mixed request; later floral display |

The very first radish alone takes five minutes as a one-time teaching sample. Do not shorten subsequent cycles or existing workshop jobs. These values are design defaults tested by a model, not observed player preferences. The first implementation must clearly label its actual timers and output.

Plant one bound seed in an empty owned bed. Harvest one produce plus its replacement bound seed atomically. Seeds cannot be sold, traded, converted into old materials or used to mint extras. The seed library restores missing family entitlement only: count seeds in hand plus growing/ready plants toward two radishes and one marigold before replacing a deficit. Recovery never instantly harvests a plant. This deliberately prevents three marigold plants; flexible seed exchange or more crop families require a new capacity and pacing model.

Reserve twelve produce slots per family, twenty-four total. A shared bag was rejected because fast radishes could crowd out flowers and block mixed requests. A full family stack leaves its plant ready and seed safely attached. Show “Radish space full — use a request or choose another ready bed”; never discard output, consume the seed or restart the timer on a failed harvest. Runtime selection must allow any ready bed and preferably select the oldest ready bed, avoiding the model's greedy slot-zero priority starving another ready bed.

## Practice, purposeful visits and creativity

Every harvest earns one gardening practice point. A rested bank adds one extra point when available: initially two, replenish one per twelve hours up to six. **An empty bonus bank never prevents planting, harvesting or base practice.** The comparison where the bank was the sole source of XP was rejected: it would turn useful activity into another wait gate. No universal production bonus is added. Four- and twelve-point thresholds in the experiment are probes, not finalized skill levels or unlock prices. Future unlocks should open recipes, visual choices and expertise rather than compound all output.

An optional once-per-cycle soil/leaves observation adds authored feedback, not speed, yield or XP. A small personal field has six clipping entitlements replenishing one per fifteen minutes. Two clippings can make one of three marker styles independently of workshop resources and its occupied bench. The model collapses gathering and consumption into one action; runtime still needs reachable field locations, a real item/action contract and clear ownership. Once all three styles are owned, making duplicates is not an infinite reward loop. Rearranging a patch and choosing a marker are free creative activities.

Only a deliberately selected marker is publicly displayed at the rented plot. Private seed/produce bags stay private. Flower arrangements, home displays and visitor inspection are future extensions; they do not exist because a concept says “display.” Preserve recognizable material/silhouette identity when color or pattern is added. New clothing, equipment and rare décor should have their own visible art and acquisition story, following the same visibility/ownership boundaries.

## Independent errand selected for IH2-065

“An urgent matter of almost-straight stakes” is a one-time practical orientation request, available immediately from the allotment attendant while beds grow and the bench/depot are exhausted. Accepting is free and does not start a countdown. At three reachable square field stops, inspect an illustrated stake, compare its end/marking to three labelled choices, and select the usable piece. Wrong choices explain the mark and remain retryable; no damage, resource debit or random failure. Carry only three quest-bound pieces, distinct from timber/scrap/clippings and unusable in other recipes. Return the three correct pieces and choose an arrangement to assemble one fourth marker design, “Officially almost straight,” by hand. Preview/cancel is free. Only explicit selection publishes this marker.

Persist accepted → zero/one/two/three unique pieces → assembled once, with exact UUID replay and no duplicated reward. This quest grants no XP, kits, money, seed copies or production bonus. Existing three clipping-made markers stay distinct. Once completed, the route can be inspected again but cannot farm pieces/rewards; it is finite. Available with no house, bridge, coworker, bench slot, ordinary materials, flower or rested credit. If its selected marker is replaced, it remains owned and reselectable. No timing or play-duration claim is attached.

Acceptance states: fresh and busy-bench/zero-depot access, wrong choice recovery, cancelled approach/preview, duplicate stop/replay/concurrent final assembly, full produce bag, no coworker, reload/restart and old-save defaults. Test real approach/ownership/SQL and desktop/narrow/short keyboard/tap paths. This quest is newly specified and **outside the thirty-six-cohort model**; the reported first-hour gaps deliberately remain. One short authored errand does not establish a whole evening of activity.

## Working together without requiring attendance

Propose a mixed request consuming one radish and one marigold at most once per rolling twenty-four hours per resident. Each completion supplies one credit toward a six-credit visual town welcome bed. One resident can eventually complete it; no specific absent person, minimum unique helper count or simultaneous login is required. Larger groups can finish sooner. Preserve personal recognition and a useful personal request after the public bed opens; do not erase newcomer purpose when earlier players finish it. Contributions and a selected public marker are explicit, never an automatic transfer from a private bag.

The model's one/three/six-helper examples reach six credits after 144/48/24 hours respectively. They sum identical modeled request schedules: this is arithmetic, not a multiplayer identity, transaction or shared-server proof. The welcome bed must not pay old currency or speed workshop kits. Do not add a repeatable crop-to-scrap conversion without a separate economy audit.

## Humor is part of the action

Use short original lines tied to outcomes, with calm alternatives and no repeated blocking modal:

- Planting: “The committee has approved having roots.”
- Ready radish: “Promoted to vegetable. Still reports to you.”
- Flower not ready: “Out of office. Returning in about three hours.”
- Full stack: “The pantry is at capacity. The radish has been informed.”
- Shared welcome bed: “A public improvement. Suspiciously improved by the public.”

Keep instructions, quantities and errors literal beside the joke. Humor should never hide a failed purchase or cooldown. No coworker's identity, offensive caricature or permanent loss is a punchline. Dialogue variants and contextual reactions need a bounded repetition policy before this becomes a large content lane.

## What the experiment actually says

Run `node --experimental-strip-types tools/simulate-garden-plan.ts`. [JSON](../../evidence/IH2-064/garden-model.json) and [CSV](../../evidence/IH2-064/garden-cohorts.csv) compare three practice policies, two storage policies and one/three/twelve daily visits for seven/forty-two days: thirty-six cohorts. Every schedule includes the same extra one-time five-minute tutorial visit. The fixed strategy replants two radishes and one marigold, visits beds in slot order, makes finite markers and submits available mixed requests. It is not an optimizer, human playtest or arbitrary-strategy proof.

Selected reserved-stack/rested-bonus results:

| Days | Visits/day | Harvests | Practice | Mixed requests | Remaining bonus bank |
|---|---:|---:|---:|---:|---:|
| 7 | 1 | 22 | 38 | 7 | 0 |
| 7 | 3 | 38 | 52 | 7 | 2 |
| 7 | 12 | 38 | 52 | 7 | 2 |
| 42 | 1 | 96 | 182 | 42 | 0 |
| 42 | 3 | 108 | 192 | 42 | 2 |
| 42 | 12 | 108 | 192 | 42 | 2 |

Fast visits reach the four-point probe sooner (two/eight/twenty-four hours at twelve/three/one visits per day). Longer-run harvest/practice convergence comes partly from full stacks and request limits, not demonstrated enjoyment or balanced retention. All retain three seed entitlements and zero accounting losses. Zero losses checks conservation in this pure experiment; it does not prove database atomicity, replay safety or concurrency.

State coverage includes a fresh player, occupied bench with no scrap and no house, all seeds planted during bridge construction, full output, missing seed recovery, a week away and the known all-lanes-saturated state. The first-hour burst samples at five-minute intervals have no new modeled purposeful action at minutes 15, 20, 25, 40, 45, 50 and 55. These are opportunity samples, not measured boredom or play duration. Free rearrangement remains, but is not a substitute for quests. A short independent field/errand activity is required in the next playable slice. This design does **not** claim thirty to sixty minutes of sustained new activity.

The experiment imports current workshop constants only to report a 144 bench-hour housing lower bound and six ideal scrap per day. It does not simulate the workshop and garden together. Zero ordinary bootstrap cost and no conversion are design prohibitions, not tested runtime economic isolation. Human retention, realistic travel/action time, alternative strategies, new crop families and composed economy still need testing.

## Phone, art and authority contract for implementation

[Growth sheet](GARDEN_GROWTH_CONCEPT.svg): two crop identities, four distinguishable stages each. [Phone storyboard](GARDEN_PHONE_CONCEPT.svg): choose seed → preview/cancel → inspect a stable list → harvest/display. These are original static concept illustrations, not runtime sprites or interactive controls. Generator and hashes are recorded in [provenance](garden-art-provenance.json); no purchased or imported art. The browser concept check measures text containment and at least forty-four design-pixel targets only, not physical touch or accessibility.

Runtime needs world, bag, menu and selected public-display representations; shared foot anchors; four-facing sow, inspect and harvest actions; different seed/produce silhouettes; optional quiet growth/arrival cues. This package does not supply those animation frames. Reduced motion uses an immediate still pose/result. Decorative movement must never delay authorization, settlement or input release.

Use direct approach/tap and Places alternatives, DOM labels, keyboard focus and stable forty-four CSS-pixel controls on narrow and short viewports. Preview is free; cancellation restores the prior world/input state. Keep bed rows fixed while clocks tick. Show exact crop, output space, remaining real time and why an action is unavailable. A failed harvest leaves its row and ready plant in place. Avoid burying a busy field under a permanent panel.

Add an explicit versioned garden save with tolerant old-save defaults and strict incoming command validation. Server time, resident ownership, slot bounds, capacity and actual approach distance are authoritative. Plant/harvest/recovery/request commands use existing UUID receipts, revision checks and player/town transaction locks; retrying a receipt cannot duplicate produce, seeds, XP or contributions. Reject cross-resident access and stale/conflicting actions cleanly. Persist planted timestamps/deadlines rather than decrementing counters; never trust a browser clock or change an existing job deadline. Test simultaneous harvest/recovery, reconnect, restart, old save, invalid time and full storage against real isolated SQL before claiming durability. Backup/restore and practice preservation remain release gates.

## Next bounded task

IH2-065 implements one small garden vertical slice plus one genuinely useful independent field/errand lane, original action/item art and a selected public marker. Keep café economy, extra crop families, trade, combat, chat and weather bonuses outside that task. Validate local and authoritative server paths, timer/replay/capacity/ownership boundaries, old saves and existing jobs, then actual desktop/narrow/short browser flows, required checks and exact-head CI/artifact review. Hosted beta and physical-phone validation retain their separate gates.
