# IH2-187 · Redraw the playfield in the frame that resizes it

Resizing an idle or paused office should keep the town visible so players can keep their bearings. The browser observer now schedules the change for the game step. Phaser can update geometry in its usual scale check, and the game applies any remaining change before the scene renders. A visible resize wakes the idle loop briefly. An open menu gets the existing short redraw budget while the movement lock remains in place.

This follows the Ubuntu diagnostic that sampled 33 dark points out of 35 in the first short-landscape capture and zero once the town had rendered. In the new focused baseline check, resizing left the running game at its 10 fps idle cap. The candidate observed a wake from idle, actual backing-canvas size changes, and zero dimension writes inside the browser layout observer. Both captures in each local renderer sampled zero dark points. [Earlier Ubuntu resize diagnostic](https://github.com/dadbod87/idle-hands-2/actions/runs/44765755710).

The ordinary Chrome and software-rendered Chromium runs each passed the existing Sound and menu-redraw cases. They covered 1440 × 900 through short landscape at doubled text and portrait, pointer and keyboard focus, and pixel checks behind a resized open menu. Movement stayed locked while the menu was open and resumed on close. [Local measurements](LOCAL_RESIZE.json).

The browser tests use a disposable local build. Full exact hosted checks and physical-device verification remain pending. Keep the early and settled screenshots when doing the later exact-source check so intermittent flashes remain visible. Nothing in the saved previews or databases was started.

Terra reviewed six actual Chromium stills. The early and settled town views were readable in both renderers, and the Sound and footer buttons remained clear. The open guide intentionally covered much of the dimmed town. Field-note text extends below the short viewport. The stills cover the emulated short layout, so a physical-device rotation check is still open.
