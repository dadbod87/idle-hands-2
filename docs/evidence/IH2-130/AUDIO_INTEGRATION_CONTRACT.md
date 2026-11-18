# Bounded optional sound integration — review draft, not implemented

Player benefit: a welcoming sense of place without forcing office speakers on or adding work to the server. The first slice should be place music, not a sound for every click. Keep quests, persistence and timing independent.

## Presentation and interaction

Try one illustrated 44px Sound control at the upper-right of the playfield, with the location/weather label reserving that width. Use the existing modal, so its shared input lock, Escape and focus return continue to work. A compact panel needs Enable sound / Pause, separate Music and Effects sliders with visible percentages, and one short current-place line. Keep mute available directly from this panel; avoid extra permanent HUD rows. If 320px or enlarged text cannot fit this placement, refine the HUD rather than shrinking targets. Preserve resident selection and guide controls.

Default silent on every page load, even if volume preferences were saved. Opening the panel alone must create no AudioContext or network clip request. Enable/Resume must be a deliberate gesture. Hide, page exit and audio interruption stop voices and cancel pending requests; returning asks for another deliberate Resume. Starting or stopping sound must neither steer the character nor close another pending save. Storage failure only loses preference persistence, never progress.

## Existing code and asset choices

The accepted129audition is historical evidence; do not silently turn its study page into the production engine. Its original three themes/six accents, source score, synthesis and provenance are reusable. Compare lazy static WAV loading against lazy synthesis: fetching just one theme after Enable avoids a 25–30s synchronous synthesis pass on a phone. Do not fetch all4MB at boot. Bound decoded-theme cache to two, one music voice and one effects voice, and one pending load per theme; epoch-check late decode completion after mute/room change. Keep original study byte-exact.

Use existing confirmed room/context hooks, not the displayed location text or speculative walking target. Town/square/neighborhood use the town score; trail uses woodland; home uses home. Workshop/garden may initially share the town score. Avoid repeating a door cue on every position snapshot or interpreting rewards before persistence. A first slice may omit reward cues entirely; thoughtful restraint is better than an accidental chorus. Short sketches are audition material: deliberate gaps/soft starts or non-looping Play are preferable to assuming an endless loop sounds finished. Human listening remains needed to assess repetition and taste.

## Gates before source acceptance

Controller tests should cover no-before-gesture work, bounded fetch/cache/voices, rapid place changes, mute while decoding, interrupted resume, hidden/reload, invalid preferences and failed storage. Browser checks should use real in-game controls at320/360px, desktop2K, short landscape and enlarged text; verify no horizontal overlap, visible targets, keyboard focus/Escape and canvas input lock. Hardware-muted graph checks are not human listening or a physical iPhone/Safari test. Terra6.1must inspect the actual current game stills, not only this draft.

Keep all existing537domain/198browser cases, authority/recovery/500ms gates and exact PR/main acceptance. No paid assets, dependency, backend, schema, timers, normal-preview restart or UO content. Final candidate counts depend on actual meaningful additions, not a predetermined quota. Do not start this section until131source closeout and127fixed observations finish; if the2PM boundary leaves insufficient time, retain this draft as the next handoff.

## Primary browser guidance checked November18

[MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) and [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay) support creating/resuming the context inside deliberate user interaction. [MDN decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) describes asynchronous decoding of a complete asset buffer; [AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) is an in-memory short asset. These support lazy, bounded decoding as a candidate, not a promise about phone latency or universal background behavior. Physical Safari/iPhone still needs separate validation.

## Asset and memory review

Accepted129theme WAV sizes are town1,138,504 / woodland1,335,874 / home1,298,142bytes:3,772,520total. These are optional downloads, not a new boot payload. Browser decode can resample to the context's sample rate: two cached themes are not automatically the same memory footprint as their22050Hzsource WAVs. Bound decoded bytes as well as theme count, account for an active source retaining a buffer, and retain failed/cancelled-load usability. Any compressed derivative needs explicit original-source provenance and reproducible tooling; do not quietly add an encoder dependency or assume subjective quality from automation. The first slice can keep the existing original WAVs and measure its actual lazy fetch/decode cost before considering compression.

## Updated preparation choice after measurements

The independent18Node/36native Chromium captures in AUDIO_WORKER_READINESS support a lazy dedicated worker for original synthesis. This supersedes the earlier tentative preference for static WAV loading. Preserve explicit gesture, quiet cancellation, two-theme/byte/voice budgets and original provenance. Actual bundled-worker/game checks remain required; the probe starts no game, service or audio context.

## Interaction review to carry into130

The world HUD becomes inert while the existing shared dialog is open. Plan an immediate pause/resume affordance in an open menu too, so a player does not need to close crafting just to quiet the game. Compare a44pxheader quick toggle beside Close against the long-title/320px/200%layout; preserve Close and the existing pending-save/retry behavior. Do not replace an in-progress review with Sound options or silently discard an intended action. The settings dialog can remain concise: deliberate Enable/Resume or Pause, Music and World sounds levels, and a short current-place line. Preserve predictable keyboard focus/Escape and canvas input locking.

Choose a restrained phrase/rest policy with human repetition still unverified; eight bars are not automatically a finished endless soundtrack. Keep at most one music voice, one effects voice and one pending preparation worker. Reuse cached PCM, not repeated synthesis during every loop or snapshot. Hidden/page-exit/identity change quiet the engine and require a deliberate Resume on return. Device volume preference must never turn into auto-enable after reload.

Map actual room/context to the original place themes, and use confirmed transition hooks for a door cue. Generic snapshot updates, provisional walking, failed saves, in-place home expansion and menu opening must not sound like successful doorway travel. Same-theme room changes should not restart the music; deduplicate confirmed transition identity if retries share a result. A first slice can omit all reward/gather/craft cues until the actual durable acknowledgment hooks are inspected. Sound is always presentation: every important outcome remains visible without hearing it.
