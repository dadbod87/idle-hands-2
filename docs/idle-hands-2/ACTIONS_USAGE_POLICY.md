# GitHub Actions usage and release rules

Owner direction, November 13, 2026: conserve Actions usage and put the rules in the repository so a newly synced chat follows them. This policy applies to the sequel repository, made public at the owner’s explicit request on November13,2026. It does not change the original game, GitHub billing, or required merge checks.

## Read at every startup

Read this file together with AGENTS.md, CURRENT_SESSION.md and the latest handoff before opening/updating a PR, manually dispatching or rerunning Actions, or merging. Fetch current branches and inspect active PRs/runs first. Branch backup is separate from acceptance: a feature-branch push without an open PR does not currently trigger this repository's workflow; verify the workflow before relying on that behavior. A push to a branch with an open PR can trigger a full run.

## Current public-source status — supersedes the private billing hold

On November13 the owner explicitly asked to make this existing repository public instead of buying Actions usage. The authenticated update succeeded and anonymous GitHub/API/raw-source requests returned200/public. Standard GitHub-hosted Ubuntu runners for public repositories are free, so the old private included-allowance refusal no longer by itself blocks those runs. This is an owner-approved visibility change, not an exemption from checks or source acceptance. Source, history and existing Actions history/logs are now public; the game itself remains local/unreleased.

Continue local-first batching and reuse existing exact-head results. Standard free public checks may be requested for authorized work when a final candidate is ready. Do not infer approval for paid larger runners, paid storage, subscriptions, accounts, hosting, or other billed resources. No payment method or paid budget has been confirmed or changed. Do not rerun obsolete PR39 merely to probe billing; prepare the actual coherent candidate and meet every exact-head gate. No runs or deployments were triggered by the visibility task.

Prior statements below about the private billing refusal and suggested budgets are dated history, not a current free-run prohibition. See handoffs/2026-11-13-public-source.md for verification and limitations.

## Default development loop

1. Complete a coherent, reviewable section locally. Use focused checks during iteration, then the full applicable repository checks at the candidate boundary. Do not repeatedly rerun a passing full local suite without a new change, failure or unresolved concern. Local checks do not use GitHub-hosted runner minutes.
2. Batch related small edits and documentation before opening a PR or pushing to an existing PR. Keep commits reviewable; batching hosted validation does not mean combining unrelated features. Back up independent completed sections on feature branches while acceptance is blocked.
3. Inspect current runs before triggering another. Reuse passing results only for the exact commit they tested. Let an active exact-head run finish; rerun only after a diagnosed failure or a confirmed transient failure. Do not poll for billing recovery by dispatching, closing/reopening a PR, or pushing empty commits.
4. Prepare the final source, tests, documentation and evidence before requesting hosted validation. Any subsequent commit needs its own required exact-head checks; an earlier green run cannot validate new content. Avoid preventable after-the-fact edits, but never conceal a needed correction to save minutes.
5. Before a hosted run, check recent usage, the applicable billing cycle and the owner's confirmed cap if accessible. If not accessible, record usage as unknown, not zero. For paid/private execution, at90%of included usage or upon quota/payment/budget refusal, hold new billable runs unless usable allowance or a capped paid budget is confirmed. Standard free public runner checks are covered by the explicit public-source authorization above; verify the actual runner/repository before treating a run as free. Do not repeatedly ask when the owner is already resolving the hold.
6. At closeout, record the candidate SHA, run IDs, job results, retries and their reasons, approximate summed runner-minutes, and whether further hosted runs are held. Preserve actual artifacts and the next source/handoff pointer. Give the next chat enough information to avoid duplicating work.

## Mandatory release gates remain

Before merging, domain-build-plan, both disjoint browser shards and browser-playtest must succeed on the exact final candidate, with the repository's complete applicable coverage and artifact/recovery/preview requirements. Local success, a skipped job, an old green commit or a documentation label does not satisfy this gate. The current full main-push regression run remains enabled. Inspect it after merge and stop further release steps on failure.

Do not remove assertions, silently skip PostgreSQL tests, shorten required waits, reduce browser/device coverage, substitute a runner to evade a blocked gate, or change visibility without explicit owner authorization. The owner explicitly authorized public visibility on November13; required checks were not weakened. No workflow edit, alternative runner, storage cleanup or billing change is implied by this policy. Budget changes and paid resources need explicit owner authorization.

## Current configuration and safe savings

As inspected November 13, sequel-ci.yml triggers on PRs targeting main, main pushes and manual dispatch. All jobs use ubuntu-24.04; superseded runs already cancel through concurrency. npm caching is already enabled. Browser shards run in parallel, so their durations add for usage even when wall-clock completion is shorter. Jobs round up individually. Existing seven-day artifact retention remains unchanged.

Prioritize local-first batching and avoiding duplicate/transient reruns now. Browser-download caching, selective documentation checks and a narrower post-merge job are future optimizations to measure and review. They are NOT implemented or exemptions from today's required gates. Documentation path filters must not strand required checks or bypass code validation; any future change needs an explicit always-reported gate design and validation before adoption. Do not cache mutable test databases, credentials, sessions or signing keys.

The historical audit estimated 1,969 job-minutes across117 latest-attempt runs from November9–13. It is not an invoice or a current balance, and excludes reconciliation of other repositories, prior attempts and billing dates. See [usage audit](handoffs/2026-11-13-actions-usage.md). Emails, local tests and Codex usage are separate from hosted Actions minutes.

## Owner billing reference

Only the owner changes payment and budget settings. [Billing settings](https://github.com/settings/billing), [budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets), and [current runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing). Verify live rates when estimating costs. The discussed $10 ceiling was a suggestion, not an authorized or configured budget. When a budget is authorized, use an appropriate hard stop and alerts; record scope and confirmation without payment details or credentials.

November13 billing clarification: the owner showed a “New Copilot AI Credits” budget screen and asked whether that was the needed product. It is separate from Actions runner usage. For this hold, the relevant control is Budgets and alerts → New budget → Product-level budget → Actions, under the account owning this repository. A valid payment method and usable allowance/budget are still unconfirmed; the question and screenshot are not payment or spending approval. This was the private-billing advice before the explicit public-source request; standard free public checks may now proceed under the rules above.
