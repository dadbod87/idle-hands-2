# A first morning in Ledgerwick

Standalone browser rehearsal for Idle Hands 2. Choose a name and appearance, read a backstory note, get up in a rented room and step outside. The four sprite sheets are the exact existing original residents, reused as appearance presets for the study. The two adjacent SVGs are new original illustrations authored for this rehearsal. The opening study does not change the game, server, player saves or asset manifest.

From the repository root, run `node tools/lodging-study/serve.mjs` and open [the study](http://127.0.0.1:4293/tools/lodging-study/). The server listens on loopback and serves only the listed study files and four preset sprites. Stop it with Control-C. No preview or database is needed.

The pure study checks run with `node --test tools/lodging-study/opening.test.mjs`. Run `npx playwright test --config tools/lodging-study/playwright.config.ts` for three emulated layouts, keyboard/touch, reduced motion, focus and request checks. The browser evidence is written under `test-results/browser/opening-study`.

See [the integration gates](../../docs/evidence/IH2-136/PLAN.md) before registering the room or adding a shared character profile.
