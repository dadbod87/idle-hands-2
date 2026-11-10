# Idle Hands 2 — current state

2026-11-10. Separate private source: [dadbod87/idle-hands-2](https://github.com/dadbod87/idle-hands-2), main. Original Idle Hands and real accounts are unchanged. No hosted sequel or cloud backend.

IH2-030 merged in PR #3 at 0c33b63e3a5fc86f5e808d794d0ec591e18694cf. IH2-040 is locally accepted on `feat/durable-town`; source merge remains gated on both required CI jobs succeeding on the exact final head. Consult its PR for final commit/run/merge evidence; this pre-commit document alone is not proof of merge.

Shared practice mode `/?town=1` now uses local PostgreSQL and authoritative commands, independent fictional residents, scoped presence, cooperative bridge restoration, persistent plot rights/upgrades/decoration, quest receipts and separate weekly scores. The default browser-only workshop and its saves remain intact. Selectable fictional identities are test fixtures, not production authentication. Physical house lots and broader neighborhood progression are not yet implemented.

Local acceptance: 47 domain/art/server checks, 20 browser scenarios (desktop, narrow touch emulation, short viewports), strict builds, planning/integrity checks, actual database restart/service recovery and backup/restore. See [evidence and fixture disclosures](evidence/IH2-040/REPORT.md), [local setup](LOCAL_TOWN.md) and [handoff](idle-hands-2/handoffs/2026-11-10-durable-town.md). No physical-phone, cloud load or hosted Supabase certification is claimed.

Next is IH2-045: distinct trees/residents, building shapes and materials, land textures and gentle ambient motion within the approved illustrated style. Persistent creative work and phone usability remain requirements. Local preview uses http://127.0.0.1:4175/ while this computer runs; shared mode additionally needs the local database/service.

Autonomous rules and the approximately 10% weekly-remaining stop still apply; no automatic usage reset. Last observed 66% remained during this milestone. Current usage must be checked before another substantial task.
