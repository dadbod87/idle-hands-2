# Little brass labels

This original eight-bar phrase plays around the orchard when the player has turned on music. It uses the bright first note of the game's own gather cue as a plucked voice. The ending leaves the same eight seconds of quiet as the other place scores. Music and world cues keep separate controls.

The orchard has a small buffer at its edges so a momentary step back does not interrupt the phrase. Browser practice uses the resident's feet. Shared practice waits for the game's existing movement confirmation. Opening a menu, pointing to the orchard, or sending a move does not switch tracks. The town track can be reused when leaving the orchard.

The mono phrase is 480,060 frames at 22,050 Hz. Its Float32 PCM SHA-256 is `e32c9f2466682a645261205417e089673348fc48d7e79403d2d93d74000d3f19`. Pure checks verify deterministic rendering and the orchard boundary. Native Chromium checks walk into and out of the orchard, verify the actual Web Audio buffer and hold a fictional movement reply. Browser checks use a disposable static build with an intercepted practice session for the held reply. Speaker playback still needs human listening.

Keep the existing saved previews and databases stopped. The new track uses no licensed recording or external media request.
