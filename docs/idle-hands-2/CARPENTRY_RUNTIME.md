# Pine workshop — IH2-067 integrated candidate

November11,2026. Working implementation on feat/pine-workshop, not yet source-accepted or the pinned playable preview. [Task evidence](../evidence/IH2-067/REPORT.md) retains the earlier foundation checkpoint and final source-gate status. [Selected design](design/WOODLAND_FAMILY.md) remains separate from the future regional catalog. No hosted sequel, real player or original-game change.

## One small, persistent family

Nella offers a free once-only practical hand-saw lesson. Receiving a bound saw does not equip it: preview/confirm the equipment choice. Missing-only recovery is free after the lesson and counts the existing owned/equipped entitlement. There is no sale, trade, maintenance tax or production multiplier.

Three distinct square-edge pines prepare deadfall, never destroy shared decorative trees or compete for a global yield. They share **one personal pool**, initially6/cap6, returning1bundle per4realhours. Carried pine caps at24. No fractional reserve builds behind a full pool. Existing timber remains a separate ordinary material with its existing rules.

The finishing rack spends **4pine +1harvested marigold** for one Garden study easel after **12realhours**. It is independent of the old workbench/job. Explicit collection adds one kept furnishing and3private carpentry practice. Owned/produced caps99; reserve output space before paying. A finished job waits safely, never auto-claims or repeats. Placing, moving or returning the easel uses the existing free arrangement controls and its original splayed pine legs/grain/pressed-flower silhouette.

Optional groundskeeper hampers spend **1pine +2radishes +1marigold**, grant1private carpentry practice, and start a rolling **4realhour** delivery cooldown. No currency, ordinary materials/kits, old skill XP, edible healing or universal output buff is created. Literal cost, missing ingredient, storage and timer copy stay separate from authored jokes.

## Personal craft, optional town help

A separate explicit **record craft · keep easel** action can record each produced easel once. Recorded≤produced and owned.easel===produced always; recording never removes furniture. The anonymous noticeboard accepts at most6records, then installs over one fixed24realhour deadline. One resident can supply all six. No particular colleague, unique-helper threshold or simultaneous attendance is required.

The sixth successful transaction sets startedAt/readyAt once; later visits never restart installation. Opening is durable and uses the original readyAt even after absence. After funding, further personal craft records remain possible but clearly add no public credit. Only aggregate credits/phase/timestamps are public. Private stock, equipment and personal craft/practice counters stay private; a deliberately placed easel is visible to house visitors. Tool choice is self-visible in this first hand-slot slice, not yet public wardrobe equipment.

The easel goal suggests keeping4pine/1marigold. It is a visible planning aid, not an inventory lock. Previews are free; an optional hamper or mixed garden request can explicitly spend its last flower after a clear warning. Requests remain available after welcome-bed funding; neither a six-request cap nor automatic ingredient spending is introduced. The066pacing model's selected strategy bundles reservation and voluntarily stopping welcome requests aftersix, which is not an executable limit or isolated causal effect.

## Saved state and authority

- Garden schema2 conserves harvested[crop] = produce[crop] + mixedRequests + consumed.easels[crop] + consumed.hampers[crop]. Fixed internal recipe debits cannot manufacture request counts. Strict v1migration adds zero use counts, preserving existing harvest/request/practice/seed/plant/marker/errand history and deadlines.
- Private carpentry schema1 stores the protected tool, renewable pool clock, carried/gathered/spent pine, independent job, started/produced/recorded history, sixth personal record timestamp, service cooldown and practice. RootWorkshop1adds this family and zero owned easels at the last confirmed old workshop epoch. Unknown fields, corrupt ledgers and unsupported future versions are read-only, not reset or silently repaired.
- Root invariants tie ingredients to craft/delivery history and kept ownership. Ordinary inventory/job/skills/property remain independent. A normal placement still increments the existing placement statistic; producing carpentry does not fabricate ordinary making/gathering XP.
- Existing signed identity, origin, movement/proximity, UUID/payload hash, expected revision and player/plot transaction locks apply. Debit/start, collection/award and optional private-record/public-credit commit atomically with the receipt. Failure restores all sides; retries reuse the exact request. Public credit uses a guarded singleton UPDATE credits<6. RLS/revokedPUBLIC deny direct browser access to the new private noticeboard table.
- The trusted server passes counts already allocated in the other furnishing instance; it never reduces real owned totals in virtual state. The same sole easel cannot be duplicated between workshop and house. Only owners edit their house.
- Shared schema2requests identify their version through X-IH2-Schema; native EventSource uses schema=2. Cached unversioned requests get426before a snapshot, login or mutation touches progress. Current clients strictly validate saved state and refuse older/unreadable snapshots before rendering. Existing boot/revision/uncertain-request recovery remains intact. Local key ih2:workshop:v2 retains the actual old-reader quarantine/lock boundary; new clients never write the old v1key.

No new permission is inferred for hosted infrastructure, real identities or data import. Migration is additive in standalone isolated local PostgreSQL; no hosted Supabase project is changed.

## Places, controls and art

| Place | Confirmed foot target |
|---|---|
| Nella and noticeboard | square5,35 |
| Crooked pine | square6,26 |
| Forked pine | square7,41 |
| Sheltered pine | square40,41 |
| Independent finishing rack | workshop12,6.5 |

Coordinates were separated after checking actual artwork, old interaction regions and collision-safe routes. The original workshop threshold/exit and other old door arrivals remain exact. Direct tree/attendant/rack taps, keyboard Inspect, Places and new named activity navigation reach the same authoritative stops. Cross-room named travel enters the correct door; manual steering, another destination, identity/resync or panel opening cancels stale intent. A pending request retains its UUID and gates further walking/changes until confirmation.

New DOM panels begin with the selected action/item and concise stock, retain a compact fixed feedback/confirmation area, provide literal preview/confirm/cancel, disabled reasons, keyboard focus and44pxtargets. Nella's extra joke/reaction text is optional. Panel and retry controls remain usable in narrow/short/200%layouts. Existing long garden/guide friction remains068work, not silently declared fixed by this new family.

Twenty-five original SVGs plus two home-easel forms cover three pine silhouettes/available-exhausted deadfall, pine/saw/hamper icons, Nella, preview, empty/working/ready rack and collecting/installing/open board. Four original64×80resident rigs share feet32,72. Equipped idle/six walking poses and three-stage saw/finish/delivery actions cover four facings:112equipped +144action =256frames. Action atlases use two rows (1152×160) and equipped atlases1792×80; all144action-frame SVG bodies are identical after repacking and every atlas remains within2048px per axis. The corrected wrist carry follows the real hand while keeping the blade within its frame; original default rig/garden SVG bytes remain unchanged. Full provenance/manifests and deterministic generators are recorded. No paid/imported media or current-game art.

Animations are bounded presentation after accepted results; never settle production, own steering, move the camera or submit network/database writes. Hidden/blur events cancel actions immediately even when rendering is paused; hidden new panels skip their nonessential refresh. Selected quotes align below the measured sticky header, including resize/200%text. Hidden state cancels actions; reduced motion uses a single still and no reveal fade. Anonymous noticeboard reveal is a short local opacity transition. Rendering derives deadlines, while finite client wakeups load confirmed state when a crop/job/pool/cooldown/installation deadline crosses.

## Evidence boundaries

The foundation's202checks/54browser cases are historical. The integrated candidate currently has217passing local domain/server checks, including new concurrent allocation and cached-stream guards; actual restored populated PostgreSQL restart and native Chrome art/phone/local/shared flows are recorded in current067evidence. Final full browser, exact-head CI/downloaded-artifact canvas review and source acceptance remain pending until explicitly closed out. Fixture times/positions/housing kits are disclosed; no simulated12hour wait is called a real elapsed wait, no emulation is a physical phone, and no pure schedule is server authority or human-fun evidence.


### Presentation-cost correction pending source gate

Current-rig activity sheets load3instead of12atboot; keyed asynchronous warming supports identity switches, safe ordinary-rig fallback, cache reuse and bounded failed-load recovery. The existing two loader retries remain; failed attempts are not re-enqueued each frame. All256frames still have independent gallery coverage. Still worlds redraw at10Hz with gentle scenery, normal input/travel/actions restore the normal loop, and locked-menu1Hzrefresh remains. No domain clock, effect, production or server rule changes. Rolling frame metrics explicitly include intentional idle intervals. [Measured diagnostic](../evidence/IH2-067/presentation-cost.json) retains the rejected slowerCanvasexperiment and method limitations.
