# Idle Hands 2 overnight continuation · 2026-11-19

Last inspected at 2026-11-19 14:59 PST. The separate sequel repository was at `c9353926a5f6f57230eb601e206a72567d69ffeb`. Saved previews and databases stayed stopped. Standard public Ubuntu CI used disposable PostgreSQL with fictional residents. Local native Chromium tests used disposable static servers. Mobile layouts were emulated.

## Verified on exact main

For each row, the exact PR and main runs passed the domain gate, all three browser shards and their aggregate. The emitted client files matched byte for byte between PR and main.

| Player-facing change | PR | Main | Passed cases | Required runs |
|---|---|---|---|---|
| Jun’s orchard directions | [#75](https://github.com/dadbod87/idle-hands-2/pull/75) | `c9353926a5f6` | 575 domain, 225 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44620526400) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44629304006) |

## Saved work in dependency order

| Work | Branch | Status |
|---|---|---|
| Optional original orchard score | `feat/orchard-music` at `aaad9ce052f9` | [PR #76](https://github.com/dadbod87/idle-hands-2/pull/76) · open · [in_progress](https://github.com/dadbod87/idle-hands-2/actions/runs/44631947483) · [Plan](https://github.com/dadbod87/idle-hands-2/blob/aaad9ce052f9784aed4db8505e2a0fd8ed7230dc/docs/evidence/IH2-155/PLAN.md) |
| Walkable boarding house | `feat/local-lodging-visit` at `0e075e66617a` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0e075e66617ad75a8b480487d51d9b0074ca2325/docs/evidence/IH2-156/PLAN.md) |
| Fewer invisible rain updates | `perf/quiet-rain-layer` at `b36df44cc888` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/b36df44cc888855c8dabb7970d0c5696ade4827e/docs/evidence/IH2-157/PLAN.md) |
| Optional arrival stories | `feat/browser-arrival-stories` at `608cb6d5821d` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/608cb6d5821d4c62906cd3c273c0996813208c4c/docs/evidence/IH2-158/PLAN.md) |
| Brief light after a confirmed doorway | `feat/confirmed-door-light` at `e08f050ec852` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/e08f050ec8527639f064e3ecd097215e15616056/docs/evidence/IH2-159/PLAN.md) |
| Optional saved first morning | `feat/browser-first-morning` at `817f79465edb` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/817f79465edbfa0b62a1d6d51ae8e2f8314aefe7/docs/evidence/IH2-160/PLAN.md) |
| Room-specific loading for the allotment | `perf/defer-garden-room-art` at `18c342a47a2e` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/18c342a47a2efd66ed3bb7132ce3e07affe756d8/docs/evidence/IH2-161/PLAN.md) |
| Free room and yard previews | `feat/housing-plan-preview` at `0eb0da459c83` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0eb0da459c83a58898cc865e86eecdc44a8c301b/docs/evidence/IH2-162/PLAN.md) |
| Shorter field guide and direct task links | `feat/task-first-field-guide` at `5e8f0b9fab47` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/5e8f0b9fab479e2361906c7c0f1a14ca7022df19/docs/evidence/IH2-163/PLAN.md) |
| A deliberate private parcel check in Journal | `feat/journal-cafe-parcels` at `0a8f0dccd629` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0a8f0dccd629c20df9573a5fa1603ec846fcb9b5/docs/evidence/IH2-165/PLAN.md) |
| An unfinished tree sketch during long bench work | `feat/workbench-outing` at `f1ff152b4e32` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/f1ff152b4e32f88c9d49dbafccb031cec16ab140/docs/evidence/IH2-167/PLAN.md) |

Resume with the first pending exact gate. Verify current main and preserve concurrent changes. No cloud setup, live-game change or spending was part of this work.

## Measurement and owner review

The [separate street art study](https://github.com/dadbod87/idle-hands-2/blob/c1e65d44d255cd63dbb3e1977d5a9768c0179df0/docs/evidence/IH2-166/PLAN.md) moved 16 images and 74,736 decoded bytes out of the square’s first requests. Under a fixed 75 ms response delay, the combined square-plus-first-street median was 112 ms slower on desktop and 103 ms slower at narrow-phone size. Keep that study separate until its entry cost improves in repeatable trials.

The [browser scheduling study](https://github.com/dadbod87/idle-hands-2/blob/d9469234203c0e1f69edc326625558c426f08cc1/docs/evidence/IH2-168/PLAN.md) preserved all 239 collected browser identities locally. The historical candidate predicts 51–77 seconds lower max-shard case time in three recorded suites, with the same summed case time. Hosted timing for the changed split is pending.

The [home keepsake design study](https://github.com/dadbod87/idle-hands-2/blob/ad255fd7f4c56a19d4750d048e26bbd03622bd95/docs/evidence/IH2-169/PLAN.md) demonstrates a private preview and a deliberate visitor-visible frame using the original tree certificate. Native Chromium verified both roles and removal in three layouts. The standalone study has no persistent game changes. A playable integration will need separate owner, permission, persistence and layout checks.

Terra checked captured desktop, phone and enlarged short layouts where requested. The locally tested tree-sketch shortcut uses a fictional workshop save. The local café note used intercepted fictional shared replies. The supporting check records distinguish ordinary browser play and isolated database tests. Physical-phone play, speaker listening and owner acceptance remain to be checked directly.
