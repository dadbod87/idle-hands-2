# The starter allotment

IH2-065 source accepted, November 11, 2026: PR15/mergeb4438d3. Exact-head both CI jobs pass179/53; [source and actual local-preview closeout](../evidence/IH2-065/source-closeout.json). **Local fictional practice, not a hosted release.** This file describes the implemented slice; [the earlier design study](design/GARDEN_LOOP.md) remains a historical candidate/model, not its release record. No hosted game, real identity or current-game account is involved.

## A useful personal lane

Every resident has a private three-bed allotment before earning a house. Enter through the square gate, use Places, or open Bag & journal → Your allotment and choose a walking destination. Named navigation continues through room exits and the gate; manual steering, another panel, identity change or recovery cancels it. Exiting returns immediately in front of the gate.

The rental is narrative: no recurring charge, house, kit, ordinary materials or workshop slot is required. Existing material, kit and property economy is unchanged. Planting and harvesting are deliberate actions. Growth continues while absent, ready plants wait safely, and there is no automatic repeating job, withering or mandatory watering/weather window. Cosmetic town time is independent of these real deadlines.

| Crop | Bound starter entitlement | Normal real growth | Harvest |
|---|---:|---|---|
| Radish with ambitions | Two seeds, including planted/ready copies | Thirty minutes; the very first radish alone takes five minutes | One radish and its replacement seed |
| Out-of-office marigold | One seed, including planted/ready copies | Four hours | One marigold and its replacement seed |

The seed library repairs missing family entitlements only. It counts growing and ready plants, so it cannot issue a duplicate seed alongside a planted copy. Seeds cannot be sold, traded or converted into workshop materials. This small family intentionally does not support three simultaneous marigolds; more seed families/exchange rules need another pacing/capacity audit.

Each produce family has twelve reserved slots. Radishes cannot occupy flower space. When a stack is full, its ready plant retains the produce and seed. The player can select any other bed or complete a mixed request to make room. The first suggested bed is the oldest harvestable one with space; later selection stays put. Free bed swaps retain exact planted/ready timestamps.

## Progress without an empty-bonus gate

Every successful harvest earns one gardening practice point. A rested bank adds one extra point when available: starts at two, refills one per twelve real hours, caps at six. An empty bonus bank never blocks base practice or ordinary actions. No universal output multiplier, skill purchase or finalized level/unlock pricing is added.

Refills do not bank hidden fractional time while a bank is already full. This is an explicit runtime clarification beyond the fixed-cohort design model. Older local/server workshop records initialize the new garden epoch from their last confirmed workshop timestamp, deterministically; no new epoch is created on each read. Bonus practice still requires an actual harvest.

Inspecting soil/leaves once per plant gives authored feedback, no production advantage. Displayed counts and times derive from raw saved timestamps; only commands settle/spend/award state. The client fetches at the next useful crop/refill/request deadline, never repeatedly polls a held ready crop, and cancels background/obsolete timers. This shares the existing reconnect/UUID safeguards.

## Making something recognizable

One personal field pool starts with six clipping entitlements and refills one per fifteen minutes, up to six. At the field, gather and consume two entitlements to hand-make one of three finite marker designs: Optimistic sunburst, Leaf of absence, Tiny committee pennant. Each is acquired once. There is no ordinary material, bench slot, sale conversion or infinite duplicate reward.

Ada, the Acting Dirt Liaison, offers **An urgent matter of almost-straight stakes**. Accept for free, inspect three distinct square stops and choose the usable end, stripe and notch. Wrong answers explain the mark and spend nothing. Return all three quest-bound pieces to assemble the fourth marker, **Officially almost straight**, once. Pieces are not timber or clippings. There is no timer, XP, money or output bonus. The quest works when depots are exhausted, the bench is busy and coworkers are absent. It remains in the journal after completion; an owned marker can be selected again.

Humor belongs beside a literal action/result: “The committee has approved having roots,” “a very small jurisdiction,” or “one entirely adequate marker.” Error, cost and cooldown messages remain explicit. Jokes do not conceal a decline or require repeated blocking popups.

## Chosen public expression and teamwork

Previewing is private and free. **Display marker** deliberately publishes one owned choice; removing it retains the owned collection. The square's **display registry** shows chosen marker art and its owner's name. This is a registry representation, not a claim that twenty physical plots occupy the square.

That location refines IH2-064's proposed at-plot display: one private garden instance keeps narrow-phone travel bounded, while an owner-keyed registry avoids showing a different resident's “own-or-first” marker. Public rows contain exactly owner ID, owner name and the selected owned marker ID. No other resident's bed, seed, produce, practice, bonus bank or deadline is projected. Private garden presence is not shared.

A mixed request spends one radish and one marigold, once per rolling twenty-four real hours per resident. Six total credits open a visual town welcome bed. One resident can eventually complete it; no named absent coworker, unique-helper threshold or simultaneous login is required. After completion, requests still record personal participation, explicitly spend the same produce, and do not add further public credit or trigger unnecessary town invalidations. There is no XP, old currency, kit or speed reward.

The 064 model's 144/48/24-hour examples describe its daily check-in schedules, not minimum live opening times. With six residents tending the first flowers at four hours, the small visual bed can finish much earlier. This is a starter civic decoration, not completion of the housing/town progression. Café ingredients, floral arrangements, trade, cooking, more crops and rare furnishings remain future work.

## Save and authority boundaries

- Domain state is a strict, versioned `GardenState`; it conserves seeds/plants, produce/requests and practice/harvest history. The existing workshop revision and UUID receipt path remain the single command boundary.
- Shared practice verifies signed fictional identity, actual station proximity, allowed private context, expected revision and UUID/payload before changing anything. Personal debit, shared credit, saved state and receipt commit together. Concurrent final contributions cap at six. Failed/duplicate/stale/full actions retain progress.
- Private/public projections are separate. Only an actual changed display or new welcome credit invalidates peers. Receipt replay and private planting/errand actions do not broadcast a public award.
- Local saves move to `ih2:workshop:v2` under the existing writer lock. Migration reads legacy v1 only when v2 is absent, preserves original stock/jobs/receipts and leaves the v1 copy untouched. Once v2 exists, legacy writes cannot replace it. Unsupported/unreadable current saves remain unchanged and actions become read-only; there is no silent fallback that overwrites newer progress.
- Old local/client code cannot share the new save key. The automated compatibility case simulates an older writer protocol under the real browser lock; it does not claim to execute the old compiled client. Its raw data and blank same-origin document are explicit fixtures.
- This is local fictional authority, not hosted authentication, cloud HA, real-player recovery or production deployment. No original Idle Hands data is read or imported.

## Art and phone behavior

Thirty-one original runtime SVGs and a deterministic generator cover eight growth states, empty bed, separate seeds/produce, four markers, three stake comparisons, gate/registry/field/ground, attendant and welcome-bed phases. Four original resident identities each have four-facing sow/inspect/harvest actions with two poses: ninety-six frames with the existing 64×80/foot anchor. Existing variety assets regenerate byte-for-byte unchanged. No paid/imported media or font files.

Actions play only after accepted commands. They never lock movement, own settlement or change the camera; steering/expiry clears them, and reduced motion uses one still pose. Growth textures change on bounded view refreshes, not database writes or per-frame commands.

The three DOM bed rows and action controls stay in place. Messages occupy reserved scrollable space; preview/cancel controls retain their area. Costs, output space, remaining time, unavailable reasons and positive ready checks are readable without relying on color or hover. Keyboard, direct touch and named navigation coexist. The short 200% text layout scrolls within the retained-world modal. Actual screenshots and real-device limits belong in the task evidence.

## Honest depth limits

This adds an independent resource lane, finite quest, visible choices and a small cooperative objective. It does not prove a full evening of active content, human retention or a balanced expanded economy. The prior model's saturated states remain relevant: full stacks, all markers owned, all plants growing and a request cooldown can leave only decorating/exploration. Further practical quests, ingredient uses and authored world depth should be selected from observed play, one coherent slice at a time.
