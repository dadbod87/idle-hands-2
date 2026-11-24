# Reproduce the workshop resize check

Build the reviewed browser-practice source and run the optional local probe. It uses a new browser context and starts its own loopback client. Saved previews and PostgreSQL can stay stopped. Use the same built artifact until the run finishes.

```sh
npm run build
node tools/observe-workshop-resize.mjs --engine chromium
node tools/observe-workshop-resize.mjs --engine webkit
```

The browser engines use the project's installed Playwright version. An occupied test port can be avoided with `--port 4355`. Each invocation writes a new directory under `test-results/observe-workshop-resize`; `--output` chooses another directory. The receipt records the built HTML hash. No GitHub Actions workflow invokes this tool.

Each quick run makes and places the first planter through native input and starts a real eight-hour follow-up. It resizes the workshop twelve times, including 4K, 2K, a 320px phone and short landscape at 200% text. Alternating cycles resize with Journal open. It samples the visible playfield immediately after the input and compares the settled canvas dimensions. The queued job, placed planter and original save survive a final reload. The check blocks any unexpected game API request.

For the longer Chromium variant, pass a whole number of minutes for each of four actual document freezes. The test does not move the browser clock. Four freezes of 30 minutes take just over two elapsed hours.

```sh
node tools/observe-workshop-resize.mjs --engine chromium --freeze-minutes 30
```

The first visible sample after each resize uses central pixels of the viewport. Frames between samples, physical devices and hardware-specific rendering are outside this test. The full repository browser and database checks remain required before release.

The saved probe itself passed twelve Chromium and twelve WebKit quick samples and a separate four-cycle Chromium run at one minute per freeze, using the built runtime from `1f33dd9`. All 28 first captures exceeded the light threshold, and the queued job and save remained identical at reload. These short verification runs are separate from the longer recorded soaks.
