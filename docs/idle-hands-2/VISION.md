# Vision and first playable neighborhood

Updated 2026-11-10 after IH2-054. This is the long-term direction, not implemented breadth or a release commitment. The [planning home](README.md), [current session](CURRENT_SESSION.md) and task evidence distinguish the accepted local prototype from the [expanded design foundation](design/README.md). Direct owner requirements, reversible defaults and open policies are separated in [owner directions](design/OWNER_DIRECTIONS.md).

## The promise

A ridiculous company town you can make your own and help build together. Keep Idle Hands' deadpan workplace humor while giving people meaningful choices, visible creativity and reasons to explore. Small visits should be satisfying; longer sessions should offer discoveries rather than demand constant clicking.

Reference points: Idle Hands' social humor and idle progression, FarmVille-like personal production/building, and Graveyard Keeper's mixture of management, crafting, quests and exploration. These describe desired qualities, not a plan to copy another game's content or assets. See the [official Graveyard Keeper description](https://store.steampowered.com/app/599140/Graveyard_Keeper/) for that reference.

## Three connected layers

| Layer | Possible activities | Connection to the rest of the game |
|---|---|---|
| Your place | Furnish a home/workshop, choose a specialty, arrange production and hire help. | Produce something useful, express personal style and prepare for exploration. |
| Our town | Restore businesses, contribute resources, choose public projects and trade. | Visible construction unlocks services, stories or routes for everyone. |
| Beyond town | Explore woodland routes, meet other settlements and choose optional roaming PvE/small dungeons with usable weapons and food. | Discoveries enable recipes, personal improvements, stories and shared projects; required home access remains available without combat or lucky loot. |

Example loop: learn a craft → make something for home or a neighbor → contribute materials → see construction develop → return for the opening → explore a useful route. The bridge may still require a ribbon-cutting committee, but the ceremony is replayable presentation, not mandatory attendance or another reward roll. Materials plus a real server-owned build/inspection deadline are owner direction; durations remain modeled candidates, not final rules.

Candidate regional sequence: safe company town **Ledgerwick**, the **Inkwood** trail, optional **Pumpworks** dungeon, then forestry settlement **Mossbank** and later trade/coastal **Bellwether Quay**. Names are reversible; runtime `square` is unchanged. Each destination needs a useful service/material/story and a manageable phone scene before another settlement is produced. One small optional dungeon is a later slice, not a pledge to create a giant MMO.

## Persistent world, renewable competition

The approved principle is that the town and creative work persist. Personal decorations, earned appearance choices and completed community construction should remain meaningful across weekly competitions. A score reset must not become a hidden world wipe.

The local durable proof now separates season-keyed scores from workshop inventory/jobs, property rights, decoration and quest awards. Extend that field-by-field contract for every new system; weekly rollover must not become a hidden wipe. Consumables can be deliberately spent and buffs can expire without making permanent home ownership ambiguous. Construction deadlines and opening receipts survive absence/restart; already-restored projects stay open under future migrations.

## Shared impact without one player owning everything

Proposed guardrails to test:

- New players can make a visible, worthwhile contribution without matching veteran wealth.
- Shared construction is cooperative; wealth alone does not buy every public decision.
- Personal-property editing and public-project decisions use distinct permissions.
- One person cannot dismantle everyone else's work; public changes need a clear approval and recovery path.
- Contribution receipts and project state explain where resources went. Reconnects and repeated taps cannot duplicate a payment.
- Town progress should remain viable when some players are absent. Exact contribution scaling and voting rules need playtesting.

The current bridge accepts only three kits, so that proof cannot give every member of a twelve-person group a construction slot. The design experiment compares a once-per-resident, paid 1/1/1, sixty-second maintenance lesson with separately quoted construction or upkeep recognition. It creates no inventory kit/currency and cannot restart/shorten a build. It leaves normal twelve-hour work queueable; a fast full-cost kit exposes a scrap shortage instead. Those are design findings, not implemented transactions or final recipes. Newcomers need useful follow-on work after a project opens, without deleting veterans' restoration.

Longer-term social play includes labelled Town overhead speech plus timestamped journal, then party/participant-authorized private conversations; gifts, meals, bounded buffs and consent-controlled harmless pranks. Private messages never appear in public bubbles. Help/pranks cannot destroy homes or rare items, obstruct recovery, or reward repeated targeting. Real identity, privacy, consent, retention and moderation need their own tested implementation, even for an invited office group.

## A character who belongs somewhere

Owner direction adds appearance/name/backstory selection before waking in a town bed. Reversible defaults: short flavor-only backstories, editable looks and safe rented lodging distinct from the future earned home. Confirm identity/starter awards once, then present the wake scene with skip/reduced-motion alternatives. The current fictional-resident prototype has no character creator or bed scene yet.

Owner direction also adds visible health, weapons/food, optional PvE and death returning to a town bed with temporary corpse recovery. This supersedes earlier no-combat/no-corpse assumptions without putting combat into the next neighborhood task. Homes, décor, skills and account identity remain protected. A thirty-minute window, carried-loot category and owner-only recovery are provisional comparisons; equipped drops, expiry loss, downtime/disconnect grace and final timings are unresolved. No final loss policy is approved by a working arithmetic model.

## First playable neighborhood

The first-neighborhood scope stays deliberately small: rental workshop, one starter-home/visitor path with one expansion/decorating step, café landmark/conversations, one timed bridge stage and one useful restored trail. Keep the current three materials and two ordinary recipes; teach one small personal chain, protect saving/reconnect/ownership and show what finished on a return visit. Physical homes, the teaching candidate, timed opening and trail are not yet accepted runtime features merely because their design exists.

IH2-052 addresses the home and fair first-session/return gap; IH2-053 adds the timed bridge/trail/newcomer work; IH2-050 then proves the neighborhood together. New wood distinctions/tools/recipes, crops/shops, chat, character/lodging creation, food/combat, recovery and a dungeon are later bounded selections. The catalog's `first-woodland` phase includes both the basic trail and later resource depth; it is not permission to put the entire economy into IH2-053.

The playtest should answer:

1. Is a five-minute visit satisfying even without winning a competition?
2. Can a new player understand what to do and contribute on day one?
3. Can several people contribute concurrently without lost resources or duplicated rewards?
4. Do production and project progress settle correctly after time away, a disconnected browser or a restarted server?
5. Can someone navigate, decorate and inspect things comfortably on a narrow phone?
6. Does the small neighborhood feel alive before adding more buildings?

Five/twenty-minute loops are design targets, not current acceptance: the existing first bridge kit takes twelve real hours. A short first visit may learn about a locked trail, queue useful work and return for opening rather than enter it immediately. The paid lesson's estimated introduction excludes character creation and is slower with phone reading; do not turn that model into a universal timing promise.

Do not begin with multiple full cities, player-controlled markets, complex combat, dozens of professions or a large NPC simulation. Preserve meaningful safe-town play while adding optional risk and cooperation a slice at a time.

## Art and systems development

The original illustrated SVG identity has been selected and exercised in the local prototype: warm paper/slate/sage/terracotta, directional resident sheets, distinct tree/building silhouettes and DOM menus. The former CC0 pixel comparison is historical, not an open style vote. The approved teaser is aspirational marketing concept art, not replacement runtime assets or proof of a future city's performance.

Finish one representative family before multiplying content. Every shipped item/buildable needs recognizable icon, placed/preview forms, relevant build/grow states and equipped/action art when applicable. Harvesting, chopping, planting, watering, eating, tool/weapon use, doors and opening celebrations need distinct readable poses tied to confirmed outcomes. Prototype scene props and generic depot rectangles are not a final item library. Validate four-direction compatibility, authored feet, collision/occlusion, reduced motion, night legibility and touch targets; inspect actual final CI images as well as metadata.

Favor modular visual parts, furniture identity that survives recoloring, and a coherent material/pattern system. This extends the user's interest in creative customization; exact prices and progression from the current game do not automatically carry over.

## Technical foundation and gates

Phaser + TypeScript + Vite with pure rules outside the renderer is the selected prototype stack. Local isolated PostgreSQL/HTTP/SSE proves durable commands, signed fictional identity, scoped presence and replay/ownership/restart behavior. This is not a hosted multiplayer release or a claim that fictional fixture accounts satisfy real authentication/privacy.

- Use a separate sequel runtime/data/release boundary. Do not point prototypes at the current game's production player tables.
- Keep valuable resources, ownership and construction server-authoritative. Settle payments and project contributions atomically, with safe retry/reconnect behavior.
- Compute idle production from elapsed time and explicit rules where possible; do not run a perpetual calculation for every object just to represent time passing. Define offline behavior openly.
- Send scoped updates for the location/activity a player is viewing. Avoid refreshing the whole world's lists after every account change.
- Distinguish ephemeral movement/presence from durable progress. Design load tests around several clients and realistic bursts before expanding.
- Make world content data-driven and map/quest editing repeatable. Keep rendering, rules, content and persistence separable.
- Continue browser-first, phone-first validation. Installable PWA and possible packaged clients later are recommendations, not shipped features or a reason to assume an engine rewrite. A wrapper does not solve server load or rendering. A multiplayer library is not a persistence system or a guarantee of scale.

## Still open

Final title/cast and regional detail; final resource/pricing/construction tuning; party/DM retention and moderation; combat balance/disconnect treatment; corpse equipment/loss/window/grace; additional-city property/relocation; and affordable isolated hosting/release targets. Optional market/governance/helper depth can wait. The engine and original art choice are selected prototype decisions; optional combat/death/chat are owner directions; their exact implementation and unresolved loss/privacy policies are not.

Keep the game free if possible: no paid assets, automatic billing, account imports, original-game mutation or public rollout follows from this vision. [IH2-054's design package](design/README.md) is the discoverable design/model/art foundation; the roadmap and exact evidence decide when any slice is actually complete.
