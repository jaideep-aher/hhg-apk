# HHG Farmers (Android)

Native **farmer-side** Android app for **Hanuman Hundekari / HHG** — Jetpack Compose UI, offline-friendly caching, and integrations aimed at production rollout (telemetry, optional Firebase, Play in-app updates).

Public branch on GitHub: [jaideep-aher/hhg-apk — `Jai-intial`](https://github.com/jaideep-aher/hhg-apk/tree/Jai-intial).

---

## What is in this repository

| Area | Description |
|------|-------------|
| `app/` | Android application module (`com.hhg.farmers`), UI, networking, Room, WorkManager, Hilt DI |
| `apk/` | **Prebuilt debug APK** for quick install (`hhg-farmers-debug.apk`) — see [Prebuilt APK](#prebuilt-apk) |
| `gradle/` | Gradle wrapper and version catalog |

The app targets Indian farmers with **Marathi-first** strings (`values-mr/`) and English fallbacks (`values/`).

---

## Prebuilt APK

### Recommended location (this repo)

- **Path:** `apk/hhg-farmers-debug.apk`
- **Variant:** `debug`
- **Application ID:** `com.hhg.farmers.debug`
- **Version:** `0.1.0-debug` (versionCode `1`), minSdk **24**, target/compile **35**

Install on a device: enable **Install unknown apps** for your file manager or `adb install apk/hhg-farmers-debug.apk`.

### Also present on the `Jai-intial` branch (Git)

The same debug artifact is currently also tracked under Gradle output paths (not ideal for browsing, but it confirms a debug APK was committed):

- `app/build/outputs/apk/debug/app-debug.apk`
- `app/build/intermediates/apk/debug/app-debug.apk`

For sharing or documentation, prefer the top-level **`apk/`** copy.

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

# Release bundle/APK (needs signing config for real store upload — not committed here)
./gradlew :app:assembleRelease
```

Outputs:

- Debug: `app/build/outputs/apk/debug/app-debug.apk`
- After a successful build you can copy the debug APK to `apk/` if you want a named distributable alongside the repo.

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
