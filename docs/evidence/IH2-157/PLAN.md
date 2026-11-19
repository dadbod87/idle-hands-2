# Pause work for invisible rain

The visible drizzle keeps its world-anchored motion. Clear weather, interiors and the reduced-motion preference now stop changing the hidden rain layer. Turning rain on or off changes visibility once. The existing weather and production clocks remain separate.

The same native Chromium phone instrumentation counted assignments to the actual rain element's visibility and transform styles. The baseline source was `0e075e66617ad75a8b480487d51d9b0074ca2325`. Both builds used disposable browser-practice fixtures and at least 12 compositor frames per condition.

| Condition | Before | After |
|---|---:|---:|
| Clear, with keyboard movement | 24 visibility and 11 transforms | 0 |
| Visible drizzle | 24 visibility and 12 transforms | 12 transforms |
| Reduced-motion steady view | 24 visibility assignments | 0 |
| Indoors during drizzle | 26 visibility assignments over 13 frames | 0 |

[Before](BEFORE.json) and [after](AFTER.json) retain the exact observations. The final native weather suite also checks visible landscape, world anchoring, indoor weather, and holdings across the existing scenarios. These measurements count browser style assignments. They do not measure CPU time, FPS, device thermals, or server load.

The change touches the cosmetic compositor only. Keep saved previews and databases stopped.
