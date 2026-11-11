# Idle Hands 2.0 — planning and build home

Status: **private local shared-town prototype with original visual kit; first neighborhood accepted; independent activity slice in progress** (2026-11-11). Separate game, with an isolated local command service and fictional practice identities. No hosted sequel, real accounts or paid assets. The original Idle Hands remains separate.

Nick has delegated routine design and technical choices, asked for free assets and a system that can progress one prompt at a time. The agent selects reasonable defaults, tests them and records decisions. No large upfront questionnaire is required.

## Start / resume

1. Read [current handoff](CURRENT_SESSION.md) and the latest dated closeout it links.
2. Read [build protocol](BUILD_SYSTEM.md), [decision log](DECISIONS.md), [first-session brief](EXPERIENCE_BRIEF.md) and [free-assets policy](FREE_ASSETS.md).
3. Run `python3 tools/idle-hands-2.py status`, `check` and `prompt` from the repository root. Say **“Continue Idle Hands 2.0”** to work on the next ready task. This is an on-demand workflow, not unattended background execution.

The [machine-readable roadmap](ROADMAP.json) is authoritative for task status/dependencies/acceptance/evidence. The script is read-only and validates the records; an agent must inspect the actual evidence and update them honestly. A fresh session must inspect the current local source, handoff and any newly added remote before acting. Canonical private remote is https://github.com/dadbod87/idle-hands-2, main; fetch current source/PR checks before work.

- [Expanded-world design package: systems, world map, content/art catalog, phone storyboards and pacing experiments](design/README.md)
- [Approved development teaser and provenance](../marketing/teaser-provenance.json)
- [Deep resource, growing, equipment, home and animation plan](DEEP_SYSTEMS_PLAN.md)
- [Living-town quests, skills and restoration design](LIVING_TOWN_SYSTEMS.md)

## Chosen direction

- [Engine comparison and decision](ENGINE_DECISION.md): **Phaser 4 + TypeScript + Vite + DOM UI**, selected after current source/documentation review; validate desktop/phone in IH2-010. RPGJS offers more built-in RPG systems and remains the fallback if the pilot changes the tradeoff. The Phaser pilot has now been tested locally; RPGJS has not been runtime-benchmarked. See CURRENT_SESSION and pilot evidence.
- A humorous shared company town: personal workshop/home, cooperative visible construction and modest exploration. [Experience brief](EXPERIENCE_BRIEF.md) defines the first five/twenty minutes and persistence boundaries.
- Original or verified CC0 assets first; $0 asset purchases. No mandatory monetization in the first release. Free hosting feasibility remains unproven and has its own measured gate.
- This separate local repository now owns sequel source; no sequel runtime inside 1.0. Its exact source location is recorded in CURRENT_SESSION and in the 1.0 bridge pointer. No account imports or new cloud resources assumed.

## Stages

| Task | Reviewable result | Gate |
|---|---|---|
| IH2-000 | Comparison, defaults, brief and build/continuity system | Source-reviewed documents and tracker tests; complete |
| IH2-010 | Separate local engine pilot | Walk/interact/transition, desktop/narrow/short screenshots and measured budgets; complete locally |
| IH2-015 | Private GitHub source and CI checkpoint | Exact source backed up privately; separate reproducible checks |
| IH2-020 | One coherent visual kit | Comparable samples, licensed asset inventory, phone readability |
| IH2-030 | Fun local workshop loop | Gather/craft/decorate, saved synthetic state, deterministic idle tests |
| IH2-040 | Durable two-player bridge loop | Transactions, replay/concurrency, restart/reconnect and rollover safety |
| IH2-045 | Distinct original people, trees, buildings and motion | Actual software-rendered canopy pixels and responsive evidence |
| IH2-051 | Town rhythm, conversations and deep-system plan | Day/night/weather without production changes, NPC access, real screenshot evidence |
| IH2-054 | Expanded-world design foundation | Owner/default boundaries, original world/phone concepts, catalog/art coverage and deterministic pacing experiments; no runtime expansion |
| IH2-052 | Starter homes and return visits | Persistent expansion/decorating, first-kit teaching and offline summary |
| IH2-053 | Restored trail and discovery | Useful shared destination, resident reactions and earned cosmetic |
| IH2-050 | Integrated polished neighborhood | Parent brief acceptance after the smaller slices |
| IH2-060 | Private-preview readiness package | Measured 20-client cost/performance, permissions, backup/restore, hosting decision |
| IH2-070 | Invited beta | Approved isolated target, actual deployed artifact and device verification |
| IH2-080 | Public launch | Beta issues resolved, concrete launch package and explicit launch authorization |

These are dependency gates, not promised dates. The task file contains full acceptance criteria and exclusions; update it rather than maintaining another checkbox list here. Expansion comes after the first neighborhood proves its value.

## Background and discovery

- [Original vision](VISION.md)
- [Historical reusable-art/system research](REUSE_RESEARCH.md) — paid options are now excluded
- [Installed development toolkit](../DEVELOPMENT_TOOLKIT.md)
- Current game: [state](../CURRENT_STATE.md), [art direction](../ART_DIRECTION.md), [history](../CHANGELOG.md)

Root README, AGENTS and CURRENT_STATE point here. Direct user decisions and agent defaults are distinguished in DECISIONS. Keep dated closeouts, exact check/artifact evidence, discovered follow-ups and a next task. Implementation/planning now lives in this private sequel repository; the original game keeps a discovery pointer. Keep source and handoff authoritative here. Never rely on this chat as the only record.

## Private-preview readiness

Read [PRIVATE_PREVIEW_PLAN](PRIVATE_PREVIEW_PLAN.md) and [060evidence](../evidence/IH2-060/REPORT.md) before any cloud setup. Local load/recovery checks are separate from hosted identity, physical-phone acceptance and the owner cost/access gate.

For the owner-facing review and next decision, start with [OWNER_REVIEW](OWNER_REVIEW.md). Source/CI closeout remains separate from a hosted release.

[Activity-depth research and current gaps](ACTIVITY_DEPTH.md): parallel goals, humorous teamwork and personal expression. IH2-062 is the first finite off-bench collection layer; future garden/services/equipment are still planned.
