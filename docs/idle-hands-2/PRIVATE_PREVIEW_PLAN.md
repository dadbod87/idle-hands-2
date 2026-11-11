# Private neighborhood — reviewable hosting and access plan

Prepared 2026-11-10. 050is closed throughPR#11/exactCI42949447550 and matching main59e237f. Local060measurements are in [evidence](../evidence/IH2-060/REPORT.md); final060CI/merge is separately recorded. Only loopback synthetic residents are authorized. No real accounts, invitations, domains, provider configuration or billed resources have been created.

## Proposed architecture and concrete release boundary

Retain the tested Phaser/DOM client as static Vercel output; place a dedicated sequel PostgreSQL/Auth project in the existing Supabase organization; use one persistent paid Node service for current room authority. Render's512MB/0.5CPU service at$7/month is a candidate, subject to measured load, region/network testing and terms. The live original game and its Supabase/Vercel projects are excluded.

One process currently owns movement credits, room membership, serialized operations, SSE connections and monotonic world caches. A stateless or horizontally scaled lift could split authority. Vercel now supports WebSockets, but that does not make these process-local structures durable or shared. Do not replace the current transport with high-frequency Supabase Presence.track: its current rate budget is unsuitable for walking. Preserve sparse, room-scoped updates; no animation or cosmetic-clock database writes.

Confirmed connected metadata: The Patron Group Supabase organization is Pro. Vercel team identity is verified; its billing plan is not returned by the available team metadata. These facts do not authorize another project or imply unused credits. All current provider prices/quotas need rechecking at setup.

## Conditional budget, before any provisioning

Players can remain free; there are no paid assets. The preferred initial configuration is one deploying administrator, static client on the existing Vercel team, an additional isolated Micro project in the verified existing Supabase Pro organization, and one paid persistent Node instance.

| Condition | Estimated additional monthly base |
|---|---:|
| Existing suitable Vercel plan; single-admin Render workspace without a workspace fee | Supabase Micro10 +Node7 ≈ **$17** |
| Render Pro workspace needed for administrator collaboration | Above17 +workspace25 ≈ **$42** |
| Vercel Pro also required rather than already paid | Add20 to the applicable row |

These are conditional public-price inputs, not an account quote. A new Supabase Pro base would change the estimate; the proposed target uses the verified existing Pro organization. Taxes, SMTP, excess bandwidth/build/compute/storage and extra deployment seats are excluded. Proposed first gate: approve up to$25/month additional only after confirming the first row. If workspace/hosting eligibility or ownership requirements require another row, stop and re-quote; do not silently upgrade. Existing Vercel billing and any Render workspace are unverified.

Render's no-fee workspace has one administrator and usage limits; game players are not cloud-workspace seats. A paid Node instance is separate from workspace price. Render's Free compute can be evaluated without promising a dependable beta: it sleeps after15idle minutes, and its documentation advises against production use. An entirely free evaluation also needs a separate eligible Supabase Free project and independent backups; available free project slots/account suitability are not verified. No free-tier keep-alive workaround or production-project reuse is proposed.

[Supabase project pricing](https://supabase.com/pricing), [compute billing](https://supabase.com/docs/guides/platform/compute-and-disk), [Render pricing](https://render.com/pricing), [Render workspace features](https://render.com/docs/platform-features-by-plan), [Render current workspace plans](https://render.com/docs/new-workspace-plans), [Render Starter resource/price example](https://render.com/articles/best-railway-alternatives), [Render Free limitations](https://render.com/docs/free), [Vercel Pro](https://vercel.com/docs/plans/pro-plan), [Vercel Hobby eligibility](https://vercel.com/docs/plans/hobby).

Connected project metadata currently shows no sequel project on either provider. Proposed names are `idle-hands-2` on Vercel and `Idle Hands 2 Private Preview` on Supabase; names are proposals, not reserved resources. Choose colocated provider regions after checking actual availability and measuring server→database RTT. Do not assume the local51mscommand result applies across regions.

Vercel supports WebSockets, but [duration and instance behavior](https://vercel.com/docs/functions/websockets) still require coordination for this process-local authority. Start with one persistent room process, graceful draining/checkpoints and tested reconnect; no horizontal autoscaling or overlapping authorities until a lease/coordinator design is proved. Verify actual external rewrite/SSE/cookie forwarding on the selected target; do not assume the local proxy is a hosted deployment contract.

## Identity and permission implementation gate

The selectable fixture adapter is not authentication. Never expose it through a proxy, tunnel, deployment or public preview. Remove fixture routes in the hosted adapter, reject startup with synthetic mode on hosted configuration, and use a separate verified Supabase identity and explicit server-owned invited-town membership. No original-game identity/progress import. Choose verified Google OAuth or custom SMTP email access after owner access policy; Supabase default SMTP is restricted to organization team addresses and2messages/hour, not an invitation solution.

Verify tokens/session server-side against project issuer/audience/signature/expiry; reject revoked/disabled membership on requests and active streams. Do not trust user-editable user_metadata, playerId, client time, inventory or position as entitlement. Derive the member ID from verified identity. Keep private schemas unexposed; the current owner connection bypasses RLS and is not a least-privilege hosted role. Separate migration owner from restricted runtime role; allow only required schema/table operations, no DDL or browser secret/service-role access. Preserve parameterized queries and atomic costs/receipts/proximity checks. Test outsiders, disabled members, visitors, stale sessions and exact-request retries before invites.

Cookies need HttpOnly/Secure, scoped paths, explicit trusted same-origin or strict cross-origin CORS/CSRF policy. Do not simply expand allowedOrigins to*. Terminate TLS at a trusted proxy and reject forged forwarding headers. Secrets stay in approved provider stores, never Vite public variables, logs, screenshots or Git. Plan signing/DB credential rotation and session revocation; current fixture logout only clears the browser cookie and does not revoke a copied token.

## Threat and operational controls

Local060now bounds snapshot/login/fixture/event request admission, streams and stream buffering. Existing body/pool/command/movement bounds remain. Hosted exposure still requires real identity and proxy/upload-timeout review. Existing movement10/s and commands30/min remain; transport caps must reject before SQL without changing progress/receipts. Established streams now close at inclusive expiry even without movement; queued movement/commands also recheck after reading a delayed body. Backpressure now closes a slow reader rather than accumulating historical presence; unchanged peer lists are suppressed after the first event. Rate keys must be fixed or validated member IDs, never arbitrary attacker values. Measure20unique clients rather than twenty tabs using one identity.

Current durable growth is bounded per resident except command receipts. Do not prune receipts with an arbitrary TTL: an old UUID could become executable again. Define a versioned replay window and compact tombstones/rejection contract before pruning. Use measured bytes/command and real intended activity to forecast storage; the theoretical20×30/min ceiling is864,000 receipts/day, not an observed workload. No raw cookies/token payloads or personal chat content in diagnostics. Chat and uploads are not implemented; their moderation/audience/content-retention policies remain separate gates.

Town/property data persists across weekly competition. Account departure should disable membership and anonymize the display identity while preserving town work/property until an explicit transfer/deletion policy is approved. Existing foreign-key RESTRICT relationships are a safeguard, not a complete erasure workflow. Do not test deletion against real accounts.

## Backup, incident and rollback contract

Current evidence proves matching PostgreSQL16 dump/restore, migration checksum replay, a fresh Node process with the same signed session, queued work, decorated expanded home, trail award and project journal. It does not prove a scheduled hosted backup service. Proposed private-beta targets: daily encrypted independent logical export, seven daily plus four weekly retained copies, monthly isolated restore, targetRPO24h/RTO2h subject to the measured drill and owner acceptance. Supabase Pro daily backups currently retain7days; database backups exclude Storage objects. There are no user uploads yet; add object backups before enabling them.

Before each migration: freeze new writes, take/verify backup, record source SHA/schema versions/row counts, run staged migration, verify conservation and reopen. Migrations are checksum-versioned; never edit an applied file. Revert compatible client/server code independently; database recovery is a forward fix or deliberate reviewed restore, not blind SQL rollback. On restore, stop the room process, restore into an isolated new database first, verify receipts/ownership/deadlines, switch only while writes are closed, and restart one authority. An open client must truthfully adopt the new boot even if the restored revision is older; delayed responses from the retired process cannot clear ambiguous pending requests or replace recovered state. An actually missing command receipt after an older restore can be retried only under the documented recovery contract; do not promise zero lost progress from daily backups.

Operational metrics: request latency/errors/rate rejections, SQL count/time, active/peak SSE, dropped slow streams, accepted/rejected movement, room-scoped bytes, pool waiting count, NodeRSS/CPU/event-loop delay, DB/index/receipt growth and backup age. Alert on repeated500s, failed backups, pool saturation, persistent reconnects, memory growth or spending thresholds. Provide a private owner support route and downtime message before inviting anyone. No telemetry vendor or paid monitoring is installed here.

## Invite checklist and stop condition

After local060 evidence: owner selects hosting/account/access/budget, then070 implements the isolated hosted adapter and proves HTTPS/auth/permissions/load/restart/backup/rollback on the actual artifact. Test one physical phone and desktop, disclose browser emulation/software GPU limitations, then invite a small allowlisted group with support instructions. No invitations or public domain until those gates pass. When owner is away and070 has no approved resources, finish independent design/readiness artifacts and stop at this documented decision; do not invent unrelated features to bypass the dependency.


## Implemented evidence and remaining operational gates

The bounded local test uses20ordinary residents,760accepted legal movement messages,140distinct commands and20same-ID retries, then40total stream connections through reconnect. Every resident retains1scrap/2timber/4supplies, one crafted/placed planter and an unchanged12hqueued job; zero output kits. Node+client process, database cgroup snapshots, storage growth, bytes and percentile methods/limits are recorded in the evidence. Idle10seconds adds no SQL or presence updates. No twenty-rendered-browser, long soak, mobile-radio, Safari or hosted capacity claim follows.

New transport budgets: login120/min global and10/min/member; snapshot1200/10s global and60/10s/member with32global/two-member pending requests; SSE240attempts/min global and12/member with64total/two-member active streams; fixtures120/min. Fixed or validated member keys bound memory. MaxSSEframe64KiB; false-write/oversize disconnect, no application backlog. Existing10movement/s,30commands/min andfour queued member operations remain. Every test keeps its original deadlines.

Local request-body overflow still uses the generic failure path, and no production proxy slow-upload/header policy has been configured. Hosted070must implement/review proper oversized-body classification and timeouts together with verified identity and trusted-proxy handling; fixture hardening is not security certification. Public-schema Data API exposure is not assumed. [Supabase's current changelog](https://supabase.com/changelog.md) was checked; CLIv3 breaking behavior is not silently adopted, and existing pinned local tooling remains. No Supabase SDK/schema upgrade occurred.

Actual local backup/restore and process restart are proved. Hosted PostgreSQLmajor/version, scheduled backups, encrypted independent storage, restore timing and maintenance messaging must be verified on the new target. Use backup tools matching that target major; a localPostgreSQL16.15proof does not certify a future hosted17or later restore. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups) and [SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp) apply to the proposal.

The owner decision needed before070is a concrete account/ownership/access/budget choice. Recommended access: Nick as initial deploying administrator, verified Google login plus an explicit server-owned invitation list; enable no open registration or existing-game imports. Owner must approve that target and cost ceiling before resources or invitations. If a suitable cloud account/plan cannot meet the chosen ceiling, return the revised quote. Public domain and launch remain later gates.
