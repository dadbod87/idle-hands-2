# IH2-010 engine pilot — 2026-11-09

Result: **local pilot acceptance passed**. Phaser 4.2.1 remains the selected engine for the next stage. This is original placeholder art, a local synthetic position save, and one client. No sequel hosted deployment, remote repository, server, authentication, economy, house sale, cooperative progression or multiplayer benchmark exists yet. Existing Idle Hands 1.0 remains unchanged.

## Implemented / verified

- Separate local source repository on `feat/engine-pilot`, outside the 1.0 deploy root; copied planning authority and unmodified 40-file pinned skill bundle.
- Exact-pinned Phaser 4.2.1, Vite 8.3.7, TypeScript 7.0.2 and Playwright 1.56.1. Installation used `--ignore-scripts`; no upstream starter script, telemetry hook or demo asset executed/imported. npm installation audit reported zero advisories for the installed graph, not a full security audit.
- Pure TypeScript grid/path/collision/session modules, thin Phaser world renderer, DOM menus and contextual controls. Original square/workshop plus labeled café, future home plots and bridge-committee interaction.
- Actual keyboard and mouse/touch inputs, destination walking around obstacles, solid-building collision, modal movement lock/unlock, scene transition/return, saved-room reload and canvas resize tested at 1440×900, 390×844, 360×640 and 844×390. Each closed-menu world occupies at least half the viewport; nav targets at least 44px and within viewport; no horizontal page overflow.
- Local `npm run test`: four domain tests; `npm run test:browser`: four complete walkthroughs, final run 53.1s; `npm run build`: strict TypeScript and Vite successful. Tracker/integrity checks and ten tracker tests pass separately.
- All browser runs intercept/block external HTTP origins; none attempted. No page/console errors. All player state is synthetic local-only; no service calls were intercepted to impersonate a live backend. Tests read diagnostic snapshots/metrics but drive behavior with real browser input, not mutation hooks.
- Reviewed desktop square, phone square/workshop/housing dialog, narrow square/dialog and short-workshop screenshots. No blocking HUD/control overlap found in these pilot states. Long interior/ground signs can enter/leave the camera; Places plus DOM context keeps essentials reachable. This is not a final art or full accessibility review.

## Measured evidence

Built distribution including runtime license notices: **361019 bytes summed gzip** (~352.6 KiB), below the 5MB pilot target. Method: Python gzip default level per file, mtime zero, sum dist files; not an actual network-speed/load-time test. Vite reports a different gzip estimate and warns about the 1.38MB minified engine/application chunk; retained as a future loading-budget consideration, not hidden by changing the threshold. File sizes/hashes: build-metrics.json.

Frame intervals sampled from Phaser update timestamps over the final 600-or-fewer visible frames, sorted p95; after resize restored to each viewport and allowed 2.5 seconds. This is a short unthrottled headless Chrome run on local arm64 macOS using Node 26.7.0. It is not GPU profiling, a long-duration benchmark, low-end phone hardware or proof of 30fps on a real phone. Browser identity and exact sample counts are in each metrics JSON. Node 24 remains a target but was not independently tested in this session.

- desktop-metrics: 526 samples, p95 16.80 ms, Phaser 4.2.1.
- phone-metrics: 522 samples, p95 16.80 ms, Phaser 4.2.1.
- short-metrics: 525 samples, p95 16.80 ms, Phaser 4.2.1.
- narrow-metrics: 522 samples, p95 16.70 ms, Phaser 4.2.1.

## Defect found and fixed

Native dialog close dispatches asynchronously. Immediately clicking the floor after closing could reach a still-locked session; choosing a destination could also be cancelled by a later close handler. Closing now releases the input lock synchronously, while the close fallback only unlocks if still needed. The first real pointer click after closing, plus destination arrival in all four sizes, guards this regression. Touch emulation was configured at browser-context creation, rather than claiming a physical phone.

## Limits / next tasks

No real-device, Safari/Firefox, multi-client, server durability, slow-device, 200% zoom/accessibility, housing economy or six-week progression simulation yet. These belong to the recorded visual/domain/durable-play gates. Placeholder art is deliberately simple; no final visual kit selected. No localhost preview is remotely accessible. No new server/bill, remote publication or current-game change.

Next IH2-015 establishes private GitHub source and separate sequel CI before visual-kit production; then IH2-020 chooses the coherent art kit. User's slower progression/teamwork/humor/housing priorities and preferred GitHub/Vercel/Supabase stack are in DECISIONS and PACING_AND_HOUSING. Extra hosting is conditional on a concrete modest estimate; the asset budget stays $0.
