# IH2-204 · Inkwood Glasshouse concept

Inkwood already tells the story of a trail restored by the town. The next project can make that story deeper by asking for three different kinds of help. One person can do each job over time, or several players can divide the work. A new player gets a worthwhile visit after the restoration and keeps every existing bridge and housing milestone.

[Open the three-stage design study](study/index.html). The world illustration and project text are original examples. The study has no building entrance, shared state, inventory writes or game economy.

## Proposed playthrough

| Stage | What the player does | What changes |
| --- | --- | --- |
| Overgrown | Follow the established Inkwood walk. Choose a free entrance clearing with borrowed gloves, a pine contribution, or a planting chart using observations already in the Journal. | Each job fills its own line on the town board. Neighbors can see which work still needs help. The original Journal stamps stay with their owners. |
| Under repair | Once all three jobs are complete, the crew fits the glass on a real deadline. Leave to work, visit a neighbor or try the Riverwalk. | Show a cleared path, boards around the frame and the work barrier. The deadline belongs to the project and passes while everyone is away. |
| Open | The new groundskeeper greets both the original volunteers and late arrivals. An optional first tour offers a choice of one permanent houseplant keepsake. | Lamps, trays and an open door show what town work achieved. The opening animation can be seen once after arriving, and the nursery remains accessible afterwards. |

The existing bridge and noticeboard already show a shared counter and a timer. This project's different contribution paths are the reason to make it. The free entrance job gives someone with an empty Bag a reason to take the trip. The pine job gives carrying materials a deliberate alternate use. The chart turns a private discovery into a public task while preserving the private Journal. The precise pine amount, chart threshold and build duration need comparison with the current starter, housing and crafting routes before tuning.

## Authority and pacing to prove before implementation

- Treat the project and each of its three tasks as a committed, versioned record. Preserve the first valid completion for each task and a single deadline after the final one.
- Require the appropriate authenticated resident/location and the current task step. Consume pine only when the player confirms a current quoted contribution. A stale or repeated request changes neither the player's stack nor the project. The free task and chart issue no stock.
- Allow the same person to complete all three jobs and different people to work in any order. Try a new arrival who only has time for one short visit and an established carpenter who is saving for a house or easel. Avoid mandatory logins, exclusive attendance rewards, and repeating the three jobs after completion.
- Make the tour claim once per resident and version. Before the reward exists, specify how placement, visitor visibility, moving the keepsake and a packed home are handled. Keep plants cosmetic and existing garden seeds, harvests and pantry balances independent.
- Compare a solo player, three players acting concurrently, a last-minute duplicate, a late arrival after the build, and a player who is absent through opening. Review the first and last state on 320px touch and 200% short landscape. Advance only after existing bridge, trail, garden, housing and recipe routes continue to pass.

The trail walkthrough should use the current scale and foot anchors. A later asset acceptance needs daytime/nighttime sprites, approach and touch hit areas, a reduced-motion opening, a door-front exit and Bag/world silhouettes for the plant. This study provides the three building states and copy only.

## First pacing comparison and layout evidence

Nella’s existing lesson, equip and gather actions produced six pine in the first shared-per-resident deadfall pool. A second gather recovered one bundle after each four-hour boundary. An easel needs four pine and a marigold. A proposed one- or two-pine contribution leaves enough pine for the first easel. A three-pine contribution introduces a four-hour material wait and four pine introduces eight hours, before any other needs. Two pine is the starting balance candidate. This comparison did not perform or persist a new debit, account for travel, or decide the final build timer.

The current pine ledger reconciles every spent bundle against easels, hampers and commission costs. A future contribution needs its own reconciled debit source, old-save default and the same transaction as the project result. Reusing the commission counter would lose that distinction.

All three stages passed desktop keyboard, 320px touch and 844×390 at 200% text, for nine layout cases. Targets are at least 44px, the narrow page has no horizontal overflow, and the file preview made no outbound requests. Terra 6.1 confirmed that ivy and a blocked path, repair boards and an open doorway distinguish the states visually. The short header was compacted and the initial rows now say “Proposed volunteer jobs” so a concept does not look like a working job board. Verify the study in the final protocol on an actual phone before it informs runtime acceptance.
