#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_APP_DIR="$ROOT_DIR/android-app"
SDK_DIR="${ANDROID_HOME:-/opt/android-sdk}"
OUT_DIR="$ROOT_DIR/public/downloads"
OUT_APK="$OUT_DIR/flowexa.apk"

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

mkdir -p "$OUT_DIR"

if [ ! -d "$ANDROID_APP_DIR" ]; then
  echo "ERROR: Official Android application directory 'android-app' does not exist." >&2
  exit 1
fi

chmod +x "$ANDROID_APP_DIR/gradlew"
cd "$ANDROID_APP_DIR"

echo "Building official Native Android App from android-app/..."
./gradlew assembleRelease --no-daemon

SRC_APK=$(find "$ANDROID_APP_DIR/app/build/outputs/apk/release" -type f -name "*.apk" | head -n 1)

if [ -z "$SRC_APK" ] || [ ! -f "$SRC_APK" ]; then
  echo "ERROR: Release APK was not found in $ANDROID_APP_DIR/app/build/outputs/apk/release" >&2
  exit 1
fi

cp "$SRC_APK" "$OUT_APK"
cp "$SRC_APK" "$OUT_DIR/Flowexa.apk"

echo "SUCCESS: Official Native APK generated at: $OUT_APK"
ls -lh "$OUT_APK"
