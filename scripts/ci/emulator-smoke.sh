#!/usr/bin/env bash
# Runs INSIDE a booted Android emulator (reactivecircus/android-emulator-runner).
# Verifies that the exact release APK installs, launches and survives basic deep links.
# It never guesses: every adb failure is printed verbatim.
set -uo pipefail   # (no -e: we want to collect logcat before failing)

APK="${APK_PATH:-build-output/Flowexa.apk}"
PKG="com.flowexa.app"
STATUS=0
mkdir -p smoke-logs

fail() { echo "::error::$*"; STATUS=1; }

echo "==> Device"
adb shell getprop ro.build.version.sdk
adb shell getprop ro.product.cpu.abi

echo "==> 1. adb install --no-incremental"
INSTALL_OUT=$(adb install --no-incremental "$APK" 2>&1); INSTALL_RC=$?
echo "$INSTALL_OUT"
if [[ $INSTALL_RC -ne 0 ]] || ! echo "$INSTALL_OUT" | grep -q "Success"; then
  if echo "$INSTALL_OUT" | grep -q "INSTALL_FAILED_UPDATE_INCOMPATIBLE"; then
    fail "INSTALL_FAILED_UPDATE_INCOMPATIBLE: signing continuity problem (a package with another signer is installed)."
  else
    fail "adb install failed (see exact Android error above)."
  fi
  exit 1
fi

echo "==> 2. Package manager confirms installation"
PM_PATH=$(adb shell pm path "$PKG" | tr -d '\r')
echo "$PM_PATH"
echo "$PM_PATH" | grep -q '^package:' || { fail "pm path did not return the installed package"; exit 1; }
adb shell dumpsys package "$PKG" | grep -E "versionName=|versionCode=" | head -n 2

echo "==> 3. Launch MainActivity"
adb logcat -c
LAUNCH_OUT=$(adb shell am start -W -n "$PKG/.MainActivity" 2>&1 | tr -d '\r')
echo "$LAUNCH_OUT"
echo "$LAUNCH_OUT" | grep -q "Status: ok" || fail "am start did not report Status: ok"
sleep 15

check_alive() {
  local label="$1"
  adb shell pidof "$PKG" >/dev/null 2>&1 || fail "[$label] process $PKG is not running"
  adb logcat -d > "smoke-logs/logcat-$label.txt" 2>&1 || true
  adb logcat -d -b crash > "smoke-logs/crash-$label.txt" 2>&1 || true
  if grep -q "FATAL EXCEPTION" "smoke-logs/logcat-$label.txt"; then
    fail "[$label] FATAL EXCEPTION found in logcat"
    grep -A 25 "FATAL EXCEPTION" "smoke-logs/logcat-$label.txt" | head -n 60
  fi
  if grep -q "ANR in $PKG" "smoke-logs/logcat-$label.txt"; then
    fail "[$label] ANR detected"
  fi
  if grep -q "Process $PKG .* has died" "smoke-logs/logcat-$label.txt"; then
    fail "[$label] process death detected"
  fi
}

echo "==> 4. Cold start health"
check_alive "launch"

echo "==> 5. Deep link: public catalog (/c/{companyId})"
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://orderflow-topaz.vercel.app/c/ci-smoke-company" "$PKG" 2>&1 | tr -d '\r'
sleep 10
check_alive "deeplink-catalog"

echo "==> 6. Deep link: Firebase email-link shape (fake, must not crash and must not open the catalog)"
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://gen-lang-client-0196712383.firebaseapp.com/__/auth/action?apiKey=ci-fake&mode=signIn&oobCode=ci-fake" "$PKG" 2>&1 | tr -d '\r'
sleep 8
check_alive "deeplink-emaillink"

echo "==> 7. Cleanup"
adb uninstall "$PKG" || true

if [[ $STATUS -ne 0 ]]; then
  echo "::error::Runtime smoke test FAILED"
  exit 1
fi
echo "Runtime smoke test passed."
