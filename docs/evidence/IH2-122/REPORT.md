# IH2-122 — local status repair; acceptance pending

The actual saved Bag could show a waiting notice after its read succeeded and controls unlocked. The UI now remembers confirmed outcomes separately from temporary waiting/error/unresolved notices, and avoids rewriting identical live status every second. Positive and refused command receipts remain readable. No new backend action, polling, timer, observer, economy/server/protocol/schema or art change.

Focused client checks5/5pass, zero skipped/flaky/report errors. Five new explicitly intercepted fictional client fixtures cover held reads, failed-read recovery, pending-request guard/same-payload retry, refusal and success receipts. Three failed fixture/test-assumption iterations are retained in METHOD and compact JSON. Terra reviewed seven focused stills: status text is legible without visibly covering actions; short200footer needs scrolling. Emulation is not physical-device evidence.

Full local domain **502/503**, zero skipped. Ordinary20-client command p95259.713ms passes; profiled632.147ms fails the unchanged500msbudget. Both conserve140unique/20replayed commands, receipts/inventory, zero idle SQL and complete stream/request cleanup. This timing failure is retained without rerun or limit relaxation; no sole cause or server speedup is inferred. The server and profiling code are unchanged from accepted121.

Build succeeds with232files,226art bytes unchanged. Plan/pinned/whitespace pass. Full local Chrome execution completed **189/193**, zero skipped/flaky/report errors. Two long existing flows reached their unchanged90second local cap; the unfinished ownership setup then caused the dependent trail and fresh-visit cases to fail. Two runner step-ID diagnostics are retained. All188prior cases executed and all five new cases passed. A clean ordered-family run using the existing bundled Chromium CIconfiguration separately passes **5/5**, including its unchanged420second cooperation/240second ownership caps and15second assertions. This does not reclassify the failed local Chrome profile. New cases are added to shard1, preserving all prior188as94+99.

Exact final PR/main/raw and matched-client-only saved-preview/session/Terra acceptance are **pending**. Normal previews still use121API9and119client. No protectedPGrestart/reset/reseed/migration/keycopy, original-game/real-player/cloud or paid work. Read [plan](PLAN.md), [method](METHOD.md), [focused review](TERRA_FOCUSED.md).

Next performance questions are saved as an [unselected follow-up](NEXT_PROFILING.md), not an implemented workload or hosting promise.
