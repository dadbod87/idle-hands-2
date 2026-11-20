# IH2-171 · Show one earned keepsake in an owned home

A resident who has recorded all three tree studies can preview the original Neighborhood Naturalist certificate and display it for visitors at home. Taking down the frame leaves the certificate in Journal. The game shows a small framed stand just below the room's top overlays, where arriving phone visitors can see it. The display card identifies it at normal play scale and gives the visitor its short story.

## Player path

- Open Bag → Inspect or arrange a house → Keepsake display in your own home.
- Preview the stand in your real home plan. Previewing or cancelling changes no shared state.
- Choose Display for visitors. It reaches the room only after confirmation. Visitors have a read-only card under On display.
- Take down the frame at any time. Visitors already standing in that house see it disappear. The rest of town receives no keepsake invalidation.

## Authority and compatibility

The additive PostgreSQL migration adds a nullable constrained column on the existing private plot row. Preexisting rows begin clear. Authoritative writes use the existing actor and plot locks, confirmed home position, exact revision and replay helpers. Hanging requires all three accepted survey IDs. One coherent snapshot statement projects the chosen certificate only inside the relevant instance and leaves privately earned progress out of plot records. Room-specific refreshes add no background timer. Old servers omit the capability field and the newer client omits the controls for those snapshots. House construction updates keep the field on the existing plot.

The regular plot-lock SQL and café-clock regressions stay exact. Current database checks verify the ordered migration checksums from source, including all historical checksums already pinned. The previous release's fixture artifacts remain intact. The migration was created using the checksummed official CLI's local file-generation command. It has not been applied to a saved or hosted database.

## Evidence and acceptance

Native Chromium runs exercise the display from the actual game UI using intercepted fictional owner and visitor replies. The fixture holds confirmation, then supplies scoped invalidations to verify the world and an open visitor card update for display and removal. Desktop, 320-pixel touch and short landscape at 200% text use the real canvas, UI and asset. The first screenshot review identified overlap with wall lettering and small-screen overlays. The stand moves below the arrival overlay and keeps the lettered panel intact.

An isolated PostgreSQL test is prepared for unearned and non-owner refusal, current-home validation, owner hang, visitor-only projection, unchanged inventory and deadlines, exact replay, and rollback after an injected late receipt failure. The real migration, scoped HTTP update, and full browser/database regressions must pass in disposable CI before merging. Physical-device and saved-play acceptance remain separate.

Terra rechecked the corrected phone arrival, desktop room and short owner panel. The frame no longer overlaps the arrival HUD, wall lettering, player or exit. The miniature inscription stays small at room scale, so the visitor's display card carries the readable title. The final observed local domain pass was 437 tests, with 28 database suites skipped to keep saved services stopped. A duplicate-query regression in the first check was corrected by reading the new plot field only for the explicit display command. The prepared PostgreSQL case also opens actual guest and outsider streams to check targeted invalidation.

The final browser fixture also drops the first display reply after recording the fictional change. The frame stays hidden for the owner until retrying the same request ID and payload receives an accepted reply. The open visitor card updates after both display and removal without reopening the panel.

The first full CI run caught a legacy home-route regression: a snapshot could add an empty keepsake field while returning the visitor's position outside. Empty stands now preserve the existing plot shape. The room-specific projection uses the confirmed position and the HTTP response checks it again before sending. The isolated HTTP scenario verifies that polling and signing back in after leaving omit the display even when the saved checkpoint still points to the home.
