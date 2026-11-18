# IH2-123 — bounded server-only session profiling

Selected November18 after122completed all source/main/saved/Terra gates and pushed closeout e935cbae8b421bda623bbbb9dcfd00b6b0ee50ac over main9afd70be62811b48be7f2efeeafaaa188acb4898. The owner's latest performance priority selects the existing longer-session candidate now; inherited Journal/Registry polish stays deferred. Source work/idle-hands-2-session-profile, branch perf/bounded-session-churn. No other active task.

## Player benefit and scope

Separate server work from test-driver work before choosing another performance fix. This can identify waiting, connection pressure and cleanup problems without changing progression. Profiling itself is not a speedup, leak diagnosis or capacity guarantee. No game/server/protocol/schema/economy/art/library change, pool growth, durability relaxation, cloud, spending, original game or real-player work.

## Declared before implementation and measurement

Add opt-in tooling: a separate child process owns the ordinary unmodified five-connection API; the parent owns20distinct protocol HTTP/SSE clients. Require explicit reset opt-in, loopback ih2_load, named disposable55434 idle-hands-2-cafe-candidate-pg, or explicit isolatedCI5432fixture container. Refuse protected55432/idle-hands-2-pg, remote hosts, other databases and missing/mismatched options before any connection or spawn. The diagnostic never restarts PostgreSQL or touches normal saved keys/data. Required repository recovery checks may restart only the named disposable candidate container; protected55432 is never restarted.

Server generates an ephemeral key in memory; driver keeps cookies in memory. Save no credentials, bodies, SQL values or raw URLs. Private IPC controls the diagnostic, never a new HTTP endpoint. Sample server and driver CPU/RSS/event-loop work separately. Child figures include instrumentation/read-only-observer overhead and exclude PostgreSQL/browser resources. No overhead claim without a controlled comparison.

Run **three sequential full diagnostics**, each with a **300-second workload window from first request**, followed by bounded read-only verification/cleanup. Overall watchdog **360seconds** includes setup and cleanup; startup/shutdown individually bounded. Real clocks only; no forcedGC, host/global database-stat resets, stock/time/position grants. Keep measurements serial and separate from local browser/domain loads. Record source/runtime/host provenance and retain every attempt/failure.

Complete ordinary first-lesson progress by60seconds:20zero-progress residents, legal200msroute/ACK movement, three finite gathers, public/mixed/private presence checks, real five-second planter, claim/place, and ordinary twelve-hour queued kit. Expected per-resident stock1scrap/2timber/4supplies, one owned/placed planter, no output kit, seven unique receipts/revision7. Costs, durations, cooldowns and same-UUID authority remain intact.

Five finite waves at60/105/150/195/240seconds perform legal short private-workshop movement, snapshot, identical last-command replay and SSE reconnect, with no new economic action. At wave2, five residents also explicitly log out/in, preserving earned progress without re-granting the lesson. Keep all20identities distinct. Verify initial19public peers, mixed-room privacy and reconnected private0peer views. HTTP operations retain a five-second abort bound. Late/failed waves are failures, not silently skipped work.

At270seconds enter a real30-second idle window after work drains. Resource/IPC sampling performs no SQL; the existing read-only observer pauses for idle. Require zero application SQL, zero observer idle submissions, unchanged presence,20live streams/0finite requests at both idle bookends, and at least one actual15-second heartbeat for each of the20connections. Unexpected SSE EOF is an error unless the client deliberately closes. After cleanup require zero streams/requests. Verify20residents,140unique receipts, exact conserved inventory/owned/placement/job state, no replay reward,9metadata records and fsync/full_page_writes/synchronous_commit on. Retain bounded SQL/pool/transaction categories and resource samples; never sum overlapping spans as wall time.

Diagnostic targets declared now: command/replay and snapshot p95≤500ms; server event-loop p95≤50ms. Retained timing failures are legitimate study outcomes if correctness/cleanup hold; they never replace or weaken the original mandatory500ms burst/CI gates. No invented memory-growth threshold: three bounded traces cannot prove a leak or unlimited capacity.

This is **20protocol clients**, not20renderedTownClients. It does not model public-construction invalidation/refresh amplification or establish physical-phone/WAN/hosting performance. Game bytes remain identical. Full existing193browser cases and saved-preview equivalence remain required; Terra reviewed the actual122desktop/mobile views. New visual review is needed if a visual regression/change appears.

## Acceptance and closeout

Meaningful safety and child-process smoke tests prove target refusal, separate observable child resources and complete stream/request shutdown. Run all three declared diagnostics, then required repository checks with explicit disposable targets. Verify all232compiled game files unchanged. Final PR/main each require all five jobs and complete raw domain/browser/recovery/load proofs. No normal runtime update is expected; read-only preservation must verify all17saved tables/9metadata/keys/PIDs/464game+125historical bytes. Save readable results, limits, source/runs and next useful action; push/verify closeout before another section.
