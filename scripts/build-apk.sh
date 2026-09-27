#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
SDK_DIR="${ANDROID_HOME:-/opt/android-sdk}"
WEB_URL="${1:-${FLOWEXA_WEB_URL:-https://orderflow-topaz.vercel.app}}"
OUT_APK="$ROOT_DIR/public/downloads/flowexa.apk"

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

mkdir -p "$ROOT_DIR/public/downloads"

cat > "$ANDROID_DIR/local.properties" <<EOF
sdk.dir=$SDK_DIR
flowexa.web.url=$WEB_URL
EOF

if [ ! -f "$ANDROID_DIR/app/flowexa-release.keystore" ]; then
  keytool -genkeypair -v \
    -keystore "$ANDROID_DIR/app/flowexa-release.keystore" \
    -alias flowexa \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass flowexa123 \
    -keypass flowexa123 \
    -dname "CN=Flowexa, OU=Mobile, O=Flowexa, L=Riyadh, C=SA"
fi

chmod +x "$ANDROID_DIR/gradlew"
cd "$ANDROID_DIR"
./gradlew assembleRelease --no-daemon --quiet

SRC_APK="$ANDROID_DIR/app/build/outputs/apk/release/flowexa.apk"
if [ ! -f "$SRC_APK" ]; then
  SRC_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
fi

cp "$SRC_APK" "$OUT_APK"
echo "APK_READY $OUT_APK"
ls -lh "$OUT_APK"
