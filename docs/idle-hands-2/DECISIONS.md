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
| A-001 | 2026-11-09 | Agent-selected; pilot required | Phaser 4.2.1 / TypeScript / Vite / DOM UI, browser-first top-down 2D. See ENGINE_DECISION for tradeoffs and source-level evidence. |
| A-002 | 2026-11-09 | Agent-selected | Local separate sequel repository at engine pilot; copy planning authority and leave pointer here. Separate cloud resources/identities when later approved, never piggyback on 1.0. |
| A-003 | 2026-11-09 | Agent-selected | PostgreSQL authoritative domain transactions, with separate Supabase a preferred candidate for database/auth/storage, Vercel for web delivery and GitHub for source/CI. Select the command runtime at shared-loop milestone. Colyseus remains a conditional room/presence transport only if needed; no dedicated room host until measured. This supersedes the earlier unconditional Node/Colyseus default under D-008. |
| A-004 | 2026-11-09 | Agent-selected | Invite-only office-sized first neighborhood; three resources/two recipes/one shared project, no commerce/PvP/large map initially. See EXPERIENCE_BRIEF. |
| A-005 | 2026-11-09 | Agent-selected; art test required | Compare original illustrated vs coherent CC0 pixel samples; pick readability/coherence, not pack size. No purchased LimeZu assets. |
| A-006 | 2026-11-09 | Agent-selected | No mandatory monetization, ads, paid advantages or subscriptions in first release. Hosting free-tier feasibility is unproven; never promise permanent zero operating costs. |
| A-007 | 2026-11-09 | Agent-selected | Start with local-only fixtures and no external runtime calls; cloud/real auth after permissions, cost and backup gate. No automatic account import. |

## Reconsider only when evidence warrants it

Engine: pilot fails phone input/loading/rendering budgets or standard RPG plumbing dominates. Art: silhouette/scale/license coverage fails. Multiplayer: server memory/event volume or reconnect semantics fail. Cost: invited pilot does not fit a measured free option; prepare reduced scope/hosting alternatives for Nick instead of adding a bill. Product: feedback shows the small loop lacks visible personal/community progress. Record new evidence and superseding decision before changing direction.
