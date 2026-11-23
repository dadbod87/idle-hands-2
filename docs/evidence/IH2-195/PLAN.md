# IH2-195 · See who is around town

Open Places, then unfold the paper Town map in shared practice. District badges show how many residents are there. The list gives names and the same landmark names used by the existing map route selector. Residents can pick a meeting place without chasing a moving dot. Browser-only practice keeps its ordinary map.

The view derives coarse districts from the existing live, scoped presence stream. It never queries new data, includes no private room positions and clears stale locations when the connection is interrupted. Presence refreshes preserve map routes and focus. Repeated movement within one district leaves the roster DOM alone, and a folded map defers updates until opened.

The focused check uses fictional HTTP and presence data in the actual client, keeps the native map travel check, and covers desktop keyboard, narrow touch and short landscape. Hosted checks belong to the batched follow-up after the open hood PR.

Local build, repository plan and skill checks passed along with 443 domain tests (28 database-only checks skipped). Three focused Chromium cases passed. Terra 6.1 found a marker collision and two overlapping labels at 320 px. The corrected captures separate those elements and add a count key. In short landscape the map and route controls use separate scroll positions. The travel button remains fully reachable and at least 44 CSS pixels high. These are emulated captures using fictional residents and an intercepted stream.
