# November 23 · Combined playthrough checkpoint

This study branch combines the exact shared-town draft head `4d1812ed5f765d2e654d61aa9237088a51efc928` and the independent browser-practice batch `5c34791`. It resolves the overlapping Journal fields, canvas panel cleanup, integration hash and roadmap entries in one isolated checkout. The merge is a reproducible verification study. The two release candidates still have separate source and acceptance gates.

Pinned Node 24.22.2 and Chromium passed the compiled client build, 448 local domain tests, and seven focused browser cases. The domain command skipped 28 database-only cases. Browser coverage included actual Riverwalk and map routes, recording a find after reload, unchanged inventory, note identity scoping, headwear animation, touch gesture confirmation, and scoped resident map and wave controls. Synthetic shared responses and the Riverwalk browser clock were used only in the declared cases.

No saved preview or database was started. No hosted run was triggered by this study. [Draft #109](https://github.com/dadbod87/idle-hands-2/pull/109) validates its exact separate shared candidate. Green [PR #108](https://github.com/dadbod87/idle-hands-2/pull/108) remains the base review. The accepted main is PR #107 at `168e857`.

## Saved addresses and missed waves

This follow-up includes `feat/saved-home-addresses` at `d84ba1c`. In the combined build, received waves also enter Recent field notes, so a resident can look up a greeting after the bubble clears. The same bounded, resident-scoped tab history applies. Returning to an address still uses the existing street route and home entry check.

The compiled build passed with 449 local domain tests and 28 database-only skips. Three focused Chromium cases passed for saving and revisiting a home, sharing the map and recording a received wave, and changing resident identity without carrying field notes over. Shared responses in these cases came from isolated fixtures.
