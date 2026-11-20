# IH2-168 · Balance the three existing browser shards

Move the local stable-toolbar and woodland-certificate specifications from the third Chromium shard to the first. These specifications use their own browser contexts and browser practice saves. They leave the ordered shared fixtures in the second shard alone. Every browser specification still appears exactly once. The suite count, assertion content, runner count, environment and timeout remain the same.

## Predicted effect

This table sums case durations in three successful main browser reports, measured in seconds. The prediction moves the cases at their recorded durations and does not account for setup, queues, environment drift, or interaction with earlier tests. Max shard case time is a proxy for the waiting time on the full suite. Total case time is identical for each row.

| Exact main run | Recorded shard case seconds | Projected shard case seconds | Predicted reduction in max |
|---|---|---|---|
| [Private snack shelf](https://github.com/dadbod87/idle-hands-2/actions/runs/44612226962) | 630.8 / 682.7 / 798.6 | 723.3 / 682.7 / 706.1 | 75.3 s |
| [Browser headwear](https://github.com/dadbod87/idle-hands-2/actions/runs/44617600844) | 625.9 / 673.5 / 794.0 | 716.7 / 673.5 / 703.2 | 77.3 s |
| [Jun’s orchard directions](https://github.com/dadbod87/idle-hands-2/actions/runs/44629304006) | 615.8 / 747.0 / 798.1 | 707.9 / 747.0 / 706.1 | 51.1 s |

## Acceptance

Require exact bidirectional case identity across all three shards and keep shard two’s order. Inspect the two moved cases’ existing output and preserve the same client build. Compare actual browser job elapsed time with the immediately preceding source on the same runner label. Keep timing as a sampled observation. Continue ordinary functional gates even if the timing observations vary. This change does not add a runner or change deployment or game code.

This branch is a prepared measurement candidate. It should follow the playable changes, after they have their exact main results. The timing estimates are not a demonstrated billing reduction.

Local Playwright collection compared all 239 exact file, title and case IDs. Registration changed from 77/80/82 to 81/80/78 and preserved every ID. The browser-group domain check passed.
