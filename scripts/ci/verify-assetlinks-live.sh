#!/usr/bin/env bash
# Retrying check of the DEPLOYED assetlinks.json (Vercel may deploy later than Android CI).
# Env: SITE_URL (default https://orderflow-topaz.vercel.app), MAX_ATTEMPTS (default 20), SLEEP_SECONDS (default 30)
set -euo pipefail

SITE_URL="${SITE_URL:-https://orderflow-topaz.vercel.app}"
PKG="com.flowexa.app"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-30}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
FP="python3 $HERE/lib-fingerprint.py"

EXPECTED=$($FP expected "$ROOT/android-app/signing/expected-signer-sha256.txt")
URL="${SITE_URL}/.well-known/assetlinks.json"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "Attempt $attempt/$MAX_ATTEMPTS: GET $URL"
  HTTP_CODE=$(curl -sS -L -o live-assetlinks.json -w '%{http_code}' "$URL" || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    if LIVE=$($FP assetlinks live-assetlinks.json "$PKG" 2>live-assetlinks.err); then
      if echo "$LIVE" | grep -qx "$EXPECTED"; then
        echo "Live assetlinks.json is valid JSON, lists ${PKG} and contains the expected signer."
        exit 0
      fi
      echo "Live file is valid but does not contain the expected signer yet."
    else
      echo "Live file is not valid assetlinks JSON:"; cat live-assetlinks.err || true
    fi
  else
    echo "HTTP status: $HTTP_CODE"
  fi
  sleep "$SLEEP_SECONDS"
done

echo "::error::Live assetlinks.json at $URL never contained the expected signer for ${PKG}."
exit 1
