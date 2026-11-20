# IH2-176 · Stop a guided walk

A player who selects a place or a guided task can stop midway using the playfield’s Stop walking button or Escape. This is especially useful on touch screens, where tapping the floor often starts a second route. Cancel clears the current guided target and arrival intent, keeps the player in their present room and returns keyboard focus to the world. It leaves any already-confirmed shared movement under the ordinary position sync. A door that has begun confirmation finishes its existing flow.

Native Chromium verified Escape from a Places route on desktop and touch cancellation of a route toward the allotment at 320 pixels and at 844 × 390 with 200% text. There was no dialog or room entry after the cancel. Playfield height and normal control widths stayed stable. The existing Places search and normal workshop arrival also passed in those same layouts. This used local practice, a deliberately saved starting position at the east commons and a cosmetic clear-day fixture. The test uses the ordinary controls and needs no API interception or inventory changes.

Terra found the button readable and clear of the HUD in all three captures. On short landscape at enlarged text, the destination note can continue below the viewport. It remains in the existing scrollable notes. Physical-phone review and the full shared browser suite are separate checks.

The first full CI attempt reached the boarding-house destination while taking its screenshot, before Escape arrived. The route had already ended. The corrected fixture begins across town at a normal reachable point and asserts the resident is still walking after screenshot capture. Search, travel, timing, layout and input assertions remain in place.
