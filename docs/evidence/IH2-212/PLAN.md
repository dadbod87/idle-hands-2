# IH2-212 · Town chat rehearsal

[Open the local rehearsal](study/index.html) with the repository served on a temporary loopback address. Ellis, Marlow and Pip are fictional players. The chat panel labels its audience as Town · Ledgerwick, shows the sender and timestamp, and keeps an entry after its speech bubble disappears. Short landscape places the history and composer beside each other. Quiet bubbles keeps the dated history. Leaving the square hides speech from that scene while retaining already delivered Town lines.

The rehearsal keeps up to 24 lines in page memory. Each visible bubble lasts 5.5 seconds, shows the latest eligible line and yields the full text to the history. Those are review values. The controls for a sample reply and changing rooms are part of the rehearsal. In the game, the same Journal can distinguish Chat and Activity while Bag stays separate. The future chat control should be reachable by touch without taking room from the short-view movement controls.

## Play it and verify it

From the repository root, run `python3 -m http.server 4347 --bind 127.0.0.1`, then visit `/docs/evidence/IH2-212/study/`. Stop the static server when done. The rehearsal loads the game's existing original illustrations and has no external requests, accounts, game writes or chat backend.

Run `node --test docs/evidence/IH2-212/study/town-chat.test.mjs` for the local model. With the same static server open and Chromium/WebKit installed, run `node docs/evidence/IH2-212/study/browser-check.mjs`. The browser script accepts `IH2_WEBKIT_EXECUTABLE` when WebKit lives outside the usual browser cache. The checking clock is isolated and scripted. Desktop keyboard, 320px touch and 640×360 at 200% text cover a deliberate send, literal markup, dismissal, exact bubble expiry, quiet mode, a room change and retained timestamp history. Actual on-device keyboard and readout behavior need a later playtest.

## Next playable slice

Start with Town messages in one settlement using verified player sessions and a narrowly scoped message stream. Bind the sender and posted time on the server. Give sends stable IDs so retries and reconnects deduplicate. Deliver only to entitled residents. Keep other rooms' speech bubbles out of the scene while letting already delivered lines remain available. Incoming messages should leave camera input, private progress and rendering cadence independent. Player mute and report controls should be decided alongside a clear history policy before real play.

Participant-only conversations are a later slice. Verify that unauthorized residents receive no data through live delivery, catch-up or history routes, and that a delayed response cannot cross identities. Private replies have no public overhead bubble. The current document makes no promise about final retention, private messaging availability or a live release.

## November 23 review

Four model cases passed. Chromium and WebKit each passed the desktop, narrow phone and enlarged landscape route. A visual review found the initial short composer scrolled the header away. The two-column layout now keeps Close and Send fully in view. The history can scroll independently, and timestamps display minutes on one line while preserving their full machine-readable value. No browser save or external network request was made.
