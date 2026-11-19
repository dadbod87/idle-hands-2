# November 18 continuation closeout

PR #63 is merged on **5af4bba4ad36601948573e91395a1ce653215d75**. The final PR run 44422579863 and main run 44424566689 each passed 549 domain tests and 198 browser cases. The two EC2-backed runners used the primary Ubuntu archive after the installer changed the runner mirror-list priority. Setup took 25–42 seconds on the final PR and 23–41 seconds on main. Earlier workflow attempts and the original short measurement are retained in the evidence folder. [CI proof](../../evidence/IH2-127/RESUMED_CI.json)

The corrected fixed observation run **44426254500** used that exact main commit and passed both declared windows and the data conservation, idempotency, timing and shutdown checks. Each run used 20 fictional identities and submitted no SQL during quiet. The workload exercised a short burst then quiet. The timings describe loopback CI and do not measure production traffic or physical phones. [Observation proof](../../evidence/IH2-127/corrected-study-verification.json) · [raw captures and screenshots](../../evidence/IH2-127/corrected-study)

| Trial | Observed ms | Quiet ms | Unique command p95 ms |
| --- | ---: | ---: | ---: |
| 1 | 180000.011 | 31877.288 | 62.0 |
| 2 | 180000.390 | 31878.602 | 74.2 |

PR #64 is merged on **ed683ee9f778323af5f40b2afcaad4b985332702**. The final PR run 44426542471 and main run 44428383970 each passed 549 domain tests and 201 browser cases. The archived allotment study initially failed its reviewed-source checksum because the game entry file now mounts Sound. Its historical inputs stayed pinned, and its reproduction tests passed with the newly reviewed current checksum. [Music CI proof](../../evidence/IH2-130/MUSIC_CI.json)

Players can start optional original place music from Sound, adjust volume, pause from other panels, and continue through confirmed room changes. The game starts silent each visit. The first music pass repeats after an eight-second rest at a default 45 percent volume. Musical taste, physical phones and Safari still need playtesting. Door and reward accents remain outside this music pass. [Music design and verification](../../evidence/IH2-130/PLACE_MUSIC.md) · [synthetic CI screenshots](../../evidence/IH2-130/screenshots)

Saved local previews and databases remain stopped. Both PRs changed source in the sequel repository. The accepted game build is available for a later authorized preview startup.
