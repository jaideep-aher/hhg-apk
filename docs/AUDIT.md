# HHG Farmers — Production Readiness Audit

**Date:** 2026-04-20
**Scope:** Android app (`app/`) + Railway backend (`backend/`)
**Goal:** Surface every baked-in assumption and scalability trap before Play Store submission.

---

## Executive Summary

| Severity | Count | Status |
|---|---|---|
| 🔴 Blockers (fix before Play Store) | 10 | 2 resolved / 8 open |
| 🟡 Scalability concerns (fix within 3 months) | 8 | 0 resolved / 8 open |
| 🟢 Nice-to-have | 10 | 0 resolved / 10 open |

**The app is ~60% production-ready.** The core UX, offline caching, permissions, and navigation are solid. The biggest remaining risks are **release signing** (will get you rejected from Play Store), **API versioning** (will force mandatory updates later), and **telemetry plumbing** (will leave you flying blind after launch).

---

## 🔴 Blockers — Must Fix Before Play Store

### #1 — Release build is signed with the debug keystore ❗
**File:** [`app/build.gradle.kts:60`](../app/build.gradle.kts)
**Current:** `signingConfig = signingConfigs.getByName("debug")`

**Why it's a blocker:**
- Google Play Console will **reject** the upload.
- If you ever do get it through with a debug key, your app identity is tied to that key **forever** — lose it = cannot publish updates ever again.

**Fix:**
```bash
# 1. Generate a proper release keystore (do this ONCE, back it up)
keytool -genkey -v -keystore ~/hhg-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias hhg
```
```kotlin
// 2. In app/build.gradle.kts
signingConfigs {
    create("release") {
        storeFile     = file(System.getenv("KEYSTORE_PATH") ?: "release.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias      = "hhg"
        keyPassword   = System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    getByName("release") {
        signingConfig = signingConfigs.getByName("release")
        // ...rest stays
    }
}
```

**🔐 Back up that `.jks` file in at least 2 places.** Losing it is unrecoverable.

---

### #2 — API_BASE_URL hardcoded in BuildConfig ✅ Partially resolved
**File:** [`app/build.gradle.kts:46,56`](../app/build.gradle.kts)
**Current:** Points at `https://api.hanumanksk.in/api/` (custom domain)

**Status:** ✅ Custom domain means backend host can be swapped via DNS without an app update. The URL itself is still baked in, so if the domain changes, users must update. Acceptable since you own the domain.

**Future-proofing (optional):** Add Firebase Remote Config fallback URL list for deep resilience.

---

### #3 — Telemetry secret exposed in BuildConfig / APK
**File:** [`backend/src/routes/telemetry.js:15-16`](../backend/src/routes/telemetry.js)

**Issue:** The backend guards `/api/telemetry` with a shared-secret header. Whatever secret the APK sends is extractable by anyone who decompiles the APK (trivial with tools like `apktool`). Attackers can then flood your telemetry endpoint with fake farmer IDs, page visits, and location data.

**Fix options (pick one):**
- **Good:** Rate-limit by IP + add a daily quota per device ID
- **Better:** Drop the shared secret; authenticate via short-lived tokens from the farmer login flow
- **Best:** Device attestation via Google Play Integrity API

```javascript
// Minimum viable: rate-limit middleware
const rateLimit = require('express-rate-limit');
app.use('/api/telemetry',
  rateLimit({ windowMs: 60_000, max: 20, keyGenerator: r => r.ip }),
  telemetryRouter);
```

---

### #4 — Telemetry flush worker logs "Would flush" — never actually POSTs
**File:** [`app/src/main/java/com/hhg/farmers/service/telemetry/TelemetryFlushWorker.kt:33`](../app/src/main/java/com/hhg/farmers/service/telemetry/TelemetryFlushWorker.kt)

**Issue:** Events are accumulated in Room but never sent to the backend. After launch you'll have **zero visibility** into crashes, adoption, feature usage, or user flow.

**Fix:** Inject a `TelemetryApi` (Retrofit) and POST the batch:
```kotlin
private suspend fun flushBatch(batch: List<TelemetryEvent>) {
    val req = TelemetryBatchRequest(events = batch.map { it.toDto() })
    api.submitTelemetry(req)  // POST /api/telemetry
    db.events().deleteBatch(batch.map { it.id })  // remove on success
}
```

---

### #5 — FCM token registration is a stub — push notifications don't reach backend
**File:** [`app/src/main/java/com/hhg/farmers/service/push/FcmService.kt:23`](../app/src/main/java/com/hhg/farmers/service/push/FcmService.kt)

**Issue:** When FCM generates a new token (every few months, or on reinstall), the `onNewToken` callback never registers the token with your backend. Your backend has no way to send messages. Critical alerts (payment updates, force-update push) cannot reach users.

**Fix:**
```kotlin
override fun onNewToken(token: String) {
    val farmerId = sessionStore.currentFarmerId() ?: return
    scope.launch {
        api.registerFcmToken(farmerId, token, System.currentTimeMillis())
    }
}
```
Plus a backend endpoint `POST /api/push/register { farmerId, token }` and an `fcm_tokens` table.

---

### #6 — versionCode is hardcoded to 1
**File:** [`app/build.gradle.kts:31`](../app/build.gradle.kts)

**Issue:** Every Play Store upload must have a **unique, strictly-increasing** `versionCode`. If you forget to bump, Play Console rejects the upload. Manual bumping is error-prone.

**Fix — auto-increment from CI:**
```kotlin
defaultConfig {
    versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
    versionName = "0.1.${System.getenv("GITHUB_RUN_NUMBER") ?: "0"}"
}
```
Or simpler — just a counter in a file committed to the repo.

---

### #7 — No API versioning (`/api/farmer` instead of `/api/v1/farmer`)
**Files:** All routes in [`backend/src/routes/`](../backend/src/routes/)

**Issue:** If you ever rename a field in a response (e.g., `highestRate` → `maxRate`), every old APK in the wild **crashes** because Moshi can't find the expected field.

**Fix (do this before the first Play Store release — it's cheap now, expensive later):**
```javascript
// backend/src/index.js
app.use('/api/v1/farmer',    farmerRouter);
app.use('/api/v1/rates',     ratesRouter);
app.use('/api/v1/notices',   noticesRouter);
app.use('/api/v1/config',    configRouter);
app.use('/api/v1/telemetry', telemetryRouter);
```
```kotlin
// build.gradle.kts
buildConfigField("String", "API_BASE_URL", "\"https://api.hanumanksk.in/api/v1/\"")
```
Now when v2 ships you can run `/api/v1/*` and `/api/v2/*` side by side. Old APKs keep working.

---

### #8 — Moshi fails on unknown/new JSON fields
**File:** [`app/src/main/java/com/hhg/farmers/data/model/Models.kt`](../app/src/main/java/com/hhg/farmers/data/model/Models.kt)

**Issue:** Many data-class fields are non-nullable with no default. If the backend drops a field, old APKs crash. If Moshi is strict, unknown fields may also crash depending on config.

**Fix:** Make every field nullable with a default, and ensure Moshi ignores unknowns:
```kotlin
@JsonClass(generateAdapter = true)
data class Farmer(
    val farmerid: Int = 0,
    val uid: String = "",
    val farmername: String = "",
    val mobilenumber: String? = null,
    val farmeraddress: String? = null,
    val status: String = "UNKNOWN"
)
```
Moshi ignores unknown JSON keys by default, so the main risk is **removal** — defaulting every field covers that.

---

### #9 — DB pool size hardcoded (max 10), no timeouts
**File:** [`backend/src/db/pool.js:11`](../backend/src/db/pool.js)

**Issue:** Under even modest load (100 concurrent users), 10 connections saturate. No query timeout means a slow RDS query can hold a connection indefinitely. No way to tune without redeploying.

**Fix:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max:                    parseInt(process.env.DB_POOL_MAX           || '20'),
  idleTimeoutMillis:      parseInt(process.env.DB_IDLE_TIMEOUT_MS    || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS   || '5000'),
  statement_timeout:      parseInt(process.env.DB_STATEMENT_TIMEOUT || '10000'),
});
```

---

### #10 — OkHttp has read/connect timeouts but no call timeout
**File:** [`app/src/main/java/com/hhg/farmers/di/NetworkModule.kt:31-34`](../app/src/main/java/com/hhg/farmers/di/NetworkModule.kt)

**Issue:** If a request stalls between read chunks on 2G, it may hang longer than the 30s read timeout. Users see frozen screens.

**Fix:**
```kotlin
OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .callTimeout(45, TimeUnit.SECONDS)   // ← total upper bound
    // ...
```

---

## 🟡 Scalability Concerns — Fix Within 3 Months

### #11 — Telemetry batch size (200) and 7-day retention hardcoded
**File:** [`app/.../service/telemetry/TelemetryFlushWorker.kt:30,39`](../app/src/main/java/com/hhg/farmers/service/telemetry/TelemetryFlushWorker.kt)
**Fix:** Drive both via `/api/config`.

### #12 — Location timeout is 10s (insufficient on rural 2G / indoors)
**File:** [`app/.../service/location/LocationProvider.kt:52`](../app/src/main/java/com/hhg/farmers/service/location/LocationProvider.kt)
**Fix:** Increase to 20-30s or drive via config.

### #13 — Dependency updates are manual
**File:** [`gradle/libs.versions.toml`](../gradle/libs.versions.toml)
**Fix:** Enable Dependabot on the GitHub repo.

### #14 — No pagination on farmer patti fetch
**Files:** [`backend/src/routes/farmer.js`](../backend/src/routes/farmer.js), [`app/.../RetrofitFarmerRepository.kt`](../app/src/main/java/com/hhg/farmers/data/repo/RetrofitFarmerRepository.kt)
**Issue:** A farmer with 500+ entries returns all at once → OOM on 2 GB phones.
**Fix:** Cursor-based pagination (`?cursorId=X&limit=50`).

### #15 — Telemetry inserts not wrapped in transactions
**File:** [`app/.../service/telemetry/TelemetryManager.kt:122-135`](../app/src/main/java/com/hhg/farmers/service/telemetry/TelemetryManager.kt)
**Fix:** Use Room `@Transaction`.

### #16 — Notice list hardcoded to `LIMIT 20`
**File:** [`backend/src/routes/notices.js:32`](../backend/src/routes/notices.js)
**Fix:** Use env var + pagination.

### #17 — No rate-limiting on any endpoint
**File:** [`backend/src/index.js`](../backend/src/index.js)
**Fix:** `express-rate-limit` middleware — 100 req/min/IP on `/api/*`, stricter on `/farmer/exists` (enumeration risk).

### #18 — No JSON-bomb protection on Express
**File:** [`backend/src/index.js:16`](../backend/src/index.js)
**Fix:** Tighter `strict` mode on `express.json`.

---

## 🟢 Nice-to-Have

### #19 — Offline cache is write-only
**File:** [`app/.../service/offline/OfflineCacheImpl.kt`](../app/src/main/java/com/hhg/farmers/service/offline/OfflineCacheImpl.kt)
**Fix:** Return cached patti on network failure in `RetrofitFarmerRepository.getFarmerData`.

### #20 — UID regex `^\d{5}$` hardcoded on both sides
**Files:** `backend/src/routes/farmer.js:23`, `app/.../UidAuthRepository.kt:25`
**Fix:** Drive min/max length via `/api/config`.

### #21 — `google-services.json` missing — Firebase (Crashlytics/Analytics/FCM) silently disabled
**File:** [`app/build.gradle.kts:18-20`](../app/build.gradle.kts)
**Fix:** Download from Firebase Console, drop into `app/`. Everything auto-wires.

### #22 — PDF export hardcodes Marathi locale
**File:** [`app/.../service/share/PdfExporter.kt:56`](../app/src/main/java/com/hhg/farmers/service/share/PdfExporter.kt)
**Fix:** `Locale.getDefault()`.

### #23 — ProGuard rules missing for Moshi generated adapters
**File:** [`app/proguard-rules.pro`](../app/proguard-rules.pro)
**Fix:** Add `-keepclassmembers class **_*JsonAdapter { <init>(...); <methods>; }`.

### #24 — PDF export capped at 30 entries
**File:** [`app/.../service/share/PdfExporter.kt:67-74`](../app/src/main/java/com/hhg/farmers/service/share/PdfExporter.kt)
**Fix:** Multi-page PDF.

### #25 — `runCatching` swallows error cause
**Files:** Throughout
**Fix:** Log the throwable before returning the default.

### #26 — Force-update stub ✅ RESOLVED
**Status:** Fully implemented via `/api/config` + `AppGateViewModel` + `ForceUpdateScreen`. See commit `23004ef`. Bump `MIN_VERSION_CODE` in Railway to force every old APK off next launch.

### #27 — No OkHttp connection-pool tuning
**File:** [`app/.../di/NetworkModule.kt`](../app/src/main/java/com/hhg/farmers/di/NetworkModule.kt)
**Fix:** Explicit `ConnectionPool(5, 5, MINUTES)`.

### #28 — Settings language-switch is a UI stub
**File:** [`app/.../ui/screens/settings/SettingsScreen.kt`](../app/src/main/java/com/hhg/farmers/ui/screens/settings/SettingsScreen.kt)
**Fix:** Either remove or wire to `AppCompatDelegate.setApplicationLocales`.

---

## Critical Path to Play Store

**Do these in order before first submission:**

1. **Today** — Generate release keystore; wire `signingConfig` (#1)
2. **Today** — Add `/api/v1/` prefix to all routes + update APK URL (#7)
3. **Today** — Wire versionCode auto-increment (#6)
4. **This week** — Implement telemetry POST (#4) and FCM token register (#5)
5. **This week** — Add rate limiting (#17) and telemetry auth (#3)
6. **This week** — Default all Moshi fields with nullables (#8)
7. **Before launch** — Drop in `google-services.json` (#21) so you get crash reports from day one
8. **Before launch** — Add `callTimeout` + DB pool tuning (#9, #10)

Everything under 🟡 and 🟢 can wait until you have real users and real data about what's actually breaking.

---

## How to Add Features After Launch

The architecture supports three levels of change, each with different update costs:

| Change type | Requires app update? | Example |
|---|---|---|
| **Backend-only** | ❌ No | Adjust rate caps, notice text, min/max UID length |
| **Backend schema** (via `/v1/`) | ❌ No | Add a new endpoint, add fields to existing response (as long as old fields remain) |
| **UI/logic** | ✅ Yes | New screen, new button, new client-side validation |

**To force updates when needed:** Bump `MIN_VERSION_CODE` in Railway → every user sees the force-update screen on next launch. No Play Store review, no downtime, ~5 seconds to deploy.
