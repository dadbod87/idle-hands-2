# IH2-012 — natural movement and living-town direction

2026-11-09. Direct feedback: movement felt constrained to tiny squares. Implemented continuous positions and velocity outside Phaser; keyboard axes combine with normalized diagonal speed, turning/release takes effect immediately and manual steering interrupts a pointer route. Stopping, menu locking and local saving no longer round/snap positions. Existing version-1 integer position saves still load; new fractional positions restore safely if collision-valid.

Pointer clicks retain their exact sub-tile endpoint. Clear direct routes use one segment; obstacle-aware routes use the existing navigation grid internally but remove redundant waypoints with collision-aware line-of-sight checks. Walking does not stop at every hidden grid cell. Movement uses bounded swept substeps and slides along walls while preserving collision; blocked/out-of-world destinations remain rejected. No new movement RPC or backend exists.

## Validation

- `npm run test`: 8 domain tests pass, including equal diagonal speed/frame partitioning, immediate turn/release, no snap on lock/save, obstacle paths to fractional endpoints, wall sliding and manual route interruption.
- `npm run build`: strict TypeScript/Vite pass. Existing large engine-chunk warning remains; no dependency/version changes.
- `npm run test:browser`: 4 complete actual keyboard/mouse/touch walkthroughs pass (55.4s), at 1440×900, 390×844, 360×640 and 844×390. Combined-key diagonal motion, release at rest, no menu snap, free-form pointer endpoints within 0.05 tile (~1.6px), building collision, named destinations, transitions, saved-room reload, HUD bounds and canvas resize all checked.
- No page/console errors or attempted external origins in the blocked-network browser fixtures. Local synthetic state only; no backend/auth/service interception or real player data.
- Phone square and short-workshop screenshots inspected after the change; controls/playfield remain usable in the tested states. No physical-phone, cross-browser, multiplayer or full accessibility claim.
- Tracker/ten tracker tests, skill integrity and whitespace checks run at closeout. Prior IH2-010 evidence is retained unchanged; new screenshots and metrics are stored beside this report.

## Scope and continuity

Living-town design captured in LIVING_TOWN_SYSTEMS: quests and skills connect gathering/crafting to shared restoration, residents/services and home décor. Those systems remain staged designs, not implemented preview features. New NPC helpers/shops/rare items do not silently expand the pilot scope. Source remains local-only; no remote, hosting, payment or current-game modification. Next IH2-015 remains the private GitHub/CI checkpoint, then the visual kit.

Refresh the existing http://127.0.0.1:4175/ preview to load this build. All six served build files/runtime notices were checked against their recorded hashes. Summed gzip/file methodology and hashes are in build-metrics.json; frame samples below are short local Chrome update intervals, not real-device performance.

- desktop-metrics: 531 samples, p95 16.70 ms.
- phone-metrics: 520 samples, p95 16.70 ms.
- short-metrics: 522 samples, p95 16.80 ms.
- narrow-metrics: 523 samples, p95 16.80 ms.
