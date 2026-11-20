# November 20 — the direct furniture action in Bag accepted

Opening Bag after collecting a planter keeps its item card visible. Available workshop furniture has a direct placement choice and still uses explicit confirmation. Main `85b117ab241f2b0ce14f4897466326fd51db4bfc` passed 592 domain tests and 251 browser cases. [Exact verification](../../evidence/IH2-184/EXACT_CI.json).

The next candidate is [`IH2-185` and its plan](../../evidence/IH2-185/PLAN.md), on `perf/stable-bag-counts`. Keep inventory labels accurate while avoiding repeated changes to stable slot metadata. Continue with the ordinary exact-head gates and keep saved services stopped.
