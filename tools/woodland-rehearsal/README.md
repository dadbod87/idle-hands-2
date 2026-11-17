# A little wayfinding — standalone interaction rehearsal

[Resume handoff: home candidate, verified source and remaining gate](../../docs/idle-hands-2/handoffs/2026-11-17-home-and-woodland.md).

## Current revision — hands-on repair, November 17

V3 replaces the correct-tool instant repair with a small spatial setup: position a brace under the load marker or line a rope hook up with the plank eye, then explicitly set the repair. The two conditions use different marker positions. The accepted band spans20points on a0–100diagram scale; it is an abstract interaction, not simulated physics or a real-world tool instruction. There is no reflex deadline, resource cost, failure penalty or reward. Leaving and the tool-free detour remain available.

Use the native slider, keyboard arrows or44pxnudge buttons. The triangle is labelled as the brace/hook position; the dashed box is labelled LOAD/EYE. The repair button stays disabled while misaligned. Adjustments update the existing slider instead of replacing it during input, preserving keyboard focus and continuous dragging. Consecutive adjustment entries coalesce in the temporary route history. All state still resets on reload.

The benefit is a visible action between choosing equipment and seeing the crossing reopen. It tests manipulation alongside route planning; it does not establish a satisfying three-to-five-minute session. Remaining opportunities are a less abstract world interaction, meaningful second-visit decisions and an observed human trial. Different target positions alone are not a claim of deep replay variety.

Nine pure model tests passed, including the prior detours/repairs/refusals/return coverage plus invalid/remote positions, broad tolerance boundaries, misaligned refusal and safe unfinished exit after setup. Three fresh Chromium layouts each completed three walks: wrong-tool detour, rope repair by keyboard, and brace repair by pointer/touch with nudges. They preserve the earlier route/status/isolation checks and verify focus retention, disabled misaligned repair and continuous desktop dragging without replacing the input. Phone controls are touch-emulated, not physical-device tested. Aligned phone/short captures may require scrolling to the repair button; actual button clicks complete successfully in those checks.

Terra6.1 reviewed four actual rehearsal captures and found no sampled blocking issue. Its small labelling recommendation was applied: the triangle is explicitly named in the control label and the target says LOAD/EYE. This remains review of a standalone rehearsal, not the saved game, final terrain, real physics or human enjoyment. Design/plan/forty pinned files, JavaScript syntax and whitespace checks passed. No registered game source, migration, economy, inventory, equipment ownership or task acceptance changes.

Current four-file payload is **16,495raw bytes /6,932separately gzipped bytes**, using the deterministic file-byte method below. [V3 browser observations](../../docs/evidence/woodland-rehearsal-2026-11-16/v3/browser.json), [rope aligned](../../docs/evidence/woodland-rehearsal-2026-11-16/v3/phone-rope-aligned.png), [rope misaligned](../../docs/evidence/woodland-rehearsal-2026-11-16/v3/phone-rope-misaligned.png), [brace setup](../../docs/evidence/woodland-rehearsal-2026-11-16/v3/desktop-brace-aligned.png). The model/browser scripts reproduce this revision; historical V1/V2 numbers below belong to their original versions. No full game regression/build/hosted CI, merge or saved-preview acceptance is claimed here.

## V2 — readable routes, November 17

V2 addresses the initial phone review: narrow and short layouts use readable text routes in place of the tiny diagram labels. Each branch states whether it is open or needs a brace/rope; after restoring the sign, paths read homeward. The current stop shows **Borrowed: none / brace / rope**, including away from the shed. Finishing or starting another walk clears the borrowed-tool display. Desktop retains the original diagram. No route rules or game systems change.

The benefit is deciding where to go and whether to exchange a tool without decoding miniature labels or remembering a previous menu. Both walk and early-return buttons remain in the initial360×640view. This is a small useful equipment-slot principle to carry into the UO-inspired design: show what is held and its relevance to the current action, without making a large equipment window necessary.

Three fresh Chromium two-walk cases passed at1440×900,360×640touch emulation and844×390/200%text. New assertions check branch status in both variants, repaired-branch status, homeward text, borrowed-tool reset/away display, the first phone action's viewport bounds, no overflow after every exercised action and44pxminimum exercised buttons. Existing wrong-tool/detour/keyboard/early-return/reload/storage/request checks remain intact. The seven-test pure model is unchanged; its earlier passing result is not presented as a new execution. Design/plan/forty pinned files, JS syntax and whitespace checks passed. One browser launch before installing the pinned browser did not execute the checks and is not a passing result.

[V2 browser observations](../../docs/evidence/woodland-rehearsal-2026-11-16/v2/browser.json), [phone routes](../../docs/evidence/woodland-rehearsal-2026-11-16/v2/phone-arrival.png), [borrowed rope at the blocked ridge](../../docs/evidence/woodland-rehearsal-2026-11-16/v2/phone-wrong-tool.png). Original V1 evidence below is retained as history. Terra6.1 confirmed the text routes resolve the tiny-label concern and the borrowed-tool/available-action states are clear. Its final wording finding was corrected from “either open route” to “an open route”; the corrected returning phone capture was rechecked. Current four-file payload:12,161raw bytes /5,522separately gzipped bytes, measured deterministically as below. V2 remains a standalone design rehearsal; saved-preview, source acceptance, physical-device, human-playtest and game-integration gates remain outstanding.

Design experiment, November 16, 2026, over audit checkpoint `a4f5ed8`. This is **not registered game functionality**, final terrain, continuous character movement, multiplayer or a release. PR49 and its saved-preview acceptance remain unchanged. The rehearsal imports no game modules, reads no saves, has no service/API, uses no inventory and awards nothing. Reload deliberately starts a new fictional walk. Original SVG diagram shapes and system fonts only; no external assets or proprietary UO content.

## Try it locally

From the repository root:

```sh
python3 -m http.server 4194 --bind 127.0.0.1 --directory tools/woodland-rehearsal
```

Open `http://127.0.0.1:4194/`. All controls are real buttons and support keyboard activation. Use the connected-stop buttons below the diagram or text routes; the SVG is a visual guide, not a pointer navigation surface. No installation, login or game-data transfer is needed for the rehearsal itself.

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

The original V1 four static rehearsal files total **11,081 raw bytes / 5,219 separately gzipped bytes**, measured from their file bytes with deterministic gzip; this excludes HTTP headers, browser cache and the rest of the game. This is not a frame-rate or real-device performance claim.

[Browser observations](../../docs/evidence/woodland-rehearsal-2026-11-16/browser.json), [phone arrival](../../docs/evidence/woodland-rehearsal-2026-11-16/phone-arrival.png), [restored desktop sign](../../docs/evidence/woodland-rehearsal-2026-11-16/desktop-restored.png). Browser outputs default to ignored `test-results/woodland-rehearsal`; optional first argument selects an output directory.

## Next bounded step

The [proposed integration contract](../../docs/idle-hands-2/design/OUTING_INTEGRATION_CONTRACT.md) records current resource/skill constraints, the selected visible-outcome/private-journal first proof, retry/ownership requirements and separate future cooperation/reward gates. It is design only and does not register an outing or close the home-update gate.

Phone route orientation is now revised. Next, test whether another visit changes a player's decision without relying on text quizzes. Keep this separate from the game until the existing home-update gate is satisfied and a bounded integration task is selected. Before durable rewards, specify ownership, capacity, replay, disconnect/reload, solo/cooperative contributions and an explicit useful connection to current crafting/garden/home play. Do not infer a new wallet, resource entitlement, skill multiplier or permanent reward from this diagram.

The current test is enough to review the interaction sketch; it is not enough to conclude coworkers will choose to replay it. A short observed human trial should measure understood choices, confusion, voluntary second visits and whether the repair feels worthwhile.
