# Shared action confirmation accepted

A successful shared action stays visible during coworker updates. Waiting at the café no longer makes a valid serving look like clock corruption, and project openings crossed during that wait appear coherently.

Main **eb40476ac3d364dc276996e22102e5d9055ab8ef** ([PR #62](https://github.com/dadbod87/idle-hands-2/pull/62)) contains the exact tested candidate tree. PR run **44389304996** and main run **44393346381** each passed all five required jobs: **545 domain tests and 198 browser cases**, split73/66/59, with no skips, flakes or report errors. Original500ms, recovery and durability gates remain intact. [Source proof](source-closeout.json), [PR verification](pr-verification.json), [main verification](main-verification.json).

## What changed

Ordinary public invalidations defer during pending commands; reconnect recovery remains authoritative. If a newer-clock public read overtakes a higher committed private revision, a bounded coherent refresh confirms that progress before the original command UUID clears. Failed confirmation retains the same retry identity.

Café requests acquire shared bridge, noticeboard and café rows in that order before effective time, common opening settlement and personal projection. This deliberately adds **two café lock reads**; ordinary query counts, pool/rates, schema, stock, exact cooldown/opening durations and UUID/replay rules remain unchanged. Genuine backward clocks still refuse; no time is clamped to a stored future value.

## Evidence and retained failures

Seven added client regressions and eight server-clock regressions pass. Four controlled scheduling cases first passed1/4, then4/4; an opening-boundary review added a fifth case that failed before the final correction and now passes. Three real PostgreSQL cases verify queued serving/debits, backward-clock refusal and stable failed-receipt retry, and openings crossed while queued with one exact historical event. The final queue fixture pauses real SQL after the first clock sample, so it exercises older and pre-lock implementations without replacing results.

PR61passed its candidate, but its main smoke failed twice in public wave3. The initial cancellation-only diagnosis was incomplete. Controlled scheduling reproduces the clock refusal; the old report lacks its receipt reason, so that exact old failure cause remains an inference. The later543-domain bf5b7f4and545-domain34b926bcandidates were superseded during boundary/fixture review. [Validation history](VALIDATION_HISTORY.md), [clock follow-up](CAFE_CLOCK_FOLLOWUP.md). Approximate summed standard-public job minutes **487** include all candidates, failed main attempts, a cancelled duplicate and current checks; this is not an invoice or billing balance.

The actual20-fictional-session smoke uses18actualTownClientprotocol models and2rendered Chromium contexts. It confirms15public changes,15exact retries and285invalidation frames, conserves materials/deadlines/nine migration hashes and all17table fields across idle, and drains requests/streams. API/SSE confirmations are real and unintercepted. [Terra6.1review](TERRA_REVIEW.md), [desktop](screenshots/desktop.png), [phone](screenshots/phone360.png). These are synthetic CI sessions and emulation/stills, not physical-device, human-usability, WAN or hosted-capacity proof.

Local checks:34focused and396independent passes;20database-unavailable skips (416collected) remain disclosed. Build/types, plan10, pinned40and whitespace checks pass. This follow-up preserves all232compiled client files fromPR61; across131only mainJS/index changed while other230files/all226art remain exact. Server sampling changes are explicit.

## Runtime boundary and next step

Saved previews and practice-database services remain off. Read-only inspection found a preexisting running Docker engine with other containers; this continuation did not start or stop it. Both original0600keys match read-only. Current saved-table equality, normal runtime installation and hosting are unclaimed.

Next127runs the two predeclared180sdisposable-CI observations; none had run at this source closeout.130optional original audio remains queued, with HUD and worker-readiness evidence saved separately. No UO assets or paid configuration were added.
