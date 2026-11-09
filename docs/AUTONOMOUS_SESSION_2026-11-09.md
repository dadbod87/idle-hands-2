# Autonomous work agreement — 2026-11-09

Nick explicitly asked to keep working while away, use an agent/review loop if useful, reuse appropriate systems code independently of art, prioritize a distinct feel and phone usability, and stop at about 10% weekly usage remaining. This later instruction authorizes crossing the earlier one-prompt task boundary for the bounded session below.

## Success target

Finish/review/merge IH2-020, then complete a phone-friendly local IH2-030 workshop loop: useful direct taps/interaction, gathering, small inventory, two recipes, placing a crafted item, short tutorial quest/skill progression, elapsed-time production and reliable versioned synthetic local saves. Include deterministic slow-progression simulation and independent review. Required exact-head CI must pass before each merge. Preserve accepted continuous movement/door behavior. No claim of shared/server authority from a local prototype.

Evaluate reusable systems separately from art: exact source/license, dependencies/framework coupling and integration tests before importing code. Prefer a small useful maintained module over wholesale engine adoption; free/open-source code does not automatically make unrelated artwork reusable. Record adopt/defer/reject reasoning, not just repository popularity.

## Usage and stop rules

The Codex app has a read-only get_usage_limits capability. At authorization, the actual weekly Codex bucket had 31% used / 69% remaining. This is account-wide, including other sessions and agents; it is not reserved for this task. Read it at task boundaries and before long implementation/CI/review batches, and periodically during sustained work. Use remaining = 100 - usedPercent for the 10,080-minute window, not an unrelated short limit.

Do not start another substantial batch when near 12% remaining; use the reserve to checkpoint and close out. Stop feature work by approximately 10% remaining, never consume a usage reset or buy credits automatically. If the usage read becomes unavailable, finish only the current small safe checkpoint and stop rather than guessing the remaining balance. Other sessions may consume usage between checks, so a mathematically exact reservation is impossible.

Stop at the success target, any needed spending/access/publication decision, or a repeated unresolved failure without a credible safe next step. Investigate failed checks; never skip assertions or merge failed/pending checks. If three attempts at the same cause have no new evidence or progress, record the blocker and stop that path. Make a clean handoff with actual checks/limits/next task; do not fabricate success because the user is away.

No public deployment, real accounts/progress, production mutations, paid assets, new billed hosting, automatic reset, team messaging or changing the existing game. No new scheduled automation is needed: this is the active bounded session, not a recurring job.

## Reviews

Two explicitly authorized focused agents: reusable-system source review (read-only) and independent phone/visual review (read-only). Main agent owns edits and checks. Further review may be requested once the local loop exists. Check shared usage before more delegation. Findings and unresolved limits belong in task evidence/current handoff.
