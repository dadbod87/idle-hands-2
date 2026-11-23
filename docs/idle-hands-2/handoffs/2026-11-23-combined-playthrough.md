# November 23 · Combined playthrough checkpoint

This study branch combines the exact shared-town draft head `4d1812ed5f765d2e654d61aa9237088a51efc928` and the independent browser-practice batch `5c34791`. It resolves the overlapping Journal fields, canvas panel cleanup, integration hash and roadmap entries in one isolated checkout. The merge is a reproducible verification study. The two release candidates still have separate source and acceptance gates.

Pinned Node 24.22.2 and Chromium passed the compiled client build, 448 local domain tests, and seven focused browser cases. The domain command skipped 28 database-only cases. Browser coverage included actual Riverwalk and map routes, recording a find after reload, unchanged inventory, note identity scoping, headwear animation, touch gesture confirmation, and scoped resident map and wave controls. Synthetic shared responses and the Riverwalk browser clock were used only in the declared cases.

No saved preview or database was started. No hosted run was triggered by this study. [Draft #109](https://github.com/dadbod87/idle-hands-2/pull/109) validates its exact separate shared candidate. Green [PR #108](https://github.com/dadbod87/idle-hands-2/pull/108) remains the base review. The accepted main is PR #107 at `168e857`.

## Saved addresses and missed waves

This follow-up includes `feat/saved-home-addresses` at `d84ba1c`. In the combined build, received waves also enter Recent field notes, so a resident can look up a greeting after the bubble clears. The same bounded, resident-scoped tab history applies. Returning to an address still uses the existing street route and home entry check.

The compiled build passed with 449 local domain tests and 28 database-only skips. Three focused Chromium cases passed for saving and revisiting a home, sharing the map and recording a received wave, and changing resident identity without carrying field notes over. Shared responses in these cases came from isolated fixtures.

## Exact hosted draft and independent Bag work

[Draft #109](https://github.com/dadbod87/idle-hands-2/pull/109) passed all five jobs at `4d1812ed`. The exact package matched the local compiled version across 248 SHA-256 files. See the [hosted record](../../evidence/IH2-200/HOSTED_DRAFT.json) for 596 domain/database cases, 257 browser cases and all three groups. One automatic public Ubuntu workflow used 51.0 summed runner minutes, with zero reruns. Browser setup took 20–36 seconds per group and the test step took 13.7–16.3 minutes. The slowest group merits measurement over another naturally scheduled candidate if it continues to approach the cap. No workflow change was made.

The [Bag filter candidate](https://github.com/dadbod87/idle-hands-2/tree/feat/bag-hide-empty) is saved independently at `0ef1edf`. It has local compiled, domain and focused browser evidence, and still needs hosted checks with a related batch. [The Actions timing tool](https://github.com/dadbod87/idle-hands-2/tree/chore/actions-run-report) is also backed up independently. PR #108 stays open at its passing head. The saved previews and databases stay stopped.

## Expanded local acceptance

The study now includes the independently saved [Bag filter](https://github.com/dadbod87/idle-hands-2/tree/feat/bag-hide-empty) and [workbench material routes](https://github.com/dadbod87/idle-hands-2/tree/feat/workbench-material-routes). Build, design, tracker and pinned tooling checks passed. A single isolated Chromium client ran 116 cases across 39 offline or intercepted specs, including real 2K/4K scene framing, weather, resizing, workshop and home routes, the Riverwalk and the saved address. The disabled API target refused five background movement requests from synthetic fixtures that did not respond to them. No saved database or preview was used. The hosted database acceptance still belongs to the exact separate draft #109.

The read-only comparison of #109 with its parent alternated four eight-second samples at 1440×900 and 320×640. Both layouts consistently mounted 26 scene views before and one afterwards in the same fictional 26-resident fixture. Chromium task-time medians at 1440×900 were about 7,398 and 7,376 ms, and at 320×640 about 5,092 and 5,050 ms. Frame output and time in the active rendering mode varied across samples. This confirms fewer canvas objects, without a reliable speed or frame-rate gain in this sample. It measures an emulated Chromium client and says nothing about server capacity or a physical phone.

The same combined source also passed 449 local domain cases with 28 database-only skips and six additional Chromium cases from mixed specs. They exercise the carried-item filter, native stack swaps, missing-ingredient routing, visible earned wear, map and wave presence, and resident-scoped Journal notes. The combined branch retains the isolation of each test.

The [Inkwood Glasshouse study](https://github.com/dadbod87/idle-hands-2/tree/design/inkwood-glasshouse) rehearses three project stages, different ways to help, and a visit after opening. Its [playable discovery branch](https://github.com/dadbod87/idle-hands-2/tree/feat/inkwood-glasshouse-discovery) makes the closed site reachable and defers trail artwork until the appropriate room. This branch is separate from the 116-case combined run. Actual restoration, financial decisions and a persistent keepsake are later work.
