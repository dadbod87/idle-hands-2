# Morning review — November 18

The performance work is saved and verified. The sequel remains a local preview; the original live Idle Hands game and real player accounts were untouched.

## What improved

- A town-state read now uses one combined query instead of fifteen. The same twenty-client burst uses 2,540 queries instead of 5,620: **54.8% fewer queries**. This is a query reduction, not a promise of 55% faster play or a supported player count.
- A slow, incomplete movement request no longer blocks other residents from moving or reaching doorway validation. The sender's own request order and all movement rules stay intact.
- Completed Bag/Journal reads clear misleading waiting text while keeping pending, failed and confirmed actions distinct.

## What we checked

Latest accepted main: **6c150fb6f10df6ac6decd2377cd96448e8c6d028**, [PR58](https://github.com/dadbod87/idle-hands-2/pull/58). Both final PR and main pass all five jobs, **514 domain checks and 193 browser cases**, with the original performance limits. The newest tests check that locations open on schedule, a failed save leaves everything intact, retries do not duplicate rewards, and opening dates stay fixed. They change tests only.

Six fixed five-minute ordinary-session studies preserve progress, privacy, idle streams and cleanup in every run. One old-server snapshot result misses its timing target; the other five trials meet theirs. Results vary, so there is no causal speedup or capacity claim. Earlier local timing misses remain recorded, including the latest 512/514 local run; they were not relabelled green. [Full comparison](../../evidence/IH2-125/REPORT.md).

Terra 6.1 reviewed 26 actual saved-preview screenshots covering desktop at 2K/4K, narrow phones and short/enlarged-text menus. No visual blocker was apparent. Immediate-touch gray rectangles disappear in later captures; cause and input effect remain unproven. The partly hidden Registry sign and Journal activity discovery remain small future opportunities. This is Chrome viewport/touch testing, not physical-phone, Safari or WAN acceptance. [Visual review](../../evidence/IH2-124/terra-actual-saved.md).

## Your preview and progress

- [Practice town](http://127.0.0.1:4175/?town=1)
- [Fictional neighborhood tour](http://localhost:4176/?town=1)

These links work on this computer while its services run. The performance fix is installed in the preview. The latest source change adds tests only, so it needed no install or restart. The earlier API-only update preserved three original signed sessions and their saved positions. All stored town data, original keys and existing preview processes remain verified. No real accounts or saved towns were reset, and no cloud resources or paid services were configured.

## Best next work

Measure how public town activity causes real clients to refresh. Use the [prepared candidate](../../evidence/IH2-125/PUBLIC_REFRESH_CANDIDATE.md) and [latest safeguards](../../evidence/IH2-126/NEXT_PERFORMANCE.md). Preserve actual targets and timers, disclose historical fixtures, and verify eventual public/private state with native desktop/touch clients. Do not add caches, increase pools or change the economy based only on noisy timings.

[Source and preservation report](../../evidence/IH2-126/REPORT.md) contains exact checks and limitations. CURRENT_SESSION and the dated handoff identify the current source/documentation branch; verify its remote head on resume. Actual service commands/PIDs remain in movement-body-2026-11-18/active-services.json. The overnight work window ends at 7 AM Pacific (15:00 UTC); resume further implementation only with the next instruction.
