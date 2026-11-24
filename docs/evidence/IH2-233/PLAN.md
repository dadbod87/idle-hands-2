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

## Tour reward preview

[Try the two original plant choices](tour/index.html). The fern and sundew have distinct silhouettes and pots. The two large radio cards preview a choice, and the free confirmation produces a clear named receipt with focus. Reload for a fresh preview. This file-based design stores nothing and calls no game service. Desktop keyboard, a 320px phone and an enlarged short view each completed the choice. Terra found both silhouettes and the confirmation clear. The short view scrolls to the action and receipt.

## Pine conservation and volunteer-board rehearsal

The unregistered pine adapter has its own exact two-bundle history. It upgrades known valid carpenter records without changing an existing number, gives ordinary recipes the actual smaller carried count, and keeps the aggregate gathered/spent totals and old uses conserved. The combined model tests use the real saw lesson, first gather, planting, harvest and easel rules. A valid donation leaves four pine, the normal easel uses those four, and later refills still stop at the real 24-bundle cap. Invalid ledgers, too little current pine and a second review spend nothing. Ten model cases passed. The model still returns both prospective writes for an atomic store. It cannot demonstrate concurrent SQL, consumed command receipts or a game migration.

The [rehearsal board](board/index.html) runs against the exact model in a temporary local Vite session. Load it from the repository root at `/docs/evidence/IH2-233/board/`. It is clearly marked with fictional residents and supplies. Choose an empty-bag volunteer, review two competing frame offers, apply one, and let the later volunteer keep all six pine. A trail observer contributes their chart while keeping the original notes. After the explicit trial time advance, even the losing volunteer can choose a permanent plant in the rehearsal. None of these interactions reach a game service or persist a browser record.

Native desktop keyboard, 320px touch and short enlarged Chromium each completed the full board from first job through the late visitor’s tour. Terra verified the cost and complete confirm/cancel targets. The narrow review may scroll the resident’s starting balance out of view. Before real integration, show price and after-donation balance together in the confirmation and verify the same native flow against connected test actors. A real game release still needs transactional persistence and the full normal validation.

The final board keeps current and after-donation stock beside the cost. The reproducible client-only check is `node docs/evidence/IH2-233/board/check.mjs` from the repository root. The check uses a temporary local port and the standard pinned Playwright Chromium. It repeats the losing volunteer and late tour across the same three shapes.

## Facade artwork at game scale

The [three-facade study](facade/index.html) retains the actual game's 148×112 footprint and unchanged overgrown source. The original new repair art clears the brambles, braces the window and blocks the doorway with a striped barrier. The restored art opens the same doorway and adds warm lamps and seedlings. Browser captures checked identical image geometry across desktop, 320px and enlarged short views. Terra could tell the stages apart without captions and noted that the small barrier still needs the actual closed-door state and copy to make access unambiguous. These two prospective assets are deliberately outside the playable loading list.
