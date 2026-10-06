#!/usr/bin/env bash
# Validates the release APK produced by Gradle. Fails hard (no "|| true") on every check.
#
# Required env:
#   EXPECTED_VERSION_NAME, EXPECTED_VERSION_CODE
#   ANDROID_HOME (build-tools installed)
# Optional env:
#   EXPECTED_PACKAGE (default com.flowexa.app)
#   GITHUB_OUTPUT   (when set, apk_sha256 / signer_sha256 are written there)
set -euo pipefail

PKG="${EXPECTED_PACKAGE:-com.flowexa.app}"
APK_DIR="android-app/app/build/outputs/apk/release"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
FP="python3 $HERE/lib-fingerprint.py"

: "${EXPECTED_VERSION_NAME:?}" "${EXPECTED_VERSION_CODE:?}" "${ANDROID_HOME:?}"

latest_tool() { find "${ANDROID_HOME}/build-tools" -type f -name "$1" | sort -V | tail -n 1; }

echo "==> 0. Exactly one release APK"
APK_COUNT=$(find "$APK_DIR" -type f -name '*.apk' | wc -l)
if (( APK_COUNT != 1 )); then
  echo "::error::Expected exactly 1 release APK in $APK_DIR but found $APK_COUNT"
  find "$APK_DIR" -type f -name '*.apk' || true
  exit 1
fi
APK_FILE=$(find "$APK_DIR" -type f -name '*.apk')
FILE_SIZE=$(stat -c%s "$APK_FILE")
echo "APK: $APK_FILE ($FILE_SIZE bytes)"
if (( FILE_SIZE < 1000000 )); then
  echo "::error::APK is abnormally small ($FILE_SIZE bytes)"
  exit 1
fi

echo "==> 1. ZIP integrity"
zip -T "$APK_FILE"
unzip -tq "$APK_FILE" >/dev/null

echo "==> 2. zipalign (strict)"
ZIPALIGN=$(latest_tool zipalign)
[[ -n "$ZIPALIGN" ]] || { echo "::error::zipalign not found"; exit 1; }
"$ZIPALIGN" -c -P 4 4 "$APK_FILE"

echo "==> 3. Package metadata (aapt2 dump badging)"
AAPT2=$(latest_tool aapt2)
[[ -n "$AAPT2" ]] || { echo "::error::aapt2 not found"; exit 1; }
BADGING=$("$AAPT2" dump badging "$APK_FILE")

echo "$BADGING" | grep -q "package: name='${PKG}'" \
  || { echo "::error::Package name is not ${PKG}"; exit 1; }

APK_VERSION_NAME=$(echo "$BADGING" | grep -o "versionName='[^']*'" | head -n1 | cut -d"'" -f2)
APK_VERSION_CODE=$(echo "$BADGING" | grep -o "versionCode='[^']*'" | head -n1 | cut -d"'" -f2)
echo "APK versionName=$APK_VERSION_NAME versionCode=$APK_VERSION_CODE"

[[ "$APK_VERSION_NAME" == "$EXPECTED_VERSION_NAME" ]] \
  || { echo "::error::versionName $APK_VERSION_NAME != CI $EXPECTED_VERSION_NAME"; exit 1; }
[[ "$APK_VERSION_CODE" == "$EXPECTED_VERSION_CODE" ]] \
  || { echo "::error::versionCode $APK_VERSION_CODE != CI $EXPECTED_VERSION_CODE"; exit 1; }

echo "==> 4. apksigner"
APKSIGNER=$(latest_tool apksigner)
[[ -n "$APKSIGNER" ]] || { echo "::error::apksigner not found"; exit 1; }
"$APKSIGNER" verify --verbose --print-certs "$APK_FILE" | tee apksigner.txt

grep -q "Number of signers: 1" apksigner.txt \
  || { echo "::error::APK must have exactly one signer"; exit 1; }

if ! grep -q "Verified using v2 scheme (APK Signature Scheme v2): true" apksigner.txt \
   && ! grep -q "Verified using v3 scheme (APK Signature Scheme v3): true" apksigner.txt; then
  echo "::error::APK is not verified with signature scheme v2 or v3"
  exit 1
fi

SIGNER=$($FP certs apksigner.txt)
# Public value: printed on purpose so it can be copied into the expected-signer file / assetlinks.
echo "Release signer SHA-256: $($FP pretty "$SIGNER")"

echo "==> 5. Signer == expected production signer"
EXPECTED=$($FP expected "$ROOT/android-app/signing/expected-signer-sha256.txt") || {
  echo "::error::android-app/signing/expected-signer-sha256.txt does not contain a full SHA-256 fingerprint."
  echo "::error::Copy the 'Release signer SHA-256' value printed above into that file (and into assetlinks.json)."
  exit 1
}
if [[ "$SIGNER" != "$EXPECTED" ]]; then
  echo "::error::APK signer does not match the expected production signer."
  echo "::error::Refusing to publish an APK signed by a different identity (users could not update)."
  exit 1
fi

echo "==> 6. assetlinks.json (repository copy) contains the signer"
ASSETLINKS="$ROOT/public/.well-known/assetlinks.json"
[[ -f "$ASSETLINKS" ]] || { echo "::error::$ASSETLINKS missing"; exit 1; }
if ! $FP assetlinks "$ASSETLINKS" "$PKG" | grep -qx "$SIGNER"; then
  echo "::error::assetlinks.json does not list the release signer for ${PKG}; App Links would not verify."
  exit 1
fi

mkdir -p build-output
cp "$APK_FILE" build-output/Flowexa.apk
APK_SHA256=$(sha256sum build-output/Flowexa.apk | awk '{print $1}')
echo "Flowexa.apk SHA-256: $APK_SHA256"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "apk_sha256=$APK_SHA256"
    echo "signer_sha256=$SIGNER"
  } >> "$GITHUB_OUTPUT"
fi
echo "APK validation passed."
