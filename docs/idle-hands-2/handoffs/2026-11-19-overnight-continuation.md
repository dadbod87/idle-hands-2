# Idle Hands 2 overnight continuation · 2026-11-19

Last inspected at 2026-11-19 22:07 PST. The separate sequel repository was at `5440e24c4c9098113c3662f7f29affe0f2c5d856`. Saved previews and databases stayed stopped. Standard public Ubuntu CI used disposable PostgreSQL with fictional residents. Local native Chromium tests used disposable static servers. Mobile layouts were emulated.

## Verified on exact main

For each row, the exact PR and main runs passed the domain gate, all three browser shards and their aggregate. The emitted client files matched byte for byte between PR and main.

| Player-facing change | PR | Main | Passed cases | Required runs |
|---|---|---|---|---|
| Jun’s orchard directions | [#75](https://github.com/dadbod87/idle-hands-2/pull/75) | `c9353926a5f6` | 575 domain, 225 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44620526400) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44629304006) |
| Optional original orchard score | [#76](https://github.com/dadbod87/idle-hands-2/pull/76) | `d422168f896a` | 577 domain, 227 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44631947483) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44634075817) |
| Walkable boarding house | [#77](https://github.com/dadbod87/idle-hands-2/pull/77) | `5d0e3b76b304` | 581 domain, 229 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44636988009) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44639583360) |
| Fewer invisible rain updates | [#78](https://github.com/dadbod87/idle-hands-2/pull/78) | `2166d2a3cdaf` | 581 domain, 230 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44641881230) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44644093361) |
| Optional arrival stories | [#79](https://github.com/dadbod87/idle-hands-2/pull/79) | `6a2b3f1abaaf` | 583 domain, 231 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44646691801) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44648832528) |
| Brief light after a confirmed doorway | [#80](https://github.com/dadbod87/idle-hands-2/pull/80) | `efbb363bd3a8` | 583 domain, 233 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44651294688) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44653713483) |
| Optional saved first morning | [#81](https://github.com/dadbod87/idle-hands-2/pull/81) | `8b4921c1c20c` | 586 domain, 235 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44655822915) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44657923357) |
| Room-specific loading for the allotment | [#82](https://github.com/dadbod87/idle-hands-2/pull/82) | `ded1071f4d5b` | 586 domain, 236 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44663888654) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44665888373) |
| Free room and yard previews | [#83](https://github.com/dadbod87/idle-hands-2/pull/83) | `0f09487c648e` | 586 domain, 237 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44668074834) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44670004257) |
| Shorter field guide and direct task links | [#84](https://github.com/dadbod87/idle-hands-2/pull/84) | `32c76200d352` | 586 domain, 237 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44674248417) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44676114775) |
| A deliberate private parcel check in Journal | [#85](https://github.com/dadbod87/idle-hands-2/pull/85) | `7cf5f49698d4` | 586 domain, 238 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44678192237) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44679987072) |
| An unfinished tree sketch during long bench work | [#86](https://github.com/dadbod87/idle-hands-2/pull/86) | `5440e24c4c90` | 586 domain, 239 browser | [PR checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44681875414) · [Main checks](https://github.com/dadbod87/idle-hands-2/actions/runs/44683634905) |

## Saved work in dependency order

| Work | Branch | Status |
|---|---|---|
| Balanced browser checks | `perf/browser-shard-balance` at `d9469234203c` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/d9469234203c0e1f69edc326625558c426f08cc1/docs/evidence/IH2-168/PLAN.md) |
| The second blanket room score | `feat/boarding-house-music` at `862b544fb84c` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/862b544fb84c746535c3c9514a36ab7f937d8822/docs/evidence/IH2-170/PLAN.md) |
| Earned Naturalist display for home visitors | `feat/home-keepsake-display` at `0d1c82d066bb` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0d1c82d066bbe3796febab10c2e4c40234df7968/docs/evidence/IH2-171/PLAN.md) |
| Read the framed certificate directly | `feat/read-home-keepsake` at `0efccbf9fb8d` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/0efccbf9fb8d121379aaf53c827fe995e3ce820b/docs/evidence/IH2-172/PLAN.md) |
| Ready allotment trip during workshop work | `feat/bench-ready-allotment` at `18f1afcf8bf9` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/18f1afcf8bf9859726caf3c657bd981598f65e9c/docs/evidence/IH2-173/PLAN.md) |
| Steadier location and action HUD updates | `perf/stable-context-hud` at `886b534de30f` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/886b534de30fd284a8b741996e27c74f9026d908/docs/evidence/IH2-174/PLAN.md) |
| One announcement when a crop is ready | `fix/garden-ready-announcement` at `7c8aae954254` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/7c8aae954254123d45dadd1dd0e34266fd1dd6a7/docs/evidence/IH2-175/PLAN.md) |
| Tap or press Escape to stop a guided walk | `feat/stop-assisted-walk` at `2dcee18995a1` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/2dcee18995a1615f8830d0b135c6e19c3074e612/docs/evidence/IH2-176/PLAN.md) |
| A distinct walkable Garden Studio sunroom | `feat/garden-studio-interior` at `e6535514ae3e` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/e6535514ae3ea625b1bb7e6dd380f496f3ce5cc9/docs/evidence/IH2-177/PLAN.md) |
| Softer foreground furniture and fewer redundant renders | `perf/steady-interior-furniture` at `f57648f054ac` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/f57648f054ac8f75a7391adb3d6d395b3f6387d8/docs/evidence/IH2-178/PLAN.md) |
| Sound clear of the short-landscape playfield | `fix/short-sound-placement` at `c1c7dee8b894` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/c1c7dee8b89423c8cd91e94cfd702d489cb31407/docs/evidence/IH2-179/PLAN.md) |
| A Sunroom notebook with private allotment access | `feat/sunroom-notebook` at `b681eda93c3f` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/b681eda93c3f6c47b221f5b7bfa7efa1ba0387bf/docs/evidence/IH2-180/PLAN.md) |
| A distinctive Workshop Lodge drafting wing | `feat/workshop-lodge-interior` at `848f753f8f3d` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/848f753f8f3db9db0455f228c65e2c35932c5657/docs/evidence/IH2-181/PLAN.md) |
| A private Lodge work board and direct workshop route | `feat/lodge-drafting-board` at `1302837c7796` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/1302837c7796ef9b6876f731ef36fbceb2b9f6fd/docs/evidence/IH2-182/PLAN.md) |
| A direct route from Marlow to the first planter | `feat/marlow-material-depots` at `d16832dece19` | Source backup, full checks pending · [Plan](https://github.com/dadbod87/idle-hands-2/blob/d16832dece190360db18135d465a380cf208244e/docs/evidence/IH2-183/PLAN.md) |

Resume with the first pending exact gate. Verify current main and preserve concurrent changes. No cloud setup, live-game change or spending was part of this work.

## Measurement and owner review

The [2K, 4K and phone sample](../../evidence/overnight-render-2026-11-19/README.md) compared 18 fresh Chromium sessions. Both builds kept near-identical movement callback timings at these sizes, with fewer first-route resource entries in the prepared build. Terra inspected the 2K and 4K screenshots for the prior map cutoff.

The [separate street art study](https://github.com/dadbod87/idle-hands-2/blob/c1e65d44d255cd63dbb3e1977d5a9768c0179df0/docs/evidence/IH2-166/PLAN.md) moved 16 images and 74,736 decoded bytes out of the square’s first requests. Under a fixed 75 ms response delay, the combined square-plus-first-street median was 112 ms slower on desktop and 103 ms slower at narrow-phone size. Keep that study separate until its entry cost improves in repeatable trials.

The [browser scheduling study](https://github.com/dadbod87/idle-hands-2/blob/d9469234203c0e1f69edc326625558c426f08cc1/docs/evidence/IH2-168/PLAN.md) preserved all 239 collected browser identities locally. The historical candidate predicts 51–77 seconds lower max-shard case time in three recorded suites, with the same summed case time. The planning estimate describes test scheduling, with no evidence of billing savings.

The [home keepsake design study](https://github.com/dadbod87/idle-hands-2/blob/ad255fd7f4c56a19d4750d048e26bbd03622bd95/docs/evidence/IH2-169/PLAN.md) demonstrates a private preview and a deliberate visitor-visible frame using the original tree certificate. Native Chromium verified both roles and removal in three layouts. The standalone study has no persistent game changes. A playable integration will need separate owner, permission, persistence and layout checks.

Terra checked captured desktop, phone and enlarged short layouts where requested. The locally tested tree-sketch shortcut uses a fictional workshop save. The local café note used intercepted fictional shared replies. The supporting check records distinguish ordinary browser play and isolated database tests. Physical-phone play, speaker listening and owner acceptance remain to be checked directly.
