# Idle Hands 2 — source authority

Separate sequel repository: private `dadbod87/idle-hands-2`, default source branch `main`. No hosted game or cloud backend. An isolated local PostgreSQL practice town is available. Do not confuse it with dadbod87/idle-hands (live build 194, real accounts). This repository now owns sequel implementation and planning; the original repository keeps a pointer.

Read docs/CURRENT_STATE.md, docs/CHANGELOG.md, docs/RELEASE_CHECKLIST.md, then docs/idle-hands-2/{CURRENT_SESSION,BUILD_SYSTEM,DECISIONS,EXPERIENCE_BRIEF}.md. Run the tracker `status`, `check`, `prompt`. The task file is authoritative. Make ordinary reversible decisions autonomously, one bounded task per prompt. New user instructions outrank older planning assumptions.

IH2-010 engine pilot is complete. Read the current handoff/tracker for the active task and actual branch; do not switch to an older pilot checkpoint before inspecting the current source. Follow .agents/skills/phaser-2d-game, game-ui-frontend and game-playtest; pinned upstream files must remain intact. No current-game art/cast/economy restrictions silently migrate into this independent prototype. Read docs/ART_DIRECTION.md before art changes. docs/idle-hands-2/DEEP_SYSTEMS_PLAN.md records candidate resource/growing/equipment/home/town/action-animation depth; keep candidate catalogs distinct from implemented systems. The expanded owner directions, candidate catalog and art/pacing contracts are indexed in docs/idle-hands-2/design/README.md; read it before052 or later expansion. It does not mark combat/chat/regions implemented. Cosmetic town time/weather must never settle jobs or alter server economy.

## Actions usage — mandatory startup

Before any PR update, hosted rerun/dispatch or merge, read [ACTIONS_USAGE_POLICY](docs/idle-hands-2/ACTIONS_USAGE_POLICY.md). Work locally first, batch hosted validation, inspect existing runs, preserve exact-final-head gates, and respect the recorded billing hold. A private backup push is not source acceptance. Never configure spending or infer a paid budget from development authorization.

## Product requirements
- Slow long-term progression, humor, deep systems and teamwork. Rapid onboarding is not rapid completion; avoid infinite click-to-money compounding.
- Players should acquire personal house plots, upgrade homes and decorate them over time. Plot rights and creative work persist; weekly competition must not erase them.
- Free assets only, original or verified CC0 first. Prefer GitHub + Vercel/Supabase where suitable. Modest extra hosting can be considered with a concrete cost estimate; no unlimited spending or silent billed setup.
- Preserve the existing game's accounts/runtime; no imports, real data, credentials, production tests or unapproved cloud infrastructure. The isolated local Docker database is authorized for IH2-040.

- Personal/group quests, gathering/crafting, skills and restoration should make the town feel alive; integrate candidates such as helpers/shops/rare décor gradually. See LIVING_TOWN_SYSTEMS. Movement is continuous, not a tile-step control contract.

## Implementation / verification
Use an isolated feature branch, preserve unrelated work. Domain state is pure serializable TypeScript outside Phaser; DOM HUD/menus, explicit input lock, local synthetic fixtures. No server authority claim until a server exists. Assets require exact provenance/licenses; no unreviewed starter scripts, paid assets or telemetry.

Required checks: npm run check:design when changing candidate catalogs/design tools, npm run test, npm run build, npm run test:browser, npm run check:plan, python3 tools/verify-game-skills.py and git diff --check. Browser tests must inspect actual canvas screenshots at desktop, narrow phones and short landscape; console/network checks, pointer and keyboard interactions, collision, menu gating, room transition and reload. Record measured payload/frame methodology and real-device limits. Never call emulation a physical-phone test. Benchmark targets are evidence gates, not promises.

Use feature branches and PRs to main. Both sequel CI gates, `domain-build-plan` and `browser-playtest`, must complete success on the exact final candidate before merging; the latter requires both isolated browser-shard jobs to succeed, with their disjoint results covering the full suite; keep manual gating even if branch protection is unavailable. Inspect current remote/PR state and preserve concurrent work. Never infer hosting or production from a source/CI merge. Bootstrap status is in CURRENT_SESSION; do not claim a check ran until it did. Public launch, cloud provisioning and any expense require their concrete gate. Update docs, task evidence and dated handoff with exact commit/commands/outcomes; close the task only after its acceptance artifacts exist.
