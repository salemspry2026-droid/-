# Flowexa Platform (Web & Native Android)

## Architecture Overview
Flowexa provides an integrated ecosystem featuring a modern Next.js web application and a dedicated 100% Native Android application.

### Official Android Application Path
* **`android-app/`**: **Official, Canonical Native Android Application** (Kotlin + Jetpack Compose + Material 3 + Room Database + WorkManager + Offline Outbox Sync + Firebase Android SDK).
* **`android/`**: **DEPRECATED / LEGACY ONLY**. This folder contains the retired WebView hybrid prototype and MUST NOT be used for any production builds, release workflows, or continuous integration.

### Package & Credentials
* **Package Name:** `com.flowexa.app`
* **Local Source of Truth:** Room Database (`flowexa.db`) with Outbox sync pattern.
* **Sync Engine:** Automatic bidirectional synchronization with Firebase Firestore (`ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9`).

### Build Instructions
To build the official Native Android release APK:
```bash
cd android-app
./gradlew assembleRelease
```
Or use the automated script wrapper:
```bash
./scripts/build-apk.sh
```
