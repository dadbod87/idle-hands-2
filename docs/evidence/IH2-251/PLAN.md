# IH2-251 · How fast does a fresh town grow?

The six-week model reruns three visit schedules, solo or with two neighbors, with and without a missed week. Every personal gather, planter, marigold, bridge kit and easel uses the current pure game rules. The new Glasshouse uses the same review and completion rules as its candidate. The bridge's fixed maintenance fee and one-time credit are modeled explicitly. Travel, reading and mistakes take no time in the calculation. The player spends no housing kits. Home figures therefore mean having the required material budget, before walking, construction or placement.

| Typical return schedule | Solo first plant | Three neighbors, first resident's plant | Solo reaches starter-home budget | Solo reaches starter plus upgrade budget |
| --- | ---: | ---: | ---: | ---: |
| Once daily | 96 h | 48 h | 14 days | 38 days |
| Morning and evening | 60 h | 36 h | 7.5 days | 19.5 days |
| Frequent short visits, six daily | 48 h | 24 h | 7.2 days | 19.2 days |

The three-neighbor cases coordinate the one-time paid maintenance route and divide the three Glasshouse jobs. This makes town teamwork visibly faster, while six visits per day barely beat two on personal housing under this policy. A solo resident who misses days 2–8 returns to unclaimed work and can still earn a plant. The once-daily absentee falls short of the 36-kit combined home budget within this six-week window. Nobody loses a collected kit, a kept easel or an entitlement to missed time. The once-daily three-person absence exposes the cost of rigid volunteer assignments. The actual board allows anyone to take the missing job.

In all twelve comparisons, volunteering changes neither the first easel date nor home budget dates. Only one resident spends the two pine. Starting with six carried leaves the four required by the first easel. Frequent visitors have 11–14 modeled returns where a kit is still running and a crop, easel or first outing offers an alternative. Once-daily residents generally arrive to a ready kit. Preserve the easy return for them. Give people who finish the early town projects new paths, plant display and workshops before adding a longer arbitrary construction timer.

Use this as a tuning check, not a completion time or human enjoyment claim. A group needed less than 25 hours in the most coordinated model. The Glasshouse is one opening, while the personal home and first upgraded workroom are much longer arcs. A larger release still needs several different long-running goals. Compare the model with fresh-player sessions that include routefinding, picking a task, returning without reminders and choosing a home item to show a visitor.

Reproduce with `node --experimental-strip-types tools/simulate-glasshouse-pacing.ts`. The decimal hours and source fingerprints are in `visit-model.json`. This analysis forces no economy or timer changes.
