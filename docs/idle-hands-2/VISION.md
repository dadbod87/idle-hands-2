# Vision and first playable neighborhood

Status: working design brief, 2026-11-09. Confirmed decisions are maintained in the [planning home](README.md); the examples below are proposals.

## The promise

A ridiculous company town you can make your own and help build together. Keep Idle Hands' deadpan workplace humor while giving people meaningful choices, visible creativity and reasons to explore. Small visits should be satisfying; longer sessions should offer discoveries rather than demand constant clicking.

Reference points: Idle Hands' social humor and idle progression, FarmVille-like personal production/building, and Graveyard Keeper's mixture of management, crafting, quests and exploration. These describe desired qualities, not a plan to copy another game's content or assets. See the [official Graveyard Keeper description](https://store.steampowered.com/app/599140/Graveyard_Keeper/) for that reference.

## Three connected layers

| Layer | Possible activities | Connection to the rest of the game |
|---|---|---|
| Your place | Furnish a home/workshop, choose a specialty, arrange production and hire help. | Produce something useful, express personal style and prepare for exploration. |
| Our town | Restore businesses, contribute resources, choose public projects and trade. | Visible construction unlocks services, stories or routes for everyone. |
| Beyond town | Explore a neglected industrial park, forest trail or abandoned company facility; meet characters and find materials. | Discoveries enable recipes, personal improvements and shared projects. |

Example loop: explore → find a useful material/recipe → improve your workshop → produce supplies → contribute to a shared bridge → open a new area. The bridge may still require a ribbon-cutting committee. This example is not a fixed resource economy or quest specification.

## Persistent world, renewable competition

The approved principle is that the town and creative work persist. Personal decorations, earned appearance choices and completed community construction should remain meaningful across weekly competitions. A score reset must not become a hidden world wipe.

Before implementing seasons, write a field-by-field persistence contract. Weekly score, weekly objectives, consumable stock, land ownership, building upgrades, discoveries and rewards need explicit treatment. D-002/D-003 protect the town and creative work; they do not settle every currency or inventory rule. Avoid ambiguous promises such as “permanent” when a feature actually expires.

## Shared impact without one player owning everything

Proposed guardrails to test:

- New players can make a visible, worthwhile contribution without matching veteran wealth.
- Shared construction is cooperative; wealth alone does not buy every public decision.
- Personal-property editing and public-project decisions use distinct permissions.
- One person cannot dismantle everyone else's work; public changes need a clear approval and recovery path.
- Contribution receipts and project state explain where resources went. Reconnects and repeated taps cannot duplicate a payment.
- Town progress should remain viable when some players are absent. Exact contribution scaling and voting rules need playtesting.

## First playable neighborhood

A deliberately small proposal: one personal property per player, a few useful businesses, one shared construction project and one exploration area. Include movement, readable interactions, a resource loop, saving, reconnecting, decoration and one short character story.

The playtest should answer:

1. Is a five-minute visit satisfying even without winning a competition?
2. Can a new player understand what to do and contribute on day one?
3. Can several people contribute concurrently without lost resources or duplicated rewards?
4. Do production and project progress settle correctly after time away, a disconnected browser or a restarted server?
5. Can someone navigate, decorate and inspect things comfortably on a narrow phone?
6. Does the small neighborhood feel alive before adding more buildings?

Do not begin with a whole region, player-controlled markets, complex combat, dozens of professions or a large NPC simulation. Each is an optional later direction, not a launch requirement.

## Art and systems development

Establish the visual identity early: camera perspective, grid/scale, silhouettes, palette, line or pixel treatment, animation directions and interface hierarchy. Compare the same small scene in each concept so the choice is about style and readability.

Finish a representative set first: one player with variations, one NPC, one building exterior/interior, several props, terrain transitions, interaction feedback and a phone interface. Build a rough playable loop alongside the design. Validate collision footprints, occlusion, animation and touch targets before commissioning or generating the complete library.

Favor modular visual parts, furniture identity that survives recoloring, and a coherent material/pattern system. This extends the user's interest in creative customization; exact prices and progression from the current game do not automatically carry over.

## Technical principles to evaluate

These guide the future architecture; they do not select an engine or host.

- Use a separate sequel runtime/data/release boundary. Do not point prototypes at the current game's production player tables.
- Keep valuable resources, ownership and construction server-authoritative. Settle payments and project contributions atomically, with safe retry/reconnect behavior.
- Compute idle production from elapsed time and explicit rules where possible; do not run a perpetual calculation for every object just to represent time passing. Define offline behavior openly.
- Send scoped updates for the location/activity a player is viewing. Avoid refreshing the whole world's lists after every account change.
- Distinguish ephemeral movement/presence from durable progress. Design load tests around several clients and realistic bursts before expanding.
- Make world content data-driven and map/quest editing repeatable. Keep rendering, rules, content and persistence separable.
- Evaluate browser delivery, phone controls, save safety, asset loading and hosting costs in the small prototype. A multiplayer library is not a persistence system or a guarantee of scale.

## Still open

Final name; modern versus fantastical setting; camera and art style; browser-only versus native delivery; audience size; real-time versus asynchronous activities; trading; combat; resource/currency design; land allocation; governance; NPC cast; account sharing/imports; monetization; engine, database, hosting and budget. Resolve these through specific decisions and small tests, not by treating the concept examples as commitments.
