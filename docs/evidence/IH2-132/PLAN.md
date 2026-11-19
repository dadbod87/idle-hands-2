# Group routine town refreshes

When several residents act together, each emits an update that can cause the other clients to reread town state. In the corrected fixed observation run 44426254500, the two trials produced 204 and 205 load-phase snapshot requests. Those reads accounted for 1,632 and 1,640 of the 2,059 and 2,067 load-phase SQL statements, respectively.

This candidate groups new routine invalidations into a 75 ms window from the first runnable event. More events do not extend the deadline. A refresh already in flight can leave one pending follow-up. Explicit reads, scheduled project wakeups, receipt recovery, and reconnect reads still take their existing paths. Personal actions still wait for authoritative confirmation. Hiding the page, changing residents, and replacing a stream cancel an obsolete timer.

The player benefit would be fewer competing reads during busy shared activity, with the tradeoff that a coworker's update can arrive a little later. The 75 ms interval is a candidate default. No server, schema, economy, rendering, content, or sound changes are part of this candidate.

## Verification

- Focused tests cover one read per window, a dirty follow-up after an in-flight read, cancellation and immediate reconnect, and a command that begins before an already scheduled timer. Preserve all prior receipt, reboot, expiry and timer behavior.
- Require all existing source checks and the 20-identity shared refresh smoke. Inspect the real browser, model and server artifacts and preserve the existing correctness and 500 ms budgets.
- On the accepted candidate source, run the same two fixed 180-second observations as run 44426254500. Both trials must preserve all receipt, visibility, deadline, idle SQL and cleanup gates. Compare the total load-phase snapshot requests and SQL statements, alongside observed convergence. The working target is at least 15% fewer snapshot requests across the two trial medians with all original latency targets passing. Retain both results, even if the candidate misses the target. The workload and server are the same as the corrected baseline. The source also includes the intervening optional audio work, which starts disabled and remains unused in this fixture. Runner variation prevents a production-capacity or guaranteed latency conclusion.
- Use disposable CI only. Saved previews and databases stay stopped. Report actual interval results and limitations separately from source acceptance.
