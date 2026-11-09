# Pilot acceptance

- npm run test; npm run build; npm run test:browser; npm run check:plan; upstream skill integrity; diff check.
- Review actual canvas screenshots for desktop, 390×844, 360×640, 844×390; keyboard/tap pathfinding, collision, transition, reload, modal input lock and resize.
- Report original placeholder provenance, exact dependency/license inventory, compressed payload, frame-sample methodology, console/network findings and physical-device limits.
- Local-only is not a multiplayer/private beta release. No cloud/account/cost changes. Record task evidence/current handoff before completion; local commit on feature branch while no remote exists.

## Private source / CI gate
- Feature PR, exact tested head, domain-build-plan and browser-playtest success before merge.
- GitHub runner: Ubuntu 24.04, Node 24.22.2, bundled Chromium from pinned Playwright 1.56.1; local default uses Chrome. No runtime/deployment secrets.
- Preserve current browser screenshots/metrics/traces/report and built client artifact for seven days; disclose synthetic data.
- Verify remote private visibility/default main, merge/check hashes and current handoff. Source backup/CI is not a hosted beta.
