# Private GitHub / CI bootstrap

2026-11-09. Separate private source: https://github.com/dadbod87/idle-hands-2. Initial main seed is locally tested exit checkpoint af7d9dd, retaining the full original pilot history. No Vercel/Supabase project or deployed sequel created. This is source backup and regression testing, not a beta launch.

Bootstrap PR adds two required-by-project jobs: domain-build-plan (domain tests, strict build, roadmap/tests, 40-file upstream integrity, whitespace and built artifact) and browser-playtest (four real-input viewport walkthroughs, external HTTP blocked, current screenshots/metrics/traces/report). Standard Ubuntu 24.04 runner, exact Node 24.22.2 (official distribution index observed 2026-11-09), dependencies from the committed lock, install scripts disabled. Playwright 1.56.1 uses its bundled Chromium in CI; local runs default to installed Chrome. No runtime/auth/database/deployment secrets are passed to jobs. Artifacts retained seven days; no paid runner/feature selected.

Actions pinned to verified upstream full commit IDs: checkout v7.0.1 3d3c42e5aac5ba805825da76410c181273ba90b1; setup-node v7.1.0 949feb2413d6458794dcd2491c4babbbce0c15c1; upload-artifact v7.0.2 cf430e030ddbb5b0abf93d22962f4752f3646cd9. Their action.yml runtimes are Node 24. Recheck releases before intentional upgrades; do not auto-follow moving tags.

Current test output goes to ignored test-results/browser (or QA_EVIDENCE_DIR), keeping previously committed milestone evidence unchanged. Browser errors/external attempts fail the suite. CI success is not physical-device, multi-client, backend or production proof.

The CLI connection has repo access but no workflow scope. The connected GitHub app is the first workflow-write path; record its actual result rather than claiming the pipeline exists from a local file alone. The app successfully wrote the reviewed workflow. Any future missing permission needs an explicit connection fix; no credential exposure or bypass. Final PR/head/jobs/merge and branch-protection availability are recorded in the handoff/PR closeout after actual verification. No merge with pending/failed jobs.

## Actual bootstrap findings

GitHub rejected branch protection with HTTP 403: this private repository needs GitHub Pro for that feature. Visibility remains private and no upgrade was purchased. Both jobs remain mandatory project/manual merge gates; do not claim platform-enforced protection.

The initial CI run 42708814883 passed domain-build-plan and three browser layouts; desktop reached the final plot walk while still moving at the 45s test deadline. Its trace shows progress rather than a stuck route. CI software rendering is slower than the local Chrome run. At that bootstrap checkpoint, the complete-flow timeout became90s in CI and named-destination arrival10s. IH2-030 expands to15 browser cases: the current CI complete-flow limit is180s, ordinary assertions15s and explicit travel waits30s; the browser job is bounded to15 minutes so reports/artifacts can finish after software-rendered passes. Local defaults remain45s/5s, with bounded travel waits. All position, collision, input, no-error/network and arrival assertions remain; no retry or skipped case masks failures. New CI results must be verified.
