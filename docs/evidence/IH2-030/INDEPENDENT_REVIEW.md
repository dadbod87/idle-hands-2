# Independent reviews — IH2-030

2026-11-09. Two read-only agents reviewed source and isolated Chrome on the loopback preview. No real accounts, server records or shared fixtures. Desktop 1440×900, touch phone 360×640, short 844×390; normal and 200% DOM text. These are emulations, not physical devices.

## Fixed findings
- Competing tabs could overwrite local progress: local workshop now has a single writer using Web Locks. Other tabs can inspect but actions explain read-only state; close the writer and reload to take over. Storage events refresh readers. Required browser API is disclosed; unsupported browsers remain read-only.
- Back-cache lifecycle could kill countdown interval: timer remains through caching; persisted pageshow reacquires writer ownership. Regression uses synthetic lifecycle events and does not certify all browser cache policies.
- Save failure warning was replaced by action success: receipt keeps the failure warning, with an Unsaved practice indicator. In-memory practice can continue, with reload-loss explicitly stated.
- Placement rebuilt focused buttons: selection/apply/cancel now restore selected-slot focus and scroll it below the sticky header. Focus recheck passed all four phone/short × normal/200% states (phone 200 slot 142–321px below header 134; short 200 slot 123–240 below header 115).
- Quest prematurely requested craft after only one material: remains gathering until recipe affordable.
- Stale orientation sentence and decorative caption behind depots corrected.
- First craft left too little for a return job: initial depots now each hold6 once, allowing first planter plus queued 12-hour bridge kit on the first visit. Replenishment remains capped.

## Final review observations
Focused source review found no remaining concrete blocker; domain reviewer independently ran10 workshop checks. Phone reviewer completed gather3 bins→walk via clear ground→door entry→direct bench→5s craft/claim→place planter without using Places. Collection buttons stayed at y327 before/after receipts. No checked-layout horizontal overflow or unreachable close controls. Focus visibility recheck closed the last finding.

No assertion of full accessibility, multiplayer safety, real-server authority or broad device compatibility. Parent report records final full-suite and exact-head CI results separately.

Parent full-suite follow-up also caught and fixed short-landscape footer collapse at200% text (feedback now above a full-width action row) and a bench lower-edge tap target that did not cover the whole visible illustration. A dedicated domain regression covers lower-edge approach; the complete browser suite retains short/200% playfield gates.

Final height review found that DOM text scaling resized the playfield but Phaser retained the previous canvas size. Added a container ResizeObserver using the pinned engine’s setParentSize/refresh path (not a synthetic window resize event) and a regression asserting canvas/playfield height agreement after200% DOM text. Final recheck/evidence follows this change.

Final fresh-context bounds recheck passed without window resize: phone200 canvas321px/container321px; short200 canvas205px/container205.8px (pixel rounding). Normal layouts match and there is no checked overflow. No remaining concrete blocker in the focused source or phone reviews.
