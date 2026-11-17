# A little wayfinding — standalone interaction rehearsal

Design experiment, November 16, 2026, over audit checkpoint `a4f5ed8`. This is **not registered game functionality**, final terrain, continuous character movement, multiplayer or a release. PR49 and its saved-preview acceptance remain unchanged. The rehearsal imports no game modules, reads no saves, has no service/API, uses no inventory and awards nothing. Reload deliberately starts a new fictional walk. Original SVG diagram shapes and system fonts only; no external assets or proprietary UO content.

## Try it locally

From the repository root:

```sh
python3 -m http.server 4194 --bind 127.0.0.1 --directory tools/woodland-rehearsal
```

Open `http://127.0.0.1:4194/`. All controls are real buttons and support keyboard activation. Use the connected-stop buttons below the map; the small SVG diagram is a visual guide, not a pointer navigation surface. No installation, login or game-data transfer is needed for the rehearsal itself.

Restore the lookout sign, then return to the town gate. Borrow one tool at the shed or take the open detour. A wrong choice never traps you: exchange the tool for free, switch routes, or return unfinished. The second walk changes the weather condition and which crossing is blocked. The restored sign gains a homeward arrow; a repaired crossing visibly changes from a broken red path to an open path. These changes last only for this rehearsal.

## What this tests

The busy-player audit found a quiet established state despite several independent production lanes. This sample tests a route choice and visible repair result that can be explored separately from those lanes. It contains no queue prerequisite or full-bag check, so it cannot consume the last starter material or block a busy crafter. That structural separation is not an integrated busy-save test.

Two variants compare a blocked ridge shortcut needing a brace with a creek plank needing a rope. An open branch permits solo completion without borrowing. A player may prefer the detour, repair the obstruction for its visible result, or leave early. This is a route-planning sketch, not yet a three-to-five-minute outing. Automated walks finish in seconds; there is no timer inserted to manufacture the target duration. The second condition changes the route/tool choice but does not establish sufficient replay variety.

Player benefit: an immediate visible world response and a clear way home alongside slow work. Friction removed: no mandatory tool cost, attendance, random item loss or hidden inventory prerequisite. Remaining opportunity: more satisfying hands-on interaction, route variety, useful rewards under existing limits and human playtesting. Cooperation still needs an actual complementary-role/authority slice; no synthetic second resident claims to prove teamwork.

## Verification

```sh
node --test tools/woodland-rehearsal/model.test.mjs
# With the rehearsal server running and pinned Playwright browsers installed:
node tools/woodland-rehearsal/browser-check.mjs
```

- Seven pure tests passed: both solo detours, both correct-tool repairs, blocked/remote/unknown-action refusal without mutation, and safe unfinished return. Finished walks cannot be replayed for another outcome; a new walk starts independently.
- Three actual Chromium layouts passed: 1440×900, 360×640 touch emulation, 844×390 with 200% text. Each exercises the wrong-tool refusal and detour, second-variant repair, keyboard tool selection, return, new-walk reset and reload. Checks recorded no page errors, failed/external requests, browser-storage writes or horizontal overflow; visible buttons measure at least44CSSpx high.
- The initial phone composition put the first route action below the initial viewport. Compacting the diagram brought walk/early-return actions into the360×640arrival view; the final browser pass covers that version. Initial browser launches preceded browser installation and did not run the audit; they are not passing results.
- Terra6.1 independently reviewed four final rehearsal captures. No sampled blocking visual issue; the tiny phone diagram labels need a compact textual route summary or another treatment. Connected-stop button labels remain readable. Short-height captures are scrolled action views, not proof that all controls fit the initial viewport.
- Design/plan validation (including ten tracker tests), forty pinned game-skill files, JavaScript syntax and whitespace checks passed. No registered game source, dependency, migration, asset manifest or task acceptance status changed. No full game suite, build, hosted CI, merge, physical-device test or saved-preview acceptance is claimed by this checkpoint.

Four static rehearsal files total **11,081 raw bytes / 5,219 separately gzipped bytes**, measured from their file bytes with deterministic gzip; this excludes HTTP headers, browser cache and the rest of the game. This is not a frame-rate or real-device performance claim.

[Browser observations](../../docs/evidence/woodland-rehearsal-2026-11-16/browser.json), [phone arrival](../../docs/evidence/woodland-rehearsal-2026-11-16/phone-arrival.png), [restored desktop sign](../../docs/evidence/woodland-rehearsal-2026-11-16/desktop-restored.png). Browser outputs default to ignored `test-results/woodland-rehearsal`; optional first argument selects an output directory.

## Next bounded step

Improve phone route orientation and test whether another visit changes a player's decision without relying on text quizzes. Keep this separate from the game until the existing home-update gate is satisfied and a bounded integration task is selected. Before durable rewards, specify ownership, capacity, replay, disconnect/reload, solo/cooperative contributions and an explicit useful connection to current crafting/garden/home play. Do not infer a new wallet, resource entitlement, skill multiplier or permanent reward from this diagram.

The current test is enough to review the interaction sketch; it is not enough to conclude coworkers will choose to replay it. A short observed human trial should measure understood choices, confusion, voluntary second visits and whether the repair feels worthwhile.
