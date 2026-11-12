# Asset production plan — candidate design, 2026-11-10

This is a production plan, not shipped content or a request to generate a complete future asset library. The owner’s latest directions take precedence over older exclusions in the first-neighborhood brief. Original foundation audit was inspected against main `fb0fab36b7bd66d7711bb7eca55126821d880f3d`;052/053 scoped evidence now augments it, with exact acceptance in task closeouts. The teaser is approved marketing concept art, not a screenshot, atlas or license to treat its objects as implemented. All later region names are candidates.

The companion [CONTENT_CATALOG.json](CONTENT_CATALOG.json) indexes48 bounded materials, tools, furnishings, buildings, recipes, three trail landmarks and one candidate encounter actor. Its phase names match the systems design: `starter-home`, `first-woodland`, `food-combat`, `regional-cities`. Only052 and053 have near-term runtime references; empty future task references intentionally avoid inventing approved milestones. The `first-woodland` phase is a semantic content grouping:053 selects only existing-catalog trail/timed-bridge/cosmetic work; its new material/tool/recipe entries are unassigned candidates after integrated050, not automatic053 scope. Each entry’s `region_ids` names its first proposed availability or physical location; it is not copied from the phase-wide region list. Portable owned items may travel elsewhere later. A catalog ID never renames a current durable runtime ID. Null recipe amounts/durations are unresolved, not free or instantaneous.

## Audited coverage: what actually exists

| Actual source | Coverage we can claim | Gaps and limitations |
|---|---|---|
| `src/game/workshop.ts`: `scrap`, `timber`, `supplies` | Three implemented resource definitions; two real recipes with current inputs and real-hour durations | No item-specific material/recipe icon library. Inventory is text; depot visuals are colored rectangles plus labels in `WorldScene.ts`. The rectangle is not a final scrap pile, timber stack or supplies cabinet. |
| `WorldScene.ts`: planter/stool/rug/lamp/crate/shelf Graphics branches | Six distinguishable procedural placed forms | No individual inventory icons, authored preview/state families or directional interaction art. The `PROPS.art` hints map planter/lamp to a tree, stool to a bench and rug to a plot; those generic mappings do not fulfill final item art. |
| `public/art/original`: bench, shelf, crates, room floor and bridge states | Authored scene props and current neglected/repaired bridge art | These scene props are not automatically the six owned-item definitions. A crate scene illustration cannot stand in for every resource, recipe output and equipment icon. No construction-stage bridge art/timed opening exists. |
| `public/art/variety`, catalog and `tools/create-town-variety.py` | Original oak/birch/fruit layers, varied ground, workshop/café exteriors and four resident sheets with28 frames each | Trees are scenery, not implemented species-yield nodes. Café is a landmark, not a shop. Four resident rigs are not modular character creation, equipped clothing or tools. |
| `public/art/variety/comparison-sheet.svg` | A clearly labelled future-house vignette | There is no separate finished house sprite, physical home interior, build/opening state family or owner/visitor door asset. The comparison sheet must not be loaded as a home. |
| `src/phaser/TownSky.ts` and current DOM game controls | Cosmetic day/night/weather, warm window overlays, reduced/hidden safeguards; current navigation and guide symbols | No item-specific health/food/combat/equipment/chat/recovery icon system. Existing map/book controls remain useful navigation, not proof of future system art. |
| Owner teaser in `docs/marketing/idle-hands-2-development-teaser-v2.png`, with `docs/marketing/teaser-provenance.json` | Approved humorous direction and aspiration; retained source/provenance in the repository | Not runtime art, not item coverage, not an implemented world. Keep the disclosure on any reused marketing image. |

The `art.existing_evidence` fields in the catalog link real files and narrow the claim per item. Every row deliberately keeps `final_item_family_complete:false`. A small current procedural form can be retained as a valid prototype while its complete future family remains unproduced.

## Production batches and stop gates

| Batch | Candidate content to finish together | Deliverable before expanding |
|---|---|---|
| A · next052, starter home | One starter façade/interior/door pair and its first Ledgerwick workroom upgrade, protected bed/wake anchor, six existing furnishings with matching icons and ghosts, truthful bridge-kit bundle icon | One complete owner/visitor home loop on phone; no lost/multiplied copies or blocked door after layout migration. Review final screenshots and source art, not just diagnostic metadata. No clothing/crop/combat catalog implementation slips into052. |
| B1 ·053, existing catalog | Traversable Inkwood trail/blocked-to-open art, timed bridge construction/ready/opening family and a small cosmetic discovery; retain the existing three resources and two recipes | A truthful contributed→building→ready→opened sample and usable new route. Existing repaired bridges keep their earned state; no retroactive closure/timer. No wood-species, tool or recipe economy is added by this batch. |
| B2 · first woodland depth, later unassigned after050 | Select one Inkwood pine/birch distinction, one Ledgerwick hand tool/axe and a bounded recipe pair; one readable source node per selected material | First pass integrated050 acceptance, then select the later material/tool/recipe slice explicitly. Prove one unmistakable gather→craft→place choice. Authored living/available/personal-empty/regrowing states do not erase the shared public tree for other players. Tool contact and reward receipt are separate; do not produce all species now. |
| C · food/combat, later unassigned | Ledgerwick garden bed/seed/herb chain and soup, Ledgerwick/Inkwood orchard fruit and snack, one Ledgerwick-crafted weapon, one optional Inkwood/Pumpworks paper-mite encounter and a clear Pumpworks entrance/return marker; health/telegraph/recovery markers | One complete phone encounter and safe recovery route, no inventory loss rule silently finalized. Validate the proposed recovery deadline, disconnect/downtime grace and equipped-item treatment first. No mandatory rare drop or punitive crop death. |
| D · regional cities, later unassigned | Mossbank later oak/nursery/outfitter family and Bellwether Quay coastal market/lantern family; one useful service/house style at a time | Distinct offering and recognizable silhouettes for each selected destination. No giant city atlas before a region has a useful playable purpose and measured memory budget. |

Ledgerwick is the candidate starting-town name; Inkwood is the candidate first woodland. Pumpworks, Mossbank and Bellwether Quay are candidate future places, not live destinations. Ledgerwick and Mossbank remain safe settlements: hostile paper mites and any future combat drops belong only to marked Inkwood pockets or the Pumpworks dungeon. The clipboard pennant is now a permanent053 three-landmark discovery award, never a rare PvE drop. Inkwood/Pumpworks do not gain starter housing from this catalog; the first house, garden bed and052 workroom upgrade are Ledgerwick content. Harvestable oak remains a later Mossbank candidate, not an early wood gate; reused decorative oak/birch/fruit tree art in the053 trail grants no resource species. Keep item ownership and house creativity persistent across all phases and weekly competition.

## Definition of a complete item family

Each selected item receives a stable manifest ID, exact provenance/license, reproducible source, material masks and a small review contact sheet. A menu label is not its icon. A finished world sprite is not its construction preview.

- **Icon:** readable silhouette at24/32px and44px touch-row presentation; quantity is DOM text, not painted into the item. Shapes and labels carry meaning beyond color.
- **World and preview:** one identifiable base silhouette, foot/placement anchor, collision/interaction footprint and material regions. Preview must show the same object and earned tier. Finish changes retain outline, grain, motifs and meaningful details.
- **Tools/clothing/weapons:** inventory form plus four facing layers and all selected actions. Hands, grip and feet remain anchored; left/right mirroring must not reverse readable insignia or put the tool through the body. Unproduced compatible layers use an explicit reviewed fallback, never a missing texture.
- **Construction/restoration:** proposed/contributing/building-inspection/ready/opened views plus input/remaining-time status. Existing bridge neglected/repaired art only covers two endpoints. Do not impose candidate construction timers on already earned property without a separate migration decision.
- **Growing:** prepared/planted/sprout/growing/ready/harvested-regrowing forms. A perennial tree’s ownership is separate from this yield. No withering/weather destruction art is needed because that mechanic is not approved.
- **Damage/recovery:** creature tell/hit/incapacitated variants, health/target symbols and an owner-bound belongings/corpse marker. Houses and permanent furnishings have no combat/prank damage mechanic. “Neglected restoration” texture is a story stage, not permission for players to destroy homes.

## Directional animation and receipt coverage

Keep the accepted64×80 rig frame and foot anchor `(0.5,0.9)` as the starting contract; four facings and distance-driven walking already exist. Validate four distinct bodies with each new clothing/tool layer before growing the wardrobe. Use measured atlases, shared palettes and material masks; do not explode every body×outfit×tool×action into duplicated full sheets.

| Action family | Minimum first authored sequence | Reduced-motion / retry behavior |
|---|---|---|
| Character creation and waking | Appearance preview; editable name/flavor backstory; sleeping/eyes-open/sit/stand samples; safe lodging spawn | Static preview and “Wake” transition. Skip/replay changes presentation only; confirmed identity is retained. Starting lodging is not an owned house. |
| Walk and doors | Existing facing/steps; face entry, short acknowledged fade/threshold, exact safe exit point | No camera shake, forced pan or foot slide. Wait for source/portal confirmation; cancel superseded intent. Static transition preserves the same destination. |
| Chop/mine/salvage | Anticipate→tool contact→recover→lift material | One quiet contact pose and receipt text. Neither swing count nor particle count creates output. No perpetual job animation while absent. |
| Plant/water/pick/harvest | Kneel/pat; pour; reach/basket; bend/cut/lift, each visibly different | Static action icon/pose with the same target and ready time. Ready yield waits; repeated/replayed receipts do not duplicate produce. |
| Build/opening | Brief fit/hammer pose; committed stage change; restrained banner/ribbon moment | Static opened sign plus timestamped journal card. No exact-attendance requirement, camera takeover, paid skip or replayed reward. |
| Eat/equip | Hand-to-mouth; adjust clothing; draw/put away held item | Preserve base identity and covered choices. No assumed clothing productivity bonus. Show only the confirmed inventory/slot result. |
| Combat | Readable enemy tell; deliberate weapon swing; hit/recover; distinct incapacitated pose | Static tell zone/symbol and text. Never remove tactical information; avoid flashes. Server health/receipts decide damage, not contact frames. |
| Death/bed/corpse recovery | Incapacitated→safe town bed; owner marker; inspect→confirmed transfer | Short/static transition and durable journal entry. Candidate30-real-minute deadline is not approved tuning. No gore required; use a readable clothed silhouette/belongings marker. Partial/full-bag recovery needs separate capacity states. |
| Speech/help/prank | One readable overhead bubble, subtle gesture; optional quiet cosmetic reaction | Bounded timestamped journal retains the message. Private messages never leak into public bubbles. Harmless cosmetic pranks respect opt-out; no rare-item/property destruction. |

Motion starts after the relevant state is confirmed or is explicitly a cancellable domain-free anticipation. “Outcome unknown” retains the same command ID; it must not play failed/successful loot twice. Hidden tabs stop decorative work. Reduced motion does not speed jobs, change combat deadlines or skip required choices.

## Phone and performance constraints

The [phone storyboards](PHONE_STORYBOARDS.svg) are original vector design concepts at360×640, not screenshots or a functioning purchase flow. They reserve clear world space and44px-or-larger action controls. Validate actual narrow phones, short landscape and200% text later; a diagram is not an accessibility or device-test pass.

Health/current-max, target tell, world navigation and retreat remain outside chat drawers. At most one optional journal/composer is expanded; composing owns keyboard focus and movement hotkeys pause. Overhead speech is bounded, avoids doors/health/touch controls and is backed by channel-labelled history. Recovery exposes location, exact server deadline and capacity before transfer, not a threatening unexplained countdown.

Reuse the bounded camera/door contract. Keep canopies axis-aligned: actual software-rendered CI lost triangles under rotation. Preserve the compositor pixel checks, climate-aware palette and actual final image review. Night/indoor/light layers and decorative motion stay client-only; no per-animation network/database work. Warm windows, foliage and action effects must not drown out silhouettes.

Budget from measurements, not atlas counts alone: record compressed transfer, decoded image/texture memory, draw calls, frame distribution and input-to-response latency on a physical phone plus the software-rendered CI case. Atlas only selected assets; unload scene-specific groups; cap particles and nearby actors. Retain original source and hashes. Render metadata passing is insufficient: past missing frames/canopy clipping were caught in actual screenshots.

## Open review decisions, not blocking questions for the owner today

1. Confirm the first complete052 home/material family before bulk production; keep the six current owned silhouettes recognizable.
2. Recovery timing/equipped drops/expiry consequences/downtime grace remain unresolved. Storyboard countdowns are illustrative; they are not tuning approval.
3. Choose one supported first weapon/encounter and a clear retreat gesture before commissioning more creatures or weapon sheets.
4. Validate character-body/clothing/tool combinations and touch legibility on a physical phone before multiplying equipment slots.
5. Finalize chat audience/moderation/privacy separately from fictional local fixtures. No private-message bubble or fake online identity in an art sample.

## IH2-052 production update
Nineteen original vectors now cover starter/expanded exteriors and interiors, six furniture world/icon pairs and three material icons under public/art/homes; deterministic tools/create-home-art.py and exact provenance record them. Runtime furnishings now use their authored home-* forms and bag/selection icons. Both home rooms retain the original six placement IDs; expansion adds continuous floor to the right. The table above is the historical054 gap audit, not a claim these19assets are still absent. Future action/stage/equipped families remain incomplete; no full catalog family is marked final.

### IH2-069 courier study, not a runtime family

Fourteen original candidate vectors and their exact generator/hash provenance live in `docs/evidence/IH2-069/concept/art/catalog.json`. Three letterbox palettes retain the same80×112shell/slot/cap/flag/feet and foot point(40,106), with closed/open poses; three addressed parcels, three receipt stamps, route card and work-surface illustration cover the proposed item props. Existing owned-room art is copied only for a generic placement sketch. Two-sheet native browser capture checks all14bounds and visible forms. No accepted runtime asset, collision or palette is replaced. Promotion needs explicit IDs/manifest/provenance and actual world-scale owner/visitor/door/camera/placement review; closed/open studies are not yet actor handover/assembly animation. Record remaining action coverage rather than calling this a completed production library.
