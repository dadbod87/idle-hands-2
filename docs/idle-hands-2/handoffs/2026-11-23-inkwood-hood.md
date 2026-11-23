# November 23 · Earned Inkwood hood and trail guidance

PR #107 merged as `168e85720d680dd125d6204e84a12e455bf14878`. The exact PR and main passed 593 domain/database tests and 254 browser cases. The required main run was 45213779084. [Gate evidence](../../evidence/IH2-191/EXACT_CI.json).

The candidate on `feat/inkwood-hood` reuses the original hood art and the permanent three-discovery entitlement. The town saves the worn choice with the authenticated command, and existing room-scoped presence shares the visible item. Bag shows the item's status, and the trail journal guides the player to the next missing landmark and links to the earned hood. [Implementation and verification plan](../../evidence/IH2-192/PLAN.md).

Local Chromium emulation used declared fictional snapshot and presence payloads, with desktop, 320px portrait and short landscape captures. Terra 6.1 reviewed the hood on the wearer and neighbor and the Bag controls. The corresponding hosted HTTP test covers the real award, isolated peer stream, and restart. No saved-preview or protected database restart was requested or performed.

As a follow-up, evaluate a second directly earned cosmetic for the carpentry loop. The already-authored Clerk cap could mark a first recorded easel. Treat that as a new bounded gear choice with its own earn conditions and mutual exclusion, while preserving browser-practice appearance preferences and the occupied town slot.

Initial PR #108 run 45219072940 passed domain/database and browser groups 1 and 2. Group 3 observed the garden scene transition before the asynchronous Bea artwork request. The exact intended request assertion now polls for completion and still rejects extra sheets. The focused local test passed. The replacement final-head run is automatic. No manual reruns or coverage changes.
