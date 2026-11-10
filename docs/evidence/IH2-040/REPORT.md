# IH2-040 — durable local shared-town proof

2026-11-10. Private sequel source, branch `feat/durable-town`; final exact candidate and merged source belong in its PR closeout. Both existing required jobs must finish success before merge. This is an isolated local proof, not a hosted beta or a change to the original game.

## Result
The opt-in `/?town=1` mode uses a local Node command service and PostgreSQL16.15. Three fictional residents have independent inventory, jobs, skills, quests and property. Commands confirm on the server before rewards appear. Residents cooperate on the three-kit bridge; completion updates connected clients and the restored illustration. Plot rights, upgrades and owned decoration persist; visitors cannot edit another resident’s plot. The default browser-only workshop and its saved progress remain separate and intact.

Shared mode starts fresh fictional server residents. It never imports trusted balances from localStorage. The visible fixture chooser is for testing, not a real account system. Local server listens only on127.0.0.1 and rejects non-loopback database targets; original Supabase/project secrets and live players were never accessed.

## Authority / durability
Private `ih2` SQL schema, enabled RLS with no public/browser grants, parameterized transactions and row locks. Actor identity comes from the server-verified HttpOnly/SameSite fixture cookie, not command fields. HMAC keys remain under ignored `.local/`, scoped by fixture database. Synthetic login is deliberately selectable; it must be replaced by verified real identity before a hosted trial.

Requests carry stable IDs, payload hashes and expected revision. Persistent receipts reject changed-payload replay, preserve exact effects through retries/restart, and return the latest snapshot. Costs, output, contribution, plot state, score and quest flags commit together. A deliberately injected SQL failure after updates rolls all of them back. Corrupt durable data fails closed; it is not silently replaced with a fresh workshop.

Server validates proximity, legal movement paths, a speed-credit budget and request rates. Movement is capped at10 messages/second; the client targets at most~6.7 and pauses hidden. Room-scoped SSE batches presence at most5Hz; square presence is shared, personal workshops are private. Movement/animation does not write inventory or issue snapshots each frame. Position checkpoints occur at transitions/commands. Reconnect loads a snapshot; invalidations during an older request cause one fresh follow-up rather than losing shared updates.

Weekly score rows are separate and use Friday16:00 America/Los_Angeles, including DST. Rollover preserves inventory, queued jobs, furnishings, plots, bridge and stable quest awards. Quest v0→v1 metadata migration retains awarded IDs and cannot pay twice. First orientation and bridge-contributor awards are cosmetic record flags, not hidden income multipliers.

Plot claim costs12 kits; the first upgrade costs24 additional kits (36 cumulative), aligned to the prior slow-pacing study. Test actors can exercise it with seeded stock; ordinary new residents start at0 kits. House art, individual town lots/trail access and a broader housing progression remain neighborhood-polish work.

## Verification / fixture disclosure
Local suite:47 domain/art/server checks (24 existing plus23 PostgreSQL/HTTP cases), strict frontend/server TypeScript+Vite,20 browser scenarios, planning+10 tracker checks,40-file upstream integrity and diff checks. Exact final hosted outcome is the PR gate; a pending check is not a pass.

Database cases cover replay/hash conflict, concurrent final contributions, stale revisions, insufficient costs, ownership/visitor denial, concurrent/newcomer claims, shared item allocation, expiry/caps, weekly/DST/content migration, rate/speed limits, rollback and private-schema privileges. HTTP tests restart both fresh service objects and an independent Node process, keeping committed progress and a prior signed session. A real `pg_dump`/`pg_restore` drill into the separate `ih2_restore` database verifies state and receipts, followed by migration checksum replay. A separate actual PostgreSQL container restart preserves an upgraded decorated plot and queued job; the already-running HTTP service reconnects through its idle-pool error handler.

Browser cases use desktop1440×900, narrow360×640 touch emulation and short844×390. Three separate browser contexts cooperate, a committed response is intercepted/lost, the exact same command ID retries without another charge, restoration propagates, owner upgrades/places/moves furniture, visitors see read-only controls, and reload retains state. Three additional intercepted-client cases validate old-identity response rejection, coalesced refresh after delayed snapshots and cached-page/boot resynchronization. Existing15 standalone checks remain.

Automated browser residents in **only `ih2_browser`** start with **48 bridge kits and2 planters** to test ownership/upgrades without waiting days. This is explicit synthetic setup, not normal starting progress or a real-player grant. Client-only race tests intercept API responses and EventSource in isolated contexts. The lost-ack test aborts a response after the actual local server commits it. All screenshots depict these fixtures. No old-game records or real accounts were modified.

Axe DOM checks have zero violations in the checked visitor view; incomplete items are retained. Canvas accessibility and real phones are not certified. The local loopback HTTP timing JSON records a small functional sample and request/event/checkpoint counts; it is not a20-client load or cloud benchmark. Payload hash/estimate method is in build-metrics.json.

## Review / platform boundaries
Independent source review found identity-generation races, remote cached-page ticker loss and cross-location furniture move accounting; all fixed and rechecked. Returning to a resident now returns their current confirmed position rather than an older database checkpoint; a regression test covers switching back after movement. A later invalidation-during-load race is also covered by an actual bundled-client regression. Temporary focused transport mocks confirmed no remote localStorage/WebLock writes and no optimistic rewards.

Supabase-compatible transaction/auth boundaries were evaluated using current primary documentation. The portable store has no named prepared statements/session state and does not depend on a browser Data API. Future verified JWT identity/authorization, scoped Supabase presence or other transport and hosting are separate gates. No Colyseus host is needed for this bounded local proof. SSE here is a local persistent Node adapter, not a promise of unlimited serverless streaming.

Supabase CLI3.1.0 was checksum-verified and generated the migration filename. Its advisor command targets a full local Supabase stack on54322, which is absent; that attempt failed to connect. No hosted advisor/auth/Realtime claim is made. Private schema/RLS/privilege/index/transaction checks were instead executed against the actual isolated PostgreSQL database. Backup tools use the matching PostgreSQL16 container; the host’s18 tools produced an incompatible transaction_timeout setting and were replaced for this drill.

## Next
IH2-045: Nick accepted the illustrated family and explicitly requested varied tree/person/building silhouettes, land/building materials and restrained ambient motion. That visual pass is now the next tracked task, before neighborhood polish. Keep the approved controls, style and persistent shared foundation. No public deployment, new billed infrastructure or asset purchase was performed.
