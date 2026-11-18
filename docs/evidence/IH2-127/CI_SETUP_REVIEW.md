# Browser-check setup variability — measured follow-up

PR63first attempt44401163885: group3completed browser dependency install in23seconds; groups1/2spent608/570secondsbefore running tests. The same32.1MBUbuntu package download took1secondat28.7MB/sin group3,9min19sat57.4kB/sin group1, and8min12sat65.2kB/sin group2. The Chromium CDN downloads themselves completed in a few seconds in all three. See preserved setup-download-excerpts.json and exact raw logs.

Groups1/2then reached the unchanged20minute cap after66/73and65/66completed cases, with no observed assertion failure. Full acceptance failed; partial counts are not green reports. Group3raw report confirms all59/59, no skips/flakes/errors. Domain549/549also passed. Initial attempt cost58approximate summed standard-public job-minutes, not an invoice or cycle balance. One diagnosed failed-job rerun retains the unchanged source and passing same-head jobs; preserve its separate outcome and owner-boundary cancellation if needed.

This is runner setup variability, not a measurement of gameplay speed. It does not justify increasing the20minute cap, weakening assertions/coverage, adding a paid runner or attributing delays to the application database. A cache of the Chromium browser alone would not target the measured Ubuntu package-download bottleneck.

A subsequent bounded CI reliability task should compare safe dependency-provisioning options with pinned Node/browser/OS, signed package provenance, complete ephemeral PostgreSQL/restart proof, separate shard reports and all existing gates. Any prebuilt image must retain explicit loopback/service-container safety checks and matching runtime; any package cache needs version/platform/integrity keys and no credentials or mutable test database. These are evaluation requirements, not an implemented cache/image/mirror or spending approval. Prefer one measured repair over repeated installation retries; no third blind rerun.

## Repair submitted for validation

The regression shards and optional observation job now install the same pinned Chromium and full Playwright dependency set via a shared installer. On the ephemeral Ubuntu runner, it substitutes the primary HTTPS Ubuntu archive for the regional EC2 archive while retaining the existing suites and Ubuntu package verification. The installer logs elapsed time. Shard, test, database, artifact, and job limits stay the same. CI will show whether this eliminates the observed setup delays.

[Ubuntu archive verification](https://documentation.ubuntu.com/security/software-integrity/archive-verification/)

The first installer run (44417081003) passed all checks, but raw logs showed that two runners still used the regional mirror. Their installation times were 250 and 501 seconds. GitHub's runner image can reference a separate `mirror+file:` list, so the final installer demotes the regional entry there as well as handling direct sources in both APT formats. It keeps the regional, primary and security entries available for APT's signed package retrieval. [GitHub runner configuration](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/configure-apt-sources.sh)
