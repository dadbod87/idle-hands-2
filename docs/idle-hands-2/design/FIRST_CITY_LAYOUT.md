# Ledgerwick — first-city layout and housing plan

November12,2026. Owner requests a larger, coherent first city, room for several players' homes, visible neighbors, enterable homes, lively original art and clearer crafting/menus. This plan distinguishes current behavior from the candidate design. New permission allows consecutive bounded local tasks in this session; required verification/release gates still apply to each accepted section. No cloud, real accounts or original-game work is authorized.

## Audit of the accepted086 build

| Area | Current evidence | Gap and action |
|---|---|---|
| City footprint | `square` is48×48tiles, with workshop, café landmark, communal project, depots and named services; garden and trail are distinct rooms | Increasing empty grass would add walking without depth. Keep the useful center compact; expand via readable districts with their own purposes. |
| Housing capacity | PostgreSQL gives every claim a unique persistent plot ID and one owner. It does not impose a12-player plot limit | Only one exterior facade/entry serves all plots. Add real addressed front doors and residential blocks; do not mistake the current generic facade for a neighborhood. |
| Visits and privacy | Enter-home selects a plot ID; inside-room presence is scoped by that ID. Visitors see public decoration; only owner commands may arrange or upgrade | Preserve this authority while connecting each exterior to the correct instance. Tests must reject wrong doors/instances and visitor edits. |
| Creative persistence | Home levels, placements, workroom nooks, pennant and public letterbox styles are durable | Exterior upgrades and new routes must never reset ownership, repeat rewards or remint furniture. |
| Art and life | Distinct original trees/buildings, distance-based character walk, ambient tree/steam/gesture motion,48-minute sky and drizzle exist | The residential block needs coherent yards, route surfaces, bounded vegetation and several readable roof/porch silhouettes. Existing two house sprites are sufficient only for a layout study. |
| Menus/crafting | Bag and Journal are separate. Work has authoritative costs, deadlines and explicit claim; current tools have focused regression coverage | Independently audit first-time/returning comprehension. Lead with action, cost and outcome; hide optional explanation, never hide material costs or errors. |

## City structure

Ledgerwick is the safe starter company town. Its identity is civic optimism, terracotta/green roofs, warm wood, quiet vegetation and paperwork that has escaped supervision. The town square stays the service hub. The residential district is a quieter public place to see neighbors' houses; the allotment is for growing, and Inkwood is for exploration/resources. These are different destinations, not four copies of one map.

| District | Purpose | Layout and route rule |
|---|---|---|
| Town square, existing48×48 | Workshop, post, common project, shared noticeboard, useful services | Keep accepted positions/collision stable initially. A clear eastward lane at approximately(44,25) is the candidate residential connection; prove its walkability before integration. |
| Housing block, candidate64×64 |24individual home addresses and one commons | Four6-home streets, a central2-tile clear walk, broad cross streets and door-front arrival points. No route crosses a building or private interior. |
| Allotment, existing18×18 | Crops, bounded harvesting and useful independent work | Keep compact rows/clear entry. Ready crops wait safely; timers do not close the area. |
| Inkwood, existing bounded trail | Discovery now, later authored resource/exploration depth | Keep a safe readable path. Later combat/resources need their own threat/authority/animation slice. No surprise danger on a housing route. |

The blueprint lives in `tools/neighborhood-layout.ts`; the separate interactive study is in docs/evidence/IH2-087/study. It is not runtime gameplay. Every candidate door has a sampled public route and clear collision-safe feet. At existing5tiles/second, the longest unobstructed planned gate-to-door route is under20seconds. This is geometry arithmetic, not measured player behavior, network latency or guaranteed phone travel time.

## Addresses and expansion

Each block has24addresses:1–6 Clover Court,1–6 Copper Row,1–6 Birch Bend and1–6 Larkspur Lane. Distinguish local address from block ID and ownership. The candidate mapping derives block/slot from the existing positive decimal plot ID using bigint arithmetic, so a player's address does not move when someone else joins, a name changes, sorting changes or a plot ID is skipped. Plot25 begins block2; no later player is permanently excluded by a full first block. No rounding of large database IDs.

This is an agent-selected migration-friendly default, not an implemented buying-choice UI. Current claim still allocates a persistent plot for12kits. Integration must clearly say when an address is assigned; do not show a selectable empty lot if the command cannot actually reserve that lot. Voluntary relocation/choosing a specific vacant address can be a later atomic ownership-preserving feature. No eviction, theft or forced attendance.

Visiting should be simple: Homes & neighbors → choose a resident/address → walk through the proper district gate → approach that door → enter automatically when close. Keep direct world tap and keyboard. A visit does not require buying your own plot. Exit immediately outside that same front door. The directory must distinguish a free route/visit from claiming/upgrading, and clearly show a visitor's read-only status. Old saved interior positions must retain their plot identity. Lost transition replies resolve before conflicting movement.

## Art and useful life

Preserve the accepted208×248facade frame and(104,240)feet while authoring at least three starter silhouettes and their expanded counterparts: modest gable cottage, broader porch house and narrow taller townhouse. Use a small shared material palette with distinct roof/door/window arrangements; a color swap alone is not sufficient variety. House level remains recognizable. No exterior claims about a purchased inventory decoration unless it is truly placed/publicly projected by authority.

Use three tree species in purposeful clusters, layered grass/verge textures, address signs, communal seating and little gardens. Keep public lanes visible beneath weather, preserve foreground occlusion and do not put collision on tiny decorative clumps. Decorative motion stays local/cosmetic, reduced-motion safe, offscreen bounded and independent of jobs. New NPC walking routes need collision, presence and conversational purpose; more bobbing objects alone are not more depth.

The commons is a place to cross paths. Candidate life: a resident changes a short comment by time/project stage, someone pauses at a noticeboard, a courier walks a legible loop. These are later authored slices; do not fake player presence, public chat or available shops. Town jokes should explain the place while keeping the action label plain.

## Progression and engagement

Aim for satisfying voluntary return, not compulsion. Maintain slow permanent progression, clear achievements and visible creative investment. While one long job runs, a player should have at least one useful choice from gathering, growing, errands, exploration, decorating or helping a shared project. Preserve offline completion/storage limits and no missed-day punishment. Avoid pointless additional timers, hidden odds, streak pressure, infinite click farming or escalating costs introduced merely to consume time.

Show one next useful goal, its concrete requirements and a direct action. A crafting card should answer: What do I get? What do I spend? How long? Can I do it now? Where does the finished item go? Keep an explicit claim when ownership depends on it, truthful disabled reasons and stable controls while timers/status change. Put flavor and deeper rules behind Details. Terra's independent first-use/return audit informs the next bounded UI section; automated success is not proof the game is fun.

## Later towns need distinct plans

| Candidate town | Distinct identity and service | Housing/route policy |
|---|---|---|
| Mossbank | Forestry settlement, timber framing, steeper roofs, woodland restoration and species-specific materials | Smaller12-home green courts can expand as blocks; safe paths separate houses from resource/encounter areas. No reskinned Ledgerwick workshop/café layout. |
| Bellwether Quay | Coastal city, weathered painted wood, stone quays, ferry/trade services |24-address waterfront/upper-lane blocks; broad safe promenades and clear ferry gateway. Water/bridges do not strand owners or become furniture-placement traps. |

These are planning profiles, not shipped regions, commerce or ferry systems. Author a small useful district and its purpose, traversal/camera bounds, safe arrivals, doors, landmarks, growth allowance and art set before opening another large region.

## Implementation sequence and acceptance

1.087: audit, executable24-address geometry/proof, separate original-art interactive blueprint and desktop/phone review. No game-state or accepted preview change.
2.089: first correct the observed crafting/menu confusion before adding more destinations; see the audit below.
3.088: real residential room/block identity, stable address projection, per-door server proximity/instance validation, reachable native/direct/directory entry and correct exit; preserve old saves and exact home ownership/placements. Prototype with isolated synthetic homes, including24homes and a later block. Refuse cached incompatible clients before reads/writes if protocol changes.
4.089 acceptance detail: crafting/menu clarity from independent audit; preserve costs, timers, receipts, pending-command recovery and focus. No broad economy rebalance disguised as UX.
5.090: coherent exterior family and purposeful residential life, based on actual088camera/phone playtests. Original art provenance, depth, collision/occlusion, reduced/hidden/offscreen and payload/frame evidence required.
6.Re-audit playable first-city routes, neighbor visits, useful work while waiting and solo/group progression before any additional town or hosted invitation.

Every accepted section needs required exact-head CI, actual artifacts/images and local preview/preservation checks. Plans and prototype images never substitute for server authority or a live playable flow. Public hosting/account/cost gates remain separate.

## Independent accepted086 UX audit

Terra6.1 used fresh desktop and touch-emulated phone contexts with native first collections/craft, no protected shared identity. P2: the first planter is called orientation/optimistic/plain planter across the loop; use one player-facing item name and explicitly show one item going to Bag. P2: Places gives25destinations equal weight; prioritize current/nearby goals and group the rest without changing walk semantics. Improvement: empty bench shows a disabled collection action before the actionable recipe; lead with current work or the usable recipe. Costs, duration, ready status and collection action are already explicit. No later multi-hour wait or physical-device verification. Evidence in sibling city-ux-audit-2026-11-12/terra-review.089 precedes088integration so more addresses do not worsen the menu.

##088working integration, acceptance pending

The source candidate now derives actual64×64rooms/24sites from this shared geometry, validates district/plot doors on the local server and preserves legacy passages and physical-origin exits. Grouped Places/registry menus and original site art have focused checks; full exact-head CI/artifact/protected-preview gates remain in088evidence. The planned later cities/090silhouette family remain unimplemented. Dedicated fictional25-home test/tour data is separate from protected0plot practice.
