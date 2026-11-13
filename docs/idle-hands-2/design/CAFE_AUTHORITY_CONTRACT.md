# A tasting worth saving

**Design contract only.** Based on coherent candidate `2d3fa8f9b84ca1de8dc4585a97594ed415fe5cd1`, which is locally verified and still unaccepted. The café, teapot, new save versions and transactions below are not implemented. Accepted source/previews remain090. This contract turns the099study into a small next development sequence; it does not approve hosting, accounts, expenses or a public release.

## The small player loop

Offer one harvested radish for one tasting, immediately. No preparation queue, meal inventory, bench reservation or ordinary material cost. A successful serve starts a four-hour personal cooldown. Three personal serves earn one permanent physical teapot in Bag → Furniture. Each successful serve also adds one public café credit while that counter is below12. Reaching12fixes one four-hour opening deadline. Late players can finish their own three tastings after funding/opening.

**Stop charging when personal progress is complete and the town is funded.** Funding means12credits, including the four-hour opening wait. Waiting for the open phase would allow useless paid serves. This agrees with the existing study's stale-final-credit model. A player may continue helping after their personal reward until funding finishes; no second teapot is awarded. Count every successful serve for conservation, display personal progress capped at3, and cap this finite chapter's total serves at12. Do not reset any of it with weekly competition.

Three presentation choices are free and cosmetic. Their selection never changes cost, cooldown, credit or reward. Review/cancel spends nothing. Keep the existing last-radish warning when Pip's letterbox remains unmade. The chapter is finite, not a claim of months of active content or measured enjoyment.

## What the current code actually does

| Fact | Current source evidence |
| --- | --- |
| One local JSON save key `ih2:workshop:v2`, older-key fallback, common `ih2:workshop-writer` lock; synchronize after acquisition and preserve unreadable raw data read-only | `src/ui/workshop.ts:13–14,54–66,101–104` |
| Local dispatch assigns the reducer's new state before persistence. A quota failure keeps unsaved in-memory progress and appends a visible warning; reducer `ok` alone is not durable success | `src/ui/workshop.ts:104,108–118` |
| Root version2, strict owned/placement whitelists, cross-ledger checks and exact recognized old tuples. Unknown/partial roots are not safely defaultable | `src/game/workshop.ts:38–62,104–128` |
| Garden version3 conserves harvested produce across held stock and explicit easel/hamper/commission sinks | `src/game/garden.ts:39–60,78–98` |
| Shared command locks the player, settles existing progress and resolves prior UUID/payload hash; successful player state, receipt and snapshot commit together, with rollback on failure | `server/store.ts:163–180,339–353` |
| Header/SSE schema mismatch is refused before shared snapshots or mutation; client retries retain the original pending request | `server/http.ts:55–57`; `src/ui/town-client.ts` command/retry path |
| Six migrations are checksum-locked and transactional. Expanded-home workroom constraints enumerate the eight current prop families | `server/db.ts:8`; `supabase/migrations/20261112124000_home_workroom.sql:8–9` |

These facts were read independently after domain-agent review. No new command, table, prop, authentication policy or compatibility behavior exists yet. Current authentication is isolated fictional practice, not production authentication. No Supabase feature/API is implemented by this document.

## Private ledger and exact migration

Use a proposed café child with total successful serves, last successful serve time and a fixed next-serve time. Its conservation sink is explicit: `consumed.cafe.radish = totalServes`, `consumed.cafe.marigold = 0`. Personal reward entitlement is `totalServes >= 3`; owned teapot is exactly one at/after that threshold and zero before it. Placement changes availability, never ownership or reward entitlement. Keep existing seeds, stock, jobs, practice, receipts, home rights and other sinks unchanged.

Proposed integration versions are root3, garden4 and shared protocol6; they are reserved design values, not current constants. Retain the existing save key and common writer lock. Changing to a separate key could let an old cached writer continue independently. Recognize only validated supported old root/child tuples, add zero café history and zero teapot ownership, and validate the complete new result. A purported current root missing a field, mixed/partially upgraded child, forged consumption/reward or unsupported version must preserve raw bytes and remain read-only. Never import a recovered/default state as if migration succeeded.

A forward migration must extend placement constraints without editing any of the six old files or changing their checksums. Include rental slots, starter homes and both expanded-workroom nooks in ownership conservation. Migration naming/execution belongs to its later approved local implementation task, using current tool help and project instructions; no DDL is supplied or executed here. Cached protocol5HTTP/SSEmust refuse cleanly before state access; actual accepted old compiled writers must be tested against the new saved root.

## Local mode: one save, honest success

Keep local mode explicitly separate from shared-town authority. Derive its café credit from that same private history: `min(totalServes,12)`. At serve12, the last-success timestamp becomes the fixed local funding time; opening is four hours later. No thirteenth serve is useful, so that timestamp cannot move. This needs no independently committed public-counter key and invents no other helpers. Local and shared town displays must be labelled truthfully.

**Choose a narrow staged commit for the new local café action.** Under the existing writer lock, calculate and validate a candidate root, serialize/write that complete root, then replace in-memory state and present success. If the storage write fails, keep the previous state/raw save, make no debit/reward/cooldown/credit visible as confirmed, and offer a clear retry. A successful retry must commit once. This is an implementation requirement, not existing behavior.

Do not silently change every current command's unsaved-practice behavior. The café path must explicitly distinguish pure reducer approval from a persisted outcome. A future broader local durability refactor requires its own review. Migration persistence failure also preserves the old raw root and must not enable actions against an uncommitted upgrade.

## Shared transaction and opening

Add one dedicated persistent café project with bounded credit and fixed funding/ready/open timestamps. The server, not a request body, selects identity, clock and phase. One successful transaction must atomically commit:

1. The one-radish debit and matching private consumption sink.
2. Personal serve count and four-hour cooldown.
3. The threshold-three teapot grant, once.
4. At most one public credit and the original funding/opening deadline.
5. The normalized-payload UUID receipt and confirmed snapshot.

Check usefulness only after locking the public project. If two players race at credit11, the second still receives personal progress when below3, but no extra public credit. If their personal goal is already complete, reject without debit or cooldown change. Same UUID/same payload replays the original result; a changed payload under that UUID rejects. Lost replies retry the exact request. No client-supplied output, timestamp or ownership is authoritative.

Extend the existing lock order consistently across every new writer. Prefer the current player/bridge/plot order followed by the café row; audit all shared-project callers before implementation. A phase-only settlement may lock the café alone and commit before a read-only projection; it must not introduce the inverse café→player lock order. Do not mutate through a read-only snapshot to hide missing settlement. Exact integration placement and concurrent lock-timeout behavior remain implementation gates.

Funding fixes the deadline once. Observing after the deadline must not grant anything or move it. The open identity is the fixed deadline, not the late visitor's current time. Persist a monotone opening latch through the established settlement pattern; test absence, restart and a backward/old transport observation. Public projection contains aggregate credit/stage/deadline only. Private stock, personal progress and cooldown stay private. Invalidate peers on actual shared progress/phase or visible placed-decoration changes, never once per private timer tick. No new per-frame server loop.

## A menu that explains the action

Before confirmation, show one named action, literal cost/held amount, personal3/public12goals, cooldown and Bag destination. The last-radish/Pip warning is concise and inline. Presentation details open deliberately. On cooldown, show the remaining time and disable the paid action; do not leave a clickable button with no explanation. Once both goals are complete, explain completion and provide another useful route.

Use server-clock-derived deadlines with honest reconnect/unknown states. Keep the action slot and feedback strip stable through pending/success/error/expiry, with whole words, keyboard/tap access and44pxminimum targets. Do not reopen a closed/changed panel, switch a chosen item, steal focus after delayed replies or animate a reward before confirmation. Reuse the existing owner/request/panel guards. Show an exact teapot receipt only for the first confirmed award; Bag may then correctly show0available/1owned/1placed.

The public counter approach must be an actual reachable stop, not just a point on an illustration. Source099's proposed outside point28,22and door30,22remain candidates until real hit/collision/approach checks pass. New interior doors, room permissions, exit-in-front placement and opening art need a separate bounded integration check. Existing rect edges are already world-grid coordinates; only actor points use the half-tile center conversion.

Only Aster's proposed serving gesture is locally reviewed; the other three serving rigs are unfinished. Complete their bounded family before claiming all-rig animated handovers, or use a truthful static confirmation while testing the functional loop. Teapot needs readable icon/world representations and actual owner/visitor placement checks. A timer or flourish never authorizes a grant. Reduced motion gets a clear static result.

## Next implementation and required proofs

First build the café ledger and exact migration adapter as a pure serializable candidate outside live entrypoints. Keep the live root, writer, protocol, `PROP_IDS`, server and UI unchanged in that task. Test conservation, malformed tuples, fixed cooldowns, useful-versus-complete races, reward-once and immutable input. Do not expose a dead teapot row or silently migrate an accepted preview as a foundation step.

Then prove isolated SQL transactions, forward constraints/protocol and staged local persistence, followed by one coherent counter/menu/physical reward slice. Publish no partial state-schema/client/server combination. Later room/opening animation is a bounded slice after the authoritative opening is proven.

Required cases include insufficient stock; stale revision; wrong place/resident; both goals complete; personal incomplete after town funding; simultaneous final public credit/third reward; duplicate/mismatched UUID; lost committed reply; injected rollback; local quota and migration-write failure; absence/weekly return; exact deadline/restart; populated old-save migration and dump/restore; actual cached writer refusal; all allocation maps and read-only visitors; desktop/narrow/short/text200controls and stable focus. Use only isolated synthetic data, never grant real progress. Preserve original art, keys and accepted data, and meet normal exact-head GitHub/raw-artifact/source/actual-preview gates. Physical devices and human playtesting remain separate evidence.
