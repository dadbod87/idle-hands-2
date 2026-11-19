# Try the first Ledgerwick headwear

The fitting-room rehearsal offers a slate Clerk cap with a brass docket tag, and an Inkwood hood with a stitched edge. They read differently from the front, back and side while keeping the same resident below the shoulders. Players can compare either with the original appearance and optionally watch one walk cycle. The fiction is simple. The clerk insists that the tag is an official document.

The two original accessories cover four residents, four facings and seven poses per facing. Browser raster checks verify all 224 equipped frames have the same lower pixels and still differ in the head region. Terra found that an early front brim obscured Bea's eyes. The revised front brim shows both eyes, and the browser checks verify those eye pixels across all 28 front-facing clerk poses. Existing resident sheets are copied exactly into the standalone study for comparison.

Build the preview with `python3 tools/wardrobe-study/create.py`. Run `./node_modules/.bin/playwright test -c tools/wardrobe-study/preview.config.ts` for the raster and keyboard or touch checks. Use the generated `art.json` to reproduce the art hashes. The study stores no inventory or profile and contacts no game endpoint.

A first playable slice can add one independent optional headwear slot for a resident. A real grant should come from one already reviewed social or exploration action. Apply cosmetics only after a confirmed save, and exercise existing gardening, gathering, carrying and orchard poses before enabling the slot throughout the world. The study establishes idle and walking frames. It does not establish the additional action poses or shared ownership.
