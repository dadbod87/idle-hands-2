# Mossbank willow basket study

The willow yard gives a new visitor a first local craft on the safe south route. The mill starts with four willow switches. Gather, review the three-switch cost, and start one six-hour basket. Walk to the canal steps or the ferry berth while it finishes. Pick it up at the rack and place it on the sample porch. The first result is a visible decoration with no production multiplier.

The study exercises the established Mossbank route model. North Walk is optional. The local mill stock restores one switch per six hours up to four, with a carry limit of eight. The bench holds its deadline across visits. Expiry only makes collection available. The preview spends nothing and a stale review cannot start a job. Additional repeat crafts, trading, placement rules and region unlocks need their own design.

## Review locally

Run `node --test docs/evidence/IH2-213/study/layout.test.mjs docs/evidence/IH2-220/study/willow.test.mjs`. The [native browser rehearsal](study/browser-check.mjs) starts a temporary static server and runs the full trip in both Chromium and WebKit. It covers keyboard at 1440 × 900, touch at 320 × 640 and landscape touch at 844 × 390 with 200% text. No game API, browser storage, saved services or accounts are used. Moving to a stop is instant in the paper study. The folded study control advances its own clock one hour at a time.

Eight deterministic tests and six browser trips passed. The browser trip reviews and cancels the price, confirms the cost, visits both alternate stops, checks every hourly boundary, then deliberately collects and displays the basket. The study adds a contextual label for unfinished work and keeps the finished illustration with the placement confirmation. The [browser receipt](LOCAL_BROWSER.json) records the six emulated viewport and input combinations.

## Boundaries for a playable pilot

Tune the first recipe after real wait-time playtesting. A future shared implementation should own recurrences, permission checks, consume/claim receipts and decoration placement in its existing authority. Keep the status and route portable only after those rules exist. The study art and commands do not ship with the game.
