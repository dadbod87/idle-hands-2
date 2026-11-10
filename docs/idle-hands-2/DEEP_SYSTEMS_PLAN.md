# A deeper town, built in playable layers

Working design, 2026-11-10. This is a candidate content/system plan, not a claim that the catalog below exists in the game. Consult [current session](CURRENT_SESSION.md) and [roadmap](ROADMAP.json) for implemented state and acceptance. Existing durable prototype receipts, ownership and workshop rules remain authoritative until a tested migration changes them.

## Direction and decisions

User direction: a separate, slower, persistent game with humor, teamwork, exploration, quests, skills, gathering, crafting, NPC services, personal homes and expressive decoration. Resources should connect to a town that gradually feels alive. New depth includes distinct wood species, fruit/crop growing, shops buying and selling, individual clothes/tools, meaningful home expansion and staged public construction. Personal work survives weekly competition. Free original/verified assets remain the policy.

Agent-selected defaults in this document are proposals, not final prices, balance or approved asset volume. The [vision](VISION.md), [living-town loop](LIVING_TOWN_SYSTEMS.md), [pacing and housing targets](PACING_AND_HOUSING.md) and [reuse review](SYSTEMS_REUSE_REVIEW.md) provide the governing context. In particular, simulate ordinary return visits rather than rewarding continuous clicking; expansion comes after one neighborhood works on phones.

The [IH2-054 expanded-world foundation](design/README.md) now reconciles later owner directions: regional exploration, optional combat, bed/corpse recovery, chat/social cooperation, construction timers and opening/door animation. Its machine catalog is the current cross-system candidate inventory; this earlier document supplies depth and material/animation principles. Neither is executable balance. Design-only054 precedes052; no new wood/tool/recipe economy is included in053.

## Split the next work into reviewable slices

| Slice | Scope | Completion evidence |
|---|---|---|
| IH2-051 · Town rhythm and first conversations | Cosmetic dawn/day/dusk/night, weather, three useful NPC conversations and this plan | Pure clock tests, readable overlays, reduced/hidden behavior, phone screenshots; no new production modifiers |
| IH2-054 · Expanded-world foundation | Coherent systems/content/art design and pacing experiments | Catalog/runtime anchors, labelled world/phone concepts, deterministic experiments and exact-head source checks |
| IH2-052 · Starter homes and return visits | Physical owner/visitor home, one preserved expansion/decorating path, first-session kit gap and offline summary | Durable ownership/migration/replay and six-week pacing fixtures, newcomer teaching without repeat income |
| IH2-053 · Restored trail and discovery | One timed bridge stage with grandfathered existing completion, safe trail, resident reactions, newcomer follow-on work and one earned cosmetic using the existing catalog | Two-client restoration/reward safety, safe destination migration and no luck-gated essential access |
| IH2-050 · Integrated neighborhood acceptance | Reconcile the original brief after the three smaller slices | Fresh/resumed/reconnected playthroughs, honest timing/return reasons and final UX evidence |

The machine-readable roadmap controls ordering and completion. Deeper resource/growing/shop/equipment candidates below are later bounded selections, not hidden additions to these slices. Preserve the original parent acceptance; splitting work must not mark unimplemented homes or trails complete.

## Candidate catalog and dependencies

Stable IDs below are design candidates. Preserve the original material IDs during migration; do not reinterpret existing timber as a rarer species or silently devalue players' stock. Prefer a few clear substitutions/recipes over a large first-day inventory.

| Candidate | Source / dependency | Meaningful use and boundary |
|---|---|---|
| `wood:common`, later `wood:birch`, `wood:oak` | Common salvage first; species nodes after trail restoration and appropriate tool | Common framework, light interior pieces, strong beams; species are choices with substitutes for mandatory gates |
| `fruit:orchard`, `seed:herb`, `crop:herb` | Public orchard/groundskeeper quest, then personal growing bed | Harvest, basic goods and optional food/decoration recipes; no crop death or forced midnight visits |
| `part:fastener`, `cloth:plain`, `stone:salvaged` | Existing scrap/supplies recipes or later restored supplier | Repair kits, fabric finish, masonry stages; no new currency for each material |
| `recipe:birch-stool`, `recipe:oak-shelf`, `recipe:planter-box` | Making skill, owned tool, species/common alternatives | Recognizable base silhouette retained under finishes; all requirements shown before spending |
| `npc:groundskeeper` | Bridge/trail project and useful introductory errand | Seeds, planting advice, bounded shop stock; unlock service, not an infinite compound-income helper |
| `npc:outfitter`, `npc:salvager` | Later small town restoration stage | Clothes/tool catalog and clear buy/sell offers; no player marketplace in the first slice |
| `equipment:work-gloves`, `equipment:hand-tool` | Starter kit or short quest before specialized tools | Explicit owned/equipped slots; any future mechanical effect is validated server-side and visible in the quote |
| `home:starter`, `home:workroom`, `home:garden-bed` | Durable plot ownership, staged materials and personal quest | Extra room/layout/placement capacity and distinct façades; migrate existing furnishing positions without loss |
| `town:trail`, `town:orchard`, later `town:greenhouse` | Shared material stages with newcomer-accessible tasks | Before/after world art, a new destination/service, short authored reactions; not a second sprawling district yet |

Do not add all candidates together. After the neighborhood proves useful, a small resource implementation could select one wood distinction, one reusable tool slot, two recipes and one NPC errand/service. Growing or buy/sell can be a subsequent slice if the first resource choices are not yet understandable.

## Wood and material families to grow into

All rows are proposed content, not shipped items. Existing `timber` remains existing timber; a content migration must never quietly reclassify or devalue it.

| Family / candidate ID | Where it belongs | Crafting and visual identity |
|---|---|---|
| Reclaimed timber · existing `timber` | Starter salvage/depot, useful throughout progression | Basic frames, repairs and rough boards; visible old nail holes and mixed grain |
| Pine · `wood:pine` | Early managed woodland / replanted softwood | Simple furniture and building frames; pale warm grain, common alternative for required framing |
| Birch · `wood:birch` | Restored trail groves | Light interior pieces, shelving and flooring; pale fine grain rather than a flat white recolor |
| Oak · `wood:oak` | Forestry/tool progression and longer-growing trees | Strong beams, doors and substantial furniture; broad grain and heavier structural motifs |
| Cedar · `wood:cedar` | Later nursery or restored wooded edge | Outdoor planters, siding and garden pieces; warm red grain and weathered trim |
| Maple · `wood:maple` | Nursery/woodland milestone | Polished interiors, kitchen pieces and fine craft; smooth honey grain |
| Walnut · `wood:walnut` | Later restoration/earned nursery unlock | Dark furniture collections and statement trim; deep grain, cosmetic prestige rather than a mandatory superior everything |

A species should open a material choice, recipe family or regional story. Avoid seven copies of the same progression ladder. Essential structural recipes can accept a defined common-board family; signature décor may require a species. Milling boards/finishes can add useful stages, but do not require dozens of near-identical stacks before a first home feels personal.

Other candidate chains: stone → cut blocks → masonry; clay → fired tile/pots; flax/cotton → cloth → upholstery/clothes; reclaimed metal → fasteners/tool fittings; pigments/flowers → dye/paint; sand/glass only when a window/greenhouse slice needs it. Water is an understandable growing input or convenience upgrade, not an hourly login tax. Resource rarity comes from earned access and choices; no luck-gated structural material.

## Planting, fruit and gardens

| Candidate group | First useful choices | Later depth and presentation |
|---|---|---|
| Herbs | Mint, basil | Lavender/rosemary, small planters, cooking/craft ingredients and fragrant garden collections |
| Vegetables | Carrot, tomato | Pumpkins/seasonal-looking varieties, trellises, baskets and optional NPC orders |
| Fruit trees | Apple, pear | Peach/other orchard varieties, pruning/harvest baskets and persistent personal orchard layouts |
| Bushes | Berry bush | Different fruit/dye uses, shaped garden edges and small wildlife details |
| Flowers | Sunflower, meadow mix | Roses, palette families, bouquets and dye; beauty and recipes rather than mandatory stat bonuses |
| Saplings | Pine/birch starter choices | Oak/cedar/maple/walnut nursery unlocks and a managed personal forestry plot |

Growth stages should be visible: prepared bed → planted → sprout → growing → ready → harvested/regrowing. Perennial tree/bush ownership is separate from its current yield. Proposed pacing categories are short introductory plants, ordinary crops over return visits, and orchard/woodland maturity over days or weeks; exact real-time durations need cohort simulation. Nothing dies because a coworker could not log in. Ready produce waits; clearly disclosed capacity prevents infinite unattended accumulation. Replanting, irrigation and tools should reduce chores or broaden choices, not impose alarm-clock obligations.

Skill candidates: forestry, gardening/orcharding, carpentry, masonry, tailoring and community stewardship. Prefer access, recipe variety, storage/convenience and expressive options over global exponential yield multipliers. XP comes from validated bounded actions, never repeatedly opening a menu.

## Personal equipment and purchasable collections

Candidate independent appearance slots: headwear, eyewear/face accessory, shirt, outerwear, trousers/skirt, footwear, held tool and optional bag/accessory. Hair, body and skin identity remain separate. Start with a small tested slot subset; retain every underlying choice when an outer layer or costume temporarily covers it. Rendering needs compatible silhouettes and all supported facing/action poses, with a validated safe fallback for missing art.

Owned tools can include axe, watering can, basket, pruning shears, pick, hammer and sewing kit. Functional tool stats/unlocks are explicit and server-owned; clothing stays cosmetic unless a separate reviewed rule deliberately says otherwise. Do not hide productivity bonuses inside a decorative purchase. Equipping, dyeing, storing and selling must keep ownership and item identity intact.

NPC collections can sell seeds/saplings, tool blueprints, clothes, furniture, wallpaper/flooring, roof/door/window variants, fabrics and finish recipes. Start resource-first/barter in the current prototype; introduce a single earned exchange currency only if sources/sinks and buy/sell simulation justify it. No real-money shop or paid advantage. Cosmetic colors and patterns preserve the base item, material grain and earned tier silhouette.

Home growth candidates: starter room → workroom/second room → garden/porch → specialist room/greenhouse → further interior/exterior layouts. Distinguish structural expansion from furnishing purchase and finish changes; quote them separately. Keep usable paths/door exits protected, preview layout changes, and return displaced owned items safely to storage instead of deleting them. Shared town stages can restore a trail, orchard, nursery/sawmill, village green, market or greenhouse one at a time, each adding a visible place and useful choice rather than merely another multiplier.

## Distinct action animation backlog

These animations are planned, not implemented by IH2-051. Each needs four facings, the equipped-tool layer, a stable foot anchor and a quiet reduced-motion equivalent.

| Action | Visual sequence | Confirmation boundary |
|---|---|---|
| Pick fruit | Face tree/bush → reach or gentle branch shake → fruit into basket | Fruit/XP changes only on confirmed harvest receipt; no duplicate falling-fruit reward on replay |
| Chop wood | Face trunk → equip axe → controlled swing/contact → gather a log | Node availability and wood type/yield come from the server, not swing count; don't erase a public tree for everyone |
| Plant | Kneel/prepare soil → set seed/sapling → cover/pat bed | Bed ownership, seed spend and growth start commit together; cancelling approach costs nothing |
| Water | Lift/tilt can → short pour → return tool | Future water/bed change is one confirmed action; no per-drop writes or missed-day crop death |
| Harvest a bed | Bend/cut → lift crop → basket | Capacity checked before one output receipt; ripe state survives rejection/reconnect |
| Mine/salvage | Appropriate tool or hand inspection → contact → collect | Logged bounded node yield; animation cannot reroll rare output |
| Build/repair | Inspect plan → hammer/fit part → small stage feedback | Materials and shared/personal stage commit atomically; late viewers render the saved stage |
| Equip/dress | Preview layer → brief adjust-clothing pose → final look | Confirmed owned compatible item wins after reconnect; no item duplication or lost covered layer |

Long jobs don't require an avatar to loop an animation for hours. A short start/collect gesture acknowledges the action; durable job timestamps carry the real work. Shared clients may see an ephemeral action pose, but that broadcast never proves inventory or reward authority.

## Resource fairness and offline rules

Public scenery must not become a race where an early player empties every tree before coworkers arrive. Proposed source model: personal bounded gathering entitlement at shared authored nodes, with separate shared project totals. Nodes do not vanish for everyone when one player collects. Test two simultaneous residents and a newcomer; make any genuinely global scarcity an explicit later decision.

Growing uses server start/ready timestamps and a clear harvest/storage limit. Offline completion is elapsed-time settlement, never a timer per plant or a database write every second. Completed crops wait safely; no withering, weather damage, login streak loss or mandatory alarm. Returning more often should not accelerate refill. Define storage/production caps plainly and preserve jobs through recipe/content changes.

Weather is cosmetic first. The IH2-051 48-minute visual day is unrelated to crop growth, real offline hours, cooldowns or the weekly score calendar. No season/phase multiplier, random storm loss or night-only required item is implied. Any later mechanical weather effect requires its own balance, authority, fairness and accessibility review.

## A service should create a choice

NPC shops need an authoritative offer ID, catalog version, finite integer price/quantity, ownership checks and transactional stock/inventory/payment changes. A stale quote fails without spending. Show both what is paid and received, available stock and buy/sell distinction. Guard buy→sell loops, arbitrage, negative quantities, double taps and replay. No final prices are proposed here; keep the same modest resource economy until simulation supports another exchange medium.

Clothing and tools are distinct from furniture and material stacks. Candidate slots: headwear, outerwear, outfit and hand-tool, with a minimal starter subset. Only equip owned compatible items; preserve the resident's identity/body and proper frame anchoring. A cosmetic outfit must not quietly alter production. Equipped items cannot be sold out from under the avatar without an explicit safe transition.

Homes expand by completing visible stages, not by replacing a house and deleting its contents. Separate address/plot ID, layout version, cosmetic façade and placed item instances. Preview a floor-plan change and deterministically remap valid placements; anything unmappable returns to owned storage. Visitors cannot edit. Weekly scores never reset property, skills, cosmetics or crop jobs.

Shared construction should have transparent quantities, receipts and stage art: trail survey → materials delivered → safe access → service opens. Individuals retain materials until committed. Do not require one specific absent player or let one rich account bypass every useful newcomer action. Avoid presenting a restored bridge as an open explorable route before the destination actually exists.

## Action animation and receipt matrix

Animation follows a command; it never produces an item or decides success. Each action carries a stable command ID and source/target. A local approach/preview can be cancelled freely. Once submitted, a lost response means **outcome unknown**, not **failed**: retain the command ID and retry it before another conflicting action. Closing the panel must not imply that a committed command was undone.

| Action | Approach / preview | Awaiting confirmation | Confirmed completion | Cancel, replay and reduced motion |
|---|---|---|---|---|
| Gather | Face the selected legal node; show material/available count | Brief reach/tool pose; keep feet stable | Receipt updates inventory/XP and a short useful line | Cancel approach before submission; replay shows original result; static reach icon under reduced motion |
| Craft start | Inspect exact inputs, duration and output capacity | One bench interaction, not a looping fake task | Costs and queued job become visible together | No spending before confirmation; job runs by server clock even if avatar leaves |
| Collect / harvest | Show ready output and destination capacity | Short lift/inspect pose | One receipt grants output once | No celebratory reward on a rejected/duplicate claim; reduced motion uses text/status |
| Place / move / equip | Ghost or selected slot, collision/ownership preview | Keep preview pending; no permanent silhouette change yet | Render committed placement/equipment snapshot | Cancel preview is domain-free; snapshot wins after reconnect; no tween needed |
| Contribute / purchase | Show exact offered items and affected project/stock | Stable button footprint; pending indicator | Charge, project/stock, quest credit and score commit atomically | Retain retry ID across uncertain transport; show no duplicate fireworks/rewards on replay |
| Talk / service unlock | Face NPC; readable dialogue target | Fetch durable service state only as needed | Authored response and unlocked options from snapshot | Dialogue can close freely; no reward from repeatedly opening it |

Phase-specific clothing poses must cover south/north/east/west and idle/action transitions without moving the feet or using missing frames. Root motion stays in the movement rules. Animation ends on cancellation, confirmation, scene transition or identity change; hidden tabs pause visual work, not durable jobs. On resume, derive the display from current confirmed state. Reduced motion retains the same timing information and complete actions without sway, flashing, bouncing or repeated particle bursts.

## Data, versioning and authority contracts

1. **Catalog data:** stable definition IDs and content versions for resources, recipes, tools, crops, NPC services and construction stages. Keep balance values out of renderer code. Optional art is never the source of item authority.
2. **Durable records:** bounded quantities, owned item instances where individuality matters, equipment slots, plot/layout version, growth/production jobs, skills, quest award IDs and shared stage contributions. Store timestamps and receipts, not frame counters.
3. **Commands:** authenticated actor derived by the server; stable ID/payload hash; expected relevant revision; target/quantity/quote ID; bounded validation and transactional spend/output/XP/quest/project updates. Concurrent clients cannot claim the same output or stock twice.
4. **Migration:** test old-save fixtures, in-flight jobs, changed recipes, retired items and layout expansion. Preserve earned state; quarantine unknown/corrupt durable data rather than silently creating a new player. Keep content migration separate from weekly scoreboard rollover.
5. **Transport/display:** snapshots own truth. Presence and action broadcasts are ephemeral illustrations, never evidence that a reward was earned. No per-frame/per-plant database writes. Queue retries and reject stale conflicting commands clearly.
6. **Evidence gate:** isolated fixtures only; simulate idle/regular/active six-week schedules plus absence/rejoin, storage limits and newcomer participation. Add replay/concurrency, ownership, migration and buy/sell exploit tests before economy changes. Then inspect the actual final CI screenshots on desktop/narrow/short layouts before merge.

## IH2-051 cosmetic defaults

Agent-selected prototype defaults: a global 48-real-minute loop, with dawn 4 / day 28 / dusk 4 / night 12 minutes; phase-first labels. The readable virtual clock maps dawn 06:00–08:00, day 08:00–18:00, dusk 18:00–20:00 and night 20:00–06:00. It deliberately does not imply real-hour production speed. Epoch anchoring is currently fixed at Unix epoch for reproducibility; a future server-world epoch would need an explicit versioned cosmetic contract.

Weather is deterministic in 12-minute real-time segments using a fixed integer hash and 60/30/10 clear/overcast/drizzle bucket weights. This is neither a forecast API nor a live economy random roll. One composite tint combines warm phase/soft-grey weather washes, capped at 0.40 opacity. Agent-selected reversible refinement after screenshot review: the first 0.20 blue wash looked like overcast rather than night, so clear night now uses deep blue `#263659` at 0.36 opacity; drizzle remains below the 0.40 cap. HUD stays untinted and indoor presentation should reduce the overlay to about one quarter. Dusk begins neutral, warms, then blends to the night color; the last quarter of night fades to dawn, whose brief warm glow fades back to day. Composited-color and lamp endpoints are continuous across phase boundaries when weather is unchanged; the softly shaded 12-minute weather segments remain discrete. Lamps are visual only. Readability and silhouettes take precedence over realistic darkness; inspect the actual final desktop/phone screenshots before accepting these defaults.

`climateFixture` requires `sky-study=1` and accepts enum-only `phase`/`weather` parameters. It supplies fixed visual samples only; it must never replace `Date.now()`, change server timestamps or settle jobs. Bad/nonfinite clock inputs safely use epoch zero; negative timestamps have defined floor/modulo behavior. Any preview using this override must be labelled as a visual fixture, not a simulation of real player progression.
