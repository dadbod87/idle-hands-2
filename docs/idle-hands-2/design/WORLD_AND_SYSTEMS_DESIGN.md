# Expanded world and systems design

IH2-054 design foundation · 2026-11-10 · **design only; not implemented**.

This document turns the owner's latest development directions into connected, testable slices. It does not add rooms, chat, combat, construction timers, real accounts or hosted services. The accepted local neighborhood remains the executable baseline. The teaser is disclosed concept art, not a screenshot or a complete asset library.

Read with [the original vision](../VISION.md), [pacing and housing](../PACING_AND_HOUSING.md), [living-town systems](../LIVING_TOWN_SYSTEMS.md), [candidate depth plan](../DEEP_SYSTEMS_PLAN.md), [first-session brief](../EXPERIENCE_BRIEF.md) and the authoritative [roadmap](../ROADMAP.json). New owner directions extend earlier scope; old pilot exclusions are not permanent bans, and this design is not permission to build the entire expansion in one task.

## Authority of the decisions

**Owner direction:** slower persistent progression; personal homes and decoration; quests, resources, crafting and teamwork; forests between distinct settlements; roaming monsters, small dungeons, equippable weapons and usable food; individual action/door/construction/opening art; overhead speech plus timestamped journal; help, buffs and friendly mischief; visible combat health; death followed by waking in a town bed and a recoverable corpse; appearance/name/backstory before first waking.

**Reversible design defaults:** region names below; flavor-only backstories; a safe rented boarding room; optional PvE before broader combat; Town-first chat, then party/DM; protected essential items; owner-only corpse recovery; consent-controlled cosmetic pranks; automatic opening after a construction deadline; no mandatory combat or lucky drop to earn a home. These make a coherent first design, not settled final balance.

**Unresolved before shipping the relevant feature:** construction durations/costs, combat tuning and assistance rewards, corpse recovery window, equipped-item drop rules, expiry consequences and downtime grace, social retention/moderation operations, multi-city property rights and any relocation fee. The 30-real-minute recovery window is a provisional experiment, not an owner-approved final penalty. Do not quietly settle these questions through code constants.

## The game people are joining

The player arrives in **Ledgerwick**, a company town whose practical needs have accumulated more committees than solutions. A rented bed and a usable workshop provide a safe foothold. Making a planter and helping repair a public route teach the verbs. A modest owned home, expressive furnishings, useful skills and a town that visibly changes provide the long-term reasons to return.

Work connects systems: salvage and wood become furniture or construction supplies; food can support hospitality or a woodland expedition; restoring a trail introduces an NPC service and another material choice; optional encounters yield additional stories and decoration. Required housing access has a safe crafting/quest path. Combat, spending every waking minute online, and lucky loot are never prerequisites to belonging in the town.

Permanent state includes identity, skills, property rights, owned creative work, quest awards and committed restoration. Weekly objectives have their own season records. No weekly rollover removes houses, clothes, inventory, growing jobs or recoverable corpses. Death is a separate bounded lifecycle, not an account reset.

## First twenty minutes: a person before a production queue

These are design targets, not measured completion times. The current first bridge kit takes twelve real hours; IH2-052 must provide a bounded first-lesson path before the following contribution target can be claimed. Never fake success with undisclosed grants to ordinary accounts.

The pacing experiment is comparing a one-time guided contribution costing one scrap, one timber and one supplies with a 60-second preparation time. That candidate is nontradeable, restricted to the teaching contribution, and must leave enough material to queue the ordinary twelve-hour kit. It is **not** the final recipe or a repeat shortcut. A fast full kit can consume the starter stock and leave the bench empty for hours; compare that bottleneck before selecting the teaching path. In an ordinary new group, the first visit may teach the locked trail and its project deadline rather than cross the bridge. A return visit/opening is a legitimate first route; do not promise immediate forest access.

**Reversible newcomer-maintenance candidate:** the construction target remains three credits. Before charging for the once-per-resident 1/1/1, 60-second lesson, quote its explicit route: an eligible construction contribution while the target is collecting, or a distinct upkeep/inspection contribution when the target is full, building or opened. The latter records useful personal participation with its own stable receipt/quest event; it does not create an inventory kit, transferable currency or a fourth construction slot, and never restarts or shortens the deadline. Bind eligibility and route to the quoted request; if the construction slot disappears before commitment, re-quote the upkeep route without spending rather than silently substitute. If neither route is eligible, consume nothing. Completion/contribution retries cannot pay twice or grant both events. Separate `start-lesson` (one material debit and fixed readyAt), `complete-lesson` (one durable non-inventory credit) and `redeem-credit` (one quoted construction/upkeep event). If construction fills while a paid lesson runs, preserve its paid credit and re-quote redemption only; never charge the materials again or lose the credit. Completion can issue a credit without requiring immediate redemption. The comparison can therefore show three construction plus nine upkeep contributions for twelve residents, including a day-fourteen newcomer, without pretending the current three-slot runtime already supports everyone. This remains a proposed solution: authoritative transactions, content-version migration and already-restored quest behavior still belong to IH2-052/053 implementation and tests.

| Time target | Player experience | State and failure boundary |
|---|---|---|
| 0–2 minutes | Preview body/look, choose name, choose a short backstory; confirm the same person from four directions | Draft is local until one `create-character` command succeeds; name validation and owned appearance defaults are server-side. Retry uses the same ID. No reward per appearance change. |
| 2–3 minutes | Wake in a rented Ledgerwick boarding-room bed; read an arrival note, stand up and step outside | Create-character establishes safe lodging spawn and onboarding version once. Skip/reduced motion reaches the identical confirmed position and journal entry. Reconnect never repeats starter grants. |
| 3–7 minutes | Meet the clerk, walk to one clearly marked material source, inspect exact inputs, make the one-time teaching planter | Direct tap approaches and offers the action. A destination list remains available. Job/cost receipt, not animation, owns the result. |
| 7–12 minutes | Place the planter, inspect the future-home notice, help the first public project through an explicit teaching task | Rental workshop decoration persists. A home preview is not free ownership. Teaching supplies must be earned once by a recorded quest/recipe path, not repeatable instant output. |
| 12–20 minutes | Speak to a second resident, queue a longer job, choose a personal next goal; inspect or enter the first trail only if genuinely open | Show real ready time, current project stage and a return summary. If the bridge is building, other quests/gathering/decorating remain useful; do not promise immediate forest access. |

Candidate backstories: **Transferred for Outstanding Ambiguity**, **Independent Maker**, **Returning Local**. They change flavor lines and optional journal context, not class restrictions, hidden multipliers or permanent economic advantages. Their IDs are stable content definitions, separate from display text. Name/look can be edited later through a clear service; backstory reconsideration is a future reversible presentation choice, not an unannounced paid respec.

Onboarding states: `draft → character-confirmed → first-wake-recorded → clerk-met → first-object-made → object-placed → contribution-taught → return-goal-set`. Record validated milestones and stable award IDs separately. Resume at the earliest incomplete useful step; a content revision cannot reissue a grant or erase a completed lesson. The opening note remains readable in the journal after the camera transition is skipped.

## World structure: one route before five cities

All names and IDs here are **candidates**. The runtime room `square` is not renamed in IH2-054. A future explicit room/content migration may map it to region `ledgerwick` with preserved positions, ownership and routes. Shared design phase keys are `starter-home`, `first-woodland`, `food-combat` and `regional-cities`; they organize candidate content, not implemented unlocks.

| Candidate ID / name | Distinct purpose | First meaningful connection | Boundary |
|---|---|---|---|
| `ledgerwick` · Ledgerwick | Safe starter company town; rented lodging, workshop, public project, home notice | Existing neighborhood, then bridge/trail | Commerce and combat cannot obstruct bed, home rights, essential tools or onboarding sources. |
| `inkwood` · Inkwood | Readable woodland paths, species-specific resources, orchard edge and an optional encounter clearing | Restored Ledgerwick bridge leads to one small trail | Safe marked path reaches noncombat resources; roaming enemies have readable threat/leash boundaries. |
| `pumpworks` · The Pumpworks | Optional small authored cooperative PvE space; flooded maintenance machinery and questionable inspection notes | Clearly warned entrance from Inkwood | One compact encounter/return loop before procedural generation, raids or many floors. |
| `mossbank` · Mossbank | Forestry settlement with a distinct wood/service/housing language | One later repaired route from Inkwood | Not a second full starter town in the first neighborhood milestone. |
| `bellwether-quay` · Bellwether Quay | Later coastal/trade city, regional goods and another property style | Later bounded road/ferry restoration | No player market, shipping simulation or enormous city library is implied. |

Author a small route graph: named exits have stable portal IDs, destination region/instance, access predicate and collision-safe arrival point. Tap a door once to approach and enter when close; do not add a second compulsory Enter press. Exit onto the correct side of that doorway, not the center of the square. Interiors preserve identity and private ownership; they do not become shared rooms because their art is similar.

Server transition contract: validate actor identity, current room/position/revision, portal proximity and access; accept one transition ID and return confirmed room, instance and feet. No client-supplied arbitrary destination is trusted. A repeated transition returns its receipt; competing transition intents choose one current revision. Cancel before submission stops the approach. If the response is lost, resolve that transition before a conflicting move. Client camera fades/door poses are optional presentation after confirmation; reduced motion uses a brief static state change.

Dungeon rooms require explicit instance IDs and entrance/exit/respawn anchors. Do not close an instance containing a recoverable corpse without a reachable recovery alternative. Route art must not advertise an explorable destination when the authoritative route still ends at an inspection panel.

## Homes remain a slow, safe source of identity

Rented lodging is not an earned house. Temporary bed access survives a player choosing to delay house acquisition; losing a fight never makes the player homeless. The workshop and later house can coexist as separate locations for the same durable inventory ownership.

Candidate progression: plot rights → starter dwelling → useful extra room/bed space → façade/interior options → garden/workroom choices. Address/plot ID, ownership, layout version, appearance and item placements are distinct records. House upgrades preserve furnishings and finishes; anything that cannot fit the new layout returns to owned storage through a deterministic migration, never deletion. Furniture must retain recognizable base/material/tier identity under paint or patterns.

The current proof permits one owned plot. A second city's property or relocation needs an explicit future design; do not implement it as silently selling the old home. First default: one primary residence plus safe rented travel lodging, with previews of later city styles. Additional addresses, fees and simultaneous homes remain open. Essential plot access is expandable/instanced so invite order cannot exhaust the chance to own a home.

## Materials, construction, readiness and opening

Owner direction adds real building/inspection time **after** materials, including the bridge. Existing proof contributions currently restore immediately; this is a future versioned rule, not current behavior. A migration must grandfather already restored projects rather than relock access or charge again.

Candidate project definition: `projectId`, `contentVersion`, `stageId`, material requirements, eligibility, next stage, bounded `durationMs`, resulting access/service flags and art references. Mutable instance: committed totals, revision, state, `startedAt`, `readyAt`, `openedAt` and contribution/transition receipts.

| State | What is true | Next authoritative change |
|---|---|---|
| `proposed` / `collecting` | Requirements and purpose are visible; players still own undonated stock | Each atomic contribution spends only the accepted quantity and advances the project once. Reject excess or explicitly quote a bounded partial donation. |
| `building` | Final required contribution has committed; start and deadline are fixed | That same transaction records `startedAt/readyAt` exactly once. Further refreshes or donations cannot restart/shorten the timer. |
| `ready` | Server time has reached the deadline; required result can be finalized | Lazy settlement or a bounded worker atomically records the opening/access change. A screen refresh is not a new award. |
| `opened` | Route/service/home stage is durable; opening is journaled | Optional one-time celebration/catch-up per player. No attendance, button race or weekly rollback. |

Default opening policy: automatic readiness settlement, with effective opening time `readyAt`, not a ceremony requiring someone online. `ready` is a derivable/transitional state, not a hidden second wait. If a later stage genuinely needs an inspection quest, show it as a separate named requirement before taking materials.

Store one clock, not per-second writes. Display materials, real ready time, remaining duration and what unlocks. On restart, compare server time with the same deadline and settle once. Multiple workers/clients cannot repeat charges, access flags, quest awards or opening events. Costs, inventory, personal credit, shared totals and the final deadline belong in one transaction; lock records in a consistent order.

An opening event carries an immutable ID and effective timestamp. Town viewers can receive a short scoped celebration; absent players see “opened while you were away,” can replay the cosmetic scene and retain its journal entry. Replaying cannot grant an item or rerun construction. Reduced motion retains the sign/state/journal without confetti or camera movement. Final durations come from the design experiments and later ordinary-player playtests; not every stool needs a permit timer.

## Exploration and deliberate PvE

First forest slice: one path with visible exits, two readable gathering choices, one named errand, one optional encounter clearing and a safe return. Species/resources link to existing crafting and NPC services; essential progression uses predictable sources/substitutes. Rare drops can provide decorative identity, regional recipes or optional variety, not the only key to a home, recovery or the next required settlement.

Introduce one weapon family, one food category and a very small enemy roster before designing many classes. Candidate weapons: reliable starter hand tool/club, then a distinct crafted blade or staff. These are equipment definitions, not a mandatory combat build. Compatibility with body/clothing/directional frames is an art gate. Weapons can be equipped and swung, but animation cannot decide hits, damage or loot.

Readable combat states: `safe → warned → engaged → recovering → safe`, with authoritative `incapacitated` as a separate result. Candidate default is deliberate PvE, not player damage. Roaming enemies stay out of town service/door footprints, advertise aggro range, leash to their authored area and allow a clear retreat. Avoid enemies appearing on a player's confirmed arrival point. No free hits during a loading transition or forced combat because a chat panel opened near an unseen threat; settle exact pause/escape behavior in the combat slice and test it before release.

Show current/max health as numbers, a bar and explicit hit/heal/incapacitated text. Health stays reachable on a narrow phone without covering the actor's next step, loot marker, chat composer or interact button. Meaningful attack/heal/retreat actions need touch buttons with visible cooldowns, target identity and range feedback. Do not require pixel-perfect dragging, rapid double-clicking or simultaneous movement and a tiny target tap.

Food connects cooking, hospitality and expedition preparation: show consumed quantity, health/buff effect, duration, cap and cooldown. No hunger decay or mandatory daily feeding tax in the first design. Do not consume food on a failed target/range/capacity check. Buff stacking and combat output need simulation; no final damage, heal or percent bonus is set here.

Damage/effect/loot contract: authenticated actor, encounter/target ID, action ID, expected combat revision, equipped tool, range/cooldown and server time. Resolve damage, health transition, consumption, XP, quest progress and any fixed-once loot result atomically as appropriate. A cosmetic swing does not authorize repeated attacks. Disconnect/reconnect and replay cannot reroll a defeated enemy; retries return the original receipt. Server-owned encounter RNG, if introduced, is committed once with its outcome and never controls required access. Shared encounters must have visible participation/assistance rules; personal reward entitlement and global defeat are distinct records.

## Death, waking and corpse recovery: provisional, protected and testable

Owner direction: death returns the player to town, waking in bed, with dropped items recoverable from a corpse for a limited time. Exact loss rules are **not settled**. Initial experiment only: 30 real minutes, gathered carried loot as the candidate droppable category, protected starter/essential quest gear and owner-only recovery. Whether equipped weapons/clothes ever drop, what happens on expiry and the exact recovery duration remain release decisions. Permanent property, furnishings, skills, account progress and identity are outside corpse loot.

Candidate lifecycle:

1. One authoritative health transition creates `deathId`, owner-bound `corpseId`, location/instance, inventory snapshot, policy/content version, `diedAt` and provisional `recoverUntil`. Transfer only the explicitly approved droppable category, atomically with zero health/incapacitated state and a collision-safe town-bed respawn. No second corpse from the same death receipt.
2. Return a confirmed bed/health state and durable journal entry. Show corpse region/marker, recoverable contents, deadline and route; remaining time is a display of server time. Respawn animation can be skipped. Do not claim inventory is gone before the server confirms the transfer.
3. An authorized recovery command validates owner, corpse revision, reachable location/range, deadline policy and capacity. Full or partial recovery must be explicitly selected/quoted. Atomically transfer accepted quantities and retain any remainder on that same corpse; retries cannot duplicate either side. A full bag never silently destroys the remainder.
4. Corpse states: `recoverable → partially-recovered → recovered`, or `deadline-reached-pending-policy`. The last label is a **design placeholder**, not an implemented holding state or a settled loss decision. Shipping code must choose and document the actual expiry behavior first.

Compare before finalization: direct loss on expiry versus protected town lost-and-found with a modest bounded recovery task, and different windows for ordinary short sessions. Neither option is promised. The candidate arithmetic model uses an inclusive deadline: a command at exactly `recoverUntil` is timely; one millisecond later takes its chosen expiry branch. The final release policy remains unsettled and must be displayed and tested consistently before shipping. A client countdown reaching zero is never permission to delete inventory.

Required policy work: server-downtime grace and trusted outage measurement; disconnect treatment while engaged; safety during entrance loading; dungeon closure/recovery route; repeated deaths and multiple outstanding corpses; abandoned-account retention. A new death must not overwrite or merge away a prior unexpired corpse. No looting by strangers or prank permission that silently grants corpse access. An eventual party retrieval helper needs explicit owner authorization without ownership transfer.

Acceptance before live combat: one death/one corpse/one respawn under replay; protected/droppable categories; owner authorization; capacity/full and partial recovery; exact deadline boundaries; repeated death; reconnect and actual service restart; unresolved request retries; outage-grace alternatives; dungeon closure; valid bed/door placement; safe mobile health/chat/recovery layout. Until those pass and loss policy is settled, a combat prototype uses disclosed synthetic inventory and may preview recovery without enabling irreversible loss.

## Conversation, journal and privacy

**Town** is a labelled settlement channel, not the entire world. Default first slice: messages are delivered to authorized members of the current town channel; overhead speech appears only for speakers presently visible in the same scene. Leaving a room need not delete already delivered journal history, but subscription entitlement must be rechecked on transition. Dungeon/remote settlements do not silently receive Ledgerwick chatter.

The timestamped journal is an accessible DOM panel with two clearly separated streams: **Activity** (construction, job, quest, death/recovery receipts) and **Chat** (human messages with audience labels). A disappearing bubble does not erase its chat entry; a journal entry is not evidence that an unconfirmed action succeeded. Use server ordering/timestamps, immutable message/event IDs, sender character identity and deduplication. Render plain text, not user HTML or executable links.

Later channels:

| Channel | Audience and delivery | Privacy boundary |
|---|---|---|
| Town | Settlement membership, with bounded history and visible channel label | Not globally public, but readable by current authorized town participants under the chosen history rule. Do not describe it as private. |
| Party | Current party membership and an explicit party conversation ID | Server checks membership on send, subscribe and history read; leaving revokes new delivery. Past-history entitlement must be specified. |
| Direct conversation | Explicit participants of `conversationId` | Never sent on a Town/room stream, public overhead bubble or unrelated activity feed. Recheck participants for every read/send/subscription; transport topic names are not authorization. |

DMs are an owner candidate, not a commitment to a particular provider, retention period or encryption claim. Authentication, access control, moderation access and retention need a concrete policy before real messages. Decide history limits and deletion semantics; don't promise “private forever” or end-to-end encryption. Fictional shared practice identities are not suitable real-player privacy boundaries.

Minimum social tools: mute, block, report, bounded history, server length/rate limits and clear identity. A message send carries a client message ID and channel/conversation ID; the server resolves sender from the session, validates entitlement, stores/acknowledges once and broadcasts only after commitment. Network retries cannot duplicate the journal; offline drafts are plainly unsent. Cap composer length before submit and preserve rejected drafts for editing.

Phone verbs: **Chat** opens the labelled journal/composer; choose channel before typing; **Send** acknowledges or shows a retryable pending line; **Close** restores world focus without sending. Composing captures WASD/arrows/Enter so typing never walks into danger or activates a door. Panels reserve feedback space, support 200% text and avoid bottom safe-area controls. Bubbles are short, bounded, camera-clamped and tap-through for essential world navigation; long text remains in the journal. Quiet/mute/reduced-motion modes retain readable content without animated entrances, sound or repeated flashes.

Chat/presence updates must not trigger a full economy snapshot per message or database writes per animation frame. Use separately scoped social events, with catch-up IDs/history on reconnect. Clear old subscriptions/drafts' recipient labels on identity changes; never display a delayed private response to a new resident.

## Help, gifts, temporary buffs and friendly mischief

The tone comes from practical kindness and small jokes, not stealing days of work. Resource gifts, project donations, meals, a useful temporary boost and consensual visual pranks can recreate the social spirit without importing Idle Hands 1's economy or reset rules.

**Gift default:** explicit sender offer and recipient acceptance, stable `giftId`, quoted item/quantity, expiry/version and participant identities. A server escrow holds the offered items or a transaction spends at acceptance; choose one model explicitly before implementation. Preferred candidate escrow avoids double spending, with bounded outstanding offers. Acceptance atomically moves items once; recipient-full leaves the offer intact. Cancel/expiry returns escrow to durable sender delivery storage if the bag is full, never silently deletes the gift. Preview recipient and contents; no public private-message leak. Test block/decline, simultaneous cancel/accept, duplicate acceptance, identity changes and full inventories.

**Buff default:** beneficial, visible, bounded magnitude/duration/stack count; show source, benefit and real remaining time. Recipient can reject/block unwanted effects; helpers cannot repeatedly overwrite a better buff with a worse one. Server validates ownership, cooldown, cap and consent; spending and effect creation commit together. Model active players/alts before pricing. No mandatory chain of coworker buffs to finish the home route.

**Prank default:** opt-in by recipient/category, easily discoverable opt-out, target cooldown and repeated-target protection. Candidate squeaky boots, temporary silly hat, harmless confetti or an amusing doorstep sign have a clear counter/removal route and expiry. Pranks cannot destroy property/items, conceal the health bar, seize movement, reveal a DM, loot a corpse, interrupt an unavoidable recovery deadline or apply meaningful production loss. Honor reduced motion and quiet preferences. Consent revocation blocks new pranks and offers an immediate way to remove current cosmetic ones. Author jokes without targeting private coworker facts or protected traits.

Each social action needs its own ID/revision, eligibility, audience and receipt. Do not infer permission from friendship, proximity, party membership or client UI visibility. Failed/replayed gifts/buffs/pranks cannot consume again, resend private information or replay a disruptive animation.

## Shared implementation contracts

Keep the existing pure serializable rules outside Phaser. Extend the authoritative server through small versioned commands; do not create a parallel client economy because an action has new art.

| Record / contract | Candidate stable identifiers | Required invariants |
|---|---|---|
| Identity/onboarding | `accountId`, `characterId`, `onboardingVersion`, `backstoryId`, stable milestone/award IDs | Session-derived actor; no client account substitution; creation/awards idempotent; appearance is separate from ownership. |
| Location | `regionId`, `roomId`, `instanceId`, `portalId`, movement/transition revision | Valid continuous feet, legal route/portal, safe arrivals, scoped subscriptions, identity generation guards. |
| Items/equipment | Definition/content ID, owned instance ID when individual, slot and inventory revision | Bounded integer quantities; only owned compatible equipment; furnishing allocations across locations cannot exceed ownership. |
| Jobs/projects | Job/project/stage ID, recipe/content version, `startedAt`, `readyAt`, settlement receipt | Server clock, bounded output/storage, one effective completion, no per-second persistence, old jobs survive migrations. |
| Combat/recovery | Encounter/action/death/corpse IDs, health/corpse revision, policy version/deadline | One committed outcome, fixed-once loot, protected state untouched, owner/capacity/deadline checks. |
| Social | Channel/conversation/message/gift/effect IDs, membership/consent revision, expiry | Audience enforcement on every path; one receipt per send/transfer; privacy is not a display filter. |

Commands use stable IDs and payload hashes, the relevant expected revision and server-authenticated identity. Retrying an ID with another payload is rejected. Record failures with an explicit distinction between definite rejection and outcome unknown; don't “retry” an uncertain purchase as a new ID. Related spending/output/credit commit atomically; cross-player locks use a consistent order. UI closes, animation callbacks, client clocks and event delivery never confer authority.

Bound transport work by useful changes. Background jobs settle elapsed server time; presence/action poses are ephemeral; reconnect fetches a bounded authoritative snapshot plus separately authorized journal catch-up. A changed server boot/identity generation invalidates stale position intent and private-response subscriptions. Two clients, restart and delayed responses must preserve the same earned state.

Failure rules apply to every slice: cancel an unsubmitted approach/preview without cost; retain pending IDs after lost responses; never celebrate an unconfirmed reward; restore focus after a panel; display real duration and source; reject insufficient/capacity/stale state without partial spending. A visible failure/retry message must not be immediately replaced by ambient chatter or success text.

## Staged backlog after this design foundation

This is a dependency proposal for later roadmap updates, not new active work. Each slice needs its own acceptance/evidence before the next expansion.

1. **IH2-052:** earned starter-home path, physical home presentation, return summary and fair one-time first-kit teaching. Preserve rental safety and current durable receipts; tune the ordinary-player route with the pacing model.
2. **IH2-053:** one timed bridge stage—materials → fixed real `readyAt` → settlement/opening journal—leading to an actually traversable Inkwood trail, NPC reaction/errand, useful newcomer follow-on and optional cosmetic discovery. Use the existing three resources and two recipes; no wood species, new tool or extra recipe economy enters this slice. Grandfather the proof's already restored bridges; never relock earned access. The first twenty-minute session can inspect/learn a locked route and return for its opening. No required rare drop or implied immediate access.
3. **First neighborhood acceptance (IH2-050):** prove the connected home/workshop/project/trail story on narrow phones, short landscape and keyboard, including action-art gaps, full bags, absence and reconnect. Larger systems do not excuse unfinished basics.
4. **Later first-woodland resource selection, after IH2-050:** select a bounded wood distinction, one tool and at most two new recipes from the candidate catalog. Prove fair personal gathering entitlement, meaningful alternatives, complete action art and ordinary-player pacing before this additional economy. The catalog phase key `first-woodland` spans the basic IH2-053 trail and this later unassigned selection; it is not permission to implement both in IH2-053. Likewise, later construction-family expansion may reuse the proven bridge lifecycle for a selected second project or house stage. Preserve completed projects; no blanket timer on every prop or recipe.
5. **Character/lodging slice:** persistent appearance/name/flavor backstory, one rented room/bed, safe wake/door animations and replay-safe onboarding. It may precede combat; preserve existing characters through a versioned opt-in edit flow.
6. **Town social slice:** authenticated Town chat, camera-safe bubbles and bounded timestamp journal; mute/block/report and input ownership. Party/DM follow only after audience/retention tests.
7. **Food/tool/action slice:** one equipped weapon/tool and one usable food, complete directional art and accessible actions, server consumption/effect receipts. Add safe noncombat uses first.
8. **Optional woodland PvE slice:** one readable roaming enemy/clearing, health/heal/retreat, fixed-once outcome and no property gate. Synthetic non-destructive death preview until recovery policy is reviewed.
9. **Recovery slice:** settle the open loss/grace rules, implement one death/bed/corpse loop and all replay/ownership/expiry/instance tests. Only then enable real loss in an invited test.
10. **Pumpworks party slice:** one small dungeon with usable entry/exit, cooperative entitlement, corpse accessibility and party privacy; no procedural city-sized content promise.
11. **Mossbank connection:** a distinct service/material/housing style after the existing region remains meaningful. Bellwether Quay follows only if travel, collaboration, property migration and operating costs support it.

Gifting/buffs/pranks are separate bounded social slices, not automatic extras to chat or combat. Keep provider choices, native packaging and cloud costs behind existing readiness gates. The browser/phone-first client, possible PWA and later wrapper are delivery options, not solutions to server load or a promise of a native rewrite.

## Review gates and open decisions

Design review should check the candidate catalog/art matrix, phone storyboards and cohort/construction/recovery experiments together. Record where a model is only a proxy. No final house price, combat balance, build deadline or corpse loss is accepted merely because a simulation executes.

Before each runtime PR: confirm the exact slice, old-state migration, authority/receipt tests, offline and concurrency cases, complete representative art and readable phone controls. Inspect actual final CI artifacts, including software-rendered world images, before merging. Emulation is not a physical-phone check; source/CI is not production.

Open decisions to carry forward: first shared timer lengths; earliest genuine forest access; corpse expiry/equipped drops/window/grace; combat disconnect/safe-transition policy; party/DM history and moderation; gifts' escrow/delivery limits; buff/prank consent categories; relocation/multiple-home rules. Preserve these as explicit questions for their slices. Meanwhile, build the next small playable proof rather than waiting for a complete MMO specification.
