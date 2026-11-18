# Explicit browser fixture targets

All five destructive browser starters now fail closed when the database target or matching container is missing. Supply IH2_BROWSER_DATABASE_URL explicitly for the disposable ih2_browser database and IH2_PG_CONTAINER for its matching container. Local tests accept only loopback port55434 and idle-hands-2-cafe-candidate-pg. CI accepts only CI=true, loopback5432 and the current ephemeral service-container ID. The neighborhood starter may use its explicit dedicated database URL. Query options, fragments, remote targets and protected55432 are rejected before Pool/reset.

Do not use the protected practice database or start local services against the owner's current instruction. There is no safe implicit reset target. Public-refresh measurement remains blocked until a later authorized service window. CI uses only its own ephemeral PostgreSQL; original saved data/keys are absent. See128report for exact validation and local limitations.
