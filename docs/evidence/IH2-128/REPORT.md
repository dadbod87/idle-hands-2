# Browser startup and public-refresh regression guards

Status: candidate in progress; no source acceptance yet. Selected after owner explicitly kept Docker and normal previews stopped November18. This independent safety slice was split from127; public refresh/database measurements remain blocked.

Five destructive browser-only starters now require an explicit isolated URL and matching named55434container, or explicit CI5432hexcontainer identity, before Pool/reset. No fallback, remote target, query routing override or malformed credential disclosure. CI passes its existing service-container ID to browser jobs; no runner, cap, worker, assertion budget or test coverage changed.

Three new actual-TownClient controlled tests cover invalidation burst coalescing (one in-flight plus one follow-up), hidden/return refresh with retired-stream rejection, and former-identity dirty replies. Three new Node target tests cover allow/refusal matrix and actual child startup rejection for all five starters.

Local pinned Node24.22.2focused22/22passes,0skips. Independent domain/client selection358passes,0failures,4PostgreSQL cases explicitly unavailable/skipped (362collected); this is not the complete520-case suite. First controlled burst test incorrectly began with an already-open bridge and expected it to regress to building; the existing monotone guard correctly preserved open. Corrected the test fixture to collecting, with raw first failure retained. Build passes (existing bundle-size warning). An independent-suite launch mistakenly requested a nonexistent Node built-in json reporter and exited before tests; corrected to the standard spec reporter, retaining that launcher error separately. No client/server/economy/schema/dependency/art bytes changed.

Local PostgreSQL/full193browser execution unavailable: Docker and all four saved-preview listeners were already stopped when first checked; owner expressly asked to keep them stopped. No service restart, database command, grant, migration, reseed, key copy or new saved-cookie/screenshot claim. A read-only fingerprint attempt failed because the daemon is unavailable, so current saved-table equality is unverified. Read-only original0600key digests match prior acceptance; no key bytes copied/exposed. Previous runtime acceptance remains historical.

Required exact finalPR/main all-five/full520domain+193browser and raw artifact checks remain pending. No fresh performance/capacity result follows from controlled transport tests. Partial local checks must not be described as the complete suite.

Player benefit: safer testing of future updates and dependable confirmation when neighbors contribute. Friction removed: eliminate test-startup defaults that could reach a protected cluster and preserve a clear refresh contract. Remaining opportunity: actual shared-public measurement when local services may be started; music remains a separate original/cleared-audio candidate.
