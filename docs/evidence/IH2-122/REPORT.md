# IH2-122 — accepted truthful menu confirmation

The Bag could keep saying “Waiting for server confirmation” after the read had succeeded and controls unlocked. Completed reads now restore their confirmed message. Successful actions and refusals retain their specific receipts; genuinely pending, unresolved and failed requests remain distinct. Identical status text is not rewritten each second.

Only `src/ui/workshop.ts` changes at runtime. No new backend request, polling, timer, observer, economy rule, protocol, schema, server calculation or art change. The test scheduling repair below is separate from runtime performance.

## Accepted source and checks

Final scheduling candidate **956ec4883457144eff92aea99372fca5b06ec086**, [PR55](https://github.com/dadbod87/idle-hands-2/pull/55), merged as **9afd70be62811b48be7f2efeeafaaa188acb4898** with an identical source tree. Both exact-head runs passed all **five** required jobs and their inspected raw reports:

| Run | Domain | Browser | Groups | Failures/skips/flakes/report errors |
|---|---:|---:|---|---|
| PR44259045365 | 503 | 193 | 73 + 66 + 54 | 0 |
| Main44261396741 | 503 | 193 | 73 + 66 + 54 | 0 |

All 188 previous browser identities remain, plus five new intercepted client-only fictional cases. These cover delayed completion, failed-read retry, unresolved saves and identical-request retry, authoritative refusal, and retained successful receipts. No duplicated spend or reward was observed in those controlled fixtures. The ordered shared-town journey remains together in group2.

The artifact-ID and ZIP-hash proofs verify housing/outing restore, actual disposable-database restart, signed-session recovery, all nine migration checksums, coherent 26-home snapshots, durability, conservation, idle silence, cleanup and unchanged 500 ms load budgets. All 232 compiled client files match the frozen local candidate; all 226 prior art files, CSS and license files remain unchanged.

| Measured workload | PR p95 | Main p95 |
|---|---:|---:|
| Original 20-client commands | 196.204 ms | 65.689 ms |
| Instrumented 20-client commands | 70.496 ms | 57.525 ms |
| Rich 26-home snapshot | 71.199 ms | 52.325 ms |

These finite loopback CI measurements do not establish WAN, hosted capacity or physical-phone performance. See [PR proof](pr-ci-verification.json), [main proof](main-ci-verification.json) and [full closeout](source-closeout.json).

## Saved preview and visual acceptance

Only the two known static preview processes were updated, using immutable main source and its exact compiled artifact. The original accepted121 API processes remain running with API9 and byte-equivalent backend source. Every field in all 17 saved tables, nine migration records, original0600 keys and protected PostgreSQL start time remains unchanged. No migration, reset, reseed, grant, key copy or protected/API restart occurred.

Three existing fictional Aster/Avery sign-ins made immediately before the client update retained their same in-memory signed sessions across update and reload, with no new login and unchanged API instances. This does not claim another historical browser cookie was tested. Native pointer/tap/keyboard checks covered desktop2K/4K, phones320/360 and short landscape with200% text. Sixteen layout checks include complete short-screen status reveal by native wheel, no horizontal dialog overflow, focus containment and painted world pixels. There were no page errors, economic commands or movement requests. Every 464 current game response and 125 historical-study response matched its preserved bytes.

Terra6.1 inspected all 26 actual saved-preview captures: 16 settled views, including two scrolled footer views, plus ten immediate tap captures. No visual blocker of this narrow status repair was apparent. Several immediate touch captures contain gray rectangles absent600ms later; their cause and interaction impact remain unknown. The obsolete Registry sign fragment and Journal below-fold discoverability remain inherited polish opportunities. At enlarged short size, Bag explanatory text continues below the captured edge even though the complete status is reachable. See [actual still review](TERRA_ACTUAL_SAVED.md), [native checks](actual-saved.json), [visual disposition and image hashes](actual-visual-disposition.json) and [preservation proof](saved-preservation.json).

Representative repository copies: [desktop world](actual-practice-desktop2k-world.png), [phone Bag](actual-practice-touch-phone360-bag.png), [short enlarged status](actual-practice-touch-short200-bag-footer.png). These actual saved views use no interception, economic-clock fixture or grants. All checks use Chrome viewport/touch emulation, not physical devices, Safari, WAN or human enjoyment acceptance.

## Retained failures and validation recovery

- Full local domain: **502/503**, zero skipped. Ordinary command p95 **259.713 ms** passed; instrumented p95 **632.147 ms** failed the unchanged500 ms limit. Both conserved140 unique/20 replayed commands and inventory/receipts, with zero idle SQL and complete cleanup. This failure was not rerun or relabelled, and no sole cause is inferred.
- Full local Chrome: **189/193**, zero skipped/flaky/report errors. Two existing flows hit their unchanged90-second local caps; unfinished ownership setup then failed dependent trail and first-visit fixtures. Two runner step-ID diagnostics remain retained. All previous188 cases executed and all five new cases passed. A separate clean ordered-family run under the existing bundled-Chromium CI profile passed **5/5**, retaining the existing420-second cooperation/240-second ownership and15-second assertion limits. It does not reclassify the failed local profile.
- Focused new client cases passed **5/5** after three retained fixture/test-assumption corrections. The preceding0/3,0/3 and1/3 iterations remain in [method](METHOD.md) and compact evidence. No runtime or timeout relaxation was used to hide those results.
- Original UI PR54 passed all four raw503/193 gates. Its identical main6cc2f96 twice cancelled at the fixed20-minute group1 cap. The second attempt logged all94 cases passing but cancelled during report upload, so it was **not accepted**. No third blind retry was requested.

[The necessary scheduling repair](CI_RECOVERY.md) assigns the exact same193 cases to three measured groups. Every runner/browser/Node/PostgreSQL pin, worker count, test/assertion/job limit, coverage and authority check remains intact. Both final PR/main now pass all five jobs. The slowest PR job retained235 seconds below the cap despite301 seconds of installation; the slowest main job retained324 seconds. These are two measured runs, not a reliability guarantee. See [PR headroom](recovery-pr-headroom.json) and [main headroom](recovery-main-headroom.json).

Approximate rounded standard-public runner minutes: final PR48/main47, original UI PR87/cancelled main66, **248 total** across distinct executions. Reused logical job clones are excluded. This is not an invoice or billing-cycle balance; paid configuration, larger runners, hosting and spending were not enabled.

## Player benefit and remaining work

A completed read looks completed, real failures stay recognizable, and specific action receipts remain useful. This reduces the false appearance of a frozen Bag without changing progression. [Bounded session-churn profiling](NEXT_PROFILING.md), Journal discovery and obsolete Registry art remain separate unimplemented follow-ups. No original Idle Hands1, real-player, cloud or hosted release occurred. The documentation backup is not another runtime merge or CI claim.
