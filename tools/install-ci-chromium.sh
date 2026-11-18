#!/usr/bin/env bash
set -euo pipefail

# GitHub's regional Ubuntu mirror stalled during package downloads. Use the
# primary archive on ephemeral runners, keeping Ubuntu's APT signature checks.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo 'This installer is for GitHub-hosted Linux CI.' >&2
  exit 1
fi

sources=/etc/apt/sources.list.d/ubuntu.sources
if [[ -f "$sources" ]]; then
  sudo sed -Ei '/^URIs:/ s|https?://[a-z0-9.-]+\.ec2\.archive\.ubuntu\.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' "$sources"
fi

start=$SECONDS
./node_modules/.bin/playwright install --with-deps chromium
echo "Playwright and Ubuntu dependencies installed in $((SECONDS - start)) seconds."
