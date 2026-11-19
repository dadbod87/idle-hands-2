# IH2-169 · Let visitors see an earned keepsake

The first home-display study uses the existing Neighborhood Naturalist certificate. A resident earns it by recording three tree studies. The owner can preview the framed certificate and explicitly hang it for visitors. A visitor sees the certificate only after that choice. Taking down the frame leaves the earned keepsake in Journal.

Run the standalone study from the repository with an ordinary static server bound to loopback, then open `/tools/home-keepsake-study/`. The `?earned=0` view shows the incomplete book. The two view buttons demonstrate the owner and visitor states from the same fictional fixture. The study uses only in-memory state. It reads no game save, posts no request, and runs outside the shipped client. The starter room, rug, lamp and certificate are original existing repository art.

## Candidate runtime contract

- Use one deliberate display slot in each eligible home tier. The owner’s retained sketchbook proves eligibility. The certificate stays in Journal, with no additional Bag item, recipe, fee or production effect.
- Treat preview as private rendering. A shared write requires the current authenticated owner, their confirmed home interior, an eligible earned certificate, and the usual precise request and revision rules. Persist an allowed display choice through ordinary home upgrades. Older homes start with the slot clear.
- Project the single chosen certificate ID and position through authorized home views. A visitor sees its short story alongside the other home displays. Do not reveal the incomplete sketchbook or other private inventory.
- Commit and remove through the existing write and receipt boundaries. A conflicting or lost reply keeps the last confirmed display until reconciled. No presence or animation network events. Confirm the same object for a visitor after reload and removal.
- Validate frame alignment for every approved home layout, at ordinary scale and narrow phone. Use the existing art source and collision contract. No extra object blocks the player’s walking surface.

## Study evidence

Native Chromium exercised keyboard and touch-emulated preview, cancellation by switching views, explicit hang, read-only visitor projection, owner removal, and the unearned state. The 1280 × 800 desktop, 320 × 640 phone and 844 × 390 enlarged short browser views all preserved complete words and no horizontal overflow. Six automated WCAG A/AA scans reported zero violations in the preview and visitor samples. These observations cover the study. Physical phones, shared database authority, game-room positioning and durable progression require separate implementation and verification.

Terra reviewed all six captures. The frame and adjacent title identify the keepsake at small scale, where the lettering inside the miniature certificate is too small to read. The short enlarged preview shows both actions and the privacy explanation. The smallest phone view scrolls to Cancel, with the primary action fully in view.
