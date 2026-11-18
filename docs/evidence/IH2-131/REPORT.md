# Committed personal progress during public updates — candidate correction

Status: source candidate; full exact PR/main acceptance pending.127fixed performance observations remain unexecuted. No normal saved service, original key, real player, server, economy, protocol, schema, rate, pool or timer changed.

## Finding and correction

Real127smoke on894385d failed after the three bridge contributions: all expected first-wave invalidations arrived, models kept one snapshot read in flight, and cleanup drained, but immediate private-revision assertion failed. Its actual game screenshots/report/raw failed case are retained under ignored local artifacts. A controlled actual-TownClient probe independently reproduces the same class: public rev0/time1200accepted before command rev1/time1100leaves clientrev0and clears the command UUID. No fixed180smeasurement ran, and the failed smoke is not called a passed performance result.

The correction keeps the coherent snapshot/time/identity/boot/allocation guards intact. Automatic invalidations become one dirty follow-up while a command is pending. If a valid command reply's higher private revision was overtaken by a newer-clock lower-revision read, one fresh coherent snapshot confirms it after any existing read settles. Failure, an unconfirmed lower revision or a service change retains the original pending UUID; retry does not become a new spend. There is no unconditional additional query on ordinary success and no loop of fresh-read attempts. Existing network-stall behavior is not a newly certified latency guarantee.

Six new controlled actual-client cases cover a pre-existing public read,32pending invalidations, failed network/401confirmation, a successful but still-lower-revision confirmation and a fresh-read reboot. Initial focused run26/27exposed an old stream-retry fixture that assumed no delayed dirty follow-up. Its exact command/UUID/timer checks remain; the fixture now also serves and asserts the single delayed snapshot. Final focused28/28pass, including all prior client cases and three real-HTTP transport/target guards. No monotonic/boot guard was relaxed.

Actual fresh native startup observed two unauthenticated snapshot401s (workshop boot and scene resume can coalesce into one); the diagnostic records one-or-two setup-only responses and their matching console resource notices. Every authenticated/load response must succeed. Setup waits for both native authenticated reads and zero finite requests. This fixes a test assumption, not auth authority, and no route is intercepted.

## Validation and scope

Local focused28pass, independent selection390pass/20database-unavailable skips (410collected), build/types, plan10and pinned40pass. Full prior530domain/198browser plus six additions (expected536/198), original500ms/recovery checks and real20-client smoke immediate revision/conservation/deadline/replay assertions remain required on exact final PR/main. Full local PG/browser unavailable because owner keeps Docker/normal previews stopped. Current saved-table equality and normal-runtime installation are unclaimed. Existing read-only original0600keys remain intact.

The current build intentionally changes the main JS and its index reference; other230of232compiled files and all226art files remain byte-exact. This is a client confirmation correction, not an unmodified-runtime claim. Actual isolated CI desktop/phone capture and Terra6.1review remain pending. A source merge will not itself restart saved previews or publish a hosted game.

Player benefit: a successful action stays visible while coworkers advance shared projects. Friction removed: success text with older holdings on screen, and avoidable public reads during a pending action. Remaining opportunity: after complete source acceptance, resume127's predeclared two fixed observations; retain every timing miss and choose any optimization from evidence.
