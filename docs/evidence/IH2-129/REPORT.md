# Original town audio audition study

Status: source accepted on main **221501ad09f83b4356069a97e099b69dd1554919**, [PR60](https://github.com/dadbod87/idle-hands-2/pull/60), identical tested candidate tree. Standalone study only; game runtime is unchanged. No UO/Stones recording, MIDI, melody transcription, sampled instrument or soundfont is imported. Owner requested nostalgic place/action music; original sketches explore that direction while exact UO rights remain unresolved. [Direction and primary references](PLAN.md).

## Deliverable

Three independently authored eight-bar scores: warm town strings/wind, quieter Inkwood, and restful home/café plucks; six small original accents. Reproducible integer-phase/harmonic/seeded-noise synthesis emits mono22050Hz16-bit WAV and a classic-script, file-openable listening page. No added dependency or runtime service. Three current original project illustrations are copied byte-exact with hashes; every generated file and source is recorded in [the manifest](study/manifest.json).

| Sketch | Duration | WAV bytes |
|---|---|---|
| Town square | 25.815 s | 1138504 |
| Inkwood | 30.291 s | 1335874 |
| Home & café | 29.435 s | 1298142 |
| Wooden door | 0.41 s | 18126 |
| Material collected | 0.61 s | 26946 |
| Craft complete | 0.89 s | 39294 |
| Town opening | 1.5 s | 66194 |
| Coming home | 1.15 s | 50760 |
| Menu tap | 0.34 s | 15038 |

The full optional WAV pack is **3,988,878bytes**, under its unchanged4million-byte study budget. Game boot loads none of it. Tracks peak at or below0.22and accents0.28, with finite samples, small DC/adjacent deltas and zero endpoints; these are digital waveform checks, not speaker loudness, artistic quality or hearing tests.

## Controls and experience

The study is silent/context-free on arrival. Deliberate Play or accent tap creates one AudioContext; separate real GainNodes control music/effects. One theme plus one accent at most; two cached themes (cache bytes are not total/transient process RAM). No overlapping playlist or autoplay-next. Switching a place stops music and waits for Play. Pause/mute/hidden cancel pending starts; returning does not resume automatically. Completion and quiet idle release the running context. Device failure is recoverable by another deliberate Play. No storage, telemetry, game/API calls, server timers or saved progress.

Native hardware-muted Chrome focused checks cover real buttons, keyboard gain changes, touch, stable reserved feedback, direct file opening with no HTTP dependency, controlled auxiliary hidden return and quiet reload. The visibility setter is a disclosed controlled fixture, not proof of native device backgrounding. Automated output is explicitly muted; listening quality and physical iPhone/Safari remain pending.

Eight actual desktop/390/360/320/phone200/320-200/short/short200captures check whole control words,44px targets, focus, images, overflow and label/percentage overlap. Three Axe scans report zero violations with incomplete items retained. Terra6.1found clear choice/Play controls and coherent art; its initial label-spacing/card-height suggestions were fixed and reviewed again: [V1](TERRA_V1.md), [V2](TERRA_V2.md). Still review is not interaction or music-quality acceptance.

Player benefit: a small, comfortable listening sample makes atmosphere a reviewable choice before game integration. Friction removed: avoid immediate sound, surprise resumed playback, stacked accents and cramped phone labels. Remaining opportunity: evaluate these sketches by ear, then choose a separate bounded optional-runtime audio slice with appropriate confirmed-event hooks and a restrained cadence.

## Validation and retained observations

Seven focused Node cases and four focused browser cases pass on pinned Node24.22.2/current native Chrome, with browser hardware output muted. Exact final Linux CI regenerates all original audio/scripts/provenance byte-for-byte against the committed Mac-generated study. Complete local PostgreSQL/full browser suite remain unavailable because the owner explicitly kept Docker and existing saved previews stopped; the temporary study-only test HTTP server is separate and closes after tests. No normal service was reopened. Local saved-table equality is unavailable; no new saved-cookie/normal-preview acceptance is claimed.

[Early observations](early-observations.json) preserve the initial15,338byte budget overrun (unused tail shortened, no budget raise), unavailable TypeScript compiler API (replaced with pinned native type erasure), typed-array type correction and one narrow/200%label failure. First browser raw2pass/1fail artifacts remain in ignored local evidence; corrected4/4and later polish rerun4/4are separate. This does not label earlier failures passed.

Final independent local selection365pass/4explicit unavailable database skips (369collected), build, design, plan10, pinned40, exact232compiled game bytes, original0600key hashes and stopped-normal-service checks pass. Fresh197case collection preserves all old193identities plus four new cases; collection is not execution. Exact PR/main all-five/raw527domain+197browser gates pass: PR44351428054 / main44356623283, attempts1/1; raw artifact IDs/ZIP hashes and original500ms/recovery/nine-metadata gates verified. Approximate summed public job minutes95, not an invoice or billing-cycle balance. Original500ms/recovery/nine-metadata gates and all old520/193cases must remain. No hosted game/public launch, paid resource or original Idle Hands change.

Selected native captures: [desktop](screenshots/desktop.png), [phone360](screenshots/phone360.png), [phone320/200%](screenshots/phone320-200.png), [short/200%](screenshots/short200.png). These are standalone study screenshots with original synthetic audio, not a new saved-game or physical-device test.
