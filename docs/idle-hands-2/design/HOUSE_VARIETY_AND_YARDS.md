# Homes worth recognizing from the street

Owner direction, November13: retain the liked neighborhood, but vary actual exterior sizes, give yards different decorations, and let players purchase multiple home layouts with added features. This is recorded future design, not a claim that those choices are playable. Costs mean earned in-game progress/resources, not real-money purchases; no new wallet or price is implemented here.

## Current-source starting point

Read against110base5bdaaab: `src/art/residential.ts` supplies cottage, brick-gable and timber-porch families, chosen deterministically from plot ID, with starter/expanded art. This is visual variety, not a player-selected purchased layout. `src/game/neighborhood.ts` fixes24lots per block, each8×10tiles, with a6.5×7.5building collision envelope and a stable door/front point. `server/store.ts` owns level1/2homes; `src/game/home-layout.ts` owns original nooks plus two expanded workroom nooks. The purchase helper uses earned bridge kits; no general money wallet exists.

A future smaller house can use less of its parcel; a larger footprint needs explicit walkability/door/camera proof within that envelope or a separately designed lot expansion. Merely stretching an image over the current collision model is not the requested change. Preserve the existing facade families as art inputs, but let the later catalog/ownership system decide purchased appearance instead of deriving all choices forever from plot ID.

## What must be true

- A small cottage and an expanded house should differ in visible footprint, height, roof/porch silhouette and usable interior, not just a sign or paint job. Several choices at a comparable tier let players express taste; the most expensive option must not make every street identical.
- Exterior size must fit the existing persistent lot envelope and preserve door identity, shared walkways, sight lines, neighbor access and phone tap targets. Buying a larger home never evicts a neighbor or changes anyone's address.
- Yards are personal creative space: owned planters, trees/shrubs, paths, fences, lamps, benches and small whimsical ornaments are candidate families. Let owners choose from a bounded arrangement system; do not permanently randomize the yard and call it customization. Visitors can see it but cannot edit, spend, harvest private resources or rearrange anything.
- Each layout purchase clearly previews its exterior, floor plan, included features, required resources, construction time and exact server quote. Lead with what changes. Review/cancel costs nothing; repeated/delayed confirmations charge once. Preserve a comfortable path back to an affordable layout.
- More expensive layouts add useful space or a distinct feature, such as a conservatory nook, porch, extra decorating room or workshop wing. These examples are agent-selected candidates, not approved production bonuses or resource yields. No hidden multiplier, mandatory combat/rare drop or bought progress bypass.
- During an upgrade timer, keep the existing home usable and its contents safe until the new layout commits. The purchase screen should compare a few illustrated floor plans with short feature/cost labels rather than a long specification.
- Home ownership, purchased layouts, yard pieces and decoration persist through weekly competition. Switching floor plans must preserve every owned furnishing and return displaced pieces to the Bag, never delete/remint them. A sale/downgrade/refund policy needs its own economy decision before offering one.

## Candidate progression and identity

Start with a few coherent families rather than dozens of shallow recolors: compact cottage, narrow townhouse, garden studio and a broader workshop home. Mix rooflines, roof materials, window shapes, entryways and yard framing within the established original illustrated art style. Each family needs a readable small starter form and purposeful expansion variants. These are proposed art families, not final counts/names or an imported asset pack.

Existing level1starter and level2workroom homes must migrate deterministically to equivalents with all current rights, decoration, workroom nooks and address intact. No retroactive bill. Keep price amounts and construction timers unpriced until an earned-resource/pacing model can show meaningful choice over weeks, things to do while building, and fair return visits. The current prototype spends bridge kits for homes; do not label a nonexistent currency balance as money.

## A bounded implementation sequence

1. Inventory current housing authority, lot/door geometry, furnishing allocations, save/SQL constraints, visitor privacy and prices. Compare several exterior/floor-plan concepts on an actual street, including full24-home blocks,320/360phones, short/text200, daylight/night and decorated yards. Use Terra to cold-read choice/cost/features when that UI exists.
2. Prove a versioned catalog and forward migration outside live entrypoints. Layout ID and purchased rights are server-owned. Reserve yard slots without blocking shared lanes; price and claim/layout conflicts commit atomically under existing UUID/revision patterns.
3. Integrate one complete purchase/preview/construct/arrive/decorate/visit loop, with original art and exact item availability across rental, starter, expanded rooms and yard. Prove retries, old caches, two buyers, timer restart, dump/restore and weekly persistence before expanding the catalog.

Keep the active café transaction task bounded; no house geometry, economy or art is changed by this design capture. The roadmap includes a discoverable housing-variation design task after coherent café integration. This does not require public hosting, real accounts or asset purchases.
