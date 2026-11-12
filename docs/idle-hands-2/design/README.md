# A living town, built one useful layer at a time

IH2-054 design package, 2026-11-10. **Design candidates, not implemented features.** The design was recorded against the IH2-051 neighborhood. The design package itself adds no regions, combat, chat, purchases, real accounts or hosting. IH2-052/053 now implement their bounded home/teaching/return and timed bridge/trail slices; see CURRENT_SESSION and exact task evidence, rather than treating every candidate as shipped.

## Read the design

- [Owner direction and decision boundaries](OWNER_DIRECTIONS.md)
- [World and systems design](WORLD_AND_SYSTEMS_DESIGN.md): opening, homes, construction, exploration, combat/recovery and social contracts
- [World concept map](WORLD_CONCEPT.svg) and [region data](REGION_PLAN.json): candidate connections and distinct services; not a playable map or travel-time measurement
- [Item/art production plan](ASSET_PRODUCTION_PLAN.md) and [candidate content catalog](CONTENT_CATALOG.json): current gaps, production batches and required representations
- [Phone storyboards](PHONE_STORYBOARDS.svg): proposed interaction, not gameplay screenshots
- [Pacing experiment](PACING_EXPERIMENT.md): assumptions, spending, cohorts, construction and recovery tradeoffs
- [Approved office teaser](../../marketing/idle-hands-2-development-teaser-v2.png), [creation brief](../../marketing/teaser-creation-brief.txt) and [provenance](../../marketing/teaser-provenance.json)

The map and storyboards explain the direction; they are not a substitute for art in every shipped item or a proof that a phone can render a future region at target frame rate. The teaser is a more polished, aspirational illustration. Its perspective/detail do not silently replace the accepted runtime camera or asset contracts.

## The daily loop

Return to a bed or workshop, see what finished, choose one useful personal goal, help a neighbor, and decide whether to explore. Gather, cook or craft; improve a home or contribute to a public project; queue something worth returning for. A short visit must leave a clear result. A longer visit offers more exploration and choices, without infinite click income or multiplying every production bonus.

Town creation and home ownership remain useful without mandatory combat. Wilderness and dungeons add optional risk, materials, stories and decoration. Chat, gifts, buffs and reversible jokes connect the same people across these activities. Permanent creative work stays outside corpse loot and weekly score rollover.

## What the next implementation actually includes

**IH2-052:** one physical starter-home/visitor path, one persistent expansion/decorating step, an honest return summary and a bounded first-kit teaching path. Use the art audit and pacing findings to make those choices concrete. Do not implement the whole candidate catalog as part of that task.

**IH2-053:** one useful restored trail, authored resident reactions, three deterministic personal discoveries and a permanent home pennant. New funding starts one fixed six-real-hour bridge construction deadline; versioned authority and migration preserve already-open bridges. Paid newcomer upkeep remains available; no new resource/recipe or combat/chat economy. Exact checks/CI are recorded in its evidence and PR closeout.

**IH2-050:** prove the first neighborhood together before expanding. Current limited claims and device/load gaps remain in the evidence; a design diagram does not close them.

After that gate, select one expansion slice at a time: one wood distinction/tool/recipe family; one garden/food service; verified-identity town chat and help; a small optional PvE outing; then corpse recovery and a first dungeon. Further settlements and extra housing locations follow measured travel/content needs. These are candidate sequencing decisions, not newly completed tasks or promised dates. Private messages wait for real participant authorization and privacy tests, not merely a hidden UI tab.

## Production rules across systems

| Concern | Contract |
|---|---|
| Progress and time | Server timestamps/receipts own jobs, construction, buffs, damage, death and recovery. The 48-minute cosmetic day never changes these timers. |
| Movement and doors | Preserve collision-safe movement, input focus and acknowledged source/arrival checkpoints. Cosmetic door animations cannot authorize entry. |
| Items and identity | Separate item definitions, owned instances/stacks, equipped slots and placed property. Finishes keep silhouette/material identity; validate catalog migrations. |
| Personal and public work | Distinct ownership/permissions, clear spending and retry receipts; no unilateral demolition or gifts from another player's stock. |
| Chat | Explicit audience, verified sender and server time. Town speech may have a visible bubble; private messages never become public bubbles. |
| Friendly mischief | Consent controls, cooldowns and recovery; persistent houses, rare items and days of progress remain protected. Disable nuisance effects around recovery/danger if needed. |
| Art | Every shipped content entry needs the representations its verbs require. A label, generic glyph or reuse hint is a tracked gap, not final item art. |
| Evidence | Design simulation is not a runtime implementation or live retention forecast. Emulated phones are not physical devices. |

## Platform and backend direction

Keep the proven browser/Phaser/TypeScript foundation. Design phone controls first and add installable-web-app behavior after the core loop is stable. Optional packaged mobile clients can share the same account/world backend; packaging alone does not improve server authority, rendering or database load.

The current local Node/PostgreSQL service and fictional identities are a proof boundary, not deployed authentication. Choose hosted services after the cost, permissions, backup and concurrency gate. A future authoritative combat process may have different realtime needs from asynchronous jobs; measure one encounter before committing to a long-lived hosting architecture. No new paid services, app-store accounts or cloud resources are authorized by this design package.

The browser/PWA recommendation was researched on 2026-11-10: [MDN installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing), [Capacitor](https://capacitorjs.com/docs), [Apple distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases/). It is a staged agent recommendation, not a claim that the current prototype already installs or that native distribution is configured.

## Decisions that remain genuinely open

The corpse window is provisionally 30 real minutes for experimentation. Equipped-item drops, expiry loss versus infirmary recovery, downtime grace and repeated-death handling must be settled explicitly before combat release. The simulation compares consequences; it cannot decide player tolerance.

World/city names, region layout, item prices, project waits, drop probabilities, buff strength, chat-history retention and additional-property limits are reversible design defaults. No permanent-loss rule or regional economy is finalized by a picture or a number in a candidate catalog.

First evaluate the design model, then the prototype, then real phones and a realistic shared workload. Keep the next executable task and actual acceptance in [the roadmap](../ROADMAP.json).

November11 owner refinement: [ACTIVITY_DEPTH](../ACTIVITY_DEPTH.md) audits long-job gaps, compares four developer-described game loops, and stages useful solo/cooperative/creative activities. Humor and visible acquired/equipped identity are core. The062sketchbook is a small local collection chapter, not implemented gardening, shops or public trophy display.

[Starter garden candidate](GARDEN_LOOP.md), IH2-064: two crops, independent rented beds/produce stacks, recoverable seeds, base practice plus a rested bonus, solo/cooperative requests and chosen visual expression. Thirty-six analytical cohorts expose capacity and activity gaps. [Growth concept](GARDEN_GROWTH_CONCEPT.svg) and [phone concept](GARDEN_PHONE_CONCEPT.svg) are original static studies, not implemented garden screens. IH2-065 is the next bounded runtime slice.

[Actual starter garden runtime](../GARDEN_RUNTIME.md) tracks065separately from the historical064concepts: private beds, bound seeds, held harvests, finite marker/errand choices and owner-labelled public registry. The48entry candidate catalog still describes future herb/home-garden items; it does not falsely mark those broader families implemented. Runtime art/command mappings are in065evidence.

## Current066depth audit

[Actual runtime coverage](CURRENT_RUNTIME_COVERAGE.md) dates the48candidatecatalog against accepted065, including home icons/garden art and remaining equipped/tool gaps. [Woodland family](WOODLAND_FAMILY.md) selects a modelled pine/saw/easel/produce-service family with retained-item opt-in town help. It remains non-executable design;067owns its implementation. [Evidence](../../evidence/IH2-066/REPORT.md) separates real agent inputs, elapsed fixtures and analytical schedules.

[IH2-067 integrated working contract](../CARPENTRY_RUNTIME.md) maps the new pine/saw/easel/hamper/noticeboard family and256original equipped/action frames. It is distinct from the48-entry broader candidate catalog; source acceptance is pending in067evidence, and no living-tree chopping or new region is implied.
