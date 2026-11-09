# Systems reuse independently of art — 2026-11-09

User explicitly asked to consider reusable game-system code despite selecting original art. Focused independent agent source review, no code imported or packages installed by that review. Engine license does not license unrelated assets. Chosen original art does not prevent reusing mature validation/state tools.

| Source | Inspected revision/license | Decision |
|---|---|---|
| RPGJS server |5.3.0, commit e357a13d8b50662b777fb0b31659a5fba31c4f71; MIT | Reuse architecture patterns, not the entire engine/inventory mixin. |
| Zod |4.6.7, commit 19c40d2072288b4cafec851e9d056a72a88e5973; MIT | Adopt exact-pinned validation when IH2-030 implements saves/commands; check archive/license and bundle impact then. |
| XState | Stable 5.33.4, tag commit bd77717b8d33c49af1c8ee4a7e22cebb936cc8b1; MIT | Defer until branching/parallel quests or NPC routines justify it. Default branch/docs are v6 beta; do not accidentally import beta conventions. |

The inspected [RPGJS ItemManager](https://github.com/RSamaium/RPG-JS/blob/e357a13d8b50662b777fb0b31659a5fba31c4f71/packages/server/src/Player/ItemManager.ts) is a 982-line RpgPlayer/map-database/reactive-signal mixin with equipment/hooks/hotbar integration. Item resolution, quantity mutation, buying/selling and snapshot rehydration depend on that machinery. Porting it for three workshop resources costs more integration than a small pure domain module, and it does not supply our command replay/transaction guarantees. No source copied merely to claim reuse.

Useful patterns: separate item definitions from quantities; reconstruct from saved stable IDs; storage behind an adapter; presentation events separate from rules. The inspected [save service](https://github.com/RSamaium/RPG-JS/blob/e357a13d8b50662b777fb0b31659a5fba31c4f71/packages/server/src/services/save.ts) remains runtime dependent; default memory storage is not a durable shared town. [Official save guidance](https://v5.rpgjs.dev/guide/save-load) distinguishes persistence strategy from synchronized room state.

The inspected [QuestLogGui.vue](https://github.com/RSamaium/RPG-JS/blob/e357a13d8b50662b777fb0b31659a5fba31c4f71/playground/games/vue-gui/src/gui/QuestLogGui.vue) presents IDs/labels/completion flags; it is not a standalone reward engine. A targeted repository-tree search found no standalone crafting/quest module; this was not an exhaustive extension audit.

[Zod source](https://github.com/colinhacks/zod/tree/19c40d2072288b4cafec851e9d056a72a88e5973) provides actual reusable validation code without external runtime dependencies: save versions, known IDs, finite/safe/bounded quantities and command shapes. It is not inventory authority. [XState stable source](https://github.com/statelyai/xstate/blob/bd77717b8d33c49af1c8ee4a7e22cebb936cc8b1/packages/core/src/StateMachine.ts) supplies independent state-machine/persisted-snapshot machinery; our short tutorial should start with data-driven steps, adding it only when complexity warrants.

IH2-030 contract: bounded integer resources, data recipes/tutorial steps, pure validated commands, all-or-nothing local mutation, persisted command/reward IDs, elapsed-time production/caps and versioned synthetic save. Tests must cover rejected-input immutability, replay, refresh during production, corrupt saves and overflow. This local prototype is not secure/server authoritative; preserve the same contract for later transactional execution. Retain notices and exact source/version whenever actual code is adopted.
