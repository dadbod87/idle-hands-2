# IH2-045 independent review

Original-art authoring and phone/source integration checks were delegated under the user's existing authorization. No original-game files or real accounts were touched.

- Art validation: deterministic generator rerun; all14 SVGs parsed and dimensions checked; four1792×80 sheets with28frames and shared(32,72) foot; mirrored west-facing poses and distinct apparel/builds visually inspected. Trees have separate static trunk/canopy layers and authored occlusion; café chimney mouth metadata.
- Source review: metadata placement preserves workshop/café thresholds at(640,704)/(992,704). Shared sprite-sheet textures reused; media-query listener removed on scene shutdown. Hidden/reduced/offscreen effects reset without domain/transport calls; default local NPCs remain separate from shared residents.
- Actual canvas review caught black/green missing-texture placeholders despite initial passing DOM tests. Root corrected Phaser texture-key use. Regenerated desktop/360px screenshots render all residents; texture/frame assertions added to prevent recurrence.
- Reviewed desktop/narrow door approach, path readability, building/tree recognition and comparison-page phone reflow/sample disclosure. No remaining concrete blocker in those reviewed screenshots. Full test execution outcomes are root's evidence, not inferred from the review.

Limits: emulated viewports, no physical-phone/cloud-load/full accessibility certification; broader NPC interactions and shared peer interpolation remain later work.

Follow-up: actual Linux CI screenshots exposed canopy clipping after PR #5 merge. Independent pinned-source inspection found correct image matrices/UVs, without a proven engine cause. A new screenshot-pixel coverage check distinguishes healthy art from the known bad captures. Root reproduced failure with SwiftShader, replaced rotation with bounded axis-aligned sway and verified the positive software case. Review actual follow-up CI artifacts before merge; prior50/24 green was insufficient visual evidence.
