# One-prompt-at-a-time build system

Authority: Nick delegated routine design/technical choices on 2026-11-09 and requested free assets with as little upfront input as possible. The agent owns ordinary reversible choices and records reasons; Nick may steer at any point. This system runs when prompted; it does not start unattended background development or promise automatic future sessions.

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
7. Run tracker `check`; review diff for scope/secrets/licenses; commit/PR and satisfy the owning repo's release gates. In the original 1.0 repository all three existing jobs must succeed before merge even for bridge/planning work. In this separate local sequel repository, follow its AGENTS local acceptance gates; do not invent a PR/CI run while no remote exists. Mark work `done` only after its acceptance artifacts exist. Record final merge/release evidence in the handoff or PR closeout; do not falsely claim a still-pending release.
8. End with outcome, remaining limits and the next task. Stop at a completed task boundary; the next prompt resumes. Do not request routine reapproval or advance into a new major milestone without closing the current one.

## Delegation and escalation

Proceed autonomously with free local prototypes, designs, source review, tests, documentation, reasonable balancing drafts and fixes inside the selected task. Choose a coherent visual direction after comparison; Nick's review can redirect it without making upfront approval a routine gate.

Ask only for an unavoidable missing account/access decision; spending or a commitment that can incur charges; public launch/domain/account migration; destructive action affecting real people; major changes to the approved separate-game/persistent-world direction; or unresolved materially different product priorities after useful independent work. Prepare the concrete artifact and explain the tradeoff first. No paid assets/subscriptions, currency grants, real-account tests, current-game rewrites, public sequel launch or copying real player data is authorized by this workflow.

The separate **local** sequel repository now exists and owns implementation; its current location is in CURRENT_SESSION. The following describes the completed IH2-010 boundary: create it adjacent to this checkout's work area, not under the current game's deploy root. First check for an existing one. Do not overwrite another directory. Carry these docs, project instructions and provenance into it; leave a verified pointer in this planning home. Remote creation/visibility and hosting can be resolved later with a reviewable private-preview plan. Until moved, this repository is the planning authority. No sequel code inside 1.0's index.html or deploy path.

## Definition of ready / done

Ready: dependencies done; goal, scope exclusions, acceptance and evidence location stated; no required unanswered question for the task.

Done: implementation/design meets each acceptance item, reproducible relevant checks pass, regressions reviewed, source/license records complete, handoff and task state consistent. A design task can be done without runtime tests if explicitly scoped that way; a runtime task cannot be closed on prose alone. `done` is task acceptance, not production release.

Milestone gates: engine pilot → visual kit → local loop → durable two-player loop → polished neighborhood → private beta → public launch. Later milestones remain queued until dependencies pass. At beta/launch, require live artifact verification, device checks, cost measurement, permissions/security, backup/restore and rollback. Add expansion tasks only after the first neighborhood proves useful and fun.

## Evidence, branches and rollback

Use `docs/idle-hands-2/handoffs/` for dated closeouts and `CURRENT_SESSION.md` for the current pointer. Prototype screenshots/reports go in the sequel's `docs/evidence/<task>/`; test output may be ignored, but keep a small durable summary and selected screenshots with synthetic data disclosed. Task evidence links must be repository-relative, present, and immutable commits referenced when known. Never paste tokens or real-user payloads.

Each task should revert independently. Save migrations need forward recovery and restore tests, not blind data rollback. Paid/server setup stays absent until its explicit gate. Changes in this planning directory do not bump the current game build.
