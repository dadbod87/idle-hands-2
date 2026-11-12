# Idle Hands 2 — illustrated company-town kit

IH2-020 working direction selected under delegated authority, 2026-11-09. Compare at `/?art-study=1`; owner can redirect later. This is a distinct town game, not a reskin of the original office. No current-game artwork, cast, photos or runtime copied.

## Selected visual language

Original vector illustrations: warm paper, slate ink, sage vegetation, terracotta roofs, teal work clothes, brass accents. Quiet organic ground; strong silhouettes and layered materials. Small-town civic absurdity; later optional PvE retains this identity. Georgia/Times New Roman for signs/headings, restrained Courier New for stationery/status; system fonts only. Avoid excessive chrome or permanent task panels over the world.

The CC0 Kenney Tiny Town 1.1/Tiny Dungeon 1.0 family was downloaded from its official public pages, included licenses inspected, exact archives/files fingerprinted, and composed into the same workshop/square/person comparison. It is a viable free prototype option, but was not chosen for the playable art: fixed 16px medieval building/equipment vocabulary needs more adaptation for our character/clothing/material/housing identity. Pixel assets remain comparison-only, never loaded by the game page. Do not treat this choice as rejection of reusable systems code; see SYSTEMS_REUSE_REVIEW.md.

## Scale, anchors and camera

| Item | Contract |
|---|---|
| World | Orthogonal top-down movement, 32 world pixels per simulation unit. Accepted continuous movement/collision/door geometry unchanged. |
| Character frame | 64×80 SVG viewBox, all poses same size; anchor (0.5,0.9) at the foot point, displayed at 0.9 scale. Render scale never changes collision. |
| Direction | Four illustrated directions; diagonals choose stable dominant axis, idle retains facing. |
| Walk | Six shared-scale poses per direction plus idle; advance by actual distance (12 world pixels per pose), not timer/earnings. Stops use idle. |
| Reduced motion | Keeps idle pose while locomotion/facing still work; no added ambient loops, bounce or camera shake. |
| Depth | Ground behind world; actor depth follows foot Y. Buildings/trees use authored foot Y; near occluding art softens to keep the player readable. |
| Camera | Existing follow/collision coordinates remain. Do not zoom or pan automatically on menu open. Narrow views may show part of a building; direct taps/approach paths stay usable. |
| Props | Tree100×112, bench100×60, crates72×72, building208×248; material/silhouette identity retained in future recoloring. |
| UI targets | At least 44 CSS px including the guide in short landscape. DOM text uses rem and is tested at 200%; decorative mobile eyebrows/subtitle/hint collapse before crowding the player. |

## Authored assets and material conventions

`tools/create-original-art.py` generates the original SVG source files under public/art/original. No raster generation/editing or paid service. `tools/record-art-provenance.py` records their exact hashes and stable IDs in licenses/asset-provenance.json and src/game/asset-manifest.json. Renderer constants/pose selection are in src/art/kit.ts. Keep original SVG source/shape geometry reproducible, not just compiled textures.

Roof/plaster/trim, wood, glass, fabric/skin/hair and brass are separate authored material colors. Future finish variants should change a material or overlay without erasing silhouette, tier motif, window/door positions, outline or identity. Do not globally replace every matching color. No customization/equipment economy is implemented in this stage.

## Phone interaction and disclosure

Small header, contextual footer, book button for optional field guide; essential text is DOM, playfield remains primary. Direct door taps approach/enter and exits land outside the door. A secondary Places list remains an aid rather than the intended only way to play. For IH2-030 extend explicit tap-intent to resources/props with safe approach and feedback, as recommended by the independent review.

The field guide contains a readable first-goal affordance and before/after bridge art. Quest/restoration rewards are explicitly not implemented yet. Do not depict simulation changes as real shared progress. The before/after sample is a picture, not an alternate live map or new district.

## Validation and missing coverage

13 domain/art/provenance tests; movement/door workflows at desktop/390/360/short; three visual/guide/study flows plus reduced motion; nine axe scans with zero automated WCAG2A/AA/2.1A/AA violations in checked DOM states, with incomplete checks preserved. This is not complete accessibility or canvas-text verification.200% testing is actual doubled DOM text (rem), not a claim of physical-device/native browser zoom testing.

Independent phone review verified direct entry/exit without Places and identified/fixed oversized 200% decoration, a wrong in-workshop action label, and the small short-view guide target. Final focused recheck found no remaining blocker in those states; see task report for method/evidence.

Missing before broad content: varied body/hair/skin/outfits and more NPC rigs; gathering/tool animations; readable resource-node states; home interior/upgrade pieces and decor families; stage-specific district restoration; effects/audio; real-device/Safari/Firefox/performance and broader accessibility review. Do not produce a bulk city library before the workshop loop proves useful.

## Nick’s visual variety direction — 2026-11-10
The current preview’s look is owner-accepted. Preserve that family while developing different tree silhouettes/species/sizes, varied people/builds/hair/clothing, distinct building footprints/heights/roof shapes and materials, and richer land/path textures. Buildings must be recognizable without reading their signs. Small leaf movement, steam and occasional resident gestures should make the place feel alive; keep motion restrained, support reduced motion and avoid per-animation network/database activity. IH2-045 is the next concrete visual sample/review gate after the durable shared-loop proof.

## IH2-045 implemented variation
`tools/create-town-variety.py` adds original oak/birch/fruit layers, four1792×80 resident pose sheets, timber workshop, tall plaster café and quiet ground detail. Feet, collision and door positions stay unchanged. Catalog metadata supplies dimensions/feet/occlusion; parse sheet frames on their existing texture keys. `/?variety-study=1` shows the explicit future-house sample. Default local townsfolk are passive fictional decoration; shared fixture identities have stable rigs. Canopy/steam/idle transforms are local, restrained, reset by reduced motion/hidden state and skipped offscreen. See IH2-045 evidence; physical-device and expanded district content remain later gates.

Software-renderer correction: canopy motion is bounded ±.45px lateral translation, not rotation. Rotated SVG canopy quads clipped under ANGLE/SwiftShader despite valid texture metadata; actual compositor pixel coverage now protects this area. Keep trunks stationary and reset offsets for reduced/hidden states. Underlying driver/engine cause remains unproven.

## IH2-051 town rhythm
Use one bounded source-over world wash, with HUD/menus outside it. Deep-blue nights keep doors/people/paths readable and warm original window shapes; interiors use one-quarter tint. Day/night phases blend continuously. Light drizzle is one sparse repeating world-only compositor layer, paused/reset for reduced motion, hidden state and interiors. No lightning, camera shake or weather penalties. NPC roles/nameplates distinguish authored residents from player presence. Future action-specific tools/poses are planned in DEEP_SYSTEMS_PLAN, not represented by new reward animations yet.

## Expanded-world art gate — IH2-054
[Asset production plan](idle-hands-2/design/ASSET_PRODUCTION_PLAN.md) audits existing procedural/icon gaps and required views/states for every candidate item/buildable. Original illustrated silhouettes/materials remain the runtime family; optional future PvE is readable and restrained, not a replacement with medieval pack art. Color/pattern overlays preserve tier motifs and identity. Distinct action receipts, door fades, bed opening and construction celebrations have reduced-motion equivalents and never act as reward authority.

[World map](idle-hands-2/design/WORLD_CONCEPT.svg) and [phone storyboards](idle-hands-2/design/PHONE_STORYBOARDS.svg) are labelled original vector concepts, not runtime screens. The [approved humorous teaser](marketing/idle-hands-2-development-teaser-v2.png) is generated marketing concept art; its detailed image is aspirational, not a finished sprite library. Provenance is beside it. Production batches follow052 homes,053 existing-catalog trail/timed bridge, then later expanded resources/combat/regions; do not bulk-produce assets before interaction/scale/material tests.

## IH2-052 homes and owned-item art
Nineteen original code-authored home SVGs, deterministic tools/create-home-art.py, home catalog/anchors and exact provenance. Starter/expanded interiors18×16/24×16 retain the same safe bed/door/six furnishing nooks; extra floor is on the right. Exterior feet104,240 align at the shared frontage, with existing lot collision and roof occlusion retained. Small interiors centre on desktop and pan/follow on phones. Six actual furniture world/icon pairs and three material icons replace generic display hints; full future action/equipment families remain tracked gaps. Owner/visitor/expansion and short/doubled-text evidence belongs to052; not physical-device certification.

## IH2-053 bounded trail family
Ten original SVGs from tools/create-trail-art.py add quiet576×832trail ground, three recognizable96×112landmarks, a pennant world/icon and collecting/building/ready/open bridge stages. Bridge foot48,112 aligns every stage to world832,408 and the actual approach threshold. Landmarks retain safe body hit areas/foot approaches. Existing oak/birch/fruit canopy family is reused.82original vectors have exact provenance. Ready art is presentation only; server confirms opening. A permanent pennant belongs to its earned owner and appears on that home wall. This small safe trail is not the complete candidate forest, harvest-node set or action-animation library.

Renderer follow-up: smooth rasterized SVG textures remain LINEAR, while only WebGL context multisampling is disabled (`antialiasGL:false`). All current illustrations are textured quads; local software probe improves mean frame interval25–28% with tiny primitive-edge image differences and intact authored silhouettes. This is not a switch to pixel art or removal of texture smoothing. Actual full/CI canopy and viewport image gates remain required.

## IH2-062 illustrated fieldwork

Four original reproducible SVGs from tools/create-fieldwork-art.py compose our existing tree layers into distinct framed study pages and an original Naturalist journal certificate. Keep all86originalvectors fingerprinted. Tree silhouettes match the actual oak/birch/fruit subjects; visible square labels and existing tree hit targets support direct approach. The keepsake is a journal illustration, not yet a wall furnishing. Future public trophies and wardrobe must retain recognizable earned silhouettes, not erase them under finishes.

## IH2-064 — garden concept boundary

Two original static sheets in docs/idle-hands-2/design show two crops at four stages and three phone states. Reproducible generator: tools/create-garden-study.py; exact hashes and zero purchased/imported media in garden-art-provenance.json. These sheets are documentation, outside the runtime manifest and client build. World/bag/menu/public display variants and four-facing sow/inspect/harvest actions remain IH2-065 work. Preserve common foot anchors, recognizable crop/material silhouettes and still reduced-motion results; never let action animation own settlement.

## IH2-065 — original runtime garden kit

31SVGs in public/art/garden pluscatalog, generated by tools/create-garden-art.py. Eight crop stages, emptybed, distinct seed/produce icons, four marker silhouettes, three stake comparisons, private garden ground/attendant, gate/registry/field and two shared welcome-bed phases. Four original resident identities reuse their64×80rig and32,72foot for4facings×3actions×2poses=96frames. Default variety generator output remains byte-identical; no imported/paid media or font files. Exact hashes are in asset-provenance and the117-vector manifest.

Confirmation action poses are bounded260ms, cancel on steering/expiry, never lock input/settlement/camera, and use one still pose under reduced motion. Real-time crop textures refresh on a bounded view cache and never write progress. Inspect actual world/phone/short/gallery PNGs and finalCI artifacts before accepting the kit; its static gallery is not a gameplay screenshot.

IH2-066 specifies a candidate pine/deadfall/saw/easel/hamper/noticeboard family in design/WOODLAND_FAMILY.md; no new runtime asset family is produced by that design task. Use the original material palette, recognizable grain/silhouette, four resident rigs and explicit icon/world/preview/equipped/action/stage anchors. CURRENT_RUNTIME_COVERAGE dates the actual117SVGs and remaining production gaps; candidate status never means complete art.


## IH2-067 pine family — integrated candidate

Adds25 original carpentry vectors and2 home-easel vectors;144 original SVGs total. Three pine silhouettes share one personal bank; available/exhausted forms, independent rack stages, Nella, saw/bundle/hamper/easel and collecting/installing/open noticeboard remain distinct. Four existing resident rigs retain feet/body identity through112 equipped idle/walk and144 prepare/contact/recovery frames.64x80 frames anchor at32,72; action sheets1152x160, equipment1792x80. One-shot760ms action cancels on movement/hidden/reduced motion; private equipment is not broadcast. Craft art retains outlines and flower identity. All256 rasterized frames and strict SVG bounds reviewed after a wrist-placement correction. No external/paid assets; exact hashes/provenance recorded. Physical-phone/Safari/GPU texture behavior remains untested. Existing left-aligned workshop/long garden/guide friction is tracked for068.

## IH2-071 commission candidate

Fourteen original069vectors are promoted without geometry changes through tools/promote-commission-art.py: three recognizable leaf/sun/moth palettes with closed/open box forms, addressed envelopes, recipient receipts, route card and a modal work surface.158originalSVGs total. Box dimensions80×112/foot40,106 match every motif; original cap/slot/plaque/flag/posts persist. The work surface remains a UI illustration, not a new world obstacle. Handover uses the actual receipt illustration; a bounded600msbox-flap reveal after confirmed payment uses a still result under reduced motion. No new actor-animation family or player inbox is claimed. Final actual CI/source acceptance is separate.

## IH2-074 ordinary material depots
Three original static56×48SVGs replace the square's procedural material rectangles: salvage bin/washer, bound sawn boards and stationery crate. Shared28,40foot and old world bounds/depth remain; raised nameplates stay within the original interaction areas and clear the short enlarged-text starting camera. Decorative contents are not exact stock counters. Reproducible generator/provenance and actual day/night phone/short observations are in074evidence; acceptance is separate from this art contract. No resource/collision/animation/economy change or physical-device claim.


## IH2-077 candidate collection study
[Ordinary collection art study](idle-hands-2/design/ORDINARY_GATHERING_STUDY.md) authors three hand props and Aster-only four-facing reach/contact/recovery, reusing original body/base arms with a clearer recovery tuck. It stays outside runtime/public, with exact foot/provenance and native scale/reduced-motion review. Other three rigs and actual modal/receipt/animation integration remain unfinished; this does not close runtime gathering-animation coverage.

## IH2-078 candidate four-character collection family

The separate [family study](idle-hands-2/design/ORDINARY_GATHERING_FAMILY.md) now covers all four original character identities with192frame cells. Keep their distinct apron/scarf/cap/head depth, exact32,72feet and mirrored hand slots. Existing077Aster SVG/HTML bytes remain unchanged; only its generator-source provenance hash is refreshed. This21-file study stays outside public/runtime, with native raster and Terra6.1bounded visual/interaction review. Small prop contrast remains a future refinement. No collection gameplay, loading-policy or human motion-quality claim. Runtime animation needs a separately observed visible confirmed-receipt contract.
