# Idle Hands 2 — neighborhood pilot

Private source: [dadbod87/idle-hands-2](https://github.com/dadbod87/idle-hands-2). No hosted game/backend yet.

A separate local prototype for a slower, persistent, cooperative company town. Humor, deep systems, teamwork and eventually personal home ownership/upgrades/decoration drive the design. Pilot feedback through IH2-014 is implemented locally, including continuous movement, door-click entry and doorway exit placement. Independent CI is established. The original illustrated visual kit is implemented locally; /?art-study=1 compares the styles. The book button opens a field guide. Next is a phone-friendly workshop loop after visual-kit checks/merge. No live accounts, currency, server or deployment.

```sh
npm ci --ignore-scripts
npm run dev
```

Open the loopback URL printed by Vite. Keyboard: WASD/arrows, E/Enter to interact, Escape to close. Touch/mouse: tap the floor or use Places to walk to a destination. Menus block walking.

Browser runs write current screenshots/metrics to ignored `test-results/browser/` (or `QA_EVIDENCE_DIR`), with traces/reports on failure. Committed task evidence stays under docs/evidence.

Run `npm run test`, `npm run build`, `npm run test:browser`, `npm run check:plan`. [Planning home](docs/idle-hands-2/README.md), [current source state](docs/CURRENT_STATE.md), [latest handoff](docs/idle-hands-2/CURRENT_SESSION.md).

All content is original code-drawn placeholder art; the final visual kit is a later task. External dependencies are exact-pinned; see licenses. The private GitHub repository is the sequel source authority; fetch main and current handoff before work. Existing Idle Hands remains separate at https://idlehands.thepatrongrp.com/.

Current local slice: direct-tap material depots, crafting bench, orientation journal, six furnishing types, placement and saved timed jobs. See [tomorrow’s handoff](docs/idle-hands-2/handoffs/2026-11-09-workshop-loop.md). Persistent shared town/housing is the next proof, not implemented server functionality.
