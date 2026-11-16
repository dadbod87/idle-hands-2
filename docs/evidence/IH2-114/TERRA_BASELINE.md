# IH2-114 — independent actual-game baseline

Reviewed the existing accepted 113 local game at `http://127.0.0.1:4175/`, not an IH2-114 candidate. Fresh isolated native Chrome contexts used ordinary local-workshop spawn and the game's Places and Inspect controls; no login, injected position, interception, grants or protected database access. Captures are in `../idle-hands-2-artifacts/town-life-2026-11-16/terra-baseline/`. Desktop 2560×1440 and 3840×2160, 320×640 and 360×780 emulated phones, and 844×390 at 200% root text were sampled. The scenic desktop destinations East Commons, Riverwalk, Orchard walk and Founders’ pond were reached through Places; pond arrival was also observed on both phone sizes, and East Commons Inspect was opened at 360. The separate accepted housing study at `http://127.0.0.1:49640/` was sampled at 360. These are not physical-device, Safari, full game, performance, or future-candidate results.

## Findings and bounded opportunities

### P2 — The named pond is offscreen on phone arrival

From a fresh phone session choose Places → Outdoors & exploring → Founders’ pond. At both 320 and 360, walking finishes at the sign and the field note says to inspect, but the pond is outside the visible playfield. A player gets little visual reward for the trip and must guess which direction leads to the water. Make the arrival composition reveal some water or an unmistakable nearby shoreline cue while keeping the destination and its Inspect target accessible. Verify the actual narrow-phone arrival and safe routes; desktop alone conceals this issue. `pond-phone320.png` and `pond-phone360.png` document the observed result.

### P2 — Districts are navigable but scenery remains schematic

At 2K/4K and the four visited stops, long straight paths and rounded rectangular water sit amid isolated repetitions of a few trees, small identical flower patches and benches. Market shelter and pavilion give helpful landmarks, but little around them suggests a gathering place or transition from orchard to waterside. Group varied vegetation, add a few shoreline/reed or pebble edges and irregular path margins, and give the shelter/pavilion modest noninteractive context. Preserve generous open space, player silhouettes, paths and existing interaction points. These additions could make walking feel like arriving somewhere without implying a shop or new resource action.

### P3 — Places browsing and a scenic arrival take several steps

The outdoor group contains 18 destinations; a player opens Places, expands the category, chooses a stop, waits for walking, then chooses Inspect. The field note explicitly explains the last step, and East Commons Inspect opens a concise description with a route back. The flow works in the observed state but the scenic stops are mixed with material and sketch targets, which makes browsing less inviting on a phone. Consider a short scenic grouping or visual landmark cues in a later UI pass; do not add misleading functional affordances. No navigation failure was established.

## Other observations

The square, workshop and café are readable and have personality; signs and regional directions support orientation. Portrait HUD controls remain visible, and the first objective points to depots that are actually on screen at spawn. Short 200% uses vertical scrolling, consistent with the previously inspected design. The housing preview is clearly labeled a design study; the selected detail and same-scale comparison communicate the proposal, though its long phone page places price and lot detail below the initial viewport. That is a possible future progressive-disclosure improvement, not a game feature or a 114 blocker. Actual 114 changes still need independent final native review, particularly narrow-phone landmark framing and collision/visibility around any new scenery.
