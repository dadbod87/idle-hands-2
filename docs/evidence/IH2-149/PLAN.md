# Leave a snack for a neighbor

Candidate for a first direct act of teamwork. A resident can leave one packed orchard snack for a named neighbor at the café. The neighbor sees the sender, item and two deliberate actions. Accept adds the snack to a pouch with room. Decline keeps it reclaimable. No public announcement is required. A simple note fits the tone: “The committee saved you a lunch.”

Use one outstanding offer per sender. It expires for the recipient after 24 hours. A reserved snack counts against the sender's capacity until accepted or returned, so an offline player never loses a parcel because they filled their pouch while away. The sender can take back a pending, declined or expired parcel once. Make private offers optional and start with a preset note. There is no currency, bonus, healing, spam loop or leaderboard reward in this study.

The pure [offer model](../../../tools/snack-offer-study/model.ts) compares occupied capacity, named recipient access, exact expiry, return, replay and two crossing favors. It treats an offer as a reserved item rather than a promise to create one later. Run `node --experimental-strip-types --test tools/snack-offer-study/model.test.ts`. It neither writes game state nor uses a server.

Before integration, version the orchard ledger for gifts without reclassifying older tastings or original packs. Use the existing authenticated actor lock and one offer row with explicit recipient ownership. Avoid taking two player-row locks for acceptance. Retaining reservations as derived offer occupancy lets a recipient credit their own pantry and settle the offer atomically while ordinary writers continue to protect the sender's slot. Test crossing offers and acceptance versus reclamation on real disposable PostgreSQL. Limit newest private history and notify only the intended recipient. Add an explicit, useful player-facing choice before considering timed bonuses.

## Parcel shelf rehearsal

The standalone shelf puts the pouch count, current parcel and one useful action next to each other. The recipient can accept or decline. If their pouch is full, the offer stays available and they can make room first. The sender can take their snack back even after expiry. The shelf uses the existing original orchard snack illustration. Preset messages and fictional residents keep the review focused on the interaction.

Run `node --experimental-strip-types tools/create-snack-offer-study.ts` to build the static study into `test-results/browser/snack-offer-study`. Run `./node_modules/.bin/playwright test -c tools/snack-offer-study/preview.config.ts` for desktop keyboard, 320-pixel touch and short touch at 200% text. The rehearsal keeps its state in memory. It contacts no game endpoints, writes no browser save, and creates no account or real parcel.

Terra reviewed the desktop, narrow phone and enlarged short layouts. The enlarged scenario picker originally clipped its selected title. The shelf now stacks its two sections when the available width is too small for the selected text scale. The browser check measures the full label as well as exercising the actions.
