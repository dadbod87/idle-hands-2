# IH2-113 visual review — candidate captures

Reviewed the actual local Chrome captures `test-results/browser/town-2k-square.png` (2560×1440) and `town-4k-square.png` (3840×2160), with cosmetic clear daytime forced. These are emulated desktop captures, not physical-device results. Also reviewed `town-phone320.png` (320×640), `town-phone360.png` (360×780), and `town-short200.png` (844×390 with root text set to 200%). The phone captures use a disclosed position-only fixture on the expanded lane. The pond capture was not present at review time; still images cannot verify input, collision, transitions, or accessibility. No runtime or data was changed for this review.

Final follow-up below supersedes the initial severity ratings: no sampled blocking visual issue remains; organic landscaping stays P2polish. The complete field note was verified through native keyboard scrolling.

## Findings

### P1 — Larger footprint does not yet feel like a larger town

At 4K from the square, the original cluster of buildings and people occupies a small part of the scene. Most of the newly exposed area is a sparse lawn crossed by very long, straight, broad paths, repeating tree sprites, two benches, and a rectangular pond. The expansion removes the cramped viewport boundary, but the contrast in density makes the new districts feel like empty placeholder land rather than connected neighborhoods. This directly affects the stated spacious-town goal. Add a few distinctive, coherent destination clusters along the routes (for example, riverbank details, orchard rows or garden edges, and a recognizable commons gathering place), with varied spacing and modest path detail. Preserve open breathing room and avoid suggesting unimplemented interactions.

### P2 — Routes are geometrically clear but have weak place identity and depth

In the 4K square view, roads form oversized straight T-junctions with abrupt rounded ends; trees recur at roughly regular intervals, and the pond looks like a plain rounded rectangle. Signs name destinations, but scenery alone offers little indication of a transition between them. Introduce curved or narrower connectors, varied vegetation groupings and edges, and a few layered landmarks or shoreline details to make direction and district identity readable without relying only on labels. This is a visual observation, not a claim about navigability or collision.

### P2 — Investigate apparent repeated header at the bottom of the 4K capture

The 3840×2160 screenshot shows the top of another Idle Hands header immediately below the bordered game area at the bottom edge. Check the actual page at this viewport to determine whether this is duplicate layout/overflow or a capture/render artifact; if it is the live page, prevent duplicate chrome and keep the intended HUD accessible. A still image alone cannot establish its cause.

### P2 — Mobile location and objective cues do not match the visible scene

In both portrait captures, the character stands by the Orchard walk sign, but the persistent card says “Town square” and the footer says to tap three material depots “below you,” which are not visible in this state. The scene itself is mostly an unmarked intersection, with few visible landmarks for choosing a direction. Make the current area or directional guidance reflect the actual location, and make the first objective point back toward the square when the player is away. Verify the underlying navigation flow in motion; these captures alone do not prove a player cannot reach it.

### P2 — Enlarged text crowds the short landscape view

At 844×390 with 200% root text, the logo overlaps the title, the field-note text is cut off at the bottom of the capture, and the lower action row extends below the viewport. Check scroll access and control usability in the live state, and adjust the header and HUD wrapping or compact presentation so the scene and controls remain usable at enlarged text. The screenshot does not establish whether the offscreen content is reachable by scrolling.

## What works and remaining coverage

The original square has legible buildings, characters and landmarks, and the new roads and signs make the direction of expansion visible. The 2K view shows meaningful breathing room to the east. The 4K frame does expose authored ground instead of an obvious empty outer canvas, but that is a visual observation only; it does not verify bounds or behavior. Portrait captures retain visible Places, Bag, and Journal controls and a clear player silhouette, although destination cues are limited. The destination pond view, live movement, menu gating, scrolling and reload remain unreviewed here pending their actual captures and runtime results. This review is not acceptance of those states.

## Independent follow-up — refreshed candidate

Fresh captures were made from the current local build in separate native Chrome contexts after two presented animation frames, at 2560×1440 and 3840×2160 from ordinary spawn, and at 3840×2160 pond, 320×640, 360×780, and 844×390 with 200% root text using isolated position-only fixtures. Daytime and clear weather were forced cosmetically. Captures are retained outside the test output at `../idle-hands-2-artifacts/spacious-town-2026-11-16/terra-final/`. No currency fixture, deliberate API request or economy change was made. This pass did not exercise travel, collisions, menu interactions, reload, physical devices, or performance.

- **Earlier P1, revised to P2 visual polish:** The market shelter, picnic pavilion, flowerbeds, gravel and fruit-tree variation give the expanded area more recognizable destinations. It now reads as a spacious town and surrounding open land, though the long orthogonal paths, repeated trees and rectangular ponds still feel schematic compared with the concentrated original square. Further organic path edges, shoreline detail and varied landmark groupings would improve character, but the remaining sparseness is not a visual blocker for an intentionally open expansion.
- **Earlier 4K header concern not reproduced:** Fresh cold-start 4K capture shows one visible header and the intended footer; the earlier repeated header appeared after a resize capture. This pass does not prove the original cause, but no duplicate shell is visible in the refreshed frame.
- **Earlier phone-location concern addressed in inspected states:** Both portrait captures identify Orchard walk and give directions toward the old square, riverwalk and meadow. The player and Places, Bag, Journal and Inspect controls remain visible. These stills do not establish the usability of actual navigation.
- **Earlier enlarged-text concern partially addressed; P2 remains:** The logo and title no longer overlap. At 844×390 and 200% text the page has no horizontal overflow, one canvas, and the lower controls including Inspect are visible after vertical scrolling; scrolling is an accepted layout at this size. However, even at the bottom of the page, the field note ends visibly at “riverwalk north ·” while the same portrait state continues with “meadow south.” Check the field-note container so the complete direction wraps or remains otherwise accessible. This is a visible text-clipping issue, not evidence that the controls are unreachable.
- **Pond view:** The pavilion creates a recognizable destination alongside the pond and orchard, and the regional card and footer offer a route back. The water remains a simple rectangular shape; that is a polish opportunity rather than a functional conclusion.

### Field-note scroll verification

Follow-up at 844×390 and 200%: the field note is keyboard-focusable and identifies itself with “Scroll field notes to read longer messages.” After focus and ArrowDown, its inner scroll position changed to 27 px and the visible text included “meadow south.” The full text is therefore reachable through the existing deliberate inner scroll; withdraw the text-clipping P2 as a blocker. The initial view does not show the whole note at once, so discoverability on touch remains a design consideration rather than a proven failure. The capture `short200-inner-scroll.png` and `review-evidence.json` in the external evidence directory record the state and SHA-256 hashes for the fresh screenshots.

## Final frozen candidate — image-only review

Reviewed retained final focused captures under `../idle-hands-2-artifacts/spacious-town-2026-11-16/focus-final/browser/`: `town-2k-square.png`, `town-4k-square.png`, `town-4k-pond.png`, `town-phone320.png`, `town-phone360.png`, `town-short200.png`, and `town-market-occlusion.png`. The desktop and phone states preserve the preceding visual assessment: the expanded landscape has recognizable destinations and remaining geometric sparsity is polish; portrait guidance matches Orchard walk; the short 200% view retains the previously documented scrolling tradeoff. The 4K frame shows the expected footer and no repeated visible header.

In the market capture the shelter is visibly translucent and the actor is discernible just above its roof edge. This still demonstrates the faded state but does not independently show the actor overlapping the roof pixels or prove collision behavior; those require the separate focused runtime result. No new visual blocker is apparent in the inspected images. This is a source-candidate screenshot review, not a physical-device test, end-to-end verification, release approval, or a claim about the status of the broad suites.
