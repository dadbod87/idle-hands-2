# Fewer reads during busy town updates

Accepted source [PR #66](https://github.com/dadbod87/idle-hands-2/pull/66), main `2129560f2bd8606c28431df37e5c1290450f6b2e`. The exact candidate and identical main build each passed 553 domain tests and 202 browser checks. Both raw reports retained the full prior browser suite. The separate two-trial experiment ran against that verified main.

| Source | Trial | Town snapshots | Load SQL statements | Command p95 | Snapshot p95 | Slowest sampled visible update |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Before | 1 | 204 | 2,059 | 49.9 ms | 56.2 ms | 224.2 ms |
| Before | 2 | 205 | 2,067 | 71.6 ms | 54.2 ms | 223.1 ms |
| 75 ms grouping | 1 | 86 | 1,115 | 36.0 ms | 65.8 ms | 234.4 ms |
| 75 ms grouping | 2 | 86 | 1,115 | 79.5 ms | 49.4 ms | 202.3 ms |

The median town read count fell 57.9%, from 204.5 to 86. Median load SQL fell 46.0%, from 2,063 to 1,115. That exceeds the planned 15% snapshot target. Visible updates from the start of an activity wave took a median 148.4 ms before grouping and 183.9 ms after. The deliberate waiting window trades some coworker update latency for much less repeated work. Every measured command and snapshot request stayed below 500 ms in both sets.

Each fixed 180-second trial had 18 protocol clients and two actually rendered Chromium views, 15 authoritative changes, 15 exact replays, 285 observed invalidations and at least 30 quiet seconds with zero app SQL. Original deadlines, all 17 table checkpoint comparisons, nine metadata checksums and cleanup remained intact. No balance or persistence rule changed.

This measures a small scripted burst and quiet periods on disposable CI over loopback. It does not estimate steady live capacity, physical-device latency or effect under every kind of load. The comparison includes the optional sound code that starts off and was unused by the fixture. See [source and comparison evidence](COMPARISON.json), [corrected baseline run](https://github.com/dadbod87/idle-hands-2/actions/runs/44426254500) and [grouped run](https://github.com/dadbod87/idle-hands-2/actions/runs/44557233485).

Player benefit: less repeated server work when several residents contribute or serve in a short span. Keep the existing immediate recovery and personal receipt paths. Revisit other SQL changes only when new evidence shows a remaining problem.
