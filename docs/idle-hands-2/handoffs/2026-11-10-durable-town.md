# 2026-11-10 — durable local town

## Source and acceptance
Private `dadbod87/idle-hands-2`, feature `feat/durable-town`, base main 0c33b63e3a5fc86f5e808d794d0ec591e18694cf (PR #3). This dated source document precedes the final commit; require both exact-head CI jobs before merge and record actual SHAs/run/artifact comparison in the PR closeout. No public deployment is authorized or implied.

IH2-040 adds a loopback Node/PostgreSQL command service, stable command receipts, concurrent shared bridge completion, persistent plot claims/upgrades/furnishings, independent fictional residents, private workshops/scoped square presence and Friday 4 PM Pacific score rows. Weekly competition preserves creative work. Real authentication and physical house lots remain future gates.

Local acceptance: 47 domain/art/server checks, 20 browser cases, frontend/server strict build, planning/tracker and pinned-skill integrity checks. The actual database restart preserved an upgraded decorated plot and queued job while the running service reconnected; a separate pg_dump/restore drill preserved state and receipts. Independent review findings were fixed with regression coverage. See [report](../../evidence/IH2-040/REPORT.md) and [review](../../evidence/IH2-040/INDEPENDENT_REVIEW.md).

## Running and testing
Follow [LOCAL_TOWN](../../LOCAL_TOWN.md). Dedicated `idle-hands-2-pg` binds only 127.0.0.1:55432 and keeps volume `idle-hands-2-pg-data`. Normal shared preview uses `ih2_preview`; never reset it for tests. The browser-only mode remains unchanged. Test databases are separately named and synthetic; browser fixtures seed 48 kits and two planters, ordinary residents zero kits. No real accounts, existing Supabase project or original game data were used.

Run database helper, local service on 4186 and Vite preview on 4175. Shared URL is `/?town=1`; ordinary URL uses prior local saves. CI runs PostgreSQL16.15 with Node24.22.2; local Node26.7.0 differs. Matching PG16 tools are required for portable backup output. Full Supabase advisor stack was unavailable locally; do not claim a hosted advisor pass.

## Next
IH2-045 is the next bounded task: varied trees/people, building silhouettes/sizes/materials and land textures, plus restrained motion with reduced-motion and phone-performance checks. Keep original style and usable continuous movement. If geometry changes, recover persisted positions safely. Broader housing, quests and neighborhood polish follow the roadmap.

Monitor actual weekly allowance; last observed 66% remained and the user’s approximately 10% stop/no automatic reset remains. Do not silently provision billed/public services. Preserve any concurrent work and fetch main before resuming.
