# Independent review closeout — IH2-040

Read-only agent review of store/schema/HTTP and bundled-client transport. No production data or repository writes by reviewer.

Fixed findings:
- Delayed Aster HTTP/SSE responses could replace a newer Bea login: generation/AbortController guards now reject old identity results, including mocks that ignore abort.
- Remote workshop pagehide cleared the clock interval: persisted page-cache return now retains/reloads the timer. Focused mock proved changing countdown after return.
- Furniture move UI used total ownership without subtracting items in the other location: adapter exposes outside allocation; moves identify the existing source slot. Two owned items split workshop/plot can move without duplication. Native shared-server browser case covers it.
- Coalesced GET could lose a later invalidation: one dirty follow-up fetch captures the latest bridge; five invalidations yield two total requests. Actual bundled-client browser case covers it.

No demonstrated transaction/ownership/replay/cost-loss defect remained in reviewed paths. The store uses player/plot/bridge locks, stable receipts, atomic rollback and corrupt-state rejection. HTTP validates signed fictional principal, legal/rate-limited movement and proximity. Room presence is ephemeral, not economy authority.

Limits retained: fictional selectable identity is not hosted authentication; no real-device, public deployment, full accessibility or load/cost certification. Primary architecture sources: Supabase connecting-to-postgres, Realtime presence and Vercel function limitations pages. Current source/CI evidence is authoritative.

Final follow-up: returning login initially used an older durable position checkpoint. It now returns the resident’s current confirmed in-memory position; the HTTP regression switches away/back after walking. Identity resync also refreshes the visible resident label. Actual database interruption is handled by the pool idle-error listener; restart evidence verifies the same running service reconnects without losing an upgraded plot, furnishing or queued job.
