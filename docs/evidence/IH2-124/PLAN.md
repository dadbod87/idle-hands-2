# IH2-124 — isolate incomplete movement bodies from other residents

Declared before reproduction or code change, after123completed exact PR/main/source/saved-preview/pushedcloseout gates. Source starts at123docs d730ec31986ed6145432ddeec6d4b0218c1a90c0 over main d4068f33fc9f3241d005013c9e62489a93a07ce6.

## Question and player benefit

Full current server/http.ts shows movement enters per-actor serial and the shared presence gate before awaiting its body. Hypothesis: one incomplete body blocks another member's movement or occupancy-sensitive doorway command. This is not yet reproduced and does not diagnose all reported freezes. Benefit sought: a slow connection should not make other residents wait to walk or use a doorway. Preserve each resident's own ordering and authoritative occupancy/collision checks.

## Bounded reproduction, then minimal change only if confirmed

Use ordinary signed fictional actors in the named disposable55434candidate/ih2_http_test; refuse protected55432, other DBs/hosts/override URLs before Pool. CI uses its own explicit5432service container. Prime residents, open a raw incomplete movement body, observe its data receipt through a test-only ordinary server request listener, then yield the event-loop turn so per-actor admission occurs. Keep the body incomplete while a different member's valid movement and protected doorway refusal must finish within a predeclared1000ms HTTP abort bound. Existing original500ms load budgets remain unchanged. The incomplete body is released/aborted in finally; every request has finite response/cleanup bounds. Retain the baseline failure and all later failures. The server test starts at a fixed synthetic application time while HTTP deadlines/latency use real time; no stock/position/economic-time advancement for this proof. Only separate expiry cases advance that clock.

Only if confirmed, await the body under the existing per-actor queue, and acquire the existing shared presence exclusion only around expiry recheck, current geometry/position validation, mutation and room checkpoint. Keep queue4, movement10/sec, command30/min, session/protocol/roster/CSRF rules, error/status semantics, collision/speed/portal/home rules, database/pool/migrations/economy and client bytes unchanged. Other occupancy-sensitive commands retain shared exclusion. Never parse movement before actor admission, remove the shared lock or let later same-actor requests pass.

Focused coverage: unrelated movement/doorway responsiveness; own pending body still blocks later own movement and fifth queued request refuses; malformed and aborted bodies release queues without progress; session expiry while body/lock pending cannot move feet. Expiry clock fixtures are separately disclosed; they are not timing samples or normal saves. Existing full HTTP/housing concurrent authority/privacy/idempotency tests remain intact.

## Acceptance

Required full local domain/build/193browser/plan/pinned/whitespace checks, then exact finalPR/main all five jobs/raw artifacts/original500ms/recovery/rich26home/compiled232byte identity. No cap, runner, browser, fixture authority or assertion-window relaxation. Source correction does not imply universal speedup, FPS/WAN/physical phone/capacity or original-game fix.

Before any normal API update, read-only compare actual pre-update confirmed feet against durable room checkpoints using ordinary existing fictional sessions. Never rewind an actor, copy/regenerate keys, restart/reset/migrate protected55432 or alter progress to make acceptance pass. Freeze immutable exact-main source only after gates; update only the two known API processes if safe, preserving client PIDs/all232bytes, original keys/all17table fields/nine metadata and signed sessions. Verify actual desktop/phone native controls, no extra logins across swap, and464current+125historical responses. If feet differ, hold installation and record the blocker rather than invent preservation. Terra6.1may review actual desktop/mobile captures when a visual concern warrants it; no art change is planned.

Update report/tracker/handoff and push/verify the documentation closeout before another section. Stop by15UTCNov18/7AMPacific or around90%weeklyusage; currently20%used. No paid/cloud/real-player/original-game work.
