# Inkwood inspection clearing

A standalone design rehearsal for the first optional woodland encounter. The Bramble Inspector and its municipal stamp belong to the illustrated company-town setting. The path outside the sign is safe. Enter explicitly, read the wind-up, guard, swing, eat one sample snack or retreat. Health is shown as both a number and a bar, and the wound-up pose has a visible text cue. The text says what Guard and Retreat do before either choice.

This is a turn-by-turn rehearsal so players can inspect the cues without timing pressure. One optional area and one type of enemy are enough to learn whether the choice is fun. The proposed first test has one exit directly outside the Inspector's reach and leaves all town, home and construction progress available without combat. A future live prototype would add low-speed approach and retreat using the game's normal continuous movement. No live damage, market price, wearable item, animation-collision rule, encounter rewards, housing requirement or project task is proposed by the demo.

The model uses 10 resident health, 15 Inspector health, 3 damage from a swing, 5 from a full strike, 1 through guard and one snack for up to 4 health. Five intentional swings with guarded turns win with 6 health. Four swings without guarding wake the resident at the illustrated inn. The values are provisional and test the relative choice, rather than balance a production fight.

The bed points back to a single dropped sample pouch. The model accepts pickup through a provisional 30-minute deadline. The optional late-return control advances only demo time and displays the unresolved choice while the pouch remains drawn. No player or account state is read or written. Protected equipment, homes and crafting progression are outside scope. The actual multiplayer rules still need trusted time, an exact expiry choice, capacity, a safe reachable return and atomic replay-safe death/loot receipts. The model tests one rehearsal and one pouch, leaving repeated deaths, server-restart behavior, disconnect protection and party recovery to the authoritative slice.

## Local review

Four Node cases exercise explicit entry, free retreat, guarded versus exposed swing, bounded healing, one recovery, the exact deadline and one millisecond past it. Chromium and WebKit each exercised the same native actions at 1440 × 900, 320 × 640 touch and 844 × 390 touch at 200% text. Supplied illustrations rendered. The short layout was tightened after the first check placed Retreat below the fold. Terra 6.1 checked the art and actions. Its suggestion to explain defense/retreat before acting is reflected in the warning copy and verified in the final layouts.

This sample uses only fictional in-memory state. A reload returns to the entrance. The test intercepts no requests and the optional late-return control visibly moves demo time. These are emulated viewports, with no physical device, game integration or database coverage.

Open [the standalone rehearsal](study/index.html) on a static loopback server. Reproduce from the repository root with a free port 4352:

```sh
node --test docs/evidence/IH2-215/rehearsal.test.mjs
python3 -m http.server 4352 --bind 127.0.0.1 --directory docs/evidence/IH2-215/study
# In another shell, with both installed Playwright browsers.
node docs/evidence/IH2-215/browser-check.mjs
```

All five SVGs are original code-authored illustration made for this rehearsal, without outside media and without runtime registration. Their fingerprints are included alongside the final layout results.
