# Public refresh: next optimization to evaluate

This is secondary analysis of the retained qualified run44397607793, not strict fixed-window acceptance. Trial2failed the original observation-window criterion. All metrics remain synthetic loopback data, with no physical-phone, WAN or hosted-capacity claim.

The HTTP request IDs account for every load-phase SQL statement: trial1has2091, trial2has2059. Snapshot requests use1664/1632statements (79.58%/79.26%);30command requests use417in each; one lifecycle login uses10in each. There are208/204snapshot requests versus15new shared actions and15exact retries. No idle SQL is submitted.

Every observed snapshot uses eight statements: BEGIN, three conditional shared-project opening updates, COMMIT, read-only repeatable-read BEGIN, one coherent projection, COMMIT. The update statement count is not the number of modified rows. Current live-store source confirms this sequencing; the settlement boundary and coherent read are deliberate correctness protections, not proven unnecessary work.

Snapshot pool-acquire p95is48.11/50.95ms; command pool-acquire p95is0.047/0.056ms. SQL durations/pool acquisition include scheduling/network/connect/queue, not pure database CPU or exact lock duration. Individual request tails and varied shared-runner scheduling do not establish production overload.

First evaluate a small client public-invalidation scheduling window, preserving one in-flight read and a sticky dirty follow-up. Test actual public waves and lifecycle: latest public state/own command confirmation, forced reconnect/reboot, hidden/visible, auth expiry and no blind retry. A known tradeoff is a short intentional delay before coworker updates; measure convergence rather than promising a speedup. No implementation or chosen delay is approved by these captures.

If server-side snapshot settlement is subsequently optimized, preserve one-time deadline observations/history under independent readers and commands, opening exactly at ready_at, real backward-clock refusal, durable transaction rollback, shared lock order and read consistency. A cached fast path needs explicit expiry/version and multi-process proof. Do not merely remove three updates, extend the pool, or introduce an in-memory authority cache because aggregate counts look large. Baseline/candidate comparisons must keep matching source, workload, device and metric definitions; first repair and accept the observation deadline.

Player value: quick personal confirmation during busy café activity, less server work spent rereading unchanged public state, and no silent loss or speculative rewards. Remaining opportunity: measure a bounded refresh scheduler after127closeout; sound/worker work remains the next queued playable section unless a correctness or measured usability blocker takes priority.
