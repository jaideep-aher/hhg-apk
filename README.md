# HHG Farmers (Android)

Native **farmer-side** Android app for **Hanuman Hundekari / HHG** — Jetpack Compose UI, offline-friendly caching, and integrations aimed at production rollout (telemetry, optional Firebase, Play in-app updates).

Public branch on GitHub: [jaideep-aher/hhg-apk — `main`](https://github.com/jaideep-aher/hhg-apk/tree/main).

Live API: **https://api.hanumanksk.in** (Railway). Health check: `/health`.

Database architecture (three pools — RDS read, RDS write, Neon): see
**[docs/DATABASE.md](docs/DATABASE.md)**.

---

## What is in this repository

| Area | Description |
|------|-------------|
| `app/` | Android application module (`com.hhg.farmers`), UI, networking, Room, WorkManager, Hilt DI |
| `backend/` | **Express API** (Node) for farmer search, patti, Hundekari rates, notices — deploy to **Railway**, Postgres via `DATABASE_URL` — see [Backend (Railway) and database](#backend-railway-and-database) |
| `ready to use app/` | **Prebuilt release APK** for sideload install (`hhg-farmers.apk`) — see [Prebuilt APK](#prebuilt-apk) |
| `gradle/` | Gradle wrapper and version catalog |

The app targets Indian farmers with **Marathi-first** strings (`values-mr/`) and English fallbacks (`values/`).

---

## Prebuilt APK

The file in **`ready to use app/hhg-farmers.apk`** is a **release** build (R8 minify + resource shrinking, universal APK with all CPU ABIs). It is signed and can be installed on **any device that meets the minimum OS version**, the same way you install apps outside the Play Store.

### What you get

| | |
|--|--|
| **Path** | `ready to use app/hhg-farmers.apk` |
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
adb install ready to use app/hhg-farmers.apk
```

This is a normal Android install package: sideloading is required because the app is not (yet) distributed through the Play Store.

### Regenerate the distributable from source

```bash
./gradlew :app:assembleRelease
cp app/build/outputs/apk/release/app-release.apk ready to use app/hhg-farmers.apk
```

---

## Features (current)

### Implemented

- **Onboarding & permissions (first launch)**
  - Short intro carousel, then a **permission** screen for location, notifications, and (on Android 13+ / older APIs) photo/media access — aligns with Play expectations; users can skip and continue.
- **Home**
  - Search by **last 5 digits of Aadhaar**; loads notices carousel and navigates to the farmer dashboard when a match is found.
  - Entry to **AI Market Trend** (screen is still a placeholder — see below).
  - UI branding aligned with the public farmer portal (wordmark, colors).
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
- Release: `app/build/outputs/apk/release/app-release.apk` (`com.hhg.farmers`) — copy to `ready to use app/hhg-farmers.apk` for the repo distributable.

> **Note:** Building requires a **JDK 17** runtime. If `./gradlew` picks Java 8, set `JAVA_HOME` to a JDK 17 installation before running Gradle.

---

## Configuration

### API base URL

Defined in `app/build.gradle.kts` as `BuildConfig.API_BASE_URL`:

- **Default:** `https://api.hanumanksk.in/api/` (Railway-hosted API — see below)

Change there (or introduce build flavors) if you point to staging or another host.

### Mock repository flag

`ENABLE_MOCK_REPO` in `build.gradle.kts`:

- **Debug:** `false` — hits the real Railway backend. Flip to `true` only when
  you want to iterate on UI without the network.
- **Release:** `false` — always uses the real HTTP API.

---

## Backend (Railway) and databases

The Android app never talks to Postgres directly. It hits **HTTPS** endpoints
on an Express service running on **Railway** at `api.hanumanksk.in`, which
fronts **three separate Postgres connections**:

| Pool | Target | Used for |
|---|---|---|
| `r` | AWS RDS (`ro` user) | farmer lookup, patti, Hundekari rates, notices, `/health` |
| `w` | AWS RDS (`postgres` user) | telemetry inserts, any future write endpoints |
| `neon` | Neon Postgres | AgriSight market-trend data (wired when the feature ships) |

Full reference — env vars, per-route pool selection, SSL handling, rotation
steps, known quirks — in **[docs/DATABASE.md](docs/DATABASE.md)**.

### Minimum Railway variables

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URLR` | yes | AWS RDS read-only connection string |
| `DATABASE_URLW` | yes (for telemetry / writes) | AWS RDS read-write connection string |
| `NEON_DB_CONNECTION_STRING` | only if AgriSight is on | Neon Postgres URL |
| `TELEMETRY_SECRET` | yes | Shared secret for telemetry + `x-diag-secret` on `/health` |
| `MIN_VERSION_CODE`, `LATEST_VERSION_CODE`, `PLAY_STORE_URL`, `FORCE_UPDATE_*` | optional | Force-update gate; full reference with normal vs. block values in **[docs/FORCE_UPDATE.md](docs/FORCE_UPDATE.md)** |
| `PORT` | auto | Railway sets this — do not override |

If you only have a single legacy `DATABASE_URL` set, the backend uses it for
both `r` and `w` pools.

### Source in this repo

`backend/src/`:
- `index.js` — express bootstrap, mounts `/api/...`, public `/health`
- `db/pool.js` — three-pool factory (r / w / neon) with forced SSL + NUMERIC parsers
- `routes/farmer.js` / `rates.js` / `notices.js` — read routes (`r`)
- `routes/telemetry.js` — write route (`w`)
- `routes/config.js` — force-update gate (no DB)

### Deploying

```bash
cd backend
npm install
npm start   # reads env vars; see backend/.env.example for the full list
```

`GET /health` must return `{"status":"ok","db":"connected"}` before a release
APK will show live farmer / rate data. If it reports `disconnected`, add
`x-diag-secret: <TELEMETRY_SECRET>` to the request to see the real pg error
and host without it being exposed publicly.

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
- **Photos / video** (`READ_MEDIA_*` on Android 13+) and legacy **`READ_EXTERNAL_STORAGE`** (up to API 32) where needed for attachments/saves  
- Package queries for WhatsApp / select UPI apps (sharing and adoption signals — see manifest comments)

On first launch, after onboarding, the app can prompt for the relevant runtime permissions together (see in-app **App access** screen).

---

## Versioning

- `versionCode` / `versionName` live in `app/build.gradle.kts` under `defaultConfig`.
- Debug builds append `-debug` to `versionName` and use `applicationIdSuffix ".debug"`.

---

## License / product

Product copy and naming follow in-app strings (e.g. “Hanuman Hundekari”, “HHG Farmers”). Add a license file if you intend open-source distribution.
