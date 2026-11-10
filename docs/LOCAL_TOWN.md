# Local shared practice town

This is a local development proof with fictional residents, not a hosted account system. The ordinary browser-only workshop remains at `/` and keeps its own save. Shared mode is `/?town=1` and starts separate residents on the local database.

## Start
From the sequel repository, with Docker running:

```sh
npm ci --ignore-scripts
npm run town:db
npm run town:server
```

Keep that server terminal open. In another terminal:

```sh
npm run build
npm run preview -- --port 4175 --strictPort
```

Open http://127.0.0.1:4175/?town=1 and choose Aster, Bea or Casey. Different browsers/profiles can represent different residents together on the same computer. No real accounts or old-game saves are imported. Each resident starts with zero bridge kits; the first planter is quick, later production is slow. Confirmed inventory/jobs/property persist through local server restarts in the dedicated Docker volume. The computer and local services must remain running to use the preview.

Use normal gathering/crafting to produce kits; contribute at the bridge and acquire/upgrade plot rights. Plot claim12 kits, upgrade24 additional. The frontage leads to a selected resident’s private home instance. Visitors can enter and see its furnishings; only the owner can edit or expand. Existing six placement IDs survive the continuous workroom expansion. A whole street of separate lots and useful trail access remain later work. Paid one-time orientation maintenance at the bench costs one of each material and60real seconds, with ordinary jobs running independently. Bring its credit to repair or upkeep; no inventory kit is granted. Bag → Since your last visit describes confirmed status without collecting work.

## Isolated tests

```sh
npm run test:server
npm run test:browser
npm run check:plan
```

Server tests use only ih2_test, ih2_http_test and ih2_restore. Browser tests reset only ih2_browser and seed each fictional resident with48 kits/2 planters to exercise ownership quickly. This is test setup, not the normal economy. Two client-only race tests plus a cache/restart case intercept responses/EventSource; the shared-server case aborts an already committed response to verify safe same-ID retry. No real progress/currency grant occurs.

PostgreSQL16.15 image is pinned by digest in tools/town-db.ts; the named container/volume are exclusive to this sequel. Existing unrelated containers are checked/preserved. `node --experimental-strip-types tools/town-db.ts stop` stops the fixture database while retaining its volume. No destructive reset command targets the ordinary preview database. Runtime HMAC keys are ignored `.local/` files with private permissions. No cloud credentials are required.

The fixture service refuses non-loopback databases and binds127.0.0.1. Synthetic login is deliberately selectable; it is not secure personal authentication. Public hosting, verified identity, real phones, load/cost/backup policy and a production deployment remain later gates.
