# Pacing, construction and recovery experiment

2026-11-10 · IH2-054 · **Design evidence, not a new game rule or release.** No account, server, database or runtime save is read or changed. Region names below are candidate design references: Ledgerwick, Inkwood, Pumpworks, Mossbank and Bellwether Quay.

The model supports slow permanent housing, but exposes two unfinished parts of the first session: the existing twelve-hour first contribution gap, and a shortage of scrap after a faster full-cost teaching kit. A separate paid maintenance lesson resolves those two arithmetic problems without making an inventory kit; its shared-project and quest migration still need design and runtime proof. The current three-kit bridge also provides useful work to at most three people before it closes. Neither a shorter lesson nor a build timer solves newcomer participation by itself.

## Reproduce and inspect

From the sequel repository:

```sh
node --experimental-strip-types tools/simulate-design-pacing.ts
node --experimental-strip-types --test tests/design-pacing.test.ts
```

The first command deterministically regenerates these committed, synthetic artifacts:

- [Full inputs, source fingerprints and results](../../evidence/IH2-054/pacing-experiment.json)
- [Cohort spending ledger](../../evidence/IH2-054/pacing-cohorts.csv)
- [Group/project demand](../../evidence/IH2-054/pacing-groups.csv)
- [Recovery alternatives](../../evidence/IH2-054/pacing-recovery.csv)

The executable is [simulate-design-pacing.ts](../../../tools/simulate-design-pacing.ts); meaningful checks are in [design-pacing.test.ts](../../../tests/design-pacing.test.ts). No extra libraries are installed. The report fingerprints the current workshop, housing rules and server-store source. Regenerate it if those sources change.

## Implemented rules versus model choices

| Source-implemented contract imported or reflected | Treatment here |
|---|---|
| Three personal depots, initially six each; one unit per four hours; six per depot; elapsed recovery capped at 24 hours | Imported capacities/times; generated, gathered, remaining and consumed units are conserved. A full depot does not bank future recovery. |
| Sixty materials of carrying capacity; 99 kit output storage | Imported. Gathering stops at available space. Jobs do not repeat automatically. |
| First planter costs 2 scrap, 2 timber, 1 supplies and takes five seconds | Same costs; make and place once before kit production. |
| Bridge kit costs 3 scrap, 2 timber, 1 supplies and takes twelve hours | Every ordinary job uses those constants. Completed work waits until a visit collects it. |
| One contribution spends one completed kit; current shared bridge accepts three total | Personal spending row assumes **one accepted contribution**. Separate group rows show why this is not available to every member of a twelve-person town. |
| A plot costs 12 kits and the one upgrade costs 24 additional kits | Actual deductions, not the earlier cumulative-stock proxies. Ownership/upgrades are existing records; a physical playable house is still future work. |
| Permanent property, inventory and jobs survive weekly score turnover | The experiment clears only its score at seven-day observation checkpoints. Exact Friday 4 PM Pacific scheduling remains the existing server test's responsibility. |

The model independently applies these rules using source constants; it does **not** execute database commands. It is economic/design evidence, not a second authority implementation or proof of concurrent server correctness.

Reversible, **unimplemented** comparisons:

- A separate once-only maintenance lesson consumes **1 scrap / 1 timber / 1 supplies**, takes 60 seconds and records one nontradeable orientation/project credit. It creates no inventory kit, cannot pay for housing and does not shorten later jobs.
- First full kit once at 60 seconds or 300 seconds, with the full ordinary material cost. Every subsequent kit remains twelve hours. This is a teaching-path candidate, not a stock grant or repeatable express recipe.
- Six hours of construction after home/bridge materials; twelve hours after upgrade materials. Plot rights persist during the proposed work. These timer values are samples to inspect, not final prices or promised waits for every item.
- A 30-minute corpse window versus 60 minutes, measured server-outage grace, or fee-free lost-and-found at six hours after expiry. Droppable categories, final window, loss, equipment treatment and grace policy remain unsettled.

## Cohorts and accounting

Simulated for 42 days. Idle: one ten-minute visit daily. Regular: two fifteen-minute visits, twelve hours apart. Active: four thirty-minute visits. A visit can wait for a job due before its own end. More clicks or online minutes do not multiply output. A material is collected only while less than 18 of that material is carried; this reserve-space strategy is a model assumption, not an additional game limit.

Cohort actions omit movement, reading and thinking time. A separate first-session estimate below includes those explicitly. Schedules and choices are optimistic and deterministic; this does not measure player enjoyment, retention or actual device speed.

Each personal row prioritizes one accepted project contribution (an inventory kit in the source/full-kit comparisons, or a separate maintenance credit in the guided candidate), then pays 12 for the plot and 24 more for the upgrade. The accounting identity is:

`produced kits = kits held + bridge spent + plot spent + upgrade spent`

For each material:

`initial depot units + recovered units = depot units + carried units + recipe inputs spent`

All twelve six-week rows conserve those quantities. Maximum observed material storage includes the moment immediately after gathering, before recipe spending; the idle row reaches the real 60-unit limit.

| Current rules; elapsed since first playable visit | Idle | Regular | Active |
|---|---:|---:|---:|
| First completed kit / accepted donation | 24 h | 12 h + 5 s | 12 h + 5 s |
| Plot paid for, after the donation | 13 days | 6.5 days | 6.5 days |
| Upgrade paid for, after donation + plot | 37 days | 18.5 days | 18.5 days |
| Kits completed in six weeks | 41 | 83 | 83 |
| Kits actually spent | 37 | 37 | 37 |
| Kits still held | 4 | 46 | 46 |

The active cohort does not outrun regular production in this small loop. That is a useful anti-click-income result, **not** evidence that two hours of active play is fun: there are not yet enough meaningful activities to fill those hours. Add depth/choices rather than raising exponential yield.

Both shorter full-kit teaching candidates still finish with 41/83/83 kits under these resource/visit constraints. They move the first contribution forward, not the end of six weeks. Candidate construction adds a six-hour home deadline and twelve-hour upgrade deadline. One-visit players first observe those openings at their next visit: home ready at 13.25 days, observed at day 14; upgrade ready at 37.5 days, observed at day 38. No attendance reward, missed-opening penalty or creative-work reset is applied.

Regular absence on model days 8–14 produces 69 kits rather than 83. The plot already acquired remains; the upgrade is paid at 25.5 rather than 18.5 days. The queued job waits up to seven days after finishing and is collected once. There is no streak loss, retroactive wipe or unlimited offline repeating queue.

## First-session lesson: sixty versus three hundred seconds

The cohort engine deliberately has zero travel overhead. Do not confuse its 65-second first-kit timestamp with a 65-second complete introduction. This separate estimate begins at the **first playable input**, after any character creation. Creating a name/look/backstory is additional time and must be skippable/revisitable rather than hidden in this budget.

| Estimated task seconds | Direct first visit | Slower phone / more reading |
|---|---:|---:|
| Arrival note / resident | 45 | 75 |
| Three depot interactions | 45 | 90 |
| Walk to workshop | 30 | 60 |
| First planter | 5 | 5 |
| Place planter | 25 | 45 |
| Walk to bridge after collecting kit | 30 | 60 |

| Teaching-kit duration | Direct total contribution time | Slower phone total | Lesson time beyond suggested parallel activity |
|---|---:|---:|---:|
| 60 seconds | 4 minutes | 6 min 35 s | 0 seconds |
| 300 seconds | 8 minutes | 10 min 35 s | 240 seconds |
| Existing twelve hours | Over twelve hours | Over twelve hours | Not a first-session loop |

During a short lesson, the player can freely arrange an existing furnishing and read the journal/resident note; 60 seconds is budgeted for these suggestions. They do not give materials, speed up production or require busywork clicks. These are **design time estimates**, not measured playtests. A five-minute timer alone cannot meet the roughly five-minute first-contribution target; on a slower phone it exceeds the entire ten-minute idle visit. Sixty seconds is the stronger candidate to prototype, while even that path exceeds five minutes with slower reading. Do not rush the player or force a marketing time claim.

**Unresolved material bottleneck:** full initial depots give 6/6/6. The planter leaves 4 scrap / 4 timber / 5 supplies. The normal-cost teaching kit leaves **1 scrap / 2 timber / 4 supplies**. A second kit needs two more scrap, about eight hours of recovery. The bench therefore sits empty after the teaching kit instead of holding a longer return job. The tests preserve this shortage; no extra materials are silently added to make the result look good. IH2-052 must reconcile a useful first contribution with an honest next return goal, possibly through a distinct bounded lesson/recipe choice. Do not adopt the timer change alone and call onboarding finished.

## Bounded alternative: paid maintenance, not a free kit

The **paid-maintenance-candidate** is a different lesson, not a 60-second version of the tradeable recipe. After the planter, it consumes one unit of each material, takes sixty seconds, and emits one stable nontradeable orientation credit. Completion and contribution have distinct once-only receipts; retrying either emits no second credit. The housing rules read only inventory kits, so this receipt cannot buy a plot or upgrade.

The material sequence is explicit:

`6/6/6 gathered → planter leaves4/4/5 → maintenance leaves3/3/4 → queue ordinary kit, leaving0/1/3`

All three cohorts finish the first modeled session with the ordinary **12-hour** job queued, zero completed inventory kits and one recorded orientation contribution. The 60-second first-session travel estimates above apply to completing the lesson/contribution, not to receiving a kit. Normal kit inputs, recovery, housing prices and initial bin stock are untouched. The arithmetic model has no grants.

| Paid maintenance candidate; elapsed after first visit | Idle | Regular | Active |
|---|---:|---:|---:|
| Orientation/project credit, excluding travel overhead | 65 s | 65 s | 65 s |
| First real kit collected | 24 h | 12 h 65 s | 12 h 65 s |
| Plot paid | 12 days | About6 days | About6 days |
| Candidate physical home ready | 12.25 days | About6.25 days | About6.25 days |
| Upgrade paid | 36 days | About18 days | About18 days |
| Real kits completed / held at six weeks | 41 / 5 | 83 / 47 | 83 / 47 |
| Real kits spent on plot + upgrade | 36 | 36 | 36 |

Compared with an accepted one-kit donation, one fewer inventory kit is spent because the player paid three raw materials for the maintenance contribution instead. That moves plot/upgrade payment forward by about one daily visit or half a regular day; it does not create compounding income or collapse housing into the first afternoon. It is an optimistic scheduled model, not proof that these final durations feel right.

This is the strongest **candidate** for IH2-052: it resolves the empty-bench arithmetic while teaching a visible contribution. It is not yet the runtime design. The current shared bridge accepts inventory kits only. Before charging for the lesson, define the maintenance-credit transaction and project stage, its stable quest-content migration, and what happens when the bridge is already restored. A completed bridge must remain completed. A personal maintenance errand or follow-on target may provide equivalent visible credit, but neither is silently assumed implemented. A three-unit project still closes after three accepted contributors, so the wider newcomer issue remains open for053.

## Materials plus construction, once only

The construction model accepts one kit per stable contribution receipt. The final required contribution sets `readyAt` exactly once. Extra or replayed contributions spend nothing and cannot restart the timer. Before that deadline there is no opening. The first later observation records one stable opening receipt, with both the logical ready time and the observed time preserved; subsequent reads do not repeat the event. This is a candidate state contract for later authoritative implementation, not a background database tick.

The proposed stages remain `proposed → contributions complete → construction/inspection → ready → opened`. The arithmetic helper compresses proposed/contributing into its input and records an opening on observation after readiness. Presentation can show a brief celebration and replayable journal entry; exact attendance is never required. The 60-second maintenance lesson can teach contributing while the **shared** build timer remains independent.

## Group size, absence and newcomer usefulness

This is a **separate project-demand experiment**. It replays production times as potential donations before personal purchases; do not add its donation counts to the personal housing ledger. No per-person donation cap or mandatory attendance is imposed. Same-time events use a stable synthetic order, not a designed priority system.

| Current three-kit bridge, regular visits | Materials complete since common first visit | Distinct contributors |
|---|---:|---:|
| One person | 36 h + 5 s | 1 |
| Three people | 12 h + 5 s | 3 |
| Twelve people | 12 h + 5 s | 3 |
| Three, one absent first week | 24 h + 5 s | 2 |
| Twelve, one absent first week | 12 h + 5 s | 3 |

A sixty-second teaching kit plus a candidate six-hour construction timer makes a three-person bridge ready about six hours and 65 seconds after their common first visit, before travel overhead. It does not make all twelve residents useful: three slots are still three slots. A player joining on day 14 has zero accepted contributions to an already-completed bridge in both the three- and twelve-person cases; rejected extras are **not** charged. If the only player arrives on day 14, the entire group's start shifts accordingly.

This is an open design issue for IH2-053. Preserve the completed bridge; do not artificially hold it hostage until everyone attends. Follow-on restoration demand and useful personal/newcomer errands need their own transparent targets and content. Larger targets alone can burden small/absent groups, and this experiment has not selected the correct scaling rule. No claim that newcomer participation is solved.

### Candidate upkeep route after construction fills

A second paid-maintenance comparison makes the late-join contract concrete without changing the existing three-slot finding. Every resident's once-only 1/1/1, sixty-second lesson yields a nontradeable credit. While the proposed project is collecting, its first three accepted credits advance construction. Once materials are full, building has started or opening is complete, the same lesson records **upkeep/inspection** in a separate per-resident ledger. Upkeep does not increase the construction total, change its target, shorten/restart its deadline or replay the opening.

| Candidate, twelve residents | Construction credits | Upkeep credits | Residents with first-session lesson recognition | Lesson materials spent |
|---|---:|---:|---:|---|
| All join initially | 3 | 9 | 12 | 12 scrap +12 timber +12 supplies |
| Last resident joins day14 | 3 | 9 | 12 | Same |

The day14 resident records upkeep instead of being told to repair an already-repaired bridge. A stable resident/content-version receipt allows only one recognition: retries move no second credit and spend no second materials. The model routes an **already-paid** credit, so it never debits the three materials a second time. There are no inventory kits, currency or competition-score rewards from this routing step. Tests retain exact construction state during building and after opening, and conserve each resident's material and kit ledger.

This is a candidate transaction/quest contract for052/053, not an implemented solution. The future server must decide the route before presenting the paid lesson, validate the resident and materials, and atomically commit lesson completion, nontradeable credit redemption, the correct construction/upkeep entry and quest progress. Existing completed bridge state and previous orientation receipts need an explicit content-version migration, with no repeat charge or reset. A once-only inspection solves a first-session recognition gap, not the whole long-term demand for useful newcomer work; further restoration and personal goals are still needed.

## Corpse recovery: thirty minutes is not automatically phone-friendly

Ten carried material units are droppable and four essential units protected in these candidate arithmetic cases. Homes, décor, plot rights, skills and account progression never enter the dropped ledger. Equipped-item drops are **not decided** here. Current runtime has no combat, health, death, corpses or lost-and-found.

| Candidate region/scenario | Travel + interruption/outage | Hard 30-minute outcome | Longer 60-minute outcome |
|---|---:|---|---|
| Inkwood near trail | 8 min | Recover all | Recover all |
| Pumpworks dungeon | 20 + 12 = 32 min | Lose 10 carried units | Recover all |
| Inkwood–Mossbank approach / phone interruption | 18 + 15 = 33 min | Lose 10 carried units | Recover all |
| Bellwether Quay disconnect | 8 + 31 = 39 min | Lose 10 carried units | Recover all |
| Inkwood service outage | 15 + 20 = 35 min | Lose 10 without grace | Recover all |
| Pumpworks instance closed | 18 min, route unavailable | Inaccessible, then lose 10 | Still inaccessible |

Four timer cases that miss thirty minutes recover under sixty minutes; a larger number **does not fix an inaccessible dungeon**. A measured twenty-minute service-outage grace fixes the outage example while preserving a thirty-minute personal window; it does not excuse every disconnect. Final grace policy needs authoritative outage accounting and abuse review. The model does not measure real travel or outage distributions.

The softer comparison holds expired loot for fee-free lost-and-found, available six hours after the deadline: 390 minutes after death in these examples. It avoids irreversible loss but creates a long inventory delay. That delay is also provisional and may be excessive; no fee or final loss policy is selected. Even a 30-minute route requirement can conflict with a short idle visit when a phone interruption occurs.

As an explicit **candidate convention, not a final owner-approved policy**, the helper uses an **inclusive** exact deadline (`now <= deadline` can recover); one millisecond later takes the selected expiry branch. Owner checks, free-bag capacity, partial recovery, successful-receipt replay, protected items and conservation are tested. Distinct death objects are retained independently; the arithmetic helper is not a global corpse registry. Unique death receipts, concurrent transfers, failure-receipt semantics, authoritative capacity, repeated-death storage limits, retained instance access, restart and recovery UI must be proven in the future runtime slice. Do not infer secure multiplayer inventory from this simulation.

## Decisions this evidence supports

- Keep ordinary 12-hour jobs, bounded recovery/storage and 12 + 24 housing spending as provisional baselines for the next playable slice; six-week results do not require cheapening them.
- Prefer prototyping the **paid 1/1/1, 60-second maintenance lesson** over the full-cost fast-kit options: it leaves a normal return job queued. Resolve shared-stage/already-restored quest migration and measure a real phone introduction before selecting the final flow; do not ship the credit as currency.
- Keep materials and construction deadlines distinct. Preserve work through missed openings, disconnects and weekly scores. Do not place arbitrary timers on every decoration.
- Treat the three-slot bridge/newcomer gap as unfinished content design. Add useful later work without deleting restoration or requiring every member's attendance.
- Leave corpse time/loss/equipment policy open. Test actual phone travel and interruptions, a reachable recovery route and a softer expiry alternative before committing to irreversible loss.

Twelve focused tests pass: material/kit conservation and actual deductions; once-only full-kit comparisons and bounded output; separate paid maintenance-credit conservation and a queued ordinary job; construction replay/deadline/opening; absence/weekly preservation; group closure/newcomer limits; separate once-only upkeep routing and fixed construction state; owner/capacity/partial loot/replay; deadline/outage/instance cases; first-session estimates; invalid/negative/unbounded/overlapping policies; and deterministic CLI artifacts. Full repository checks and CI remain the owning task's separate gates.
