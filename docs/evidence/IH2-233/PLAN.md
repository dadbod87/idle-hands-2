# IH2-233 · Glasshouse restoration command contract

The existing Inkwood ruin is still closed in the game. This standalone contract is the next step toward turning it into a cooperative project without risking the accepted town.

Three jobs use different kinds of progress. A resident without stock or observations can clear the path. A carpenter can review a two-pine frame contribution. A trail explorer can turn in a planting chart using the three existing stamps, which remain private and owned. One resident can do all three jobs. Several neighbors can divide the work and arrive in any order. On the first ordinary gather, six pine minus the proposed two-pine contribution leaves four for the existing easel.

The draft holds twelve real hours after the final accepted job. This is a trial value for pacing review. The deadline neither needs a player online nor changes after a duplicate request. Late arrivals can take the same free visit and optionally choose one of two original plant concepts. A tour or keepsake is not playable yet. Showing visible projects and maintaining several ways to contribute are ideas from broad progression baselines, including the original developer's description of community restoration and parallel skills in [Stardew Valley](https://www.stardewvalley.net/about/).

## Contract verified in isolation

A stored two-minute review binds one resident, one task, its version and the exact price. Current trusted location, seed-independent field notes and stock still govern the confirmation. The active review of one task remains eligible through another task's independent completion. A second frame volunteer's review spends nothing. Public projection includes only the three completion states, construction phase and deadline. It leaves out contributor IDs, inventories, trail stamps and chosen private rewards.

The pure tests cover solo and three-resident play in all six orderings, a losing duplicate, altered or expired reviews, movement before confirmation, insufficient stock, rejected clock and corruption, deadline boundaries and equal late-tour eligibility. They exercise ordered outcomes only, with no database, API or concurrent SQL transaction. The working scene, stored game data and existing player rights are untouched by this design branch.

## Next integration boundary

Persist the project, known saved reviews and command receipts. Lock the project and actor with the current session movement and transaction arrangement. One transaction must commit an accepted completion, the payer's real two-pine debit with an explicit new conservation ledger field, and the idempotent receipt. A schema change must preserve every old carpentry, commission, easel and hamper number; ordinary reducers must use the debited carried pine. Never synthesize a debit using the commission counter or hide a reservation from the Bag.

Build the visible three-task board and design-specific art together with the real guarded commands. Give a late visitor a distinct tour and permanent cosmetic with explicit placement and visitor visibility. Check loss of a committed reply, stale quotes, expired location, two concurrent payers, old saves, 320px touch, accessibility and close/reload. Full exact source and isolated fresh-database validation are required before any shared change.
