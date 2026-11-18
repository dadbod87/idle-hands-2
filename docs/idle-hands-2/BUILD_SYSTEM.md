# One-prompt-at-a-time build system

Authority: Nick delegated routine design/technical choices on 2026-11-09 and requested free assets with as little upfront input as possible. The agent owns ordinary reversible choices and records reasons; Nick may steer at any point. This system runs when prompted; it does not start unattended background development or promise automatic future sessions.

## Actions usage

Every session must read [ACTIONS_USAGE_POLICY](ACTIONS_USAGE_POLICY.md) before requesting hosted validation. Follow its local-first batching, existing-run inspection, quota hold and closeout rules. Required final-head checks remain unchanged.

## Match the verification runtime

The repository workflow pins Node24.22.2. Prefer that exact runtime for full local Node/Playwright verification and record the browser/profile. A newer system runtime is not evidence that the pinned checks passed. November17diagnostics encountered local Node26stream/installer and Chrome reload-poll failures; a matching-runtime/browser check succeeded, without establishing a single root cause. Keep those observations separate. An isolated verified official Nodebinary may be used without changing system defaults or dependency locks. Use the existing CIprofile when reproducing CI; report its configured assertion windows, not a pass of the different local Chrome profile. Never change coverage, budgets or source timeouts to manufacture acceptance.

## Validate direct Node entry points

IH2-123typecheck accepted a new constructor parameter property that the pinned Node24.22.2 strip-only runtime rejected before its handler ran. Use erasable syntax in directly executed tools and exercise the actual entry/import under the pinned runtime; a no-emit typecheck alone is not runtime acceptance. Preserve the real child-process smoke check alongside ordinary typechecks. This is a tooling lesson, not a reason to change the game's pinned runtime or add a transpiler silently.

## Resume in any session

From a current checkout, read root AGENTS and required current-game state/release documents, then this directory's README, DECISIONS, EXPERIENCE_BRIEF and latest handoff. Run:

```sh
python3 tools/idle-hands-2.py status
python3 tools/idle-hands-2.py check
python3 tools/idle-hands-2.py prompt
```

`ROADMAP.json` is the task/status source of truth, not a chat checklist. The script selects the first unfinished dependency-ready task in recorded order, resuming an in-progress task first. A blocked task needs a reason and can be bypassed only by independent ready work. No ready task means report the dependency or decision blocking progress, not invent a new feature. The checker validates IDs, cycles, dependencies, required task contracts, completion evidence, local evidence links and the single active task rule. It does not prove the evidence is true or execute tests. Review actual artifacts and results.

The generated prompt supplies the selected task and startup/closeout rules. Nick can simply say **“Continue Idle Hands 2.0.”** A new session reads the repository, not remembered chat assertions.

## Session protocol

1. Fetch current remote; inspect worktrees, open PRs and available session summaries for concurrent work. Use an isolated branch. Confirm which repository is current; if the separate sequel exists, follow its pointer. Preserve unrelated work.
2. Reconcile the last handoff, current commits, task state and checks. A claimed task is not done merely because an earlier chat said so. Record one selected task as `in_progress`, branch/owner and date in the handoff before changing code.
3. Deliver one bounded task including meaningful tests, reviewable screenshots where relevant and docs. Split a task if it cannot fit a coherent session. Add discovered work with an ID/dependencies/acceptance; do not silently expand the task.
4. Make reversible product/technical decisions yourself inside the approved scope. Record agent-selected defaults separately from direct user decisions. Prototype and playtest before treating an unmeasured assumption as proven.
5. Run task acceptance checks and relevant regression checks. A failed/missing required check keeps the task open. Separate local, fixture, device, preview, production and owner acceptance. Never call an emulated mobile viewport a real-device test.
6. Update ROADMAP, DECISIONS if changed, latest handoff and append a dated history entry. Include exact commands/results, commit/PR, screenshots, fixture interception, unresolved problems and the next executable task. No credentials in evidence.
7. Run tracker `check`; review diff for scope/secrets/licenses; commit/PR and satisfy the owning repo's release gates. In the original 1.0 repository all three existing jobs must succeed before merge even for bridge/planning work. In this public sequel repository, follow AGENTS and require both domain-build-plan and browser-playtest success on the exact final PR head before merge. Inspect actual branch protection; until it enforces all required checks, retain the manual exact-head gate. Source/CI is not a hosted game release. Mark work `done` only after its acceptance artifacts exist. Record final merge/release evidence in the handoff or PR closeout; do not falsely claim a still-pending release.
8. End with outcome, remaining limits and the next task. Stop at a completed task boundary; the next prompt resumes. Do not request routine reapproval or advance into a new major milestone without closing the current one.

## Delegation and escalation

Proceed autonomously with free local prototypes, designs, source review, tests, documentation, reasonable balancing drafts and fixes inside the selected task. Choose a coherent visual direction after comparison; Nick's review can redirect it without making upfront approval a routine gate.

Ask only for an unavoidable missing account/access decision; spending or a commitment that can incur charges; public launch/domain/account migration; destructive action affecting real people; major changes to the approved separate-game/persistent-world direction; or unresolved materially different product priorities after useful independent work. Prepare the concrete artifact and explain the tradeoff first. No paid assets/subscriptions, currency grants, real-account tests, current-game rewrites, public sequel launch or copying real player data is authorized by this workflow.

The separate sequel repository now owns implementation and planning at https://github.com/dadbod87/idle-hands-2 (public, main). Fetch the current remote and inspect PRs before working; CURRENT_SESSION and the latest closeout supply the resume point. The original game's SEQUEL_SOURCE is a discovery pointer only. Do not create another sequel checkout as a replacement, overwrite local work, or implement sequel runtime inside 1.0. Initial local creation/import is complete; future hosting and accounts still have their separate gates.

## Definition of ready / done

Ready: dependencies done; goal, scope exclusions, acceptance and evidence location stated; no required unanswered question for the task.

Done: implementation/design meets each acceptance item, reproducible relevant checks pass, regressions reviewed, source/license records complete, handoff and task state consistent. A design task can be done without runtime tests if explicitly scoped that way; a runtime task cannot be closed on prose alone. `done` is task acceptance, not production release.

Milestone gates: engine pilot → visual kit → local loop → durable two-player loop → polished neighborhood → private beta → public launch. Later milestones remain queued until dependencies pass. At beta/launch, require live artifact verification, device checks, cost measurement, permissions/security, backup/restore and rollback. Add expansion tasks only after the first neighborhood proves useful and fun.

## Evidence, branches and rollback

Use `docs/idle-hands-2/handoffs/` for dated closeouts and `CURRENT_SESSION.md` for the current pointer. Prototype screenshots/reports go in the sequel's `docs/evidence/<task>/`; test output may be ignored, but keep a small durable summary and selected screenshots with synthetic data disclosed. Task evidence links must be repository-relative, present, and immutable commits referenced when known. Never paste tokens or real-user payloads.

Each task should revert independently. Save migrations need forward recovery and restore tests, not blind data rollback. Paid/server setup stays absent until its explicit gate. Changes in this planning directory do not bump the current game build.

## Owner-authorized sequential run — 2026-11-10
Nick explicitly requested continuing through successive sections while away until usage runs low. This supersedes the one-task-per-prompt stop for this active run: keep only one task active, finish its checks/CI/artifact review/merge/closeout, then select the next ready section. Preserve approximately10% weekly allowance, recheck at boundaries, no reset credits. Hosting, real accounts, spending and public release retain their gates; no timer or background automation is created.


## Preserve local server evidence before browser cleanup

After system/restart checks, copy `test-results/server/` to a task artifact directory outside Playwright's `test-results/` output tree before starting the browser suite. Playwright clears that output tree at startup. Keep system/restart logs outside it from the beginning. If a raw report is lost, label its values unavailable; do not fabricate a previous measurement or quietly reuse an older task's proof. The hosted server job already archives its raw evidence before the separate browser jobs.

## Renewed owner-authorized sequential run — November 17

The owner asked to continue safe work through successive sections until November18at7AM Pacific (15:00UTC) or roughly10%weekly allowance remains. This supersedes the one-task-per-prompt stop for this run. Keep one task active; finish its validation/source/main/closeout before selecting the next. Recheck account-wide usage at task and major-validation boundaries; initial read11%used/89%remaining. Do not consume reset credits, buy anything or infer hosting/real-player authorization. Stop new work with time to leave a precise handoff; retain pending gates honestly. No background automation is created.

## Original standalone script generation — November18

The installed TypeScript7CLI does not expose the old transpileModule/ModuleKind API assumed by the first129generator. For the two reviewed import-free own study modules,129uses the pinned Node24.22.2native type eraser and an explicit small export list, alongside the real tsc checks and emitted-script/WAV equivalence tests. Do not treat erasure as typechecking, strip arbitrary third-party code, add a compiler dependency silently, or infer cross-platform byte regeneration until its exact Linux check passes.

## Independent public-refresh diagnostic candidate — November18

IH2-127adds optional workflow public-refresh-study.yml and tools/public-refresh.ts. No ordinary source/CI gate is replaced: all530domain/198browser/current500msrecovery checks must pass on exact PR/main before manual diagnostic dispatch. The workflow requires exact current main SHA and an explicit ephemeral CI5432service/ih2_load. It runs two fixed180sobservations with real20fictional identities (18protocol models+2native pages); source reports/cookies remain separate, and timing misses are retained rather than hidden by a green capture result. No local Docker/previews may restart under the current owner hold. This paragraph describes a candidate; see127REPORTfor actual acceptance/execution.
