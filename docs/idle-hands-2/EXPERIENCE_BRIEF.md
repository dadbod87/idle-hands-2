# First neighborhood — working product brief

Updated 2026-11-10 after IH2-054 design. Agent-selected defaults remain distinct from Nick's direct requirements in [DECISIONS](DECISIONS.md) and [owner directions](design/OWNER_DIRECTIONS.md). The [expanded design package](design/README.md) extends the long-term direction without expanding the next implementation into a giant MMO. Its models and diagrams do not implement new game rules.

## Fantasy and audience

You are an underqualified employee helping a deeply overmanaged company town become a place worth living. Your own workshop/home gradually reflects your taste; collective work changes the neighborhood for everyone. Start with an invited office-sized group of about 12 people; validate 20 concurrent synthetic clients before an invited trial. No public rollout or real identities are authorized by this brief. Fictional workplace absurdity, warm characters, no private coworker details or cruel targeted jokes.

The owner now explicitly wants optional woodland monsters, weapons, food, small cooperative dungeons, visible health, death/waking in a town bed and temporary corpse recovery, plus chat and social help. This supersedes the earlier no-combat/no-corpse design assumption; these systems remain later unimplemented slices, not requirements to add to the first neighborhood. No mandatory combat or lucky drop is needed to own a home. Town chat needs actual identity/audience/moderation work; an invited group does not remove that requirement.

Primary verbs: walk, inspect, gather, make, place, contribute, discover. Both active play and short return visits matter. The fun is visible creation and shared discovery, not an exponentially growing number alone.

## First five minutes — target, not achieved acceptance

The target clock begins at first playable input. Future character creation precedes it: preview appearance, name and a flavor-only backstory, confirm once, then wake in a rented boarding-room bed. The rental is not an earned house. That proposed opening needs its own replay-safe identity/bed/door slice; the current local pilot still starts with fictional defaults and has no character creator or bed scene.

0–1: meet the clerk/read the arrival note: “Your orientation has been postponed until you are experienced.” Establish the rental workshop and one clear personal goal.

1–3: tap the three material depots, inspect exact inputs, make the five-second first planter and place it in a legal rental-workshop nook. Preview/cancel is free; saved placement is explicit. Direct interaction teaches movement; the destination list remains a useful phone alternative.

3–5 target: complete one useful paid teaching contribution and queue ordinary longer work. **This is not current behavior:** the normal first bridge kit takes twelve real hours. The [pacing experiment](design/PACING_EXPERIMENT.md) favors testing a once-per-resident 1 scrap / 1 timber / 1 supplies, 60-second maintenance lesson that creates nontradeable participation credit, not an inventory kit or currency. It leaves materials for the ordinary twelve-hour kit; a fast full-cost kit empties scrap and leaves the bench idle. The candidate estimated contribution takes four minutes directly or about six minutes thirty-five seconds with slower phone reading, excluding character creation. Neither estimate is a measured playtest or a universal five-minute promise.

Quote construction versus upkeep/inspection before charging. The candidate retains a three-credit construction target; later residents can receive distinct once-only upkeep recognition without changing the deadline or inventing new slots. If neither route is eligible, spend nothing. Server/quest-content migration, full-project races and already-restored bridges still need IH2-052/053 implementation. No ordinary player receives undisclosed test stock, and simulated neighbors remain labelled as fixtures.

## Long-term pace and housing

Nick's latest direction: slower than 1.0, deeper systems, humor and teamwork. Quick orientation teaches verbs, not the whole progression. See [PACING_AND_HOUSING.md](PACING_AND_HOUSING.md) for provisional milestone ranges and active/idle fairness. The first planter is a one-time teaching reward, not a repeatable fast income source. Later personal and town stages should take days/weeks, with persistent housing goals over months.

Personal plots are a first-neighborhood priority. The current durable proof already records owned plot rights, one upgrade and owner decoration, with 12-kit claim and 24 additional-kit upgrade costs; it does not yet provide a physical playable house/interior. IH2-052 makes one starter-home/visitor path and one persistent expansion/decorating step concrete. New cities, multiple homes and relocation rules remain later candidates; preserve existing creative work rather than replacing it with a new address.

## First twenty minutes and return visit

Complete the planter loop, speak with residents, inspect the café, choose another placement and queue a bounded bench job. The café is currently a landmark/conversation, not an implemented shop. A new group's first twenty minutes may inspect a locked trail, learn the material/project deadline and leave with useful alternate work rather than enter the forest immediately.

IH2-053 adds one timed bridge stage plus a genuinely traversable trail, reaction/errand, newcomer follow-on and modest cosmetic discovery using the existing three resources and two recipes. Its material threshold records a fixed authoritative `readyAt`; opening settles once and is journaled without exact attendance. The current proof restores immediately, so the timer requires a versioned state change and grandfathering already-restored bridges. Sample build durations are not final tuning. Later wood distinctions, tools and extra recipes wait until after integrated IH2-050 acceptance.

Return/reconnect to one collectible job result, preserved belongings/room and an honest summary of changes and deadlines. No silent loss, repeating offline queue, repeated opening reward or weekly deletion. Replaying a missed cosmetic ceremony cannot grant output. Show real-hour durations and caps; the 48-minute visual day does not accelerate them.

## Quest and living-town direction

[Living-town systems](LIVING_TOWN_SYSTEMS.md) connects quests, gathering, making, skills and restoration. [World and systems design](design/WORLD_AND_SYSTEMS_DESIGN.md) now records the candidate Ledgerwick → Inkwood route, optional Pumpworks dungeon, later Mossbank/Bellwether Quay, character opening, food/equipment and social/recovery contracts. These names do not rename runtime `square`. Wood species, growing/fruit, NPC buy/sell services, Town/party/DM chat, atomic gifts, bounded buffs and consent-controlled harmless pranks are staged candidates. Keep the bridge/trail and one personal teaching chain complete before expanding.

Death's town-bed return and recoverable corpse are owner direction; protected essentials, owner-only loot and a 30-real-minute window are candidate defaults. Equipped drops, expiry loss, downtime/disconnect grace and final duration remain unresolved. Permanent homes, decorations, skills and account progress stay outside corpse loot. The model's inclusive deadline is a test convention, not final release policy. Real privacy and loss mechanics require their own tested authority/identity gates.

## Initial content budget

The bounded first-neighborhood target is one 48×48-tile square, rental workshop, café exterior/conversations, bridge, one starter-home/visitor path with one expansion step, and one short usable trail. The trail and physical homes remain future implementation. The accepted art already includes four original resident sheets and distinct tree/building silhouettes, not a modular creator/wardrobe. Keep three resources (scrap, timber, supplies), two ordinary recipes (planter, bridge kit), one queued bench job, six owned furnishing types and three short NPC conversations. A selected once-only teaching action is not a repeatable extra income system.

No combat, corpse loss, chat/DM, shop/trade, crop/equipment economy, auction house, PvP, hunger tax, real-money store, governance or broad regional expansion enters IH2-052/053. These are **slice boundaries**, not reversals of the owner's longer-term directions. No bulk asset production from the design catalog; finish representative families and validate phones first.

## Persistence and fairness contract

| State | Lifetime | Authority / rule |
|---|---|---|
| Personal property, owned decoration, placements | Persistent | Server ownership/placement validation; owner edits only. |
| Inventory, production timestamps and unclaimed outputs | Persistent | Atomic settlement; replay returns the original receipt. No render-frame accrual. |
| Shared bridge stages and contribution receipts | Persistent | Transactional bounded contributions; retries/concurrent finish cannot charge twice. No unilateral demolition. |
| Weekly score/objectives | Resettable competition only | Separate season-keyed rows; rollover must not alter property/inventory/projects. |
| Movement, camera, open menus | Ephemeral | Room-scoped movement; cameras/UI local. Never use client movement as reward authority. |
| Player identity | Separate sequel account | No automatic 1.0 import. Local synthetic identities until isolated auth milestone. |

Current idle rule: one queued bench job finishes by server time and waits for collection; it does not automatically repeat. Personal depots refill one unit per four real hours up to six, bounded by 24-hour elapsed recovery; carried materials cap at sixty, kit output at ninety-nine. These tested proof rules remain the baseline until a versioned change. No hidden overnight penalty, weekly asset wipe or passive compounding of every purchased prop. Cosmetic customization retains the object's base/material identity.

## Presentation and input default

The original illustrated SVG family is selected: warm paper/slate/sage/terracotta, readable top-down silhouettes, four directional resident rigs, distinct buildings/trees and restrained office humor. The prior CC0 pixel comparison is historical research, not an unresolved style vote. Preserve authored feet, collision/door thresholds, earned silhouettes and material detail under finishes. Individual items/buildables still need icons, world/preview forms, stages and relevant equipped/action poses; existing generic depot rectangles and a house study are not complete production families. See the [asset plan and phone concepts](design/ASSET_PRODUCTION_PLAN.md).

Keyboard WASD/arrows plus interact/cancel; tap-to-walk and a reachable DOM interact button on touch; destination list for workshop, square, café and trail. Prevent movement behind menus. Focus-visible controls, readable labels, reduced motion and muted-until-enabled audio. Touch targets at least 44 CSS px. Inventory/dialogue are DOM panels with stable reserved feedback space; no button shifting during rapid input.

## Pilot budgets (targets, not measured results)

Test 1440×900, 390×844, 360×640 and short landscape 844×390; text zoom 200%; one real phone before invited beta. No horizontal page overflow or HUD overlap; reserve at least half the viewport for the world when menus are closed, with compact controls in short landscape. First playable transfer goal ≤5 MB compressed excluding optional audio; profile low-end/real devices rather than declaring 60 fps from desktop emulation. Target steady ≥30 fps on the chosen real phone, desktop p95 frame ≤20 ms. Record hardware, browser, throttling, payloads and methodology. Revisit budgets with measurements rather than quietly removing them.

20-client synthetic shared-loop trial: no duplicate/negative inventory or lost committed contributions; command p95 ≤500 ms on the stated local/preview setup (network RTT reported separately). Room updates scoped to occupants, movement capped at 10 sends/s, no database writes for visual animation, hidden tabs stop rendering/nonessential reads, reconnect requests one snapshot plus subsequent scoped changes. Measure actual command/query/event counts, memory and cost before hosting selection.

## Resolved scope and remaining decisions

Selected/established: separate Phaser + TypeScript browser prototype and local PostgreSQL authoritative proof; original art family; permanent property/creative work separated from weekly competition; cosmetic day/night/weather; narrow IH2-052 → IH2-053 → IH2-050 acceptance sequence. Source/CI is not a hosted game; synthetic identities are not real account security.

Still candidate: paid teaching/upkeep transaction, physical-home presentation and migration, first bridge construction duration, character opening, regional material/service distribution and broader social/combat depth. Corpse loss/equipped drops/window/grace, chat retention/moderation, multi-city property and hosting costs need decisions at their actual slices. The [design package](design/README.md) records models, art gaps, dependencies and open policies. No new prices, public rollout, cloud spend or real-player tests follow from these design updates.
