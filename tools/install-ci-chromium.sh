#!/usr/bin/env bash
set -euo pipefail

# GitHub's regional Ubuntu mirror stalled during package downloads. Use the
# primary archive on ephemeral runners, keeping Ubuntu's APT signature checks.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo 'This installer is for GitHub-hosted Linux CI.' >&2
  exit 1
fi

# The runner image usually references this list through mirror+file:. Keep
# Ubuntu's existing fallback sources and only demote the slow regional mirror.
mirrors=/etc/apt/apt-mirrors.txt
if [[ -f "$mirrors" ]] &&
   grep -Eq '^https://archive\.ubuntu\.com/ubuntu/?[[:space:]]' "$mirrors" &&
   grep -Eq '^https?://[a-z0-9.-]+\.ec2\.archive\.ubuntu\.com/ubuntu/?[[:space:]]+priority:1$' "$mirrors"; then
  echo 'Preferring the primary Ubuntu archive in the runner mirror list.'
  sudo sed -Ei '/^https?:\/\/[a-z0-9.-]+\.ec2\.archive\.ubuntu\.com\/ubuntu\/?[[:space:]]+priority:1$/ s/priority:1$/priority:4/' "$mirrors"
fi

# Some runner images configure the regional mirror as a direct source instead.
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
