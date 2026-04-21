import java.util.Properties

// Load signing config from keystore.properties (gitignored). If the file is
// missing (CI, fresh clone, GitHub sideload), release builds fall back to the
// debug keystore so `assembleRelease` still works for local testing.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        keystorePropsFile.inputStream().use { load(it) }
    }
}
val hasUploadKey = keystoreProps.getProperty("storeFile") != null &&
    keystoreProps.getProperty("storePassword") != null &&
    !keystoreProps.getProperty("storePassword", "").startsWith("REPLACE_ME")

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.ksp)
    alias(libs.plugins.hilt)
    // Firebase plugins are declared here but only *applied* below, conditioned on
    // google-services.json being present. This lets the app build without Firebase
    // setup during early development.
    alias(libs.plugins.google.services) apply false
    alias(libs.plugins.firebase.crashlytics) apply false
}

// Apply Firebase plugins only when google-services.json exists. The `file()` helper
// isn't available inside the plugins { } block, so the conditional has to live here.
if (file("google-services.json").exists()) {
    apply(plugin = libs.plugins.google.services.get().pluginId)
    apply(plugin = libs.plugins.firebase.crashlytics.get().pluginId)
}

android {
    namespace = "com.hhg.farmers"
    compileSdk = 35

    // Upload key signing config — only registered if keystore.properties is
    // filled in. Keeps the upload keystore out of git while still letting
    // `./gradlew bundleRelease` produce a Play-uploadable AAB locally.
    signingConfigs {
        if (hasUploadKey) {
            create("upload") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    defaultConfig {
        applicationId = "com.tec.agrofixpartner"
        minSdk = 24           // Android 7.0 — covers ~97% of devices; safe for 2018+ hardware
        targetSdk = 35
        versionCode = 15
        // Shown in Settings screen (from BuildConfig.VERSION_NAME) and in every
        // Firestore location ping + Analytics event. Keep this as a short string
        // that's easy to read over a support call.
        //
        // v15 — Aadhaar search UX upgrade:
        //   * Home screen: single text field replaced with 5 separate OTP-style
        //     boxes (active box highlights orange, filled boxes bold, red on
        //     error). Applied to both native HomeScreen and the hosted `/`
        //     webview page so the Android shell and the website stay in sync.
        //
        // v13 — Firebase connectivity fixes + location enforcement:
        //   * google-services.json updated to include com.tec.agrofixpartner.debug
        //     so Firebase initialises correctly in debug builds.
        //   * Location services (GPS toggle) gate added — app blocks dashboard
        //     when device GPS is off, both at startup and while running
        //     (BroadcastReceiver on PROVIDERS_CHANGED_ACTION).
        //   * NavTrackingViewModel: GeoTracker now fires when the active farmer
        //     changes via WebView navigation (previously only fired on cold-start
        //     app_open and native HomeViewModel login).
        //
        // v12 — diagnostics pass for empty-Firebase-dashboard debugging.
        // v11 — adds Firebase Firestore location tracking and Analytics.
        versionName = "15"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }

        // Ship only the Indian-market-relevant resource configurations
        resourceConfigurations += listOf("mr", "hi", "en")
    }

    buildTypes {
        getByName("debug") {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField("String", "API_BASE_URL", "\"https://api.hanumanksk.in/api/\"")
            buildConfigField("Boolean", "ENABLE_MOCK_REPO", "false")
        }
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", "\"https://api.hanumanksk.in/api/\"")
            buildConfigField("Boolean", "ENABLE_MOCK_REPO", "false")  // release always uses real backend
            // Use the real upload keystore if `keystore.properties` is present (for Play Console
            // uploads). Otherwise fall back to the debug keystore so CI / fresh clones can still
            // produce a sideloadable APK — which will NOT be accepted by Play.
            signingConfig = if (hasUploadKey) {
                signingConfigs.getByName("upload")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

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
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.compose.foundation)
    implementation(libs.compose.runtime)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.process)
    implementation(libs.navigation.compose)
    implementation(libs.core.ktx)
    implementation(libs.appcompat)
    implementation(libs.ui.text.google.fonts)
    debugImplementation(libs.compose.ui.tooling)

    // Storage / local DB
    implementation(libs.datastore.preferences)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Background work (telemetry flush, push handling)
    implementation(libs.work.runtime.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.moshi)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.moshi)
    implementation(libs.moshi.kotlin)
    ksp(libs.moshi.codegen)

    // Async
    implementation(libs.coroutines.android)
    implementation(libs.coroutines.play.services)

    // DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Location — Uber-grade GPS via Fused Location Provider
    implementation(libs.play.services.location)

    // In-app update (nudge or force update from Play)
    implementation(libs.play.app.update)
    implementation(libs.play.app.update.ktx)

    // Install referrer (organic vs campaign attribution)
    implementation(libs.install.referrer)

    // Firebase (FCM + Remote Config + Crashlytics) — activates when google-services.json is added
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.firebase.config)
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.analytics)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.installations)

    // Analytics
    implementation(libs.posthog.android)

    // Images
    implementation(libs.coil.compose)

    // Charts
    implementation(libs.vico.compose)
    implementation(libs.vico.compose.m3)

    // Markdown rendering (for AI Market Trend narratives) — lives on JitPack.
    // Re-enable when the AI Trend screen is built:
    //   1. Add `maven(url = "https://jitpack.io")` to settings.gradle.kts dependencyResolutionManagement
    //   2. Uncomment the line below
    // implementation(libs.compose.markdown)
}
