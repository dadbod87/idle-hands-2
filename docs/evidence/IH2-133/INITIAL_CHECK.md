# November 19 Places keyboard correction

First PR #67 run [44555840591](https://github.com/dadbod87/idle-hands-2/actions/runs/44555840591) validated the domain jobs and browser groups 1 and 2. Group 3 failed at the existing neighborhood keyboard case, which expected the first listed destination immediately after Close. The new search input was the first stop in keyboard order.

The revised test checks that Tab reaches search and a second Tab reaches the original destination. The browse group now uses the same focus reveal as search, retaining the existing complete bounds, no-overflow and touch-size checks. Corrected PR `93446cae6357cb34845e98de44eae29fe8678541` passed all five jobs in [44558235898](https://github.com/dadbod87/idle-hands-2/actions/runs/44558235898). Main `9bc2172c5bf561a4eb9ac1d91735b116290babac` passed in [44560977963](https://github.com/dadbod87/idle-hands-2/actions/runs/44560977963).

Terra found the corrected first destination and focus outline fully visible in the three exact CI screenshots, including 200% narrow and short viewports. The return test intercepts fictional API state and movement acknowledgments. Places and the woodland certificate use the local browser where noted. The full suite also uses disposable shared-town PostgreSQL. No physical-phone, saved-runtime or live hosting result is claimed.
