#!/usr/bin/env bash
set -euo pipefail

# GitHub's regional Ubuntu mirror stalled during package downloads. Use the
# primary archive on ephemeral runners, keeping Ubuntu's APT signature checks.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo 'This installer is for GitHub-hosted Linux CI.' >&2
  exit 1
fi

shopt -s nullglob
for source in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
  [[ -f "$source" ]] || continue
  if grep -Eq '^[[:space:]]*(deb(-src)?[[:space:]]|URIs:).*\.ec2\.archive\.ubuntu\.com/ubuntu' "$source"; then
    echo "Using the primary Ubuntu archive in $source."
    sudo sed -Ei '/^[[:space:]]*(deb(-src)?[[:space:]]|URIs:)/ s|https?://[a-z0-9.-]+\.ec2\.archive\.ubuntu\.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' "$source"
  fi
done

start=$SECONDS
./node_modules/.bin/playwright install --with-deps chromium
echo "Playwright and Ubuntu dependencies installed in $((SECONDS - start)) seconds."
