#!/usr/bin/env bash
# =============================================================================
#  Flowexa Android - local helper
# =============================================================================
#  The OFFICIAL Android build is GitHub Actions (.github/workflows/build-flowexa-apk.yml).
#  Reasons:
#    - it injects the production keystore and google-services.json from GitHub Secrets,
#    - it derives versionName/versionCode from the tag / run number,
#    - it validates ZIP, zipalign, apksigner, the expected production signer and assetlinks,
#    - it installs and launches the exact APK on an Android 35 emulator before publishing.
#
#  A local release build cannot reproduce that (and on ARM64/Termux the x86-64 AAPT2 shipped by
#  AGP does not run at all), so this script deliberately does NOT build a release APK.
#
#  Usage:
#    scripts/build-apk.sh            -> prints how to build/download the official APK
#    scripts/build-apk.sh --check    -> static checks only (no Gradle, no packaging)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SLUG="salemspry2026-droid/-"

if [[ "${1:-}" == "--check" ]]; then
  fail=0
  [[ -d "$ROOT_DIR/android-app" ]] || { echo "ERROR: android-app/ is missing" >&2; fail=1; }
  grep -q 'applicationId = "com.flowexa.app"' "$ROOT_DIR/android-app/app/build.gradle.kts" \
    || { echo "ERROR: applicationId must stay com.flowexa.app" >&2; fail=1; }
  if grep -q 'fallbackToDestructiveMigration' -r "$ROOT_DIR/android-app/app/src/main"; then
    echo "ERROR: destructive Room migration must not be used" >&2; fail=1
  fi
  if git -C "$ROOT_DIR" ls-files --error-unmatch android-app/app/google-services.json >/dev/null 2>&1; then
    echo "ERROR: google-services.json must not be tracked by Git" >&2; fail=1
  fi
  [[ $fail -eq 0 ]] && echo "Static checks passed."
  exit $fail
fi

cat <<MSG
Official Flowexa Android builds are produced by GitHub Actions, not locally.

  1) Push to main (changes under android-app/ trigger the workflow) or run it manually:
       https://github.com/${REPO_SLUG}/actions/workflows/build-flowexa-apk.yml
  2) When all jobs are green the APK is published as:
       https://github.com/${REPO_SLUG}/releases/latest/download/Flowexa.apk
     (the website route /api/download-apk redirects there).

Nothing was built. Use "$0 --check" for lightweight static checks.
MSG
