# IH2-170 · The second blanket

The browser-practice boarding house has its own optional original six-bar score. It uses soft plucks and a sparing low line at 56 BPM. The voice comes from the first note of the game’s existing original return cue. Nothing here comes from Ultima Online, a soundfont, a purchased recording, or a network audio service.

The score uses the current dedicated worker and the two-slot music cache. Entering a room silently never creates a worker or audio context. With music enabled, the room selects its arrangement and the existing square score resumes outside. Music and effects controls keep their independent volumes and opt-in behavior. No storage, movement, first-morning timing or shared practice rule changes.

At 22,050 Hz the phrase is 593,460 mono samples (26.91 seconds) before the existing quiet loop interval. The sample has zero endpoints, 0.1614 peak and 0.02048 RMS. All three original full themes and the orchard phrase retain their previous exact PCM. The earlier audition evidence regenerates unchanged.

This work follows the accepted boarding house and its existing player path. Native Web Audio and the score fingerprint can verify what reached the browser output buffer. They do not certify physical-device playback or human listening.

All ten focused audio domain cases and all nine local Chromium music and doorway cases passed. The boarding-house touch test walked through the actual door without constructing any audio context, enabled music deliberately, verified the native buffer fingerprint, then walked out to the original square score. Related shared-confirmation cases used deliberately held fictional responses. The build passed and full repository CI is pending.
