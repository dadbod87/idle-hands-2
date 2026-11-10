# Pilot provenance and notices

Playable art is original SVG/vector illustration authored for this project on 2026-11-09 by tools/create-original-art.py; exact hashes, stable IDs and selected direction are in asset-provenance.json. Two verified CC0 Kenney sheets plus included licenses are imported for the comparison page only, not the playable runtime; exact archive/file fingerprints are in kenney-evaluation.json. No font/music/sound files, paid assets or API-generated images. System fonts/CSS supply the interface.

Runtime dependencies: Phaser 4.2.1 and its exact locked eventemitter3 dependency, both MIT. Their included license notices are preserved below dependencies/; retain them in any distributed runtime (including alongside the built bundle). Development tools include TypeScript (Apache-2.0), Vite (MIT), Playwright (Apache-2.0) and exact locked transitives. dependency-inventory.json records package-lock integrity, license declarations, installation status and copied notice paths. Optional platform packages not installed on this Mac have metadata only; the inventory does not claim their archives were audited. See package-lock.json for all resolved releases.

The pinned OpenAI Game Studio guidance retains its own upstream manifest, notices and 40-file hash inventory under .agents. It is authoring guidance, not in-game art. No anonymous starter telemetry or bundled example artwork is used.

Development-only visual checking adds @axe-core/playwright 4.14.0 and its locked axe-core dependency, with included notices preserved. Zero automated violations is not a complete accessibility audit.

IH2-030 adds exact Zod4.6.7 (MIT), with its installed LICENSE copied to dependencies/zod and lock integrity in dependency-inventory.json. No RPGJS source is bundled. Depot and furnishing primitives are original code in WorldScene.ts, separate from the39 original SVG assets.

IH2-040 adds exact pg8.16.3, @types/pg8.15.5 and @types/node24.19.2 with lock-resolved transitive licenses (MIT/ISC). Notices are retained; pg-types2.2.0 and pgpass1.0.5 carry their full MIT text in the package README, copied verbatim to LICENSE_FROM_README.md. PostgreSQL runs as an external pinned official fixture container, not a redistributed game asset. Tool/image provenance is recorded in docs/evidence/IH2-040/tool-provenance.json.
