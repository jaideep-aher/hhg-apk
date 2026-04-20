# HHG Farmers (Android)

Native **farmer-side** Android app for **Hanuman Hundekari / HHG** — Jetpack Compose UI, offline-friendly caching, and integrations aimed at production rollout (telemetry, optional Firebase, Play in-app updates).

Public branch on GitHub: [jaideep-aher/hhg-apk — `Jai-intial`](https://github.com/jaideep-aher/hhg-apk/tree/Jai-intial).

---

## What is in this repository

| Area | Description |
|------|-------------|
| `app/` | Android application module (`com.hhg.farmers`), UI, networking, Room, WorkManager, Hilt DI |
| `ready to use apk/` | **Prebuilt release APK** for sideload install (`hhg-farmers.apk`) — see [Prebuilt APK](#prebuilt-apk) |
| `gradle/` | Gradle wrapper and version catalog |

The app targets Indian farmers with **Marathi-first** strings (`values-mr/`) and English fallbacks (`values/`).

---

## Prebuilt APK

The file in **`ready to use apk/hhg-farmers.apk`** is a **release** build (R8 minify + resource shrinking, universal APK with all CPU ABIs). It is signed and can be installed on **any device that meets the minimum OS version**, the same way you install apps outside the Play Store.

### What you get

| | |
|--|--|
| **Path** | `ready to use apk/hhg-farmers.apk` |
| **Build type** | `release` (optimized, not a debuggable dev build) |
| **Application ID** | `com.hhg.farmers` |
| **Version** | `0.1.0` (versionCode `1`) |
| **Requires Android** | **7.0 (API 24) or newer** — typical phones and tablets from ~2016 onward |
| **Signing** | Release pipeline uses the **default debug keystore** so the project can ship an installable APK from GitHub without checking in production keys. For **Google Play**, replace this with your **upload key** in `app/build.gradle.kts`. |

### How to install

1. On the phone: **Settings → Security / Apps → Install unknown apps** (wording varies by manufacturer) and allow your browser or Files app to install APKs.
2. Download **`hhg-farmers.apk`** from this repo (Raw or Releases), open it, and confirm install.

Or with USB debugging:

```bash
adb install ready to use apk/hhg-farmers.apk
```

This is a normal Android install package: sideloading is required because the app is not (yet) distributed through the Play Store.

### Regenerate the distributable from source

```bash
./gradlew :app:assembleRelease
cp app/build/outputs/apk/release/app-release.apk ready to use apk/hhg-farmers.apk
```

---

## Features (current)

### Implemented

- **Home**
  - Search by **last 5 digits of Aadhaar**; loads notices carousel and navigates to the farmer dashboard when a match is found.
  - Entry to **AI Market Trend** (screen is still a placeholder — see below).
- **Farmer dashboard**
  - Profile-style card (name, Aadhaar, mobile, address when available).
  - **Patti / records** list with totals (payable, quantity, weight).
  - **Share patti** via Android share sheet (PDF export pipeline exists in codebase).
  - Shortcuts to **Daily market rates** hub and AI trend placeholder.
  - **Log out** returns to home.
- **Market rates**
  - **Hub:** choose **Hanuman Hundekari rates** vs **Other markets**.
  - **Hundekari rates:** “today’s” rates list (items and ₹ rates).
- **Infrastructure / product plumbing**
  - **Retrofit** + Moshi against `API_BASE_URL` (see [Configuration](#configuration)).
  - **Room** + **DataStore** for session and local data.
  - **Hilt** for dependency injection.
  - **WorkManager** (e.g. telemetry flush worker).
  - **Coil** for images; **Vico** charts dependency (for future chart-heavy screens).
  - **Location** (Play Services), **install referrer**, **in-app updates** (Play Core), **PostHog** analytics dependency.
  - **Firebase** libraries present; **FCM / Crashlytics / Analytics** activate when `google-services.json` is added (file is gitignored by default).

### Placeholders / “coming soon”

Routes exist in navigation; screens show a simple placeholder until built:

- Other market rates (APMC etc.)
- AI Market Trend
- Seeds (per farmer UID)
- Local Vyapari
- About

---

## Tech stack (summary)

- **Language:** Kotlin  
- **UI:** Jetpack Compose, Material 3  
- **Min SDK:** 24 · **Target/Compile SDK:** 35  
- **Build:** Gradle Kotlin DSL, Android Gradle Plugin 8.x (see root `build.gradle.kts` / `libs.versions.toml`)

---

## Prerequisites

1. **JDK 17** (required by current Android Gradle Plugin / Firebase Crashlytics plugin; JDK 11+ is not sufficient for all plugins in this project).
2. **Android Studio** Koala+ or a matching **Android SDK** with API **35** platform and build-tools.
3. Optional: a physical device or emulator with **Google Play services** if you exercise location, FCM, or in-app updates.

---

## Clone and open

```bash
git clone https://github.com/jaideep-aher/hhg-apk.git
cd hhg-apk
git checkout Jai-intial
```

Open the project folder in Android Studio and let it sync Gradle.

### Local Gradle properties (optional)

If the IDE does not auto-create it, add `local.properties` with your SDK path:

```properties
sdk.dir=/path/to/Android/sdk
```

---

## Build from source

```bash
# Debug APK (installable test build; applicationId suffix .debug)
./gradlew :app:assembleDebug

# Release APK (signed for sideload — see signingConfig in app/build.gradle.kts)
./gradlew :app:assembleRelease
```

Outputs:

- Debug: `app/build/outputs/apk/debug/app-debug.apk` (`com.hhg.farmers.debug`)
- Release: `app/build/outputs/apk/release/app-release.apk` (`com.hhg.farmers`) — copy to `ready to use apk/hhg-farmers.apk` for the repo distributable.

> **Note:** Building requires a **JDK 17** runtime. If `./gradlew` picks Java 8, set `JAVA_HOME` to a JDK 17 installation before running Gradle.

---

## Configuration

### API base URL

Defined in `app/build.gradle.kts` as `API_BASE_URL` for both `debug` and `release`:

- Default: `https://hhgfarmers.vercel.app/api/`

Change there (or introduce build flavors) if you point to staging/production.

### Mock repository flag

`ENABLE_MOCK_REPO` is set in `build.gradle.kts` (`true` in current debug/release blocks). Adjust when wiring real backends only.

### Firebase (optional)

1. Add Firebase to the Android app in the Firebase console.
2. Download **`google-services.json`** into the `app/` module directory.
3. Sync/build — the project applies Google Services and Crashlytics plugins only when that file exists.

Without `google-services.json`, the project still builds; FCM and related Firebase features remain inert until configured.

### Secrets

Do **not** commit keystores or production API secrets. This repo ignores common keystore patterns and `google-services.json` per `.gitignore`.

---

## Permissions (high level)

Declared in `AndroidManifest.xml`, including:

- Internet / network state  
- Fine/coarse **location**  
- **Notifications** (Android 13+) for FCM  
- Package queries for WhatsApp / select UPI apps (sharing and adoption signals — see manifest comments)

---

## Versioning

- `versionCode` / `versionName` live in `app/build.gradle.kts` under `defaultConfig`.
- Debug builds append `-debug` to `versionName` and use `applicationIdSuffix ".debug"`.

---

## License / product

Product copy and naming follow in-app strings (e.g. “Hanuman Hundekari”, “HHG Farmers”). Add a license file if you intend open-source distribution.
