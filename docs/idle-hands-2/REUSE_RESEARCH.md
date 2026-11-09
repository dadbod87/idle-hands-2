# Reusable art, tools and systems

Researched 2026-11-09 from the primary project/publisher sources linked below. **Historical shortlist.** Later on 2026-11-09 Nick delegated routine choices and required free assets. [ENGINE_DECISION](ENGINE_DECISION.md) now selects Phaser for a separate pilot; [FREE_ASSETS](FREE_ASSETS.md) excludes purchases. The later IH2-010 local pilot installs exact-pinned Phaser; no external art files imported. See its license inventory. The later [development toolkit](../DEVELOPMENT_TOOLKIT.md) records the actual installed authoring skills and development-only QA tools separately. This is a record of published terms and fit for evaluation, not a completed audit of downloaded releases. Recheck the exact release/archive and its included licenses before use. License-free hosting and free operation are different questions.

## Further repository evaluation

The [development toolkit](../DEVELOPMENT_TOOLKIT.md) adds a dated popularity/maintenance/source snapshot, RPGJS as a more complete framework candidate, and the installed skills/QA tooling. Compare RPGJS with a custom Phaser route before rebuilding maps, inventory, dialogue and multiplayer plumbing ourselves. The later engine decision supersedes the open shortlist; built-in systems still need testing against persistent cooperative town rules.

## Current evaluation path

Source/documentation review compared RPGJS and Phaser; the selected Phaser pilot is the next runtime test. Godot remains an alternative if browser or native requirements change; no third parallel prototype is required. Kenney/original assets are the first art candidates. The paid LimeZu row below is retained as historical research and is **excluded under the user's no-paid-assets constraint**. See the roadmap for exact task order and acceptance.

## Art shortlist

| Candidate | Work it could save | Published terms / source | Evaluation limits |
|---|---|---|---|
| **Kenney Tiny Town** | A small town map built from an existing 16×16 tile set; 130 files listed. | [Asset page](https://kenney.nl/assets/tiny-town) lists CC0; [Kenney support](https://kenney.nl/support) confirms commercial use and no required attribution for its asset-page packs. | Strong inexpensive prototype candidate. Check actual coverage and perspective against the first neighborhood; do not assume a complete animated character, interior or crafting set. Related packs need their own record. |
| **LimeZu Modern Exteriors** | Streets, buildings, city details and animated vehicles in an established visual family. | [Publisher page and license](https://limezu.itch.io/modernexteriors): paid pack; commercial/noncommercial use and editing allowed, credit required, asset redistribution/resale prohibited. | Characters are listed as coming from the separate Modern Interiors pack. Budget and inspect each pack separately. Do not put purchased raw files in a public repository or assume standalone redistribution is permitted. No purchase made; recheck current pricing when choosing. |
| **Universal LPC Character Generator** | Modular pixel characters with many interchangeable parts. | [Project licensing/attribution section](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator#licensing-and-attribution-credits): artwork has per-piece licenses, including CC0, CC-BY, CC-BY-SA, OGA-BY and GPL; generated credits are available. Generator code has its own GPL-3.0 license. | Conditional candidate, not blanket permission for the entire library. Save the selected components' license/credit export and resolve obligations for modifications and distribution. Verify art scale and animation compatibility first. |

## Systems and authoring tools

| Candidate | Existing capability | Published license / source | Work still needed / fit test |
|---|---|---|---|
| **Phaser + official Vite/TypeScript starter** | Browser game framework and a ready development/build project. | [Phaser license](https://phaser.io/download/license), [starter repository](https://github.com/phaserjs/template-vite-ts), [starter license](https://github.com/phaserjs/template-vite-ts/blob/main/LICENSE): MIT. | A starter is not a town/farming game. Preserve notices; audit dependencies and bundled example assets separately. Test tile maps, touch navigation, loading and scene changes. Select an actual supported version during evaluation; review the starter’s documented build-logging/no-log options. |
| **LDtk** | Visual 2D level/world editor; map layers, entities and JSON export. | [Features/export](https://ldtk.io/), [MIT license](https://github.com/deepnight/ldtk/blob/master/LICENSE). | Candidate for top-down maps; its site explicitly excludes isometric 3D. Need an importer and our own game rules. Editor licensing does not clear third-party tiles placed in a map. |
| **Colyseus** | Authoritative multiplayer rooms, state synchronization and reconnect/matchmaking building blocks. | [Project](https://github.com/colyseus/colyseus), [MIT license](https://github.com/colyseus/colyseus/blob/master/LICENSE). | Evaluate only when the first shared activity needs it. Need persistent saves, permissions, transaction rules, recovery and operational testing. Room servers need suitable hosting; serving the web client alone does not provide that runtime. Free framework does not mean free hosting. |
| **ink** | A narrative scripting language for branching dialogue and character stories. | [Project](https://github.com/inkle/ink) identifies the tool as MIT licensed. | Candidate for writing humor/quests outside rendering code. For a browser path, [inkjs](https://github.com/y-lohse/inkjs) is an existing MIT-licensed JavaScript port; verify compiler/runtime compatibility. Choose the engine runtime and build our UI/progression integration. It does not supply finished game dialogue or quest rewards. |
| **Godot** | Alternative engine/editor with scene and animation workflows and web/native export paths. | [Official MIT license explanation](https://godotengine.org/license/); [web export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html). | Compare with the browser-first route, not an extra engine to combine by default. Test actual phones and deployment constraints; web export requires WebAssembly/WebGL 2.0. Preserve engine notices and audit add-ons/assets separately. |

These resources can save art production, map authoring, rendering setup, networking or narrative tooling. None has been verified as a ready-made persistent cooperative Idle Hands city. Inventory, production, building ownership, contribution accounting, governance, progression and save migrations still need a coherent design and implementation.

## Reuse from the current game

Inventory our own work before commissioning replacements: humor/character concepts, original SVG props, material/pattern ideas, accessible feedback, fixture testing and lessons from production. Reuse only after checking ownership/provenance and visual fit. Do not automatically copy the single-file runtime, live data, player photos, coworker identities, paid content or credentials into a separate audience/product. Account links and any imports need an explicit future decision.

## Adoption record

Before importing a candidate, record the exact files/package version or source commit, creator, original URL, license and included license text, required attribution, modifications, intended use, cost/receipt if applicable, and decision status. Keep source art and credits reproducible. Check example assets independently of a code repository's headline license.

| Item ID | Exact source/version/files | Creator / license evidence | Intended use / modifications | Cost | Decision |
|---|---|---|---|---|---|
| No runtime/art imported | — | — | — | No spending | Phaser selected for pilot; exact installation/provenance pending |

For paid/restricted packs, confirm where source assets may be stored and who may receive them. For share-alike or mixed-license artwork, choose and document a compliant distribution approach before committing to it. Do not assume that “free to download,” an engine license, or a repository's top-level license covers every image.

## Small evaluation tasks

1. Choose the camera/style comparison and map scale from the experience brief.
2. Assemble one small licensed sample scene: player, building, interior, ground, props and readable phone interactions.
3. List what's missing: animation directions, furniture states, recoloring layers, terrain transitions, UI and sound.
4. Run the same walk/interact/scene-change task in the candidate engine paths. Record real phone readability, loading and editing effort.
5. Add one shared contribution with a tiny synthetic server fixture; test concurrent taps and reconnect behavior before committing to multiplayer infrastructure.
6. Review the results and actual license files, then explicitly adopt or reject components. Keep the existing game unchanged throughout this exploration.
