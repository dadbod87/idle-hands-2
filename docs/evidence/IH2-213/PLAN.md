# IH2-213 · A first safe route through Mossbank

Mossbank is the forestry settlement beyond Inkwood in the sequel’s design. The first route has one clear walk in, a place to read the town board, an optional lodging stop, a willow yard and a canal path. Beyond the services, eight example lots leave room for yards and a residential lane. The ferry berth is scenery in this slice. It hints at a wider world with a “Back shortly” sign of indeterminate age.

[Open the study](study/index.html) through a temporary loopback static server at 4352. Choose a destination, compare the open south crossing with a repaired North Walk, and preview the route. The selected route uses real lengths from the candidate map. The animation is compressed, and the displayed time is the route length at the current five-tile-per-second walking speed.

## What makes the town worth visiting

Keep the south crossing open from the first visit, with a safe connection to every ordinary service. The north repair is a civic shortcut. It shortens the proposed Inkwood-gate-to-willow-yard walk from about 26 to 19 seconds and leaves the route to the garden lots unchanged. The mill board is only about six seconds from the gateway. A returning resident can fit a small visit around a long workshop job or walk down to the canal. The first meaningful playing slice should give willow one distinct optional item and preserve the familiar Ledgerwick workshop and safe housing path.

Housing shapes and material choices should be visibly local. The study has eight example lots and three roof looks. A later playable map needs separate walkable door thresholds, real parcel rights and distinct exterior silhouettes. Check the regional arrival and return positions independently before inviting visits. The drawing establishes the spacings and route choices.

## Evidence and boundaries

The three local model checks sample the proposed segments for crossing and building obstructions, confirm every service is reachable before repair, and measure what improves when North Walk opens. This first pass found two paths cutting a building corner. Both were rerouted. Chromium and WebKit passed all three layouts, including native 320px touch and 640×360 at 200% text. The narrow map labels are supplemented by named controls and the duration. The closed and open states use the same existing destination choices. No server, game state, resource price, timer, unlock or travel authority is connected.

Run `node --test docs/evidence/IH2-213/study/layout.test.mjs` for the routes. With the repository served with `python3 -m http.server 4352 --bind 127.0.0.1`, run `node docs/evidence/IH2-213/study/browser-check.mjs`. The script accepts `IH2_WEBKIT_EXECUTABLE` for a local WebKit install outside the default cache.
