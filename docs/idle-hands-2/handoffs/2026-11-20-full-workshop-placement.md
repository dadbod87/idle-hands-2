# November 20 — frame-aligned playfield resize accepted

Visible resizing wakes the idle loop, applies pending canvas dimensions during the game step and preserves bounded redraws behind an open menu. Main `5ca6d6fbe00c894a3220866627295dce8d0cd02e` passed 592 domain tests and 251 browser cases. [Exact verification](../../evidence/IH2-187/EXACT_CI.json).

The next candidate is [`IH2-188` and its plan](../../evidence/IH2-188/PLAN.md), on `fix/full-workshop-placement`. Explain how to free an occupied nook from Bag and keep placement explicit. Continue with the ordinary exact-head gates and keep saved services stopped.
