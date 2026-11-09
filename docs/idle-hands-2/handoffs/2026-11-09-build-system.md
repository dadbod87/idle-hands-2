# Build-system closeout — 2026-11-09

Task IH2-000: engine/source comparison, delegated decisions, experience/persistence brief and executable roadmap/continuity workflow. Scope is preproduction setup only. No engine installed or sequel runtime shipped.

Selected Phaser for browser-first custom town simulation; retained RPGJS as a documented fallback with its real advantages. Inspected pinned source/package metadata, starter scripts, RPGJS save/sync docs, Phaser and Godot web requirements, and free-asset terms. No upstream starter was executed. Exact source evidence: ../engine-sources-2026-11-09.json.

Implemented tracker `status`, `check`, `prompt`, dependency/cycle/evidence validation and tests for invalid states. ROADMAP has staged, acceptance-driven tasks through private beta and a separately gated launch. EXPERIENCE_BRIEF establishes the five-minute/twenty-minute loop, narrow scope, persistence and provisional performance targets. Free assets/open-source defaults, no asset purchases or paid companions; operating costs remain unproven.

## Validation / release evidence

Local verification completed:

- `python3 tools/idle-hands-2.py check`: valid nine-task roadmap; pilot selected next. Manually reviewed `prompt` output.
- `python3 tests/idle-hands-2-tracker.test.py`: 10 tests pass, covering selection/resume, invalid/missing evidence, path escape, cycles, unknown dependencies, premature completion, multiple active tasks and blocked-work handling.
- `python3 tools/verify-game-skills.py`: all 40 pinned upstream files/references unchanged.
- All six required local Node suites pass: economy-and-office, fictional-names, sound-contract, social-moments, chair-spawns and comedy-contract. No game source change.
- `git diff --check`: clean. Recent session summaries and open PR inspection found no concurrent Idle Hands task/PR; current main was 0179c8879ac9267321d9fb00bd13e05f4a329f4a at branch creation.

The three existing CI jobs are required on the final candidate before merge; exact final commit/check/merge records belong in the PR closeout. New Python tracker checks are manual/local checks documented in AGENTS, not silently added to the existing CI workflow. No sequel runtime benchmark, device test, authenticated backend check or asset import was performed. No planning statement substitutes for those later task gates.

## Next session

Run the tracker and perform IH2-010 only: find/create a separate local source repository, bootstrap exact-pinned Phaser without starter telemetry/example art, build the tiny walk/interact/scene-transition map using synthetic/original placeholders, test desktop/phone/short sizes, preserve the planning system and link its new authority back here. Record actual dependency versions, asset/license inventory, payload/input/error evidence and any budget failures. Do not provision infrastructure or touch the current game. See generated prompt for acceptance details.
