# IH2-105 — Staged local café save protection

Implemented locally outside live entrypoints, branch feat/cafe-save-protection, baseee9537ebf3c30764e8cce61ff5f60a2b28cb9f17. All local checks are complete. No source/CI acceptance, live writer change or playable café release.

## Behavior

The new injected-storage adapter reloads the same current/fallback key only after acquiring the exact existing exclusive writer lock. It validates raw input, calculates the full candidate, serializes/writes the same current save key, then replaces confirmed in-memory state and exposes a tasting/reward result. A quota failure leaves stored bytes and last-confirmed stock/cooldown/entitlement unchanged. Outcome current=false distinguishes last-known data from a fresh read. Results are detached snapshots.

An unresolved operation retains its original expectedRevision and cosmetic selection. Retry reloads within the lock, never silently rebases and refuses an already-committed or newer revision even after cooldown. A completed retry cannot be retried into a second spend. Another action cannot replace a pending intent; cancellation cannot interrupt an active acquisition/commit. This is local revision-based spending safety, not durable UUID replay or server authority. A discarded post-commit reply is modelled by a new instance retrying the old expectedRevision; it gets stale progress, no new grant.

Load-only migration must write successfully before exposing a candidate as confirmed. Serving an unmigrated or fallback-key save requires an explicit load/upgrade first. Failed migration preserves the original formatted text; successful retry writes the existing v2 key without deleting the v1 fallback. A pending migration retry reloads another window’s newer committed migration/tasting instead of overwriting it. No missing-save starter grants, corrupt-current fallback, blind defaults, second project key, lock stealing or uncoordinated fallback writes. Missing/denied/rejected locks and read failures are explicit.

The actual live writer currently owns its lease for the tab lifetime. This candidate is deliberately not wired into that writer: eventual integration must reuse its coordinator/ownership, not attempt nested acquisition. No generic rewrite of existing unsaved-practice behavior occurred.

## Verification so far

- 13focused unit cases pass: save-return confirmation ordering, third-reward quota failure/retry, exact migration/fallback text, missing/corrupt/partial refusal, denied/unavailable locks, two-window/lost-confirmation stale behavior, immutable pending intents, read/clock failures, no-op/cooldown/completion, another window’s migration+serve and active cancellation guards.
- 3focused browser cases pass: actual native storage/Web Locks in fresh isolated Playwright contexts, real cross-tab denial/retry, third reward confirmation ordering and phone migration/corruption. Explicitly intercepted fixture HTML/module only; these do not load the game UI or a user profile. Quota errors are injected before native writes, not produced by filling real browser storage. No real player data or accepted fixture browser storage.
- Full local system372passed/0failed/0skipped in65,134.797458ms, including existing isolated PostgreSQL/HTTP/process/dump-restore coverage. No new database migration or café SQL is claimed.
- Strict build/design/plan and pinned checks pass; full browser139passed/0unexpected/0flaky/0skipped/0reporterrors in1,017,258.966ms. After the retry-availability consistency guard and test artifact-copy plumbing, the final native3cases were rerun successfully; their compiled fixture and ten exact source hashes are recorded. All208game bytes were identical throughout. Discovery70+69is disjoint and keeps the ordered family on2; original assertions/timeouts are unchanged.
- All208compiled game files match104byte-for-byte;202art unchanged; zero raw/gzip/download/game payload delta. New adapter and test harness are outside the live bundle. Live UI/root/garden/carpentry/commission/café rules/main/server/workflow and six migrations remain unchanged. No current analytical fingerprints need regeneration.
- Independent read-only review found no concrete defect; its test runs are not claimed as independently repeated. Protected practice and Tour all13tables/allfields/keys/sixchecksums, accepted090schema5API and54accepted study responses are unchanged.

The last interface check also made invalid requests report Retry unavailable while an operation is still active; final focused/system checks cover that guard. Native3cases were rechecked afterward with exact source/artifact provenance.

Initial focused test invocation exposed unsupported Node strip-only constructor parameter properties in the new module/test class. Converted them to ordinary declared fields and assignments; no test assertion was removed. Subsequent focused checks pass; failed log retained.

## Limits and next steps

No production/existing user storage, cloud, billing, hosted Actions, PR update, main merge, accepted-preview replacement or real progress mutation. The eventual UI bootstrap must guard access to native storage itself: a getter that throws before this injected adapter is constructed is outside the adapter. Native storage confirmation means successful Web Storage API acceptance, not immunity to browser eviction or power loss. All writers must cooperate with the same lock; noncooperating old clients require the later cached-writer/protocol proof. Shared town UUID/transactions/concurrency/rollback/protocol6/root3+garden4registration and complete rental/starter/expanded-home allocation remain unimplemented. Live confirmation/accessibility/panel guards, café counter/door, teapot Bag/world placement and remaining serving rigs are not enabled.

Next bounded independent work is the remaining original serving rigs and readable teapot art kit, preserving the existing Aster study; those assets precede one coherent café integration. Keep the source gate held until normal exact-final-head hosted checks and release proofs can run. Local artifact directory: ../idle-hands-2-artifacts/cafe-save-2026-11-13.

## Platform basis

The [HTML Storage algorithm](https://html.spec.whatwg.org/multipage/webstorage.html) throws for an unstorable value before updating the map. The [Web Locks request documentation](https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request) describes same-origin exclusive ownership, ifAvailable/null and the callback’s lease lifetime. Ports in this candidate require native semantics; the isolated tests cover API-level guarantees, not OS durability.
