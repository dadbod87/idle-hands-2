# Preserve the path while reducing town route calculation

The same resident can still reach the same workshop, commons, trail, allotment and neighborhood stops. The planner reuses numeric grid cells inside each search. A blocked or already queued cell is checked once. The existing north/east/south/west tie order, step distance and timed walking are intact. There is no cross-layout cache. The continuous collision check keeps its original number of interpolated foot samples and skips only obstacles outside the segment's swept bounds.

The [local profile](LOCAL_ROUTE_PROFILE.json) compared 3,388 ordered start and arrival routes across seven ordinary and browser-lodging layouts. Every endpoint was reachable with the same ordered waypoints as the prior implementation. The 23 focused domain cases include equal-length routes, mutable fixture geometry, boundary and fractional wall checks, and every residential door pair. Five Chromium cases exercised native map navigation, actual movement/collision/typing lock, overlapping Inspect ranges and delayed Riverwalk recording. The broader final client batch still needs its own evidence.

| 320px touch selection with Chromium at 4× CPU slowdown | Baseline median | Candidate median |
| --- | ---: | ---: |
| Nearby workshop | 3.7 ms | 3.0 ms |
| Pine deadfall to South meadow | 407.3 ms | 97.7 ms |
| East Commons to fallen pine | 425.5 ms | 86.9 ms |

Eight timed selections per route/configuration followed one discarded first trial. Each measured native destination-button handler includes opening the route, panel close and related foreground work. Disposable browser contexts used a declared legal position with a real journey start and Stop walking. No currency, task, inventory or game API changes. The measurement isolates synchronous selection at one emulated viewport, not a frame rate, real-device result, server throughput or travel duration. Unloaded route measurements in Node had different overhead. Do not infer a real device's time from this table.

From the matching built checkout, with the chosen browser installed and port 4353 free:

```sh
IH2_ROUTE_SOURCE=source-tag IH2_ROUTE_OUTPUT=/tmp/routes.json \
  node --experimental-strip-types --input-type=module < docs/evidence/IH2-216/measure-routes.mjs
IH2_ROUTE_BROWSER_SHA=source-tag IH2_ROUTE_BROWSER_OUT=/tmp/touch.json \
  node --input-type=module < docs/evidence/IH2-216/measure-touch.mjs
```

An initial probe reused a page while its position-save callback was still pending. The measured comparison uses a new browser context and confirms its planted practice position before each selection.
