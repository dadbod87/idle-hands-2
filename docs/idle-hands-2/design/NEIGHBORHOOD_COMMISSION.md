# The Post Must Go Somewhere

IH2-069 working design, November12,2026. **Candidate only. No runtime quest, furnishing, price, messaging service or new public display is implemented by this document.** Accepted068source/runtime stays pinned. Agent-selected defaults below are reversible; the owner authorized successive local design/build work, not a hosted release.

## Why this chapter

The068actual nine-route audit finds a finite neighborhood with useful independent garden/pine jobs, but little authored activity after its short stake/sketch chapters. Another timer or three more answer buttons would not solve that. This proposal is one delivery chapter, optional handwork and a recognizable possession. It is not hours of content or retention proof. Existing shared bridge/welcome bed/noticeboard remain the town-cooperation lanes; this commission chiefly adds personal expression and an optional social showcase.

Pip already exists as the town courier. Marlow is the clerk, Jun tends the grounds and Nella teaches pine work. Reuse these authored residents and square paths; preserve all their existing services. Never replace Nella's pine controls with an unavoidable quest turn-in. Pip offers the commission as an optional second action while ordinary orientation guidance remains reachable.

Pip: “I have a circular. The route is also circular. For once, this is intentional.”

## Free addressed delivery chapter

Accept three uniquely addressed quest parcels: Marlow's permit for a form, Jun's progress report on grass, and Nella's application for a tree's annual leave. Each parcel shows a name, role and original pictogram. The interaction is explicit **Hand Marlow's parcel to Marlow**, not an automatic proximity turn-in or another three-question quiz. At another person, the same parcel is politely returned without loss or a guessed-answer reward. No delivery deadline, damage or probability.

Deliver in any order. Each correct recipient gives a distinct short reaction and one unique return receipt. Save the actual order in an illustrated route card, with a different harmless caption for the six possible orders. This is personal flavor, not hidden rarity or a better reward. Return the three receipts to Pip and explicitly complete the route once. The free reward is the illustrated journal card and a letterbox plan; **it is not an owned physical letterbox**. Cancel walking, close the panel or pause the commission freely. Resuming retains the same parcels/receipts/order; restarting cannot mint another bundle.

The first chapter needs no materials, free bag space, tool, house, bridge, finished noticeboard, coworker, ordinary workbench or growth timer. Quest parcels live in a bounded entitlement record outside ordinary/produce capacity. Full bags and busy benches do not stop handover. An optional route map/Places action uses068guarded travel; direct tap and keyboard remain usable. Clear next recipient and delivered stamps stay stable while statuses change. Do not count walking, menus and three stamps as three new gameplay verbs or infer human duration from scripted runs.

Marlow: “A permit for a form. At last, a form with a future.”
Jun: “The grass is growing. Management has asked it to be more specific.”
Nella: “Annual leave for a tree. I have approved the branching arrangement.”
Pip: “Everything arrived. The town is choosing to regard this as a precedent.”

## Optional physical reward comparison

Working reward: **Unreasonably Official Letterbox**, one distinctive portable furnishing with a sloped cap, envelope slot, brass PENDING plaque and raised flag. Three fixed motif/palette choices preserve its silhouette: leaf/sage, sun/terracotta and moth/slate. Free preview/cancel and later motif switching affect the same owned item. No general finish editor, paid recoloring system, player mail/chat or NPC shop is implied.

| Alternative | Result | Question for the model |
|---|---|---|
| Free route card only | Journal card/plan, no physical box | Guarantees the first chapter works while everything else waits; weak resource connection by itself |
| 2 pine + 1 harvested radish, hand assembly | One letterbox, explicit once-only debit, no new timer | Connects useful produce/wood without consuming the scarce flower or ordinary housing materials. Two pine have an eight-hour replenishment opportunity cost, even if the initial six make the first purchase quick |
| 4 pine + 1 harvested marigold | Same one letterbox | May compete directly with the first kept easel and optional hamper/welcome request; a familiar avoidable trap |
| 2 pine + 1 radish plus a new 6h wait | Same one letterbox after explicit collection | Delays a visible reward but adds no active depth; sparse visits can postpone collection to a later visit |

These are comparison prices, not current-game charges. The model must compare first and later easel opportunity cost, not just box completion. “Two pine leave four for an easel” is true only with an untouched initial six. Depleted supplies or already-committed wood can make that false. Quote current carried wood/produce, the literal cost and any effect on a bookmarked easel goal; allow intentional spending without a hidden reservation. Optional planner policies are not server locks. Never spend a growing crop, seed or an owned easel.

The proposed hand assembly is a short practical sequence at Pip's work surface: review the stock/cost, preview a motif and inspect the assembled box. All irreversible payment and ownership must be one explicit reviewed confirmation. Preparatory arrange/preview choices are free; no timed dexterity, compulsory hold gesture or failure fee. The plan is not a recipe for unlimited boxes. A new arbitrary timer must justify something beyond slowing a one-off reward.

If short of pine, show the actual free Nella lesson/equipment/deadfall path and real shared-personal-supply next time. If short of radish, point to the actual seed/bed/harvest/recovery path. The free route stays completed, with no expiration or prerequisite reset. A returning resident gets the same useful next choice; someone arriving after all public projects open still earns their own card and optional box.

## Ownership and deliberately public expression

Physical letterbox ownership is0or1 forever in this slice. It is usable in one workshop/home placement at a time under the existing cross-location allocation contract. Moving/storing/changing the motif is free and never creates a copy; visitor controls cannot change the owner. A missing/corrupt record is not permission to grant a replacement owned item without a specific validated recovery policy.

Optional **Show my letterbox style** is an explicit publication at Pip's sample register, available before expensive housing. This publishes a labeled style illustration, not a second owned/placed object. Only ownerId/name/motif are projected; no parcel contents, delivery order, private stock, route journal or message text. Remove publication keeps ownership and placements. Preview stays private. The public register is always accessible, with loading distinguished from empty; it is not gated on six distinct helpers or a finished noticeboard. More residents add independent examples, not a private production multiplier. A house visitor can later see the actual placed item.

This is fictional NPC correspondence and decorative expression. No send-to-player action, private inbox, arbitrary text, trade, currency, personal data or promise of human messaging. Future chat/private-message work retains its identity/audience/moderation gate. Town cooperation still uses the existing projects; this chapter does not claim a new cooperative economy.

## Persistence and authority requirements for a later implementation

- Strict versioned private quest state: accepted flag, three unique addressed-parcel entitlements, unique recipient receipts and actual delivery order, completed card/plan flag, madeCount0/1 and chosen motif/publication state. Incomplete prefixes are valid; contradictory completion/ownership/order is rejected. Pause never resets entitlements. Card/plan and physical ownership are separate.
- Accept/handover/complete/make/change/publication commands need actor identity, command UUID, expected revision, server time and actual recipient/Pip proximity. Wrong recipient/preview/cancel spends nothing. Explicit reviewed confirmation must use the current revision; a retry after a lost committed response returns the same once-only result/body/UUID. No auto-turn-in on walking.
- Existing pine spent=4×easelsStarted+hampers and garden use ledgers currently cover only easels/hampers. A paid box needs a new versioned commission sink, exact cross-ledger relation and owned-copy conservation. Never fake a hamper, easel or welcome request to account for it. Proposed selected-price relation is pineCommissionSpent=2×madeCount, radishCommissionConsumed=madeCount, flowerCommissionConsumed=0; final price must be selected from the model first.
- Free handwork is independent of both current production jobs and ordinary materials. It cannot clear, advance or replace a queued job. If another command spends stock first, reject atomically with refreshed explanation; never partially take wood before discovering the radish is missing.
- New owned prop IDs/placement validation and public projections require explicit supported-old-state migration, cached-client/schema refusal, raw unknown/corrupt-save preservation and current single-writer coordination. Preserve all existing inventory, entitlements, timestamps, properties, styles, weekly-separated creativity and receipts. Design simulation is not a migration or an authority test.
- Test all six recipient-order permutations, wrong recipient, close/cancel/resume, duplicate/concurrent handover/final completion/payment, no resources/full capacities/busy both jobs, depleted pine/flower-goal warning, ownership0/1/cross-location/visitor denial, private preview/public remove, reload/actual service restart/restore and old cached clients. Exact concrete implementation task comes only after design acceptance.

## Known carry-forward observations

Current Jun/Pip dialogue contains older “crops/woods/deliveries will have to wait” copy despite accepted garden/pine systems. Record a targeted guidance correction with the future commission integration; do not silently change runtime in this design task. Preserve their original orientation/help actions and use actual state-aware next steps. Existing144SVG/159file runtime remains distinct from the new proposed art family.

The schedule model, original artwork/provenance, interactive phone concept, selection decision and final evidence are still being prepared. No design/source acceptance is claimed by this initial outline.

## Selected proposed default after the model

Select **free addressed chapter → route card/plan → optional2pine/1radish letterbox, no extra wait** for the later implementation. This is an agent design decision under delegated authority, not an owner-approved final price or an implemented charge. The free-card-only comparison never gives the physical item. Reject the flower-fee alternative because it competes with the first scarce flower; reject the added6hwait because it creates no new active action and often pushes sparse residents into another return visit. No universal price, currency or ordinary timer changes.

`node --experimental-strip-types tools/simulate-commission-plan.ts` writes the [128cohorts](../../evidence/IH2-069/commission-model.json) and [CSV](../../evidence/IH2-069/commission-cohorts.csv). `--check` verifies deterministic committed evidence and exact source fingerprints. Four prices × four visit schedules × four analytical starting histories × two voluntary priorities run for42days. The free card at modeledtime0 deliberately abstracts all walking/reading/handovers; it does **not** prove instant completion, chapter usability or human duration. The starting histories are analytical, not real accounts or valid exported game saves. Actual constants inform this separate model; proposed sinks never enter current WorkshopState.

| Representative schedule/start | Card-only next easel start | Box-first selected price | Reserve-next-easel choice |
|---|---|---|---|
| Hourly with one5mteaching return, fresh supply | 4h | Box5m; next easel4h | Box5m; next easel4h |
| Hourly, empty pine pool | 16h | Box8h; next easel24h | Next easel16h; box24h |
| Hourly, one easel already finishing and2pine left | Next easel12h | Box5m; next easel16h | Next easel12h; box16h |
| Sparse72hvisits, fresh | Next easel72h | Box72h; next easel72h | Same first next-easel result |
| First return after a week | Next easel168h | Box168h; no expired route | Same first next-easel result |

These are scripted modeled visits, not suggested compulsory login schedules. The selected cost can delay the next easel by up to8hunder box-first choices in the declared cohorts and can yield one fewer claimed easel by the42dayhorizon. Reserve-next-easel protects that one selected start, not all future output. It is not an inventory lock or an optimum claim. The flower alternative can delay a sparse resident's next easel by72hbecause the next harvest is observed at the next visit. The extra6htimer can turn a72hpayment into a144hclaim even though the item was ready at78h. No absence destroys crops, parcels, plan or reward.

Six input-sufficiency probes also expose the2pine/1radish tradeoff with existing hamper and welcome-request ingredients. They are **not** composed hamper/request/cooldown simulations. For example, spending a sole request radish prevents that request until another radish is harvested; spending the last two hamper pine can prevent that hamper. Quote those currently affected choices without inventing extra losses or refusing an intentional purchase. The model's frozen ordinary job only proves that the model leaves that field alone; existing actual runtime/SQL tests, not this model, prove current progress protection.

Assistance comparison is intentionally limited:1/3/12independent owners may publish1/3/12examples if they each choose to do so. No material gifts or private-progress acceleration are invented; one player needs no helper, and external hints have no modeled time benefit. This is showcase arithmetic, not three extra playtests or a new cooperative economy. Current town projects supply cooperative progression; this chapter adds optional personal craft/expression. Later gift/party/town-quest mechanics retain their own authority/consent scope.

## Concrete data and presentation contract to promote later

Proposed quest key `pip-post-v1`; actual recipient stop IDs `clerk`, `caretaker`, `carpentry-desk`, completion/assembly/publication at `courier`. Human names are labels, not durable keys. Derive outstanding parcels from accepted minus the unique delivered-ID prefix; do not separately mint bags of transferable mail. All six order captions are equally valuable. A free pause flag changes guidance only and cannot remint parcels or erase receipts. MadeCount0/1 and a permanent `letterbox` owned count must agree with exact commission spending.

The14original candidate vectors include three closed/open letterbox pairs80×112with foot point(40,106), three addressed envelopes, three recipient receipts, one journal card and Pip's work-surface illustration. Shape, cap, slot, plaque, flag and feet stay recognizable across leaf/sun/moth palettes; no blanket filter erases the earned item. The work surface is a modal illustration unless later scene/collision review approves a world prop. The clean concept directory also copies the existing owned-home interior solely as a generic rental/home placement sketch; it does not certify actual geometry or grant a house.

The [standalone concept](../../evidence/IH2-069/concept/index.html) contains fictional in-memory state and authored stock cases. It has no API, storage, account or real purchase. Actual browser tests exercise explicit/wrong handovers, all six captions, keyboard success focus, separate card/box ownership, stock conflicts, three motif choices, one placed copy and opt-in sample removal, plus short200%confirmation/cancel access. Those tests prove this study's interaction, not walking, server authority, future migration or real ownership. Initial long-gallery captures repeated the native viewport's old surface tail; final two-sheet captures settle the viewport/fonts/paint and show all14without truncation. No domain timeout/assertion was weakened.

Candidate closed/open poses are not an integrated actor handover/assembly animation. The next runtime slice must select an honest bounded reveal/idle treatment and record missing action coverage; broader animation depth remains future work. The three fixed cosmetic motifs are free after this one item is made, as a bounded agent default. General clothing/furniture finishes and their prices are separate future systems.

## Next implementation proposal, not yet a tracker task

After069source/design acceptance, create one bounded runtime task for this chapter/unique furnishing: strict private quest and new commission consumption/owned-copy invariants; supported old-save/SQL/header-version migration and cached-client refusal; actual recipient/Pip proximity/UUID/revision transactions; explicit private preview/public style projection; original prop/action treatment; garden/pine links and corrected older Jun/Pip availability copy while preserving all existing NPC services. Cover real HTTP/SQL/retry/owner/visitor/legacy/restart plus direct/Places/keyboard/touch/short flows and a fresh ungranted paid-craft visit. No player messaging, shops, new public project threshold, regional map, real identity or hosting in that task. The standalone sample is not its acceptance proof.
