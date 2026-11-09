# IH2-020 — illustrated visual kit

Local acceptance passed 2026-11-09; required remote CI still gates merge of the final candidate. Selected original illustrated company-town art after rendering the same workshop/square/person scene alongside a verified CC0 Kenney Tiny Town/Tiny Dungeon composition. Review page: /?art-study=1. No art purchase, font file, image API or paid service.

Implemented 39 original SVG assets, including two grounds, workshop/café, representative props/plot, before/after bridge and four-direction employee with idle plus six walk poses per direction. Shared 64×80 frames/foot anchor, distance-based walk phase, retained idle facing and reduced-motion idle pose while walking. Y-depth/occluder softening keep the character readable. All original sources, generator, stable IDs and fingerprints preserved. Kenney sheets/notices are unmodified, exact archive/file hashes recorded; comparison-only, with zero evaluation requests on the playable page.

DOM field guide has a clear first-goal cue and before/after restoration picture; it labels quests/progression as future work and changes its action to the bench when inside. Accepted simulation/movement/collision/door behavior unchanged. No economy, rewards, NPC system, actual restoration state or backend was added.

## Checks and scope

- 13 domain/art/provenance tests pass; strict TypeScript/Vite build passes. Asset hashes, frame bounds, facing/pose/reduced-motion rules checked.
- Eight complete local browser cases pass (1.3m): four movement/door/exit/reload/resize viewports plus desktop/narrow/short visual/guide/study checks and reduced motion. After shortening decorative guide copy, the four visual/reduced-motion cases were rerun and passed (6.9s); runtime movement code is unchanged.
- Nine axe scans have zero automated violations for selected WCAG2A/AA and 2.1A/AA tags. Each scan retains 1–2 incomplete findings. This does not prove complete accessibility, canvas-text contrast, physical-device behavior or all possible states.
- DOM text sizing actually doubles rem-based text; tests verify computed heading size doubles, page does not overflow, playfield stays available and close remains in viewport. This is not native browser/pinch zoom or a real-phone claim. Guide target is at least 44×44 in short view too.
- Synthetic local browser state only, external HTTP blocked/no attempts, no page/console errors. No real-account data or mocked production backend.
- Summed per-file gzip playable distribution: 385687 bytes, excluding comparison assets, below the 5MB pilot budget. Method is Python gzip, not a measured network transfer. Exact file sizes/hashes in build-metrics.json. Local frame JSON is short unthrottled Chrome/arm64 evidence, not low-end-device or sustained multiplayer proof.

## Independent review

Read-only phone reviewer exercised actual touch at 390×844/360×640 and short 844×390; direct door entry/exit worked without Places. It identified decorative crowding at 200% text, an incorrect in-workshop guide label, and recommended future approach-and-interact props. Fixed mobile branding/dialog eyebrows, map subtitle/hint, 44px short guide target and contextual action. Focused recheck found no blocker: narrow 200% playfield 363px, guide close reachable/header 160px, short guide target 44×44. Parent subsequently shortened decorative guide copy further and reran its automated visual checks. No physical-device/Safari/Firefox claim. Parent visually reviewed world/study/text-scaled screenshots.

Independent systems review is saved in SYSTEMS_REUSE_REVIEW: RPGJS inventory is engine coupled, small pure domain logic plus actual reusable validation is the chosen route. Art and code reuse are separate decisions.

## Limits / next

Representative kit only; body/clothing diversity, gathering/tool animation, more home parts, resource states, NPCs, audio and broader device/accessibility/performance checks remain. Before/after bridge is an art sample, not a newly opened route. No public/deployed sequel. Main/source authority stays private GitHub. User now authorizes bounded continued work while away; see AUTONOMOUS_SESSION_2026-11-09. Weekly read remains 69% at the latest checkpoint; stop policy is approximately 10% remaining, no automatic resets.

Next IH2-030: direct-tap gathering/bench/crafting, bounded inventory/local quest/skills/placement/production and slow-progression simulation, with versioned local synthetic saves and independent review. Do not mistake local save validation for server authority.
