# A town that slowly comes alive

User direction captured 2026-11-09. Quests, gathering, crafting, skills and restoring discovered areas belong in the design. Detailed NPC hiring, shops, item/town upgrades and rare décor are working proposals, not all part of the next implementation task. Build on the slow persistent progression and housing brief, not a second unrelated game loop.

## Connected loop

Discover a neglected place → take a useful quest → gather materials → improve a relevant skill/tool → craft supplies → restore it together → see the place change → unlock a resident, service, recipe or route → use new possibilities at home and in the next town project.

Example working chain: the bridge committee needs supplies; restoring the bridge opens an overgrown garden trail. Clearing the trail yields salvage and seeds, reveals an abandoned greenhouse, and starts a later town quest. A restored greenhouse attracts a groundskeeper who offers recipes, plant supplies and a small shop. Personal quests teach useful contributions along the way. The greenhouse is later expansion; the first playable neighborhood still proves one bridge/project and short trail.

Depth should come from connected choices and visible consequences, not filling a checklist with separate currencies. Avoid unlocking a dozen systems on the first visit.

## Roles of the systems

| System | Purpose | Initial boundary / later growth |
|---|---|---|
| Personal quests | Teach verbs, tell authored stories and give returning players a clear next goal. | One short onboarding chain: inspect → gather → craft → place → contribute. Later resident stories and optional goals. |
| Town/group quests | Coordinate useful contributions and permanently improve shared places. | The bridge is the first shared quest. Later repairs, businesses and district restoration; no requirement that one specific absent player be online. |
| Gathering | Give exploration useful discoveries and materials with readable provenance. | Small renewable sources, storage/carry limits and visible recovery rules; no unlimited click-to-money loop or pressure to stay logged in. |
| Crafting | Convert gathered materials into useful project supplies, tools and decoration. | Two starter recipes; gradual branches and production choices. Keep the first tutorial fast, later stages paced over days/weeks. |
| Skills | Provide enduring personal identity and new options. | Start with gathering and making if the simulation proves both meaningful. Prefer tool/recipe/access unlocks and bounded efficiencies; no runaway stacking multipliers. Other specialties come later. |
| Item upgrades | Make favored tools/furnishings worth keeping. | Clear materials and benefits, item identity/finishes retained, no random destruction or hidden downgrade. Costs/rules still to be simulated. |
| Town upgrades | Make shared work visibly change the map and available activities. | Stable project stages, opened routes and resident/service access. Town changes and housing persist across weekly score resets. |
| Rare décor | Make ordinary play occasionally memorable and give homes stories. | Cosmetic finds tied to places/activities, with provenance. No essential quest/plot access locked behind pure luck; plan an earned fallback so bad luck is not permanent exclusion. No paid loot boxes. |
| NPC residents/helpers | Turn restored places into new conversations, services and production options. | Authored residents appear after milestones; a later helper can be hired/unlocked for a specific bounded job. Shop buy/sell and helper prices are future economy design, not a reason to add a player market immediately. |

## Living-world presentation

A repaired place changes silhouette, signage, activity, dialogue and available interactions. Show transitions such as overgrown → cleared → repaired → inhabited. Residents refer to completed projects and use a few predictable routines. The town should remember what its players did; it need not run a costly full simulation for every offscreen NPC. Evaluate schedule/stage changes on entry and relevant server events, animate locally, and scope updates to the area.

Keep humor readable and contextual: the bridge committee eventually completes its first action item; the greenhouse's “temporary closure” sign is carefully framed indoors after reopening. Essential goals, costs and timers remain plain under the joke. No runtime AI service is required for authored dialogue.

## Progress and authority rules to prove

- Personal quest state, skills, tool upgrades, décor ownership, housing and restoration are durable. Weekly competition writes separate score/objective records.
- Quest progress comes from validated completed actions, not client claims, proximity alone or repeated menu clicks. Commands/quest rewards have stable IDs and idempotent receipts; retries, reconnects and two clients cannot duplicate rewards.
- Shared progress counts committed contributions exactly once. A project finishing concurrently charges/credits correctly, and newcomers can still contribute to follow-on work. Do not invent other players' participation in solo fixtures.
- Reward claims, inventory changes, XP and project updates are transactional when related. Content/quest versions need migration rules so a changed requirement does not erase legitimate progress.
- Rare-drop outcomes are server-owned and logged in the eventual backend; active spam/reconnect cannot reroll the same action. Cosmetic discovery must not become the sole route to a required progression item.
- Visitors can inspect a house; only authorized owners edit or spend. Helpers must have bounded jobs/storage/output, not become infinite passive compound-income machines.

## Staging in the existing roadmap

IH2-020: representative visuals include a before/after restoration example and readable quest/interaction affordances, without bulk art.

IH2-030: a small personal quest chain, gathering/making skill progression and progression-cohort simulation sit on the existing workshop loop. Validate six weeks of idle/regular/active schedules and meaningful choices before broad recipe trees.

IH2-040: make personal/shared quest progress and rewards authoritative; prove duplicate/replay/concurrency and persistent housing/project state with isolated two-player fixtures.

IH2-050: one coherent bridge/trail story, a few authored NPC reactions and a modest cosmetic discovery path alongside starter housing. More residents, helpers, shops and restoration zones are later task-sized expansions after beta evidence, not hidden additions to the engine pilot.

Current local preview has movement and inspectable placeholder locations only. None of these quest, skill, NPC-helper or economy systems is implemented yet.
