# Show a stable café parcel pickup deadline

The shelf shows the server's pickup deadline in each resident's local time, with a machine-readable timestamp. Both the recipient and the sender can see it. The pouch labels separate available and held snacks from total capacity. This replaces the rounded remaining-hours label, which could become stale while the shelf stayed open. The existing one-shot expiry still removes the pickup card. It keeps a chosen outgoing recipient and keyboard focus if an unrelated incoming parcel expires while the resident is choosing.

The deadline is presentation only. The server keeps its 24-hour rule, authority and rollback, with no extra reads, commands or recurring browser timer. The browser still asks the server to confirm every transfer and reclaim.

Two native Chromium browser cases passed with intercepted fictional town and shelf data. The new narrow touch case selects Jun with an incoming one-minute fixture, advances only the browser clock, and checks the deadline, expired-card removal, exact selected resident and focus, one shelf read and zero commands. The existing case still covers three viewports, the retry and the sender's pickup timestamp. Actual server expiry remains covered by the underlying shelf pull request's disposable transaction tests. The correction is included in the next exact shelf pull-request run.
