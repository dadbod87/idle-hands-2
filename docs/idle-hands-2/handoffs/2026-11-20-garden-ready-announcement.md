# November 20 — the stable location and action HUD accepted

The location hint and sky elements survive nearby-action changes. The action button updates its disabled state only when eligibility changes. Main `d0aad8d331fdd42f63c890447d4ea2a173b655e9` passed 589 domain tests and 242 browser cases. [Exact verification](../../evidence/IH2-174/EXACT_CI.json).

The next candidate is [`IH2-175` and its plan](../../evidence/IH2-175/PLAN.md), on `fix/garden-ready-announcement`. Keep the growing controls steady and avoid repeating the same readiness announcement every second. Continue with the ordinary exact-head gates and keep saved services stopped.
