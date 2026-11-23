# November 23 · Load home interiors at the door

The browser cold-loaded four home floor drawings even in the public street. Houses now request only their selected interior and same-size legacy fallback at entry. A legacy home requests its single drawing. The scene still waits for the current room and plan before mounting it. Furniture, yard art, exit routes and public/private state are unchanged.

The updated street-directory acceptance test failed against the previous compiled client with four outdoor requests. In the candidate it passed in Chromium and WebKit on desktop, 320px touch and short landscape with 200% text. Each run entered the guest's expanded legacy home through the normal route and requested just that one interior. The four deferred images total 13,118 uncompressed source bytes. No startup or frame-rate improvement has been measured. Chromium also passed all four cottage states plus the Garden Studio and Workshop Lodge. WebKit verified the Garden Studio and Workshop Lodge, including an in-place plan switch.

Identity, shared movement and house entry were intercepted using fictional owner/visitor fixtures. The browser fetched and rendered the real artwork. The local client compiled. Keep this branch local-first and include it in the next related home batch if accepted. There is no PR or hosted run for this change.
