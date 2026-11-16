# Housing choice proposal — separate from the playable game

Owner requirements: distinct real exterior sizes, personal yards, several home layouts with earned upgrades and meaningful added features. Preserve permanent ownership, decoration, addresses and social visits. Everything below is an agent-selected candidate for review, not an owner-approved price change or registered game feature.

## A few recognizable choices

| Family | Starter / expanded footprint | Room concept | Yard positions |
|---|---|---|---|
| Pocket Cottage | 4.5×5.5 / 4.5×7.5 tiles | Main room; expanded loft adds two nooks | Four, including side gardens |
| Front-Porch House | 6×5.5 / 6×7.5 | Main room and porch; upstairs adds two nooks | Two at front |
| Garden Studio | Expanded only, 6.5×6.5 | Main room and two-nook sunroom | Three, including a rear planting corner |
| Workshop Lodge | Expanded only, 6.5×7.5 | Main room and two-nook workroom | Two at front |

Six drawings, four families, several silhouettes at each tier. A compact house trades ground coverage for more yard expression; expanded cottages gain height rather than swallowing neighbors. The street comparator uses the SAME SVG viewBox and CSS width for all three houses. Narrow screens also show a separately labelled larger detail. Transparent illustrations avoid rectangular background patches. The schematic groups the six existing nooks and two additional room nooks; it is not a navigable floor plan or evidence that a loft/stairs already works.

All candidates fit within each persistent 8×10 lot and existing maximum building envelope. Doors remain at their current foot anchor, and public approaches remain clear. Pure checks cover all six forms across all 24 parcel addresses. Yard anchors reserve at least a 0.3-tile item radius inside the lot and outside the building. This is a reservation for later bounded decoration, not permission to place arbitrary oversized art. New homes must eventually collide against their visible footprint; invisible old full-size walls would defeat the smaller cottage.

Yard preview choices: owned planter arrangement, owned letterbox corner, or open ground. These are original illustrations only. A future placement command must move an existing owned item from the same Bag, respecting all rental/home/yard allocations. No planter or letterbox is granted here. Benches, lamps, fences and further ornaments need their own original art/recipes and bounds before entering this catalog.

## Earned progress, without a new wallet

Retain the current benchmark: 12 bridge kits for starter rights, 24 additional for expanded rights. A fresh expanded tier therefore represents 36 total earned kits; an existing starter pays only the missing 24; an expanded owner keeps all eight indoor nooks. Alternative same-tier families never charge for tier rights twice or silently downgrade a home. **This model prices tier acquisition only. A remodel/style-switch fee and yard-piece recipes remain unpriced, and no free live remodel is promised.**

Kit production remains the actual current 3 scrap / 2 timber / 1 supplies, one 12-hour bench job. No speed multiplier, duplicate bench or new currencies. Pure current-command experiments retain the first planter and use actual depot recovery/job settlement, not a cash grant. Read `pacing.json` for full schedules:

| Declared return schedule | 12 kits | 36 kits |
|---|---:|---:|
| Just after readiness, about twice daily | 144.2h (~6d) | 432.6h (~18d) |
| Once daily | 288.2h (~12d) | 864.6h (~36d) |
| Readiness returns, one missed week | 312.2h (~13d) | 600.6h (~25d) |
| Readiness returns plus a roughly weekly planter | 144.2h | 456.63h (~19d) |

These are simulated production thresholds from zero after the first tutorial planter, **not observed completion rates or SQL purchases**. One ready job can wait offline; missed days do not magically queue more jobs. Model schedules are 12/24 hours plus one minute, not automatic bot production. Contributions to the shared bridge, other crafting, resource contention and actual return behavior can delay home acquisition further. Cooperative trade is not currently modeled or silently introduced.

Propose a **six-hour builder window** after a future confirmed purchase; the old home remains usable until completion. It uses a separate server deadline, leaving the single bench, garden, café, errands and exploration available while waiting. No timer exists today. Existing owners incur no retroactive construction, charge or forced appearance change.

Garden Studio's optional future convenience opens the same three existing private garden beds; Workshop Lodge opens the same existing one-job crafting queue. Neither grants yield, storage, speed or additional queues. There should be no objectively mandatory family for earning efficiency.

## Preserve what people made

- Existing homes retain their exact original facade identifier, level, six/eight nooks and all furniture maps under a deterministic legacy catalog entry. New choice is deliberate; no automatic aesthetic conversion.
- Address, plot ID and owner never change. Bigint address mapping still opens further 24-lot blocks; this is not a 24-player cap.
- Proposed layout changes keep all earned eight-nook rights. A later geometry change returns displaced pieces to available Bag allocation without deleting or minting them. Downgrade/sale/refund is outside this proposal.
- Yard placements are public appearance; inventory, costs and private progress remain private. Visitors can enter/view but cannot rearrange, harvest another player's beds or buy for them.
- During construction, both visitor entry and the old furnished home continue. Completion must not strand an occupant, trap the door, duplicate furniture or change another parcel.

## Next bounded runtime work

IH2-115 should prove a versioned housing catalog, deterministic legacy mapping, complete allocation model and quoted/building transaction OUTSIDE active entrypoints/discovered migrations. Include strict parsing, old-cache rejection, concurrent buyers, quote expiry, idempotent retries, crash/restart/dump-restore and exact item conservation. Keep the existing seven applied SQL files unchanged. Freeze candidate migration bytes before any later integration.

Residential camera framing also needs an explicit candidate before integrating varying footprints. The existing residential block remains 2048² and intentionally pads beyond its edge on wide screens; native current-source baseline records 238px/878px horizontal padding at 2K/4K. Task113 expanded the main square, not every interior/residential map. Design a coherent surrounding street/landscape and camera extent without moving persistent addresses or inventing neighboring owned plots. Do not hide this limitation by stretching homes or lowering the player's zoom globally.

Only after the isolated contract passes should a later task register matched art/collision/catalog/protocol/SQL/client and complete purchase→construct→arrange→visit. Preserve protected previews and keys; no real players, hosted beta, paid assets or cloud launch are part of this study.
