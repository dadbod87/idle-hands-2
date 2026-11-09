# First neighborhood — working product brief

Agent-selected defaults, 2026-11-09, under Nick's delegated decision-making. Direct user requirements remain in DECISIONS. This is the first testable scope, not a promise of a giant MMO.

## Fantasy and audience

You are an underqualified employee helping a deeply overmanaged company town become a place worth living. Your own workshop/home gradually reflects your taste; collective work changes the neighborhood for everyone. Start with an invited office-sized group of about 12 people; validate 20 concurrent synthetic clients before an invited trial. Invite-only first, no public chat/moderation problem at the first milestone. Fictional workplace absurdity, warm characters, no private coworker details or cruel targeted jokes. No combat, corpse mechanics or graveyard content assumed from the inspiration.

Primary verbs: walk, inspect, gather, make, place, contribute, discover. Both active play and short return visits matter. The fun is visible creation and shared discovery, not an exponentially growing number alone.

## First five minutes

0–1: arrive at a small rented workshop beside the town square. A clerk hands over a tool and a note: “Your orientation has been postponed until you are experienced.” Pick a name/look from local fictional defaults; no account form during the local pilot.

1–2: walk or tap to a scrap pile on the maintenance path. Inspect and collect a small starter resource. Collision and one obvious interact affordance teach movement; a DOM destination list reaches every essential place on a phone.

2–3: make a planter at the workshop bench from the starter materials. See inputs, output and a short first recipe; no multi-hour wait before the first result. Place it in one legal spot on your property. Preview/cancel is free, saved placement is explicit.

3–5: donate one crafted supply to the square's “bridge repair, awaiting committee” project. See a receipt, your contribution and the shared stage change. The completed bridge later opens the trail; one player cannot spend other players' stock or remove their work. In a solo fixture, simulated neighbors are visibly labeled, never presented as actual people.

## Long-term pace and housing

Nick's latest direction: slower than 1.0, deeper systems, humor and teamwork. Quick orientation teaches verbs, not the whole progression. See [PACING_AND_HOUSING.md](PACING_AND_HOUSING.md) for provisional milestone ranges and active/idle fairness. The first planter is a one-time teaching reward, not a repeatable fast income source. Later personal and town stages should take days/weeks, with persistent housing goals over months.

Personal plots are a first-neighborhood priority: reserve space in the map now, implement acquisition/ownership, house improvements and decoration in the durable/polish tasks. A labeled future plot in the engine pilot is not a sale or an ownership system.

## First twenty minutes and return visit

Complete the planter loop, inspect the café, start one bounded bench production job, choose a second cosmetic placement, contribute to the bridge and explore the first trail once open. A small NPC errand gives context, not a second currency. Leave knowing what will finish and when. Return/reconnect to exactly one settled job result and the saved room. Show what changed, where the reward came from and the offline cap; no silent loss or duplicated output. Initial tunings are data, not hard-coded rendering rules.

## Initial content budget

One 48×48-tile outdoor neighborhood, one small workshop interior, café exterior/interaction, town-square bridge project and a short trail. One character rig, three resources (scrap, timber, supplies), two recipes (planter, bridge supplies), one timed bench job and six placeable props. Three short NPC conversations. No trading, auction house, PvP, hunger/energy tax, real-money store, guild governance or infinite procedural world at this stage. Revise counts if the pilot finds a smaller fun slice.

## Persistence and fairness contract

| State | Lifetime | Authority / rule |
|---|---|---|
| Personal property, owned decoration, placements | Persistent | Server ownership/placement validation; owner edits only. |
| Inventory, production timestamps and unclaimed outputs | Persistent | Atomic settlement; replay returns the original receipt. No render-frame accrual. |
| Shared bridge stages and contribution receipts | Persistent | Transactional bounded contributions; retries/concurrent finish cannot charge twice. No unilateral demolition. |
| Weekly score/objectives | Resettable competition only | Separate season-keyed rows; rollover must not alter property/inventory/projects. |
| Movement, camera, open menus | Ephemeral | Room-scoped movement; cameras/UI local. Never use client movement as reward authority. |
| Player identity | Separate sequel account | No automatic 1.0 import. Local synthetic identities until isolated auth milestone. |

Initial idle rule: a bench produces only while a job is queued, settles elapsed server time, pauses at job/storage limit, and has no hidden overnight penalty. The exact production/storage cap must be visible and tested in IH2-030/040. No arbitrary weekly wiping of assets. No passive compounding of every purchased prop. Cosmetic customization does not erase an item's identity.

## Presentation and input default

Warm, readable top-down 2D with illustrated pixel silhouettes, paper/signage UI and restrained office humor. Explore one original illustrated and one coherent CC0 pixel sample before selecting the final visual kit. Pixel-perfect nearest-neighbor only when all assets share compatible scale; never mix unrelated free packs to fill every slot. Reuse concepts from 1.0, not its layout or live-player photos. Art direction is provisional until the representative scene passes readability checks.

Keyboard WASD/arrows plus interact/cancel; tap-to-walk and a reachable DOM interact button on touch; destination list for workshop, square, café and trail. Prevent movement behind menus. Focus-visible controls, readable labels, reduced motion and muted-until-enabled audio. Touch targets at least 44 CSS px. Inventory/dialogue are DOM panels with stable reserved feedback space; no button shifting during rapid input.

## Pilot budgets (targets, not measured results)

Test 1440×900, 390×844, 360×640 and short landscape 844×390; text zoom 200%; one real phone before invited beta. No horizontal page overflow or HUD overlap; reserve at least half the viewport for the world when menus are closed, with compact controls in short landscape. First playable transfer goal ≤5 MB compressed excluding optional audio; profile low-end/real devices rather than declaring 60 fps from desktop emulation. Target steady ≥30 fps on the chosen real phone, desktop p95 frame ≤20 ms. Record hardware, browser, throttling, payloads and methodology. Revisit budgets with measurements rather than quietly removing them.

20-client synthetic shared-loop trial: no duplicate/negative inventory or lost committed contributions; command p95 ≤500 ms on the stated local/preview setup (network RTT reported separately). Room updates scoped to occupants, movement capped at 10 sends/s, no database writes for visual animation, hidden tabs stop rendering/nonessential reads, reconnect requests one snapshot plus subsequent scoped changes. Measure actual command/query/event counts, memory and cost before hosting selection.
