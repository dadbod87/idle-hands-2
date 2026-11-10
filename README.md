# Idle Hands 2 — neighborhood pilot

Private source: [dadbod87/idle-hands-2](https://github.com/dadbod87/idle-hands-2). A separate local game with persistent creative progress, slower progression and a cooperative town. The original live Idle Hands and its real accounts remain separate and unchanged. No public sequel deployment or cloud backend exists.

The accepted illustrated pilot has continuous movement, direct-tap destinations, doorway entry/exit, a field guide, material gathering, crafting, skills, six furnishing types and saved timed jobs. Default mode saves in this browser. Opt-in `/?town=1` uses an isolated local authoritative service: fictional residents cooperate on a bridge, own/upgrade plots, decorate and retain progress through weekly score rollover.

```sh
npm ci --ignore-scripts
npm run dev
```

Open the loopback URL printed by Vite. Keyboard: WASD/arrows, E/Enter to interact, Escape to close. Touch/mouse: tap the floor or use Places. Menus block walking. For shared practice mode and its separate database, follow [local setup](docs/LOCAL_TOWN.md). Ordinary fictional residents begin with no kits; automated tests seed supplies only in isolated fixture databases.

Run the checks listed in [release checklist](docs/RELEASE_CHECKLIST.md), including the database setup for server/browser tests. Current screenshots/metrics go to ignored `test-results/`; committed evidence lives under `docs/evidence/`.

[Planning home](docs/idle-hands-2/README.md) · [Current state](docs/CURRENT_STATE.md) · [Handoff](docs/idle-hands-2/CURRENT_SESSION.md) · [Licenses](licenses/README.md).

IH2-045 adds tree/resident variety, distinct building shapes/materials, ground detail and restrained reduced-motion-aware animation. Open `/?variety-study=1` for the responsive art review. Next is first-neighborhood polish. Real authentication, hosted play, additional housing districts and wider neighborhood content remain later gates. Dependencies are pinned and original art provenance is recorded; no paid assets are required.

Town rhythm adds a48-real-minute cosmetic day, light weather and three authored conversations. Night/rain never change production. The field guide explains the live clock and labelled lighting studies; [the depth plan](docs/idle-hands-2/DEEP_SYSTEMS_PLAN.md) tracks future woods, growing, equipment, homes, town projects and their action animations. Those larger systems are staged, not all implemented.

The [expanded-world design package](docs/idle-hands-2/design/README.md) connects future regions, construction timers, character opening, combat/recovery and social systems to the staged neighborhood build. Its original map, phone storyboards and 45-entry catalog are candidate designs, not playable features. The [development teaser](docs/marketing/idle-hands-2-development-teaser-v2.png) is marketing concept art with recorded provenance. IH2-052 now supplies physical starter-home/visitor interiors, one workroom expansion, paid maintenance teaching and optional return summaries in shared practice. The next runtime slice is the timed bridge and useful trail (IH2-053), after source checks close.
