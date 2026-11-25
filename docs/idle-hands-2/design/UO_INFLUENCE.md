# UO influence — a small world worth returning to

Recorded November 16, 2026, from Nick's current conversation. Design input, not a feature release, asset license, backend replacement or settled economy.

## Direct owner input

Nick loved Ultima Online and is considering its old graphics/systems for a private office game: a much smaller map with a few towns, exploration, team building and a mixture of cooperative survival/building, gathering/trading and short adventures. He is concerned the present sequel may bore people and asks whether UO-style backpack, skills and “paperwork” would help or hold it back. “Paperdoll” is the working interpretation of that last word, not a confirmed correction. He authorized continuing the sequel and recording these ideas.

## Product judgment and proposed adaptations

Keep the current Phaser/TypeScript/authoritative-command foundation. Borrow useful design principles before considering a UO emulator or original graphics. No UO media or code is imported by this note. Private office use is not treated as permission to redistribute proprietary assets. Original/licensed compatible art remains the default.

| System | Useful adaptation | Friction to avoid | Implementation boundary |
|---|---|---|---|
| Paperdoll / character | A readable own-character preview, explicit equipment slots, recognizable earned clothes/tools and optional title. Other players see chosen appearance. | Nineteen tiny equipment targets, hidden item layers, windows covering the phone, showing private inventory on inspect. | Design only. Existing bound saw is not a general wardrobe. Use tap/select/equip with keyboard equivalents, explicit unequip, and server-owned inventory/equipment conservation. |
| Backpack | Illustrated belongings with clear carried/available/placed/equipped counts and quick contextual actions; optional flat categories as the catalog grows. | Mandatory free-position drag sorting, piles hiding items, deeply nested bags, item-count/weight rules without a meaningful choice. | Existing Bag stays authoritative only as a projection. No new container ledger or capacity here. A physical chest may later be a view of storage, never duplicated stock. |
| Learn-by-doing skills | Practice through varied useful actions; milestones unlock tools, recipes, appearance or choices. Solo play stays worthwhile and specialists can help. | Macro-style repetition, success rolls wasting scarce inputs, opaque skill decay, compulsory skill swapping or a universal production multiplier. | Preserve existing making/growing/carpentry values. Design a small reversible specialty experiment before new skills or caps; no new XP by this note. |
| Crafting and trade | Resource provenance, useful items, a few understandable ingredient chains, eventual direct gifts/trade that connect specialists. | Every activity bottlenecking on the same twelve-hour job; huge catalogs with no uses; busywork inventory movement. | Gifts/trade need atomic two-party ownership and identity work. Current NPC handovers are not player trade. |
| Housing | Visible personal identity, displays with a story, pleasant visits and permanent creative work. | Cosmetic variants substituting for activity; display implying extra beds/queues; visitors inspecting private stock. | IH2-117 gives one representative family identity and public display descriptions using existing owned allocations. No gifts, guestbook, new furnishings or social reward. |
| Exploration / small dungeons | Short optional outings with changing discoveries, clear routes home and useful or displayable rewards that feed existing town life. | Empty larger maps, required simultaneous attendance, permanent home/skill losses, missing a meeting as a progression gate. | Future slice. One town + useful woodland + one bounded cooperative outing before another full settlement. Combat/recovery policies remain open. |
| Office social play | Asynchronous contributions, useful newcomer roles, group achievements and bounded opt-in mischief. | Repeat-target harassment, destroying days of progress, one person claiming every contribution slot, mandatory office-wide schedules. | Future verified identity/audience/consent and transactional help gates remain. NPCs and synthetic presence do not prove human social enjoyment. |

These are proposed choices for review, not claims about every historical UO edition. Official reference: https://uo.com/wiki/ultima-online-wiki/technical/classic-client-user-guide/the-classic-client-paperdoll/ (paperdoll menus/skills) and the official player guide at https://web.cdn.eamythic.com/sites/uoherald.com/uoimages/Player_Guide_Part1.pdf (paperdoll/backpack). Modern documentation is not proof of exact 1997 behavior.

## Active play alongside slow progression

A four-hour refill or twelve-hour craft can support a workday game only when the wait leaves actual choices. Slow acquisition of a home is separate from how many interesting things a resident can do today. Evaluate fresh, busy, depleted, returning and late-joining players; require a useful action independent of the busy bench and depleted ordinary depots. Avoid solving every gap with another timer or tutorial checklist.

Candidate connected outing: grow food → a neighbor prepares supplies → a short pump-station objective → bring home a recognizable keepsake/blueprint → asynchronous contributions restore a useful route. This is a design example, not accepted combat, edible-food, party, blueprint or restoration content.

Next after IH2-117: audit/reproduce the saturated player's actual options, then select one repeatable woodland activity with a visible use/payoff. Do not automatically accelerate existing jobs, create infinite resource income, add all systems at once or promise retention. An invited playtest must distinguish agent-tested functionality from whether coworkers voluntarily return, cooperate and share stories.

## Town layouts and small references, November 25

Keep the useful spatial ideas and draw original towns. The [official Britain guide](https://uo.com/wiki/ultima-online-wiki/world/cities-and-towns/cities-and-towns-britain/) describes services and shared gathering spots close enough for visits to cross. The [official travel guide](https://uo.com/wiki/ultima-online-wiki/beginning-the-adventure/movement-and-travel/) describes marking a place for a later return. These are design references across the game's history. They do not establish a specific 1997 layout or ruleset.

- Put a regular service, a recognizable meeting spot and a sign toward home along the same traveled route. Let one walk work for errands, neighbor visits and a chance encounter.
- Put wilderness danger beyond a recognizable threshold, with sight lines and a safe way around it. In a dungeon, teach by showing footwork and consequences on the floor. Keep hints short and the controls close.
- Hidden Valley uses a wooded approach, terrace houses, an orchard and a cider court around a common green. Give the town an optional loop past the gardens and back to the green before extending the road. The housing lane and road geometry are original.
- A small carved return stone now sits at the foot of the Mossbank exit signs. It points to the existing road. It is an original visual nod to marked travel stones, and walking remains the way home. Future regions can share this wayfinding motif. Prefer small things that an old player can recognize without prompting a lore lesson.

Use original art, layout geometry, dialogue, audio and names. Keep the present [sound decision](../DECISIONS.md) for legacy recordings.

## Use-based weapon training and visible equipment

Nick wants passive training through normal use, a slower climb at higher skill and a hard cap. A good hit teaches the active weapon. Armor, hats, clothing and the held weapon have distinct jobs and independent slots. A tailor or smith should eventually make usable and visually distinctive gear that other players can wear. An item keeps its dye and selected style when packed. Dye, style and surface finish are cosmetic. Visible layers should never disclose what somebody carries.

Classic UO's documented system rewards successful use, with relevant difficulty important to its guaranteed gains. Outlands retains practical training and adds separate weapon progression with weapon-linked stances. We can learn from both without adding an extra progression book or asking players to reroll their builds. [UO skill gain](https://uo.com/wiki/ultima-online-wiki/technical/skill-gain-systems/) · [Outlands practical skills](https://wiki.uooutlands.com/Skills_%26_Stats) · [Outlands weapon progression](https://wiki.uooutlands.com/Arcane_Codex). UO Forever gives more training credit in dungeons. Idle Hands can use encounter ceilings and stronger challenges to make new regions worth learning. [UO Forever skill gain](https://uoforever.com/wiki/index.php/Skill_Gain)

The Pumpworks prototype uses predictable practice marks for accepted hits and rewards a timed counter with two marks. Marks are stored with the field encounter result. Dry-side practice, misses, shelled attacks, waiting, and wearing the item alone leave progress unchanged. Progress is per weapon family and survives a retreat, defeat and reload. Rank 2 adds counter damage. Rank 3 gives a small margin at the edge of a clean hit. Direct input, movement, spacing and enemy openings still decide whether the attack connects. Keeping useful progress readable in Bag gives players room to focus on combat. The Pumpworks stops teaching at rank 4 of a provisional ten. Future regions can add challenges for higher ranks. Calibration needs real players and varied encounters.

The local shared Pumpworks candidate confirms contact and training from the server's clock, equipped weapon and confirmed positions. Its first smithing and tailoring ranks come from collecting finished work at the proper station. A different follow-up technique teaches Rank 2 and unlocks a visible finish. Dyeing, packing and reusing the finish preserve rank. Keep later training tied to varied useful work, and let ease of finding and making ingredients steer the pace. Higher ranks, swords, resident trades and furniture specialties remain future work. Review the [shared combat and trade handoff](../handoffs/2026-11-25-shared-combat-and-trades.md).
