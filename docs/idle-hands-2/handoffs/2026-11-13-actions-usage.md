# GitHub Actions allowance audit — November 13, 2026

Owner asks what consumed the included 2,000 minutes, costs, and savings. Read-only audit; no billing, workflow, permissions, runner, main or preview changes authorized or made.

## Measured scope

117 sequel workflow runs created November 9 22:06:44 UTC through November 13 04:26:29 UTC. Latest-attempt jobs fetched for all117, zero API errors. Sum each job elapsed duration rounded upward to a minute: pull_request75runs/1,176minutes; push38runs/741minutes; manual4runs/52minutes; total1,969estimated runner-minutes. This is a job-duration estimate, not an invoice: billing lifecycle boundaries, previous attempts, other repositories and exact billing-cycle dates are not reconciled. Run timing endpoint reported zero billable milliseconds even for a successful14-minute run, so that field is not used as evidence of free usage.

One successful PR run43353707882: domain133seconds=>3minutes, browser837=>14 and706=>12, aggregate4=>1, total30estimated job-minutes. Parallel jobs reduce waiting time, not summed runner use. PR and main push both trigger the full suite. Concurrency cancellation is already enabled. Notification emails and local tests do not consume hosted runner minutes.

Raw audit files: ../idle-hands-2-artifacts/coherent-source-2026-11-13/actions-runs-audit.tsv, actions-job-duration-audit.json and actions-timing-sample.json (external local evidence directory, not repository files).

## Current official pricing and owner option

Verified https://docs.github.com/en/billing/reference/actions-runner-pricing : standard Linux2-core x64 $0.006/minute, rounding each job. Additional1,000minutes=$6;2,000=$12;5,000=$30 before taxes/storage. https://docs.github.com/en/billing/how-tos/set-up-budgets explains Actions product budgets, alerts and Stop usage when budget limit is reached. A $10 ceiling would cover about1,666extra Linux compute minutes if no other applicable spend consumes it. This is an option only, not spending authorization. Account settings https://github.com/settings/billing .

## Proposed savings, not implemented

Batch small related changes after local validation before requesting hosted full-suite checks; avoid redundant reruns; cache repeated dependencies/browser downloads after review; scope documentation-only checks while ensuring required gates cannot be silently skipped. Assess duplicated main full-suite execution separately against repository release requirements before changing it. Preserve exact-final-head authority, browser coverage, screenshots and release gates. No runner substitution, public visibility change or billing bypass.

Normal source acceptance remains held. All103 documentation source backed up at82b7272dc63c3a603ff47de522865266bc9afe8b; next104pure candidate café ledger is queued, not started. Stop new development at15:00UTC November13 (7amPacific).
