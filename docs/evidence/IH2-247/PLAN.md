# IH2-247 · Defer text changes during a resize

The accepted main build emitted a WebKit ResizeObserver warning when a home-owner dialog moved to the 844×390 layout at 200% text. The full Naturalist preview, owner command, visitor rendering and removal still performed. The final browser assertion caught the warning. Moving the layout-changing text class to a coalesced animation frame lets the observer finish its current delivery. Phaser's existing measured resize and same-frame redraw path stays in place.

The matched WebKit source passed the unchanged Naturalist interaction and all three stable-toolbar layout tests after the fix. The owner/visitor exercise uses fictional intercepted town data, including the intentionally interrupted reply. There is no assertion suppression, clock fixture, database restart or change to hosted checks. The new retained browser evidence does not cover every physical device.
