# IH2-060 — local reliability and private-preview readiness

2026-11-10. Active branch `feat/release-readiness`, base main`59e237fd3b6931a9cec1af81a2c467bfebde4c82`. Separate private sequel. This section does not deploy a hosted game or touch real players. The original game remains separate.

## Measured ordinary-player workload

[Reproducible runner](../../../tools/load-town.ts), [baseline](load-baseline.json), [hardened run](load-hardened.json), [final monitored run](load-monitored.json), [comparison limits](comparison.json), [machine](system.json).

Twenty independent fictional residents start with ordinary empty bags and full personal depots. They walk legal continuous routes through actual HTTP acknowledgments, gather three materials, enter their private workshop, wait the real five seconds for a first planter, claim/place it, queue an ordinary twelve-hour kit and replay the identical last request. Ten private residents are hidden from ten remaining square occupants. Twenty streams reconnect, state is reloaded, then the town sits idle for ten seconds. No direct inventory/position/time grants, rendered-browser count, cloud or real-account test is implied.

| Result | Final local observation |
|---|---|
| Commands | 140 distinct +20 identical retries; exactly140 durable receipts |
| Movement | 760 accepted, zero rejected;20 room checkpoints |
| Conservation | Each bag1scrap/2timber/4supplies, one owned/placed planter, zero output kits, unchanged12hjob |
| HTTP | 1,020requests including40SSEhandshakes;60,580request-body bytes and485,900JSON-response bytes |
| Command latency | p95≈51ms against the recorded local500mstarget; small-body loopback RTT is reported separately |
| SQL | 3,520actual client.query calls; zero idle queries; setup/verification probes separately counted |
| Presence | Room privacy/reconnect pass; unchanged lists suppressed after the first event; raw counts/bytes retained |
| Idle | Ten seconds: zero SQL and zero presence events; required heartbeat bytes counted separately |
| Cleanup | All request/stream admissions return to zero; connections/pool close; synthetic DB retained for inspection |
| Storage | 319,488bytes additional table/index/TOAST allocation for this small batch; raw before/after relation sizes retained |

The final sampled Node RSS is about183MiB; CPU averages about5.35%of one local core over the measurement including idle. Both include the HTTP load generator and server in one process, excluding PostgreSQL/browser/OS. RSS is sampled every100ms, event-loop p95≈22.4ms at20msresolution. Docker cgroup samples every5seconds observed database CPU up to3.69%and memory around95–100MiB; these snapshots are not peak/soak or hosted capacity measurements. Different runs/GC vary; no causal CPU/RSS gain is claimed.

The hardening comparison keeps the same seven meaningful commands per player. p95stays around51–54ms. One measured run suppresses330unchanged presence updates; empty-message savings are smaller in bytes than in event count. Query count stays unchanged. No database/cache/economy shortcut was selected to make the benchmark pass. The normal aggregate test run repeats this cohort automatically in exact disposable `ih2_load`.

## Repairs and permission review

| Finding | Implemented evidence or release boundary |
|---|---|
| Connection query options could override a loopback host | All synthetic database URLs now reject query options/fragments before Pool creation, including host/port/Unix-socket override regressions. No rejected URL opens a connection. |
| Older backup rejected by an open client | Boot change is evaluated before same-boot monotonic guards. The full recovered state/clock/feet is adopted with a truthful notice. Existing same-boot stale guards remain. |
| Late old-server success/error cleared an uncertain command | Request/stream provenance and bounded16boot history reject retired responses, even after old ID eviction. Preserve exact pending UUID/revision/payload; explicit current-boot and legitimate same-boot stale receipts remain definitive. Nine deterministic transport cases plus the enhanced existing browser restart case cover this. |
| Snapshot/login/stream floods could queue unbounded work | Fixed/validated-key rate and concurrency admission before SQL. Existing command/movement/operation limits remain. Twenty ordinary members are admitted; held work/429/error/rolling-window cleanup is tested. |
| HTTP 429 permanently closed native EventSource | CLOSED streams now get one bounded 5/10/20/30-second retry. CONNECTING keeps native retry behavior; hidden/closed/identity/boot changes cancel obsolete timers. Nine deterministic client cases cover pending-request preservation; a native Chromium HTTP429 case uses the real five-second clock and intercepted fictional endpoints. |
| Slow readers could accumulate presence | Max64KiB frame, disconnect on false write, no application backlog/retry of the accepted buffered frame. First empty presence is sent; later identical lists are suppressed. Deterministic sink tests cover boundaries. |
| Established/queued sessions could outlive expiry | Idle streams close at inclusive expiry. Queued operations recheck before work and after body upload. An actual chunked HTTP request crosses expiry and cannot change in-memory feet, durable progress or receipts. |
| Selectable fixtures are not authentication | Preserved deliberately for local practice. Hosted exposure is blocked on verified identity, server-owned membership, revocation, trusted origins/proxy/TLS and dedicated sequel resources. |
| Local SQL owner bypasses RLS | Existing actual private-schema/RLS/grant tests pass, but this is not a hosted least-privilege role proof or Supabase advisor scan. Split migration/runtime roles and test the actual hosted project before invitations. |
| Receipts grow indefinitely | No unsafe pruning. A replay-window/tombstone contract must precede retention changes; raw measured allocation is not a linear long-term forecast. |

The single-endpoint/single-authority process assumption remains explicit. Bounded boot history plus dispatch provenance protects late old requests; it is not a multi-instance routing/lease protocol. Original costs, production clocks, recipe rules, inventory, awards and weekly persistence are unchanged. No schema migration was needed.

## Checks and next gate

Local aggregate136checks pass with zero skips, including43authoritative functional checks, seven pure transport checks, nine deterministic client cases, load target guards and the actual20client workload. Strict build passes. Full44browser regression passes5.9minutes; actual recovery/phone/home/short images reviewed. All136and44were rerun after the final native CLOSED-stream retry and URLquery/fragment guard. Final exact-head CI must repeat136/44and artifact review before merge. Browser recovery fixtures intercept HTTP/EventSource and earlier saved state; they do not restore a real player's database.

Actual matching PostgreSQL16dump/restore, checksum replay and new-process/session/decoration/job/journal/pennant preservation are covered by the functional suite. The additional actual database-container restart drill passes: same signed session, live service, decorated expansion, queued job, opened journal and trail cosmetic retained. Existing practice has zero saved residents; all table data blocks match the pre060 dump. Actual4175HTML/JS/CSS and82SVGs match the final build; estimated client gzip421,418bytes. NativeChrome/M5active-play p95≈16.8ms, below the local20mstarget; physical-phone30fps remains unverified. Scheduled hosted encrypted backups and restore objectives are proposals, not an operating service.

The [hosting/access plan](../../idle-hands-2/PRIVATE_PREVIEW_PLAN.md) supplies targets, conditional costs, ownership, identity, retention, backups, rollback and monitoring. [Provider metadata](provider-metadata.json) confirms no sequel resources exist on the connected Vercel/Supabase accounts; it does not grant creation or reveal credentials. Physical phone/Safari, actual hosted authentication/permissions/WAN/load, project-specific quotas and cost approval remain070gates. Do not advance by silently provisioning or inventing another feature.

Independent final source/evidence review caught the database routing-option guard loophole before acceptance; fixed and covered by rejection tests. No remote connection was attempted. Local/browser/hosted metrics and costs remain separated; no further blocking issue was reported.

The first source candidate e0c981c had a successful domain job in CI42956498045, but its browser job was cancelled when this additional native-stream gap was identified. That superseded run is not final acceptance. The native stream regression observes Chromium EventSource directly; only HTTP responses are intercepted. Its finite successful fixture ends after empty presence and can trigger ordinary native reconnect afterward; screenshot connection text reflects that fixture EOF. See [practice preservation](practice-preservation.json) for the corrected zero-resident evidence scope.
