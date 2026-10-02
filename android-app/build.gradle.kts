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
                    ?: error("KEY_ALIAS is required when building a release")
                keyPassword = System.getenv("KEY_PASSWORD")
                    ?: error("KEY_PASSWORD is required when building a release")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                val isReleaseTask = gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }
                if (isReleaseTask) {
                    error("Production release build requires flowexa-release.keystore but it was not found.")
                }
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Room Database
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // WorkManager
    implementation(libs.androidx.work.runtime.ktx)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.storage)
    implementation(libs.firebase.analytics)

    // Google Sign In & Credentials
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.google.identity.googleid)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)

    // Unit Testing
    testImplementation("junit:junit:4.13.2")
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}
