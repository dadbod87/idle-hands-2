# Idle Hands 2 — current state

2026-11-10. Separate private source: [dadbod87/idle-hands-2](https://github.com/dadbod87/idle-hands-2). Original Idle Hands and real accounts are unchanged. No hosted sequel or cloud backend.

IH2-040 merged in PR #4 at bfcf7a96d605ff005922e1ff5c89caa34b483717. Exact candidate f4b9040eb716205d8edcf4fc221915bb571963ee passed both required jobs in explicit run42859798959 and pull-request run42859787143; merge tree matched. The opt-in local shared town remains isolated from browser-only saves and original-game data.

IH2-045 initially merged in PR #5 at205cc27 after50/24 green, but actual CI screenshot review exposed rotating-canopy clipping. The acceptance correction is on `fix/canopy-rendering`: bounded lateral sway and compositor-PNG canopy coverage regression. Require both final exact-head CI jobs and inspect actual images before the corrective merge. See its PR for actual candidate/run/merge, since this source document precedes the final commit. Three distinct trees, four resident rigs, asymmetric timber workshop, taller plaster café, quiet ground materials and subtle reduced-motion-aware canopy/steam/idle motion are implemented. Collision, doors, saved positions, economy and creative progress are unchanged. Default local townsfolk are decorative fictional NPCs; shared resident appearances map to existing fixture IDs.

[Art review](http://127.0.0.1:4175/?variety-study=1) shows readable phone cards and an explicitly sample-only future house. Physical housing construction, broader NPC interactions and neighborhood progression remain future work. [Report](evidence/IH2-045/REPORT.md), [independent review](evidence/IH2-045/INDEPENDENT_REVIEW.md), [handoff](idle-hands-2/handoffs/2026-11-10-town-variety.md).

Local acceptance:50 domain/art/server checks,24 full browser cases plus focused final comparison recheck, strict build, planning/tracker/integrity/diff. Emulated desktop/narrow/short/200% text and synthetic hidden-state fixtures are disclosed; no physical-phone/cloud-load/full accessibility certification. Next bounded task is IH2-050 polished first neighborhood.

Local preview http://127.0.0.1:4175/ requires this computer/server. Shared `/?town=1` additionally uses the local database/service (see LOCAL_TOWN). Actual weekly allowance at startup65% remained; recheck before another major task and stop near10%, no automatic resets.
