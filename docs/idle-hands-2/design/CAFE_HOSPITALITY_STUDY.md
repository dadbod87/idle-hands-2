# Café hospitality — a small chapter with a clear purpose

November13,2026.099design study, not implemented gameplay. Accepted source remains090/mainf0a294a; locally reviewed091–098presentation is held separately. Routine reversible design defaults were delegated by Nick; the choices below are agent-selected study assumptions, subject to future playtesting and normal source/release gates. They do not require a new upfront owner balancing decision and do not silently change current rules.

## Selected small direction

An optional tasting window uses an existing harvested radish. Choose one illustrated presentation, review the exact spend, and explicitly serve. Help open a visible town place and earn one permanent Brave little teapot for your home. No edible inventory, new herb, health/stat bonus, currency, ordinary bench slot or material spend is introduced by the proposed chapter.099itself introduces none of these commands or rewards.

| Study default | Purpose and limit |
|---|---|
|1harvestedradish per tasting|Reachable through the existing seed loop. Never spend seeds/growing plants or a flower reserved for an easel. A known unmade Pip box also needs1radish; show that conflict before deliberate spending, with no hidden reservation |
|Immediate serving, no preparation queue|A separate2minjob adds waiting and an extra paid-result/last-credit race without a defined new activity. Ordinary request confirmation can still be pending; no authoritative result comes from an animation |
|4real-hour personal cooldown after a successful serve|Bounds repeated turn-ins; no automatic queue, attendance window, decay or login bonus. A daily player can still progress without setting alarms |
|12capped town tastings, then one fixed4hopening|A visible shared change. One person can finish; a particular absent player is never required. More people help sooner, with no last-click prize |
|3personal tastings for1permanent teapot|A distinct personal goal survives town completion. Latecomers earn the same keepsake. Destination: Bag/Furniture; placing it is a separate owner choice |
|Three free presentation choices|Same ingredient/reward, different illustration. This is small creative expression, not a stat recipe or an implementation of catalog herb soup |

Once both personal and town goals are complete, the default chapter stops asking for ingredients. If someone else finishes the town while an already-rewarded player reviews, an authoritative submit must refuse without spending. If a player still needs their personal keepsake, town completion does not prevent that progress. A previously paid2minqueue would need extra refund/storage/recognition policy; that complication is another reason to reject it here.

This is a finite optional chapter, not enough thirty-to-sixty-minute active content or a complete cooking system. The kept object and public place provide a purpose; an extra countdown on its own would not. More authored quests, tools, outings and creative systems remain separate design work.

## Comparison and experiment

[Reproduce576analytical variants and24scenery-only controls](../../evidence/IH2-099/pacing.json) with `node --experimental-strip-types tools/simulate-cafe-study.ts`. Source constants are guarded against silent changes. Every case preserves seeds/plants, harvested/held/used produce, pine and single pending counterexample jobs. It is a model, not actual elapsed play, transport/SQL/idempotency proof, measured fun or a retention forecast.

The experiment varies1/2radishes,0/2preparation minutes,0/4/8hcooldowns, daily/twice-daily/active/missed-week visits,1/4/12residents, Pip-first/café-first and budgets of1/4abstract commands per minute. Neither action budget is empirically calibrated; travel/reading/network costs may be more or less demanding. Initial20minvisit follows free introductions/tool learning and starts with ordinary unplanted seeds, zero carried produce/pine; it is not a complete fresh-account onboarding simulation. Active windows are5min every30min for12h/day, not twenty-four-hour attendance. Days8–14are omitted in the absence case. Ordinary bench/housing, hamper and mixed-request strategies are excluded; no housing acceleration is claimed.

Two-radish and queued variants can push a brief visitor’s useful decision to another visit. Café-first can postpone Pip’s letterbox, especially under the restrictive action budget; it is not permission to take the last radish unnoticed. The selected action leaves flower demand untouched, and all cohorts deliberately prioritize the existing easel goal. A scenery-only control preserves atmosphere but adds no resource/creative/restoration choice. Herbs/edible soup cannot be priced responsibly from null catalog inputs and an undefined food use, so they remain future rather than a free third crop.

These selected rows use1radish/noqueue/4h, Pip-first and the four-command sensitivity budget. Personal times are for the first resident; public opening is the first observation by any modeled resident. Times start at this chapter’s modeled planting, not actual signup. Ready-at and observed-open are separate: missing a deadline does not lose progress.

| Visit pattern | Residents | First serve | Personal teapot | Public opening ready | First observed open |
|---|---:|---:|---:|---:|---:|
| daily | 1 | 1d 0h 1m | 3d 0h 1m | 12d 4h 1m | 13d 0h 0m |
| daily | 4 | 1d 0h 1m | 3d 0h 1m | 3d 4h 4m | 4d 0h 0m |
| daily | 12 | 1d 0h 1m | 3d 0h 1m | 1d 4h 12m | 2d 0h 0m |
| twice | 1 | 10h 1m | 1d 10h 0m | 6d 4h 1m | 6d 10h 0m |
| twice | 4 | 10h 1m | 1d 10h 0m | 1d 14h 3m | 2d 0h 0m |
| twice | 12 | 10h 1m | 1d 10h 0m | 14h 12m | 1d 0h 0m |
| active | 1 | 0h 30m | 8h 30m | 3d 12h 0m | 4d 0h 0m |
| active | 4 | 0h 30m | 8h 30m | 12h 33m | 1d 0h 0m |
| active | 12 | 0h 30m | 8h 30m | 4h 41m | 4h 41m |
| missed-week | 1 | 1d 0h 1m | 3d 0h 1m | 19d 4h 1m | 20d 0h 0m |
| missed-week | 4 | 1d 0h 1m | 3d 0h 1m | 3d 4h 4m | 4d 0h 0m |
| missed-week | 12 | 1d 0h 1m | 3d 0h 1m | 1d 4h 12m | 2d 0h 0m |

## Concise menu and original art

The first draft’s phone card was about987CSSpx tall. The revised card is about550px before the final reward caption; it keeps ingredient/held/required, explicit Review and separate town/personal progress together. Presentation choices and longer ingredients/timing/privacy notes open deliberately. The final caption makes “3tastings→permanentteapot” immediate. Confirmation names1radish→1tasting, its benefit and the Pip conflict; cancel is free. A synthetic pending reply can finish after closing without reopening or taking focus. The stale-review example prevents unnecessary spending when both goals finish. These are static study interactions, not a backend implementation.

Six new original deterministic SVGs cover3presentation illustrations, the teapot, an outside counter and a proposed24×20interior;2accepted café/radish illustrations are reused byte-for-byte. All stay outside public/runtime. The exterior counter’s scaled foot sits64pxleft of the accepted café door on the same ground line, corresponding to proposed window point28,22and existing door point30,22. Actual canStand confirms those two existing-square approaches; it does not prove a new service or interior. The counter is narrow enough to clear the door.

Only actor/stop points add0.5before tile×32. The proposed interior exit point11.5,18renders384,592; the visible outer door rectangle11,17.5,2,1.5has direct edges352,560–416,608. This is consistent illustration metadata, not a new authoritative room/collision/path/camera test. The central aisle and different table groups are an art composition. Actual phone framing,44CSSpxdoor targets and arrival/exit behavior remain future runtime acceptance.

A bounded opening stamp is a small cosmetic cue, respecting reduced motion/hidden state. It is not a full grand-opening ceremony, character serve/stir family, door-walk animation or server opening event. No new person rig is claimed. Full item placement scale, actor hands, depth/occlusion and room life require a separately tested family before integration.

## Future implementation gate

After the held consolidated-menu source gate, a separate task must specify and test versioned garden consumption/café state, old-save defaults and owned teapot/entitlement conservation. Keep durable IDs and all existing stock/jobs/property. Serve validates identity/proximity/UUID/revision/cooldown and both current goals, debits only harvested radish, caps public credit, sets the fixed deadline once and awards the third-serve entitlement once, atomically. Concurrent twelfth credit, third personal award, latecomer, lost reply, unchanged retry UUID, closed/new panel focus and full/recovered state need real store/HTTP/native tests. The model’s duplicate-call assertion is not that proof.

A public café room needs a deliberate cached-client/protocol gate, authorized presence scope, normal door approach/entry and exact outside door-front return. Keep the tasting window separate from the door so opening does not change a pending service route. Show a locked door truthfully until its deadline; no nonexistent shop, health, chat or trade destination. Reconcile from authoritative time on normal requests; no database write or new network action every second. Visible celebrations never settle rewards.

All204accepted090client files,198art files/API5/protected/Tourdata/privatekeys/checksums/54acceptedstudy responses remain unchanged. Physical devices, Safari, complete accessibility and human enjoyment are unverified. Hosting, real identities, spending and public launch keep their existing gates; no alternative CI runner or billing workaround is used.
