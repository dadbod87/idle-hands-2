# Pip’s post — working runtime contract

IH2-071, November 12, 2026. This is an unaccepted local candidate on `feat/neighborhood-commission`, following accepted design PR19 / merge `15fc3404c6972b1b1803d23709317c781b3fc9ff`. Final repository checks, exact-head CI, artifact review and source merge remain required. The accepted game at port 4175 and its practice API remain unchanged.

## Free chapter and physical reward

Pip offers **The Post Must Go Somewhere** alongside the existing orientation dialogue. Explicitly accept three addressed parcels, hand each one to Marlow, Jun and Nella in any order, then return three unique receipts to Pip. All six orders have equally valuable captions. The free reward is a private illustrated route card and letterbox plan, not physical furniture. Wrong recipients return the same parcel without a debit or receipt. A paused route retains its original parcels and order; accepting again, duplicate handovers and duplicate completion cannot remint anything. No house, public-project completion, helper, empty bag, workbench or timer is required.

The optional **Unreasonably Official Letterbox** costs exactly **2 carried pine + 1 harvested radish**, once. Review the current stock and confirm at Pip; no new finishing timer. The quote identifies the next easel/hamper/welcome-request tradeoff when the current stock actually has that conflict. It reserves nothing. A growing plant, bound seed, flower, ordinary material or existing furnishing is never spent. Both ordinary and independent finishing jobs keep their original timestamps and output rules.

A player owns zero or one physical box. Leaf route, Sun route and Night post are three free motif choices preserving the same shell, cap, slot, plaque, flag and feet. Changing a motif, storing or moving the item does not create a copy. The existing workshop/home allocation transaction prevents a sole box being placed in both locations.

## Saves, transactions and projection

The current root is version 2, garden version 3 and carpentry version 2. The new commission has its own strict version-1 `pip-post-v1` record. Its order is unique and bounded; accepted/completed timestamps, pause, plan, made count, motif and publication must agree. Root ownership must equal the made count. New explicit sinks satisfy:

- `carpentry.commissionPine = 2 × madeCount`;
- `garden.consumed.commission.radish = madeCount`;
- `garden.consumed.commission.marigold = 0`.

Original easel, hamper and mixed-request equations remain intact. No unrelated counter stands in for the new recipe. A partial debit, failure, stale review or invalid post-state is atomic. The existing player-row lock, UUID/payload hash, expected revision and SQL receipt own payment, delivery, completion and placement. A dropped committed response retries the identical request and returns its original result. Actual recipient/Pip proximity is enforced at the server; walking itself never turns in a parcel.

Recognized older JSON roots migrate with zero commission sinks and no reward, preserving stock, history, jobs, properties and receipts. Purported current data with missing fields, malformed old tuples and unsupported versions stay unreadable; the browser keeps the raw bytes and becomes read-only. The browser deliberately keeps the **same** `ih2:workshop:v2` key and `ih2:workshop-writer` lock. The actual accepted older compiled writer refuses the newer root on a storage event and releases that lock; reload/pagehide cannot overwrite the newer paid box with old defaults. There is no replacement save namespace or new SQL table. Existing five migration files and checksums remain unchanged; older SQL workshop JSON upgrades through the validated ordinary command path.

Shared protocol **3** rejects cached unversioned/v1/v2 HTTP and EventSource clients before progress access or mutation. Accepted port-4175/API-4186 remains protocol 2 until a fully accepted coordinated preview update. Do not update only one side or target the original game’s backend.

Public register publication is explicit and independent of housing. It projects only `ownerId`, `ownerName` and `motif`, only for an owned box. Preview, private delivery order, crop/wood stock and receipts are not exposed. Removing the sample preserves ownership and placement. A visitor can see the selected motif of an actually placed owned home box even when the register sample is unpublished. Unplaced/rental styles stay private. Motif changes invalidate visitors only when publicly visible; private deliveries and private crafting do not broadcast. Projection reuses the existing display query rather than adding per-frame work or private-state scans into clients.

## Presentation and limits

Actual NPC services remain reachable. Nella’s saw/easel/hamper controls are retained; delivery is a separate explicit action. Jun/Pip guidance now acknowledges the implemented garden, fallen pine and NPC route while keeping shops and player mail unavailable. Bag & journal and guarded named travel provide phone alternatives to body taps and keyboard inspection.

Fourteen original accepted vector studies are promoted by `tools/promote-commission-art.py`. The runtime catalog records their source-study hashes, final hashes and 80×112 / foot (40,106) box anchor. Existing actor rigs and collision geometry are unchanged. Illustrations acknowledge handovers; no new actor handover/assembly rig is claimed. A short 600ms open/closed box reveal is local presentation after a confirmed craft, canceled on closing and still under reduced motion. It never authorizes payment, ownership or progress.

Controls retain at least 44px targets. Feedback has reserved sticky space, quotes capture the reviewed revision, and focus is uncovered beneath the title and above feedback. Closing/reopening a panel changes its generation. Late completion/retry presentation is ignored for an obsolete panel/owner while subscribed authoritative state still updates. Transport presentation guards suppress only obsolete messages, not receipts or persistence. The preexisting pending-request gate still refuses resident switching until the request is resolved.

The evidence separates fresh actual-time input, elapsed valid-command fixtures, HTTP/SQL tests, compiled-old-writer tests, static art review and actual restart/restore. Chrome phone emulation is not a physical-phone, Safari, hosted-auth or human-enjoyment result. The chapter is finite; it is not a player messaging system, repeatable money source, universal multiplier or proof of a full evening’s content.
