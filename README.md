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

IH2-045 adds tree/resident variety, distinct building shapes/materials, ground detail and restrained reduced-motion-aware animation. Open `/?variety-study=1` for the responsive art review. Next is first-neighborhood polish. Real authentication, hosted play, physical house lots and wider neighborhood content remain later gates. Dependencies are pinned and original art provenance is recorded; no paid assets are required.
