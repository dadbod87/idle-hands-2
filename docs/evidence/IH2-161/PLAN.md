# Load the allotment when someone enters it

The square loads its visible gate, stakes, registry and welcome-bed sprites. Indoor crops, the actor’s garden action sheet and the four allotment layers load with the garden. Workshop and boarding-house entry avoid that indoor set. The Bag and garden menus still request their own icons when a player opens them. Original assets and game rules stay in place.

| Cold room | SVGs before | SVGs after | Decoded bytes removed |
|---|---:|---:|---:|
| Square | 139 | 115 | 112,393 |
| Workshop | 138 | 106 | 132,788 |
| Allotment | 138 | 122 | 29,984 |
| Boarding house | 139 | 107 | 132,788 |

Each version opened 24 fresh Chromium contexts across desktop and 320-pixel phone. [The observations](COLD_BOOT_COMPARISON.json) record the one machine, samples, per-family bytes and ready times. The square's request count fell by 24 in every sample. The small local readiness shifts are mixed across rooms. This is a counted transfer reduction, with no hosted, physical-phone or frame-rate claim.

The first prototype exposed an early garden dialog while its scene was still loading. The named route now waits for the mounted room before opening the destination. A native test deliberately holds the original garden ground image request in a disposable browser and verifies that the dialog appears after the art is available. The ordinary native tests check the three beds, planting pose, narrow touch targets, weather anchoring and the direct exit. The gallery gets its address from the browser's test configuration, so it can inspect the same 31 original files in a disposable static build.

Reproduce from the repository root with the pinned Node runtime. Run `npm run build`, then `./node_modules/.bin/playwright test --config tools/bootstrap-art-study/playwright.config.ts`. Copy the result from `test-results/bootstrap-art/COLD_SYNTHETIC.json` before running a different Playwright configuration. The isolated server uses loopback 4320 and writes no game API data. For a separate before/after comparison, add `--grep "fixed delay on every SVG"`. Set `IH2_BOOT_ART_STATIC_DIR` to the exact previously built static directory for the baseline. Leave it unset for the local candidate.

With 75 ms added to each SVG reply, the desktop first-frame median moved from 711 to 617 ms and first-door median from 113 to 206 ms. The 320-pixel phone samples moved from 684 to 628 ms at boot and 182 to 235 ms at the door. Paired boot-plus-door medians stayed within 7 ms in both views. Six samples on each commit show the garden shifts 16 files to the first visit. [Door observations](FIRST_DOOR_DELAY.json). This fixed delay changes response timing without simulating bandwidth or a physical network. Review first-door responsiveness on an actual device before moving another art family.

The first full PR checks caught a two-leg route problem. Both the shared letterbox visitor and the shared carpentry owner reached the neighborhood but did not continue to the selected house. A general route guard rejected the next leg before the neighborhood had mounted. Route creation can run on the confirmed room geometry again. Named actions and manual Inspect still wait for the destination scene to mount. The existing two real shared address tests remain part of the full gate. [First run](https://github.com/dadbod87/idle-hands-2/actions/runs/44659971451).
