# IH2-121 — focused equivalence and measurements complete; acceptance pending

The snapshot read drops15database calls to one while preserving all returned game state in the focused comparison suite. The original20-player workload drops5,620→2,540load-phase queries (54.8%;220snapshots ×14removed calls). Ordinary command query counts drop27–28→13–14;20receipt replays drop22→8. Authority/locks/pool/durability/economy/client are unchanged.

| Scenario | Accepted reader p95 | Candidate p95 |500ms result |
|---|---:|---:|---|
| Ordinary pair1 |241.853ms |264.902ms |both pass |
| Ordinary pair2 (new then old) |176.137ms |388.268ms |both pass |
| Ordinary pair3 |772.697ms |198.736ms |old fails, new passes |
| Added2ms/chunk/direction |2568.363ms |430.853ms |old fails, new passes |
| Added5ms/chunk/direction |1964.024ms |954.951ms |both fail |

All ten retain140unique/20replayed commands, stock/receipt conservation, idle0, cleanup0active requests/streams and durability on. No retries replace failures. Ordinary median241.853→264.902ms is slightly higher, so there is no consistent workstation speedup claim. The measured benefit is fewer sequential round trips and lower latency in these two declared delay fixtures.5ms still exceeds the target. See [method](METHOD.md), [summary](comparison-summary.json), and [history](VALIDATION_HISTORY.md).

Eight focused cases and server TypeScript pass, including same-clock full-field equality,26-home numeric order, rich progress/privacy/construction/weekly boundary, refusal/no replacement, concurrent writers and20authenticated rich26-home HTTP snapshots (samplep9599.442ms). No movement writes/checkpoints. These are explicit isolated component fixtures, not real players or a cloud/physical-phone capacity test.

Full local domain: 501/503 pass, two unchanged 500 ms command timing failures (595.703/915.518 ms), zero skipped. These failures are retained, with conservation/receipts/idle/cleanup intact. Build/plan/pinned/whitespace pass; full browser 188 is running. All 232 compiled files, including 226 art files, exactly match accepted 119. See initial-local-domain-result.json and explain-timings.json; no exclusive host/SQL/lock cause is claimed. Exact final PR/main/all4/raw artifacts and original-key/session/data-preserving saved-preview acceptance remain pending. Do not mark121complete or claim the normal preview updated yet. No visual design changes are included; compiled client identity has been measured exact.

Player benefit sought: responsive confirmed actions without lost progress, coherent public appearances, no extra menu. Remaining opportunities: physical-device/approved-hosting measurements and fresh reproduction of outstanding registry/short-menu polish after this task closes.
