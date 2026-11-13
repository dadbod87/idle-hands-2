# Café persistence preflight — design only

Recorded a source-grounded contract for the next small café slice, with an independent domain review. The key decisions are one private/local save boundary, a staged local café commit on storage success, one atomic shared debit/progress/reward/credit/UUID transaction, and stopping paid serves when personal progress and town funding are complete. Exact old-save/cached-writer compatibility and forward placement constraints are explicit gates.

Current code was inspected directly: local key/common writer and mutation-before-persist warning path; strict root2/garden3consumption and recognized migrations; player/receipt transaction; protocol5HTTP/SSEguard; checksum-locked six migrations and hardcoded workroom families. The contract separates these facts from proposed root3/garden4/protocol6and future schema behavior. It adds no runtime or database implementation.

The next task is a pure café ledger/migration candidate outside live entrypoints, not a rushed room/food/backend release. All three other serving rigs remain unfinished. Native art and menu evidence from100–102is preserved; no new visual verification is claimed here.

This branch changes documentation only. It reuses actual102code results:348system/136browser, zero skips/flakes/unexpected/reporterrors, unchanged208client/202art and21historical study files. Documentation/design/plan/pinned/whitespace and source-scope checks are recorded separately; these are not new103runtime tests. No DB query/migration, service restart, credential/auth change, fixture grant, real player, hosting or expense operation occurred.

Normal final-head source acceptance remains held after the prior GitHub billing refusal. No merge or accepted-preview/public update. The7amstop remains in force.

[Contract](../../idle-hands-2/design/CAFE_AUTHORITY_CONTRACT.md).
