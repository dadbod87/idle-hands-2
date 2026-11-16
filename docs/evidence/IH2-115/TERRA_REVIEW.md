# IH2-115 — independent operational rehearsal V1 review

Reviewed frozen `http://127.0.0.1:4220/` in Chrome at 2560×1440, 320×640, 360×780 and 844×390 with 200% root text. This is a fictional in-memory design rehearsal, not the game, SQL authorization, persisted state or a real purchase. Captures are in `../idle-hands-2-artifacts/housing-contract-2026-11-16/terra-review-v1/`. Viewports/touch are emulated, not physical phones.

## Findings

### P2 — The review dialog initially focuses the spend action and hides free cancellation below the phone fold

On a 320×640 viewport, select Garden Studio and choose Review plan & price. The dialog clearly shows the 24-kit total, remaining balance and six-hour continuity, but the initial visible portion ends at the booking button; “Keep previewing · free” is below it. Keyboard Enter on Review opened the dialog with focus on “Use 24 kits · book builders.” The user can scroll, but a safe exit is not apparent in the first phone frame and keyboard focus lands on the consequential action. Put initial focus on a visible free-cancel/close control and make both options discoverable at narrow and short sizes, or provide a clear scroll cue. Recheck focus restoration, modal scrolling and 200% text.

### P3 — Completion points back toward another purchase rather than the creative payoff

After completing Garden Studio, the success copy and updated home/8-nook identity appear, but the next prominent section again shows plan cards and a disabled “Review plan & price,” with “Choose a different plan.” Yard arrangement is a collapsed disclosure below the cards. Offer a visible “Arrange your yard” next action near completion and use a neutral “This is your home” state for the selected plan. This would make the earned space feel useful without forcing a remodel.

### P3 — Small copy and space refinements

The poor example reads “1 bridge kits” and yard stock says “1 planter(s).” Singular-aware labels would feel more polished. Four cards remain in one row at 844×390/200% and wrap heavily, though the captured page remained readable; a more compact breakpoint could reduce scanning. These are polish, not blockers.

## Observed behavior and limits

At 320, selecting Garden Studio, reviewing, cancelling freely, reopening and confirming displayed 24 kits, a 24-kit balance, the old furnished home/address and six-hour build. Advancing the explicitly fictional clock produced “Ready whenever you are”; Finish home updated the shown home to Garden Studio and preserved eight nooks in the rehearsal. The current-yard disclosure exposed an owned planter; an independent placement in a fresh 360 session changed available stock from one to zero and offered Return planter. A separate 360 keyboard pass opened review with Enter, advanced the modal clock until the quote expired, observed disabled confirmation and an instruction to review a fresh price, then saw focus return to Review after free cancellation. The poor example reported a 23-kit shortfall with disabled confirmation. First-home and expanded-owner examples showed 36 and 2 kits respectively; these are fictional candidate amounts, not approved production pricing. No horizontal overflow appeared at 360.

The presentation communicates the old home remains open to the owner and visitors, while activities are in an optional disclosure. This is a promising readable construction loop, with recognizable choices and an explicit no-save notice. It does not prove actual authority, item conservation, visitor access, persistence, timing, multi-window behavior, performance or physical-device accessibility. The separate geometry/framing study remains to be reviewed.

## V2 independent follow-up

Reviewed `http://127.0.0.1:4221/` and its separate `street.html` in native Chrome at 2560×1440, 3840×2160, 320×640, 360×780 and 844×390 with 200% root text. Captures and `review.json` are retained in `../idle-hands-2-artifacts/housing-contract-2026-11-16/terra-review-v2/`. These are standalone fictional and schematic studies, not actual housing, live purchases, registered collision or physical-device tests.

The V1 quote concern is addressed in the inspected 320px state: keyboard Enter opens the review with a visible, focused Close control at the top, and closing returns focus to Review. The complete quoted amount and free cancellation remain available. In the fictional 320px build path, advancing six hours and finishing produces a clear “Arrange your yard” primary action and secondary plan browsing; opening the yard and placing the owned planter moved available stock from one to zero. The first-home and expanded-owner examples showed 36 and 2 fictional kits respectively, and the poor example reported a 23-kit shortfall. These sample interactions do not establish production pricing, persistence, server authorization, concurrency or real item conservation.

The schematic street clearly labels itself as ground-footprint framing rather than finished art or actual playable housing. It offers six footprints and 24 address choices; selecting the last address at 320 updated the displayed address, and no horizontal overflow was measured in that viewport. Wide views show the parcel grid with decorative verges. **Remaining P2 design-evidence clarity:** the drawing uses green dots, a dark doorway, a gold strip and a white circle without an on-screen legend. A cold reader cannot reliably identify yard anchors, door/approach markers or the intended collision boundary from color alone. Add a short visible legend and explicitly distinguish the proposed solid footprint from the approach; a schematic still cannot prove actual movement or safe visitor transitions. The earlier completion and quote concerns are otherwise addressed in the inspected flows. The singular “1 planter(s)” remains P3 copy polish.

## V3 final targeted follow-up

Independently spot-checked frozen `http://127.0.0.1:4222/` and `/street.html` in Chrome at 2560×1440 and 320×640. Captures and SHA-256 hashes are in `../idle-hands-2-artifacts/housing-contract-2026-11-16/terra-review-v3/`. The street study now displays a concise legend identifying proposed walls, clear doorway path, front step and decorating spots before the diagram, alongside its explicit schematic/no-game-change disclosure. It is readable in both inspected layouts; no horizontal overflow was measured. This addresses the V2 diagram-clarity finding, without establishing actual collision or visitor safety.

In a fresh fictional first-home example at 320, keyboard opening focused visible Close; the quote showed 36 kits and stated the rental remains usable and the new parcel reserved. After confirming, advancing the fictional clock and finishing, the study showed the first address, eight nooks and the primary Arrange your yard action; the yard displayed “1 planter” rather than “1 planter(s).” This addresses the sampled wording and completion concerns. No P2 visual or interaction blocker was observed in this targeted pass. The rehearsal remains in-memory and unregistered; this check is not evidence of SQL authority, production purchases, persistence, actual collision, a physical device, or the results of the separate broad regression.

## V4 exact-final compiled study spot check

Independently sampled `http://127.0.0.1:4223/` and `/street.html` at 2560×1440 and 320×640 in fresh Chrome contexts. Keyboard opening of the starter-owner quote focused the visible Close control on both; the quote displayed 24 kits, a 24-kit remaining balance, six hours and continued home/furnishing access. Confirming, advancing the fictional clock and finishing led to the updated eight-nook home and Arrange your yard action at both sizes. The street legend remained readable in the sampled views and the 320 document had no horizontal overflow. No new visual or interaction blocker was observed in this bounded spot check.

Screenshots, captured text and SHA-256 hashes are in `../idle-hands-2-artifacts/housing-contract-2026-11-16/terra-review-v4/review.json`. This is an in-memory unregistered rehearsal and schematic, not a physical-device, live transaction, persistence, SQL-authority or full-regression certification. The separate broad checks and source acceptance have their own evidence.
