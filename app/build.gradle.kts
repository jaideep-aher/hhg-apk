import java.util.Properties

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

    defaultConfig {
        applicationId = "com.hhg.farmers"
        minSdk = 24           // Android 7.0 — covers ~97% of devices; safe for 2018+ hardware
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

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
            buildConfigField("String", "API_BASE_URL", "\"https://hhgfarmers.vercel.app/api/\"")
            buildConfigField("Boolean", "ENABLE_MOCK_REPO", "true")
        }
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", "\"https://hhgfarmers.vercel.app/api/\"")
            buildConfigField("Boolean", "ENABLE_MOCK_REPO", "true")
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
    implementation(libs.navigation.compose)
    implementation(libs.core.ktx)
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

    // Analytics
    implementation(libs.posthog.android)

    // Images
    implementation(libs.coil.compose)

    // Charts
    implementation(libs.vico.compose)
    implementation(libs.vico.compose.m3)

    // Markdown rendering (for AI Market Trend narratives)
    implementation(libs.compose.markdown)
}
