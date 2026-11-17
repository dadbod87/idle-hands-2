# Woodland outing — proposed integration contract

November 17, 2026. Design proposal over `9a517c5`, not game implementation, a migration, economy approval or task117acceptance. The [standalone rehearsal](../../../tools/woodland-rehearsal/README.md) establishes a few route/tool affordances. It does not establish session depth, replay interest, server authority or real cooperation. The [active-play audit](ACTIVE_PLAY_REVIEW.md) remains the evidence for the busy/full-player gap.

## Selected next proof

First prove a short outing with a visible repaired waymarker and a private journal outcome. It must work when both production slots are busy, material/produce/pine stores are full and the introductory collections are complete. Do not pay ordinary resources or existing practice counters in that first proof. This is a proposed narrow integration target after the current home-update gate, not a new registered command or permission to skip it.

The outcome connects to the town as a visible route improvement and a record of something the resident did. A later earned home display could tell that story, but a journal entry is not a furnishing and grants no extra owned copy or nook. The trial must determine whether the outing itself is worthwhile; another permanent checkbox is not proof of repeatable fun.

Preserve the workday rhythm: enter or leave freely, no rare meeting window, no fee for the last starter material, no lost home/crop/skill progress, and no requirement to watch another timer. Aim for meaningful movement and hands-on repair choices before increasing map size. The current seconds-long diagram does not yet meet the three-to-five-minute play target; do not insert a forced wait to meet it.

## Existing facts that constrain the design

These are source-inspected facts at the checkpoint, not new system-test claims:

| Existing boundary | Source | Consequence for an outing |
|---|---|---|
| Pine has one personal six-unit pool, one bundle per four real hours, carried cap24; three deadfalls share it | `src/game/carpentry.ts`, `CARPENTRY_RULES`, `settleCarpentry`, `gather-pine` | A second outing pool would add entitlement. A claim from the existing pool must debit that same pool and respect current carried space. |
| Pine gathered equals carried plus spent; spent is tied to easels, hampers and the commission | `carpentrySchema` refinement | An outing cannot silently consume wood through an invented old sink. A new use requires an explicit versioned ledger and migration. |
| Carpentry practice equals three times produced easels plus hampers | `carpentrySchema` refinement | Giving existing carpentry practice for a repair would violate the current contract. Do not disguise a repair as a hamper or easel. |
| Garden harvest, consumption and practice are checked against their histories; the current café-era boundary owns the registered root | `src/game/garden.ts`, `live-garden.ts`, `live-workshop.ts` | New food/supply use cannot masquerade as an old garden request or feed a legacy writer that loses current sinks. |
| Rental, indoor and yard furnishing allocations share owned copies | `src/game/live-home-layout.ts`, `server/live-store.ts` | A future keepsake must enter owned inventory once and use the same allocation rules; borrowed outing tools are not furniture. |
| Registered shared requests use signed identity, revision, context/proximity and transactional receipts keyed to player/command with payload hashes | `server/http.ts`, `server/live-store.ts` | Reuse the authority boundary deliberately. The resettable rehearsal's local state is never proof that a resident repaired a shared object. |
| Current shared protocol is8 | `src/game/protocol-version.ts` | Any future breaking context/schema change needs a reviewed cached-client gate; this note changes no protocol. |

The ordinary gathering/making and garden/carpentry counters are useful records. They are not an already implemented UO-style specialty tree. Keep the old equations intact until an explicit skill migration is selected.

## Why a material reward is a separate decision

The reproducible [budget study](../../evidence/outing-contract-2026-11-17/budget-study.json) enumerates all175integer pool/carried tuples and350action-order cases using the current6/24limits. It applies100hypothetical one-pine outing claims plus one ordinary batch claim, both orders, with no elapsed time. When both draw from the same pool, conservation holds and the total cannot exceed the original available stock or carried space. Seven full-storage tuples yield no outing material.

This is an analytical candidate, not actual command execution, server concurrency or a validated reward implementation. Reproduce with `node --experimental-strip-types tools/outing-budget-study.mjs`; output defaults to ignored `test-results/outing-budget-study.json`.

| Proposed payout | Judgment |
|---|---|
| Free pine per repeat from another counter | Reject: bypasses current entitlement and enables click farming. |
| Pine drawn from the existing personal pool | Potential optional delivery later. It competes with ordinary gathering and still gives no material payoff to full/empty-pool players. It is not the core solution to the audited gap. |
| Existing making/carpentry practice per repair | Hold: requires an explicit skill-ledger change; do not award through an unrelated existing action. |
| One private journal outcome and a visibly repaired sign | Selected first proof. Works independently of storage; remains finite unless varied play and subsequent useful purposes are established. |
| A new house keepsake or restoration contribution | Later bounded slice with explicit ownership, allocation, pacing and audience rules. Not granted by this contract. |

If a later material delivery is selected, preview what can actually be claimed from current stock and capacity. Do not promise a reward at departure while silently letting another action consume it. Either specify and test a real reservation, or state that delivery is optional and quoted at return. A full bag must never cause a previously committed reward to be discarded. Uncommitted entitlement must not be described as a held item. No generic overflow mailbox or new capacity is implied.

## Proposed ownership and command boundary

Keep one active outing per resident, with a server-issued run identity and content version. The server chooses the variant and owns the completed objectives, borrowed-tool choice and outcome. The client requests an action; it does not submit trusted completion flags, arbitrary coordinates or a reward amount. Starting again returns the existing active outing until it is completed or deliberately left. Exact shapes/limits remain to be implemented and reviewed, not assumed present.

The brace/rope in the rehearsal are temporary choices, not existing inventory IDs or a general equipment system. In an integrated proof, keep them scoped to the outing with explicit acquire/exchange/return actions and no sale, transfer or wardrobe implication. Leaving returns the temporary tool without touching the owned hand saw. A shared equipment view must distinguish permanent ownership from this temporary activity state.

For each proposed start/action/finish/leave request:

1. Resolve identity and permitted run audience from the current authority boundary. A resident may only act on, or read a private receipt for, their own authorized outing.
2. Lock the owning state and any shared objective in one documented order. Check command UUID and exact payload replay before fresh-action revision/proximity gates: a successful request retried after movement or a later revision must return its recorded result without performing it again. A reused UUID with a different payload is refused. Existing protocol/authentication gates still apply.
3. For a new request, validate revision, content version, trusted room/proximity and action prerequisites before any debit or durable outcome. A direct HTTP request from home cannot repair a distant object. Enforce semantic once-only completion for the same run/objective even with a new UUID; a new request ID must not manufacture another outcome.
4. Commit outcome, journal record, any future reward and receipt atomically. The first proof has no material/skill debit or reward. The animation begins only after confirmed state; animation frames never perform settlement.
5. On lost replies, retry the same intent and show the confirmed result. On stale state, refresh and re-review; never silently translate a failed repair into another purchase or action. Keep an explicit safe return path.

A journal completion cannot be awarded twice by finish/leave/reconnect or simultaneously by two tabs. A leave-before-completion event must not count as a successful repair. Keep the final result and any shared effect separate: the resident can complete a personal outcome after an already completed town objective without receiving fictitious new public credit.

## Solo and cooperative progression

First make the outing genuinely completable alone. Different residents may later contribute complementary repairs asynchronously. Do not require two people to hold a button at the same moment, a named absent coworker, or a minimum unique-player count to unblock personal progress.

For a future shared restoration, record each eligible repair once against an explicit project/objective identity, cap public credits at the target and fix the terminal state once. Two simultaneous last repairs must not double-charge or award duplicate public completion. A resident keeps the personal outcome when a public target is already full. Share only the permitted aggregate/visible repair state; private run routes, bag contents and equipment are not a public roster by default.

Project size, condition variety and contribution limits are still open. Three instant repeated clicks must not masquerade as a multi-day town goal. Measure the actual solo and group schedules before choosing a threshold. Do not reuse bridge, café or easel credit counters to avoid creating an outing ledger. Synthetic characters or role toggles do not establish enjoyable human cooperation.

## Persistence and required evidence before integration acceptance

An integrated run must survive close/reload/reconnect without losing old work or claiming a local mock repair as a server result. Use additive forward state evolution, preserve applied migration bytes and exact old fields, and refuse unsupported cached writers safely. Browser-only and signed shared practice need separate verified persistence paths; do not apply the rehearsal's intentional reload reset to durable game progress.

The bounded implementation's evidence must cover:

- Fresh, busy/full, returning and late-joining residents, both variants, wrong tool, detour, free exchange, unfinished leave, successful return and a changed second visit.
- Trusted position/run/owner checks; stale revision; same-ID/same-payload replay; same-ID/different-payload refusal; a new ID against an already completed objective; two-tab completion; interruption before/after commit; reload and real restart/restore.
- Exact preservation of existing inventory, deadlines, garden/carpentry histories, permanent equipment, owned home/address and all furniture allocations. No new skill or material output in the first proof.
- Desktop/narrow/short/enlarged-text actual-game controls, keyboard focus, reachable44pxactions, collision and return geometry, menu input lock, confirmed feedback, console/network and relevant Terra review. Rehearsal images cannot substitute for this.
- Current full domain/build/browser/design/plan/pinned checks and all required exact-final-head CI/artifact/main gates, then the preserved-preview acceptance in its actual owning workspace. No migration, merge or task closure follows from this document.

## Decision and next action

Proceed next with one hands-on repair interaction in the standalone rehearsal, if it changes a meaningful decision rather than adding a text quiz or delay. The next integration candidate should use the visible outcome/private journal contract above and preserve the old economy. Before integrating, resolve the existing home-update preview gate and select a bounded owning task. New durable rewards, a full skill tree, general equipment slots and shared restoration pacing each retain their own decision and evidence boundary.

Source inspection and the analytical study support this contract. No new runtime, visual, database, concurrency, full-suite or human-enjoyment result is claimed here.

Validation for this design checkpoint: the analytical script completed all175tuples/350orders with its conservation assertions; `npm run check:design` passed; `npm run check:plan` passed, including ten tracker tests; forty pinned skill files and `git diff --check` passed. Existing browser/model evidence belongs to the unchanged rehearsal, not to an integrated outing. No full-suite rerun or hosted CI was requested for this design-only backup.
