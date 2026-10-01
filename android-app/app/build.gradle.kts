plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}
 
// Firebase configuration is supplied outside Git.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
 
// ---- Versioning -----------------------------------------------------------------
// Versions must never be hardcoded. They are supplied by trusted CI variables
// (derived from the Git tag / run number in the release workflow). Release packaging
// fails hard when they are absent so a release can never ship a stale version.
val requestedTaskNames = gradle.startParameter.taskNames
val isReleasePackagingRequested = requestedTaskNames.any { task ->
    val lower = task.lowercase()
    (lower.contains("assemble") || lower.contains("bundle")) && lower.contains("release")
}
 
val envVersionCode = System.getenv("FLOWEXA_VERSION_CODE")?.toIntOrNull()
val envVersionName = System.getenv("FLOWEXA_VERSION_NAME")
 
val resolvedVersionCode: Int = envVersionCode ?: run {
    if (isReleasePackagingRequested) {
        error("FLOWEXA_VERSION_CODE is required for release packaging (derive it from the Git tag/CI run number).")
    }
    1
}
 
val resolvedVersionName: String = envVersionName?.takeIf { it.isNotBlank() } ?: run {
    if (isReleasePackagingRequested) {
        error("FLOWEXA_VERSION_NAME is required for release packaging (derive it from the Git tag/CI run number).")
    }
    "0.0.0-dev"
}
 
android {
    namespace = "com.flowexa.app"
    compileSdk = 35
 
    defaultConfig {
        applicationId = "com.flowexa.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "2.0.0"
        versionCode = resolvedVersionCode
        versionName = resolvedVersionName
 
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
 
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"ai-studio-c5fd0d2f-b8be-4e45-a37c-45e344ff21a9\"")
        buildConfigField("String", "WEB_BASE_URL", "\"https://orderflow-topaz.vercel.app\"")
    }
 
    val releaseKeystore = file("flowexa-release.keystore")
    val hasReleaseKeystore = releaseKeystore.exists()
 
    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = releaseKeystore
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                    ?: error("KEYSTORE_PASSWORD is required when building a release")
                keyAlias = System.getenv("KEY_ALIAS")