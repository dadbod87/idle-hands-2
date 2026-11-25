# November 25 — Lower Pumpworks

Review branch `feat/lower-pumpworks-outing`, built from the prior [shared combat and trade review](2026-11-25-shared-combat-and-trades.md) at `4203555`. Read the [dungeon plan](../design/WORLD_AND_SYSTEMS_DESIGN.md#lower-pumpworks-dungeon) and [Actions policy](../ACTIONS_USAGE_POLICY.md) before resuming. This is local game work in the separate Idle Hands 2 repository.

## Try the outing

In connected practice, take a field weapon at the Upper Pumpworks survey locker. Near the entrance, use **Lower Pumpworks**. The lamplit landing branches toward the Valve gallery and Stores. The Stores route can reach the stairs without fighting the mite. Tap the floors to steer or use the usual movement keys. **Strike** or Space attacks. **Brace** or Shift blocks a lunge when timed close to impact. The first clear of the filter mite remains confirmed on a later visit. Its warning line and recovery teach the same read the Collector uses.

The **Stores chest** gives 2 Scrap once. Take the stairs to the lower sluice to find the optional **Kiln chest**, with 1 Timber and 1 Supplies. Its route stays outside the Collector’s territory. The freight lift opens from below and later works both ways. Follow the lamps and return stripe, or use Places to get to an exit.

The **Collector** alternates a lunge with a pressure ring. Move outside the ring, then use the longer opening to move in and counter. The mechanical shell changes silhouette after a landed counter. It accepts one counter per opening. The Collector’s chest unlocks after the confirmed win and awards 3 Scrap, 2 Supplies, and the **Collector’s Overdue Gauge** once. The gauge appears in Journal. Inside an owned home, choose **Keepsake display**, preview the gauge, then **Display for visitors**. Visitors in that home can see it on the wall. The collectible ownership flag remains private.

The dungeon has its own health record and keeps the equipped field weapon and armor on entry. Change equipment at the survey locker upstairs. Rest freely at the lamplit bench. Defeat returns you to that landing with full health and preserves earned stock, equipment, and previous claims. Each resident has a private encounter and chest claims. Leaving the enemy’s territory or disconnecting abandons the current fight, while confirmed damage, clears and chest claims persist. Rooms and reward tiers are available from the practice town. Browser-only practice still provides the original upper encounter.

## Authority and release boundaries

The server checks resident, room, confirmed feet, sight line, attack window, equipped weapon and input sequence. Private encounter views go only to the corresponding resident. The stock change and unique chest receipt use one database transaction. A full Bag keeps the entire claim available. The Collector clear persists before the reward is claimed. The freight-lift unlock and arrival checkpoint also share a transaction. The gauge uses the existing owner-controlled home display and existing visitor-scoped projection. Saved preview services and their database stay stopped.

## Local verification

The connected Chromium and WebKit passes each covered three dungeon cases and a separate owner/visitor case on the playable source at `a39d037`. Viewports included 2560 × 1440 desktop, 320 × 640 touch and 844 × 390 landscape. The tests checked the mite warning and recovery, Stores claim and reload, the Collector's lunge and pressure ring, claiming all three chests, the return lift and visitor visibility of the gauge. The connected tests used a disposable PostgreSQL database with fictional residents. Fixtures positioned residents at the hatch and set up an empty house for the display check. The gauge itself was earned through the Collector fight. Four separate Chromium home compatibility cases intercepted command responses to exercise retry behavior.

The broader native PostgreSQL run passed all 94 tests. The follow-up forced a receipt write to fail and confirmed that the stock award rolled back and the same command could succeed on retry. Native tests used synthetic residents and, where needed, a controlled combat clock. Terra 6.1 reviewed desktop and mobile captures. The visitor name label can partially overlap the frame in a narrow view. Physical-device play and human pacing feedback remain open. Lower encounters use the equipped field gear and existing skill benefits. Additional use-based training in the dungeon is out of scope for this slice.

The build, plan and design checks passed. The ordinary suite passed 488 tests with 39 database-dependent skips. The native runs above exercised the applicable database cases separately. Three existing Upper Pumpworks and shared-trade browser cases passed in Chromium after the upstairs control selector was scoped to its own panel. All three browser shards collected 299 cases in total (92, 90 and 117).

The full hosted gate is pending on the composed candidate. The recent [main run](https://github.com/dadbod87/idle-hands-2/actions/runs/45213779084) used about 51 aggregate runner minutes, including 44m 34s in browser test commands. Browser installation took 21–35 seconds per shard. Continue batching related work ahead of the required gate.

## Where to go next

Compose this batch after the earlier review series and run the full database and all three browser shards on the final PR commit. Keep the first-clear rewards fixed during a fresh-player playtest. Observe whether people notice the safer chest route, read the difference between the two warnings and choose a loadout they enjoy. The current small outing has two distinct opponents. A follow-up can add another room mechanic or optional crawler encounter before expanding repeat loot or party combat.
