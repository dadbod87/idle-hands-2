# Decision log

Keep direct user requirements distinct from agent-selected defaults. Supersede an ID with a dated reason; never silently rewrite history. Evidence and feasibility checks may reopen technical choices.

| ID | Date | Status / authority | Decision and reason |
|---|---|---|---|
| D-001 | 2026-11-09 | User-approved | Separate sequel, current game remains independent. |
| D-002 | 2026-11-09 | User-approved | Town and creative work persist. |
| D-003 | 2026-11-09 | User-approved | Renew weekly competition without wiping persistent world. Exact season rewards are not yet set. |
| D-004 | 2026-11-09 | User-approved | Deliberate design/early art/systems; prove a neighborhood before expanding. |
| D-005 | 2026-11-09 | User-approved | Research reusable graphics/systems to save effort, checking licenses. |
| D-006 | 2026-11-09 | User-approved | Keep the game free if possible; no paid assets. Free/open-source tools and original or CC0 art default. No asset spending authorized; see D-008 for hosting clarification. |
| D-007 | 2026-11-09 | User-approved | Agent makes routine choices, designs a staged build/continuity system and proceeds in bounded prompts with minimal upfront questions. |
| D-008 | 2026-11-09 | User-directed | Prefer GitHub, Vercel and Supabase where appropriate. Modest additional hosting may be funded by the business if needed; obtain a concrete cost decision before provisioning, not a blanket zero-hosting constraint. |
| D-009 | 2026-11-09 | User-directed | Progress materially slower than 1.0, with humor, in-depth systems and teamwork central. Active play should not collapse long-term progression into click farming. |
| D-010 | 2026-11-09 | User-requested priority | Personal house plots to acquire, homes to design/upgrade and interiors/exteriors to decorate; persistent long-term personal investment. |
| D-011 | 2026-11-09 | User-requested direction | Personal and town/group quests, gathering/crafting and skills should provide depth and focus; restoring discovered areas should make the town feel alive over time. Item/town upgrades, rare decorative drops and unlockable/hired NPC services are candidate systems to integrate coherently, not all immediate scope. |
| D-012 | 2026-11-09 | User-directed; movement accepted after preview | Movement should feel natural and free, rather than completing visible tile steps. Continuous keyboard/diagonal motion and precise pointer movement, immediate turning/stopping, retained collision. |
| D-013 | 2026-11-09 | User-directed | Clicking the workshop door should walk into range and enter automatically, without a second Enter click. Keep manual/keyboard alternatives and cancel queued entry when the player changes intent. Character animation/graphics will later make accepted movement feel more alive. |
| A-001 | 2026-11-09 | Agent-selected; pilot required | Phaser 4.2.1 / TypeScript / Vite / DOM UI, browser-first top-down 2D. See ENGINE_DECISION for tradeoffs and source-level evidence. |
| A-002 | 2026-11-09 | Agent-selected | Local separate sequel repository at engine pilot; copy planning authority and leave pointer here. Separate cloud resources/identities when later approved, never piggyback on 1.0. |
| A-003 | 2026-11-09 | Agent-selected | PostgreSQL authoritative domain transactions, with separate Supabase a preferred candidate for database/auth/storage, Vercel for web delivery and GitHub for source/CI. Select the command runtime at shared-loop milestone. Colyseus remains a conditional room/presence transport only if needed; no dedicated room host until measured. This supersedes the earlier unconditional Node/Colyseus default under D-008. |
| A-004 | 2026-11-09 | Agent-selected | Invite-only office-sized first neighborhood; three resources/two recipes/one shared project, no commerce/PvP/large map initially. See EXPERIENCE_BRIEF. |
| A-005 | 2026-11-09 | Agent-selected; art test required | Compare original illustrated vs coherent CC0 pixel samples; pick readability/coherence, not pack size. No purchased LimeZu assets. |
| A-006 | 2026-11-09 | Agent-selected | No mandatory monetization, ads, paid advantages or subscriptions in first release. Hosting free-tier feasibility is unproven; never promise permanent zero operating costs. |
| A-007 | 2026-11-09 | Agent-selected | Start with local-only fixtures and no external runtime calls; cloud/real auth after permissions, cost and backup gate. No automatic account import. |

## Later decisions — autonomous session

2026-11-09: Nick explicitly authorized continued active work while away, focused agent review, shared-system reuse independently of art, and a stop at about 10% remaining weekly usage. Bounded target/rules: [AUTONOMOUS_SESSION_2026-11-09](../AUTONOMOUS_SESSION_2026-11-09.md). Actual read initially 69% remaining; no reset/credit/spending/publication authorized. Distinct identity and phone-first direct interaction are priorities.

A-008 (agent-selected): original illustrated company-town kit, not the Kenney comparison, with four facing directions and distance-based walk poses. Source/license comparison and concrete dimensions in [ART_DIRECTION](../ART_DIRECTION.md). Selection is a reversible art decision, not a public release.

A-009 (agent-selected after independent review): retain Phaser; borrow RPGJS separation/storage/event patterns, adopt exact-pinned Zod validation for the upcoming loop when installed/reviewed, defer XState until branching/parallel behavior warrants it. [System source review](SYSTEMS_REUSE_REVIEW.md). No engine-system code copied in this visual milestone.

## Reconsider only when evidence warrants it

Engine: pilot fails phone input/loading/rendering budgets or standard RPG plumbing dominates. Art: silhouette/scale/license coverage fails. Multiplayer: server memory/event volume or reconnect semantics fail. Cost: invited pilot does not fit a measured free option; prepare reduced scope/hosting alternatives for Nick instead of adding a bill. Product: feedback shows the small loop lacks visible personal/community progress. Record new evidence and superseding decision before changing direction.

## A010 — local workshop rules and phone-first input (2026-11-09)
Agent-selected reversible tuning under Nick’s autonomous authorization: initial depots6each to complete first visit; regeneration1/4h up to6,24h recovery cap,60 material bag,99 item cap. First planter5s once, later8h, bridge kit12h; no repeated click income/auto queue. Six authored furniture nooks, free preview/cancel/moves, nonblocking cosmetic view. Single-writer browser save, visible failure and typed validation. XP/levels are persistent practice progress without yield multipliers. These are local tuning choices, not final economy or server authority. Pacing simulations use housing kit equivalents only. Revisit waiting/content balance in neighborhood polish.

## 2026-11-10 — shared proof and owner art feedback
- D-014 (user accepted): the current illustrated preview looks great; preserve its visual family and natural controls.
- D-015 (user requested): varied trees and people, distinct building shapes/sizes/roofs and land/building materials, plus restrained ambient motion. IH2-045 is the next concrete art gate, including safe saved-position recovery if geometry changes.
- A-011 (agent selected): isolated Node HTTP command adapter + PostgreSQL16.15, private schema, atomic receipts and locks. Standard parameterized store is independent of the rendering engine. Supabase-compatible database/auth/transaction-pool boundaries reviewed; no hosted project or real JWT auth claimed.
- A-012 (agent selected): plot rights12 kits, level2 upgrade24 additional kits, matching12/36 cumulative pacing proxies. Values are shared by client/server; no new production multiplier or starter-kit grant. Automated fixtures explicitly seed48 kits/2 planters only in ih2_browser.
- A-013 (agent selected): ephemeral square presence via batched5Hz SSE, client movement~6.7Hz/server cap10Hz, no animation database writes. Personal workshop rooms are private. Position checkpoints at room transitions/commands; process boot marker and reconnect resync are local-single-process proof semantics, not a multi-instance/cloud lease design.
- A-014 (agent selected): keep browser-only saves and shared practice identities separate. No trusting imported browser balances. Local fictional HMAC sessions stand in for future verified identity; replace this adapter before hosted testing.
- A-015 (verified recovery choice): use PostgreSQL16 backup tools from the same pinned container. Host18 pg_restore produced an unsupported transaction_timeout setting against16; matching tools passed the actual restore drill. Supabase advisor local-stack connection was unavailable; executed private-schema/RLS/privilege/transaction checks on the actual database instead.
