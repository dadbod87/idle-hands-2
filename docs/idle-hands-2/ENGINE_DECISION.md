# Engine decision — 2026-11-09

Status: **agent-selected working architecture under Nick's delegated authority**. Initial source/documentation review is now followed by the local Phaser pilot in docs/evidence/IH2-010. No comparative RPGJS runtime benchmark or physical-phone test performed. Validate this choice in task IH2-010 before producing bulk content. This is a decision for the separate sequel, not a migration of Idle Hands 1.0.

## Choice

Use **Phaser 4 + TypeScript + Vite**, with HTML/DOM menus and HUD. Start the pilot at the observed published Phaser **4.2.1**, exact-pinned in its own lockfile when implemented. Do not install an unpinned `latest` starter. Recheck release notes and dependency security at installation; record any version change and why.

Why: the core challenge is a persistent cooperative production/building simulation with decoration and exploration. We need clear ownership, transactions and save migrations regardless of renderer. Phaser provides the browser/camera/sprite/input layer without binding those rules to RPG character progression or save slots. This fits our existing TypeScript/browser testing skills and allows text-rich phone UI outside the canvas. It costs us more custom inventory/interaction work than RPGJS; the small scope below makes that trade deliberate.

## Comparison

| Question | RPGJS v5 | Phaser 4 | Decision for our game |
|---|---|---|---|
| What is supplied? | Maps/events, dialogue, items, RPG systems, GUI and map-room multiplayer. | 2D rendering, scenes, cameras, animation and input; game systems are ours. | RPGJS wins speed to a conventional RPG; Phaser wins control over a custom town simulation. |
| Persistent shared construction | Player save/load uses a storage strategy. Map synchronization and player snapshots do not by themselves prove atomic shared-project persistence. | Needs a backend by design; no built-in claim of durable city storage. | In either case implement authoritative transactions, receipts, migrations and restart recovery. |
| Phone/text UI | GUI/mobile systems exist; integration follows RPGJS/CanvasEngine conventions, with Vue support documented. | Canvas world with ordinary accessible DOM controls under our control. | Prefer explicit responsive DOM UI and tap-to-walk/directory controls. Actual device proof is pending. |
| Reuse and complexity | More ready systems, more framework-specific integration and package coordination. | Smaller renderer boundary; more domain code, independently testable. | Choose fewer game-specific assumptions for production, decoration and permissions. |
| Cost/license | Engine repository MIT. Commercial services are separate. Starter repository license was not declared by GitHub's license API at inspection; that is unresolved, not proof of prohibition. | Framework MIT; preserve its notice. Commercial Phaser AE/editor services are separate. | Use open-source framework; no paid companion products or example artwork assumed licensed. |
| Current source/version evidence | Root monorepo package says 5.0.0-beta.7, while published server is 5.3.0 and client 5.4.0. Do not infer published packages are beta from root metadata. | Published package and source package say 4.2.1; official starter still pins 4.0.0. | Record exact versions. Do not blindly copy either moving starter. |

RPGJS remains the fallback if the pilot shows we are spending too much effort recreating standard RPG features. Reopen the decision if map transitions, dialogue or character systems dominate scope; do not run both engines in one game. We did **not** establish that RPGJS is slow, insecure or unsuitable.

Godot is a capable MIT alternative with a strong editor/native route. Its web export requires WebAssembly/WebGL 2.0, adding a different build and phone-validation path. Our first audience opens an office link in a browser, so it is not the default. No third engine prototype is required unless Phaser fails the pilot or native/3D becomes a real requirement.

## Selected supporting architecture

- Client: TypeScript, Vite, Phaser 4.2.1 pilot, DOM UI and system fonts. No UI framework until a concrete need. Node 24 development target; confirm tool compatibility and exact-pin dependencies when bootstrapping.
- World: small orthogonal top-down 2D neighborhood, fixed tile units, camera follow, separate collision data. JSON-authored first map; consider Tiled import only once manual content editing becomes a burden. No 3D/isometric dependency.
- Rules: pure serializable TypeScript domain modules. Commands/results use versioned schemas; no prices or ownership derived from sprites. Integer resource units and bounded arithmetic; choose numeric limits explicitly before production economies.
- Backend: Node/TypeScript authoritative command service, PostgreSQL durable state. Local disposable database first. No reuse of Idle Hands 1.0 tables, accounts, secrets or project.
- Multiplayer: Colyseus is the selected room/presence transport to validate in IH2-040. Keep room movement ephemeral; persist economy, ownership and construction in PostgreSQL transactions. A room snapshot is not the durable town. Do not install it before the shared interaction milestone or add Redis/microservices by default.
- Idle production: settle elapsed time on validated commands/reconnect, with stored timestamps and explicit caps. Never update every building in the database every frame. Server validates active gathering/movement proximity; a client position is not proof of a reward.
- Saves: schema versions, migrations, idempotent command IDs, transaction receipts, backups and tested restore. Atomic shared contributions; bounds, authorization and rate limits before any public trial.
- Tools: existing project playtest/UI/foundation skills; Playwright and isolated PostgreSQL tests. Retain the existing current-game QA system separately.
- Hosting: intentionally not chosen before an executable shared pilot gives memory/connection/storage measurements. Static Vercel hosting alone is not a persistent room server. No new cloud resource or bill in this task.

## Evidence and limits

Exact source/package observations are in [engine-sources-2026-11-09.json](engine-sources-2026-11-09.json). They are a dated snapshot, not a future version guarantee. We inspected scripts/metadata rather than executing upstream starters. The Phaser starter's default dev/build scripts launch anonymous build logging; a future bootstrap will use our own minimal files and no telemetry hook. No starter art was imported.

Primary sources: [RPGJS source](https://github.com/RSamaium/RPG-JS), [quick start and explicit MMORPG mode](https://v5.rpgjs.dev/guide/quick-start), [save storage strategy](https://v5.rpgjs.dev/guide/save-load), [map-room synchronization](https://v5.rpgjs.dev/guide/synchronization), [Phaser browser/2D design](https://docs.phaser.io/phaser/getting-started/what-is-phaser), [MIT terms](https://phaser.io/download/license), [official starter](https://github.com/phaserjs/template-vite-ts), [Godot web requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Colyseus documentation](https://docs.colyseus.io/).

## Hosting clarification — later 2026-11-09

Nick prefers GitHub/Vercel/Supabase where appropriate and can consider modest additional business-funded hosting. That supersedes a strict zero-operating-cost assumption, while the no-paid-assets rule remains. Favor Vercel web delivery and a **separate** Supabase database/auth/storage project at the isolated-backend stage if suitable. Evaluate server-authoritative Postgres functions/commands and scoped realtime before adding a dedicated room server. Colyseus is conditional on an actual presence/interaction requirement; choose runtime/hosting from measured behavior and current provider terms, not habit. This pilot provisions none of them.
