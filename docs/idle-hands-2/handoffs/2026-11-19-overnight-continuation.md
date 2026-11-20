# Idle Hands 2 overnight continuation · 2026-11-19

Last inspected at 2026-11-19 17:35 PST. The separate sequel repository was at `efbb363bd3a8d23ef4e30a5a9cbdc69718fc48c6`. Saved previews and databases stayed stopped. Standard public Ubuntu CI used disposable PostgreSQL with fictional residents. Local native Chromium tests used disposable static servers. Mobile layouts were emulated.

## Verified on exact main

For each row, the exact PR and main runs passed the domain gate, all three browser shards and their aggregate. The emitted client files matched byte for byte between PR and main.

| Player-facing change | PR | Main | Passed cases | Required runs |
|---|---|---|---|---|
| Jun’s orchard directions | [#75](https://github.com/dadbod87/idle-hands-2/pull/75) | `c9353926a5f6` | 575 domain, 225 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44620526400) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44629304006) |
| Optional original orchard score | [#76](https://github.com/dadbod87/idle-hands-2/pull/76) | `d422168f896a` | 577 domain, 227 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44631947483) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44634075817) |
| Walkable boarding house | [#77](https://github.com/dadbod87/idle-hands-2/pull/77) | `5d0e3b76b304` | 581 domain, 229 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44636988009) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44639583360) |
| Fewer invisible rain updates | [#78](https://github.com/dadbod87/idle-hands-2/pull/78) | `2166d2a3cdaf` | 581 domain, 230 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44641881230) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44644093361) |
| Optional arrival stories | [#79](https://github.com/dadbod87/idle-hands-2/pull/79) | `6a2b3f1abaaf` | 583 domain, 231 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44646691801) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44648832528) |

## Saved work in dependency order

| Work | Branch | Status |
|---|---|---|
| Brief light after a confirmed doorway | `feat/confirmed-door-light` at `13272a26dcdc` | [PR #80](https://github.com/dadbod87/idle-hands-2/pull/80) · merged · [in_progress](https://github.com/dadbod87/idle-hands-2/actions/runs/44653713483) · [Plan](https://github.com/dadbod87/idle-hands-2/blob/13272a26dcdc8a73a5b2740c0d0daf2594ff2fe4/docs/evidence/IH2-159/PLAN.md) |
| Optional saved first morning | `feat/browser-first-morning` at `817f79465edb` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/817f79465edbfa0b62a1d6d51ae8e2f8314aefe7/docs/evidence/IH2-160/PLAN.md) |
| Room-specific loading for the allotment | `perf/defer-garden-room-art` at `18c342a47a2e` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/18c342a47a2efd66ed3bb7132ce3e07affe756d8/docs/evidence/IH2-161/PLAN.md) |
| Free room and yard previews | `feat/housing-plan-preview` at `0eb0da459c83` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0eb0da459c83a58898cc865e86eecdc44a8c301b/docs/evidence/IH2-162/PLAN.md) |
| Shorter field guide and direct task links | `feat/task-first-field-guide` at `5e8f0b9fab47` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/5e8f0b9fab479e2361906c7c0f1a14ca7022df19/docs/evidence/IH2-163/PLAN.md) |
| A deliberate private parcel check in Journal | `feat/journal-cafe-parcels` at `0a8f0dccd629` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0a8f0dccd629c20df9573a5fa1603ec846fcb9b5/docs/evidence/IH2-165/PLAN.md) |
| An unfinished tree sketch during long bench work | `feat/workbench-outing` at `f1ff152b4e32` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/f1ff152b4e32f88c9d49dbafccb031cec16ab140/docs/evidence/IH2-167/PLAN.md) |
| Balanced browser checks | `perf/browser-shard-balance` at `d9469234203c` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/d9469234203c0e1f69edc326625558c426f08cc1/docs/evidence/IH2-168/PLAN.md) |
| The second blanket room score | `feat/boarding-house-music` at `862b544fb84c` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/862b544fb84c746535c3c9514a36ab7f937d8822/docs/evidence/IH2-170/PLAN.md) |
| Earned Naturalist display for home visitors | `feat/home-keepsake-display` at `0d1c82d066bb` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0d1c82d066bbe3796febab10c2e4c40234df7968/docs/evidence/IH2-171/PLAN.md) |
| Read the framed certificate directly | `feat/read-home-keepsake` at `0efccbf9fb8d` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0efccbf9fb8d121379aaf53c827fe995e3ce820b/docs/evidence/IH2-172/PLAN.md) |
| Ready allotment trip during workshop work | `feat/bench-ready-allotment` at `18f1afcf8bf9` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/18f1afcf8bf9859726caf3c657bd981598f65e9c/docs/evidence/IH2-173/PLAN.md) |
| Steadier location and action HUD updates | `perf/stable-context-hud` at `886b534de30f` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/886b534de30fd284a8b741996e27c74f9026d908/docs/evidence/IH2-174/PLAN.md) |

Resume with the first pending exact gate. Verify current main and preserve concurrent changes. No cloud setup, live-game change or spending was part of this work.

## Measurement and owner review

The [separate street art study](https://github.com/dadbod87/idle-hands-2/blob/c1e65d44d255cd63dbb3e1977d5a9768c0179df0/docs/evidence/IH2-166/PLAN.md) moved 16 images and 74,736 decoded bytes out of the square’s first requests. Under a fixed 75 ms response delay, the combined square-plus-first-street median was 112 ms slower on desktop and 103 ms slower at narrow-phone size. Keep that study separate until its entry cost improves in repeatable trials.

The [browser scheduling study](https://github.com/dadbod87/idle-hands-2/blob/d9469234203c0e1f69edc326625558c426f08cc1/docs/evidence/IH2-168/PLAN.md) preserved all 239 collected browser identities locally. The historical candidate predicts 51–77 seconds lower max-shard case time in three recorded suites, with the same summed case time. The planning estimate describes test scheduling, with no evidence of billing savings.

The [home keepsake design study](https://github.com/dadbod87/idle-hands-2/blob/ad255fd7f4c56a19d4750d048e26bbd03622bd95/docs/evidence/IH2-169/PLAN.md) demonstrates a private preview and a deliberate visitor-visible frame using the original tree certificate. Native Chromium verified both roles and removal in three layouts. The standalone study has no persistent game changes. A playable integration will need separate owner, permission, persistence and layout checks.

Terra checked captured desktop, phone and enlarged short layouts where requested. The locally tested tree-sketch shortcut uses a fictional workshop save. The local café note used intercepted fictional shared replies. The supporting check records distinguish ordinary browser play and isolated database tests. Physical-phone play, speaker listening and owner acceptance remain to be checked directly.
