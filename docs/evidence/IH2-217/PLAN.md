# IH2-217 · Temporary doorstep notices

A kind joke should take seconds to enjoy and be easy to undo. This study lets Harper opt in to temporary, illustrated notices beside their cottage door. Ellis visits, selects one preset, reviews the exact result and deliberately posts it. The study stores fictional changes in the page, uses the original Pocket Cottage drawing and has a simulated clock. It is a separate design branch.

[Doorstep rehearsal](study/index.html) opens through a static preview of the repository. Serve the repository root on a disposable loopback port so the relative image and module paths resolve. Run `node --test docs/evidence/IH2-217/study/doorstep-model.test.mjs` for the local action rules.

## Candidate choices

- Off per household by default. Only the owner may enable, disable or immediately take down the separate sign. Turning the setting off clears the sign and invalidates open quotes.
- A physically visiting resident can pick from three original office jokes. The exact home and sign appear in a free preview. Posting requires its own confirmation. The available messages contain no player-written text.
- One freestanding notice occupies its own yard presentation spot. The door, existing decor, access and movement stay available. It has no points, cost, buff, loss, progress or cooldown benefit.
- A notice disappears after 15 minutes, and the house stays in an eight-hour quiet period even if the owner takes it down early. Both are provisional design values. Time belongs to the simulation here. The study does not run the game or depend on a live schedule.
- Only the sign and expiry are suitable for a public home visit projection. The owner’s private view can identify the sender. A later multi-home implementation needs a bounded sender limit across homes and an audience model for streets separately from visits.

## Authority before integration

Use server-confirmed resident identity, access to the actual home and its current consent when quoting and posting. Derive the actor, target, current time and visit from server records. Lock the current household and sender limit together so a second visitor cannot replace an already committed sign or bypass the sender limit in a different home. A duplicated one-time command returns its same receipt and should never restore a removed or expired sign. Keep receipt retention long enough to cover reconnects and protect the revision beyond retention. Revoking consent and removing the visible sign must happen together. Reject quote reuse by another resident or for a changed home. Bound all private records and scope any streamed public projection to authorized visitors. No custom messages, public profiling, new currencies, saved-game changes or hosted infrastructure belong in this proof.

## Local verification

Six deterministic tests cover default consent, owner-only controls, actual visit and quote scope, two competing visitors, expiry, revocation, early removal, cooldown after removal and idempotent replay. Chromium and WebKit each passed desktop keyboard, 320-pixel touch and 844 × 390 touch at 200% text. The rehearsal exercised preview and cancel, explicit posting, owner removal, opt-out and expiry. The native sessions used fresh browser contexts and wrote no browser storage or outbound requests. The 15-minute expiry used the simulation control. Physical-device testing and shared persistence remain future work.

Terra identified an overlapping address plaque in the first enlarged landscape capture. The cottage, sign and address now occupy separate layout cells, followed by a new browser pass and Terra inspection in both engines. The review status, full message and door are visible in the updated captures.
