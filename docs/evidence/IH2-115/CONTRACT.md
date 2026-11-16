# Housing that keeps what people made

IH2-115 is an isolated ownership/construction contract and a usable rehearsal. It is not registered with the playable game's commands, save, HTTP service, renderer or automatically discovered migrations. The existing local town remains accepted114. No public/cloud launch or real accounts are involved.

## What the player should experience

Choose a home, see the complete price, confirm once, then keep using the old home while the crew works. Return whenever convenient; readiness has no attendance window. Finish once and arrange the yard. The family changes the physical footprint and amount of yard expression, not an income multiplier. A small house remains a worthwhile choice after expansion.

The rehearsal leads with the current home, address, earned nooks and available kits. Four illustrated family choices show space and yard tradeoffs. The price summary is beside the choices; a separate review shows each cost component, the total and remaining balance. Initial focus goes to a visible free Close action. Completed construction leads to **Arrange your yard**, with other purchases secondary. Technical and fictional-clock controls are optional and clearly separated.

## Version and costs

`src/design/housing-catalog-v1.json` is a frozen, deep-immutable catalog, independent of later art-proposal editing. A pinned hash test protects its six new forms, six exact legacy facades, geometry, rights and price/time constants. Future changes need a new catalog file/version and an explicit forward adapter; do not update v1's historical values to rebalance later purchases. Unknown account/catalog versions fail read-only, without default recovery or replacing raw data.

| Component | Candidate rule | Status |
|---|---|---|
| Starter home rights | 12 bridge kits | Retains the current benchmark |
| Expanded rights from starter | 24 additional bridge kits | Retains the current benchmark |
| First expanded home | 36 total bridge kits | No hidden additional family charge |
| Same-tier deliberate remodel | 2 bridge kits | Agent-selected candidate: one day of the existing 12-hour bench recipe |
| Family choice while acquiring a tier | Included | No second charge for taste or already-earned rights |
| Builders | One fixed 6-real-hour deadline | Agent-selected candidate from112; separate from every production queue |
| Reviewed quote | Valid for 2 minutes; expiry inclusive | A fresh review preserves the selected choice; no charge on refusal |
| Preview/cancel/arrangement/removal | Free | No materials, duplicate objects or reminted entitlements |

No general money wallet, premium currency, passive output, extra bench, extra garden beds, acceleration or real-money purchase is added. The normal kit recipe stays 3 scrap/2 timber/1 supplies and12hours. These are complete **candidate** purchase prices, unlike112's earlier tier-only comparison. No price is active in the town yet.

Yards accept only already-owned planters and the unique earned letterbox. Their current production/quest costs remain the source; no new yard recipe, grant or unpriced item is offered. New benches/lamps/fences/ornaments require separately priced recipes and art bounds before joining this catalog.

## Permanent rights and one allocation ledger

Legacy import copies the current SQL rows into a separate candidate schema, in one transaction, without updating or settling the source rows. It preserves the exact workshop tuple, original facade identifier, plot ID, bigint address, level, six/eight indoor nooks and both furnishing maps. The historical facade-selection algorithm is frozen independently of future renderer changes. Unsupported/corrupt inputs roll back the whole import; no partially imported town and no recovery default. Source rows and all seven applied migration checksums remain exact.

One candidate ledger counts rental placements, six ordinary home nooks, two expanded nooks and bounded yard positions against the same nine owned-prop counters. A move clears its source and fills its destination atomically. An unplaced copy must actually exist; a unique letterbox/teapot cannot appear twice. Placement counters follow existing placement behavior; crafted planters placed in rental/yard satisfy the once-only placement flag. Removing a furnishing does not delete ownership. No independent yard inventory is introduced.

An expanded owner cannot buy a starter downgrade. No sale/refund/relocation or forced remodel exists. A remodel that removes an occupied yard position lists the proposed Bag return in review. The final return is recomputed against the current yard at completion, so arranging during construction remains safe. Every displaced copy becomes available by removing its placement; owned counts never increase or decrease.

## Quotes, spending and construction

The dedicated candidate store accepts trusted caller identity separately from a strict command. Client-supplied actor/price fields and unknown cached versions are refused. A quote is persisted server-side, bound to owner, parcel, exact target, version, revision, components and expiry. Confirmation supplies only its ID, never a price. Current holdings/revision and exact quote contents are checked again under the owner row lock.

Lock order is owner account, then a transaction-scoped lock for the selected parcel. Different buyers for the same empty parcel have one winner; the loser keeps every kit. A unique persistent parcel key prevents duplicate ownership. No owner-to-owner lock cycle or whole-town write lock is introduced. Account debit, plot reservation, immutable build record and UUID receipt commit together. A simulated receipt-write failure rolls the entire action back. Identical retries return the original receipt; conflicting reuse cannot change it.

A build records one immutable startedAt/readyAt pair and paid components. Other arranging may advance revision but cannot move that deadline or charge again. The old home, furnishings and visitor entry remain authoritative until an explicit completion at/after readiness. Snapshot reads never silently spend, finish, or pretend that a virtual latch was saved. First-home construction reserves the parcel while the rental remains usable; public appearance may show reserved/building status without exposing the target quote or private stock.

Confirmation and completion are distinct UUID operations. A late return, process restart, database restart or restore retains the paid record. No cosmetic day/night clock, week boundary or browser timer can authorize completion.

## Geometry, visitors and the street

Every plan fits the existing 8×10 parcel; all24addresses, entrances and shared routes remain fixed. New building collision must use the selected visible ground footprint, not an invisible old full-sized wall. The diagram intentionally shows proposed ground shapes, not certified production facade artwork. The later original detailed runtime kit must align visible bodies, feet, doors and roof occlusion to these exact bounds.

Yard art is bounded to0.6tile width with defined ground radius; it is cosmetic and adds no collider. Placement anchors stay inside the parcel, clear of walls and away from the public doorway path. Owners use accessible menu targets; the later renderer must not put tiny decorative hits ahead of doorway navigation on phones.

Completion refuses while a trusted exterior occupant would be covered by the new footprint. Invalid occupant coordinates also fail closed; the crew waits and the old home stays open. Existing interior safe positions all remain safe in the continuous starter→expanded room model; entry/exit intent retains the exact plot instance, district and front-door point. Visitors may look and enter, but may not arrange, spend another player's kits or harvest private garden state.

**Integration boundary:** the isolated store has no actual HTTP authentication/proximity/presence service. Its caller identity and occupant list are trusted test inputs, not client-authorized values. A later integration must verify current server positions and hold the room/presence lock through completion and coherent occupant-room updates. The diagram and pure geometry tests do not prove that this is wired into movement today.

Wide-screen framing candidates add decorative verges around the same2048px block, sufficient for2K/4K without stretching houses or inventing owned neighbors. Walkable bounds, parcels and saved positions stay fixed. The optional street diagram has24schematic parcels, native address/plan selectors and a legend; it is not the actual game camera.

## Isolation, persistence and privacy

`HousingContractCandidate` refuses protected database names, remote/override URLs and the known protected55432cluster before connecting. Only ih2_housing_test/ih2_housing_restore are accepted; local tests explicitly use disposable55434. The candidate SQL lives outside discovered migrations in its own schema. Four tables use RLS, no public policies/grants and invoker-only trigger guards. Indexed owner/FK access and one-open-build uniqueness support the account/receipt checks. Current source migrations are unchanged.

Owner snapshots retain private state. Public projection is an allow-list of owner/plot/address, current appearance, earned level, displayed indoor/yard items and construction phase. It includes the existing permanent trail-pennant flag and letterbox motif only when physically displayed in this home/yard; a box kept in the private rental does not expose its motif here. The flag stays in the existing quest-awards table, not a duplicated entitlement ledger. A single batch public query avoids per-neighbor round trips. It omits inventory, seeds/produce, costs, quote IDs, paid history and unrelated progress. Read-only account/build projections share a repeatable-read snapshot and verify consistent unfinished history. This is a local store contract, not proof of real identity or a hosted Data API policy.

Tests cover exact source-row import/rollback, all nine earned furnishing types, one-owner/two-buyer concurrency, UUID replay/conflicts, unsupported versions, foreign/expired quotes, insufficient kits, storage interruption, immutable SQL history, first/expanded ownership, visitor intent, occupied geometry, separate jobs, late return, fresh-process reads and real pg_dump/restore. The existing required PostgreSQL restart also verifies housing history; no extra or protected restart is introduced.

The browser rehearsal is intentionally in memory: fictional48-kit examples, a valid synthetic owned planter and disclosed clock controls. Reload restarts it. It has no API, login, storage, actual purchase or persistence claim. SQL proofs and visual rehearsal are separate evidence. Desktop/phone/short/text checks use Chrome emulation, not physical devices or Safari.

## Next coherent slice

Keep the115dedicated-database guards intact; implement the trusted live adapter and additive migration rather than weakening a test guard to activate this class. IH2-116 should integrate one complete shared-practice purchase→construct→finish→arrange→visit loop, with current all-writer conservation, additive migration, explicit old-cache/protocol gate, trusted positions/presence locking, matched original art/collision and preserved legacy rooms/keys/data. Browser-only workshop saves have no owned shared home and must remain independent; do not invent a local home save migration merely to mirror SQL.

Future garden/bench conveniences must access the same three beds/single queue; do not advertise them as operational before they are implemented. Keep helpful activities available during builders, clear current actions before lore, and a visible creative payoff. Add new yard recipes or family features only after the coherent loop, not as unpriced controls.

References consulted for implementation review: [PostgreSQL16 generated columns](https://www.postgresql.org/docs/16/ddl-generated-columns.html), [explicit locking](https://www.postgresql.org/docs/16/explicit-locking.html). A BEFORE trigger validates the new account expression directly, since stored generated columns are computed later. No Supabase CLI/cloud feature, API exposure or provider upgrade is part of this task.
