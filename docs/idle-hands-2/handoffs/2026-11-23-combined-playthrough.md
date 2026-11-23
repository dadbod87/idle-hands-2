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
