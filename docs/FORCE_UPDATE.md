# Force update & Railway variables

The backend reads every tunable value from Railway environment variables. You
only need the **database URLs** to keep the app working — the other variables
unlock specific features (force-update screen, telemetry auth, diagnostics).

This doc lists every variable, what it does, the value for **normal
operation**, and the value to set when you want to **force every old APK to
show the "Update Now" block screen**.

Currently-installed APK: `versionCode = 1`, `versionName = 0.1.0`.

---

## Where to set these

Railway → your service (`hhg-apk` backend) → **Variables** tab → **New
Variable** → add name + value → Railway auto-redeploys in ~20 s.

After changing a value, verify with:

```bash
curl https://api.hanumanksk.in/api/config
```

For the version-code variables you should see the new numbers in the JSON
response.

---

## Full variable table

| Variable | Required? | Normal value | Force-update value | Purpose |
|---|---|---|---|---|
| `DATABASE_URLR`              | **yes** | `postgresql://ro:<pw>@<rds-host>/hhg`        | _(unchanged)_ | Read pool (farmer / patti / rates / notices / `/health`). |
| `DATABASE_URLW`              | **yes** | `postgresql://postgres:<pw>@<rds-host>/hhg`  | _(unchanged)_ | Write pool (telemetry inserts). |
| `NEON_DB_CONNECTION_STRING`  | optional | `postgresql://neondb_owner:<pw>@<neon-host>/neondb` | _(unchanged)_ | Neon pool (AgriSight — wire in when that feature ships). |
| `TELEMETRY_SECRET`           | **yes** | Random 32-byte hex string (see below) | _(unchanged)_ | Shared secret the APK sends on `POST /api/telemetry` and the `x-diag-secret` header on `/health`. |
| `MIN_VERSION_CODE`           | optional (default `1`) | `1` | `2` (any number > installed versionCode) | Below this = **block screen** (unskippable). |
| `LATEST_VERSION_CODE`        | optional (default `1`) | `1` | `2` (match `MIN_VERSION_CODE`) | Below this = **soft nudge** (dismissible). |
| `PLAY_STORE_URL`             | optional | `https://play.google.com/store/apps/details?id=com.hhg.farmers` | _(unchanged)_ | URL the "Update Now" button opens. |
| `FORCE_UPDATE_TITLE`         | optional | `अॅप अपडेट करा` | Any Marathi/English headline (e.g. `Security update required`) | Headline on the block screen. |
| `FORCE_UPDATE_MESSAGE`       | optional | `पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. जुने व्हर्जन आता सपोर्टेड नाही.` | Short explanation of why users must update | Body text on the block screen. |
| `PORT`                       | auto | _(Railway sets this)_ | _(leave alone)_ | Don't override. |
| `DATABASE_URL`               | legacy | Same as `DATABASE_URLR` (optional — only used if the R/W vars are missing) | _(unchanged)_ | Backwards-compat fallback for older deploys. |

> Only `DATABASE_URLR`, `DATABASE_URLW`, and `TELEMETRY_SECRET` are strictly
> required. Everything else has a sensible default built into the code.

---

## What to add right now (minimum viable set)

If your Railway dashboard only has `DATABASE_URL` today, add these:

```
DATABASE_URLR              = postgresql://ro:<password>@<rds-host>.rds.amazonaws.com/hhg
DATABASE_URLW              = postgresql://postgres:<password>@<rds-host>.rds.amazonaws.com/hhg
TELEMETRY_SECRET           = <generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
MIN_VERSION_CODE           = 1
LATEST_VERSION_CODE        = 1
PLAY_STORE_URL             = https://play.google.com/store/apps/details?id=com.hhg.farmers
```

Optional — only if/when AgriSight ships:
```
NEON_DB_CONNECTION_STRING  = postgresql://neondb_owner:<password>@<neon-host>/neondb
```

Optional — only if you want to override the Marathi default messages:
```
FORCE_UPDATE_TITLE         = अॅप अपडेट करा
FORCE_UPDATE_MESSAGE       = पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. जुने व्हर्जन आता सपोर्टेड नाही.
```

You can keep the existing legacy `DATABASE_URL` set to the R connection string
during the transition — the code prefers `DATABASE_URLR` but reads
`DATABASE_URL` as a fallback, so nothing breaks.

---

## How to force the update screen

Goal: make every phone running `versionCode = 1` see the blocking
"Update Now" screen on next launch.

1. Railway → Variables, set:
   ```
   MIN_VERSION_CODE    = 2
   LATEST_VERSION_CODE = 2
   ```
   (2 is just "anything higher than the installed versionCode". Use 10, 100,
   etc. — the value itself doesn't matter as long as it's greater than 1.)
2. Wait ~20 s for Railway to redeploy, then confirm:
   ```bash
   curl https://api.hanumanksk.in/api/config
   ```
   You should see `"minVersionCode": 2, "latestVersionCode": 2`.
3. On the phone: **Settings → Apps → HHG Farmers → Force stop**, then reopen.
   You'll see the Marathi block screen with an "Update Now" button.

### To revert (unblock all users)

```
MIN_VERSION_CODE    = 1
LATEST_VERSION_CODE = 1
```

Force-stop the app once more, reopen — normal home screen returns.

### When you actually ship a new APK

1. Bump `app/build.gradle.kts`:
   ```kotlin
   versionCode = 2         // was 1
   versionName = "0.2.0"   // was "0.1.0"
   ```
2. Build + upload the new APK (to Play Store or `ready to use app/`).
3. On Railway:
   ```
   MIN_VERSION_CODE    = 2    // blocks anyone still on v1
   LATEST_VERSION_CODE = 2    // marks v2 as current
   ```
4. Old installs get the block screen on next launch; new installs proceed
   normally.

> If you only want a **soft nudge** (dismissible, "an update is available" toast)
> and not a hard block, set `LATEST_VERSION_CODE` higher than the installed
> version but leave `MIN_VERSION_CODE` alone.

---

## Generating `TELEMETRY_SECRET`

Run once, paste the output into Railway as `TELEMETRY_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output (don't use this one — generate your own):
```
5f9c8a1b2d7e4f3a6c8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a
```

This secret is what the app sends as `x-telemetry-secret` when it flushes
telemetry events, and what you send as `x-diag-secret` to get the real pg
error from `/health` when the DB is down. Anyone who knows it can write to
`telemetry_events` — keep it out of git, chat, and screenshots.

---

## Quick sanity checks after changing vars

```bash
# Public health — should be {"status":"ok","db":"connected","ts":...}
curl https://api.hanumanksk.in/health

# Force-update config — should reflect the values you set
curl https://api.hanumanksk.in/api/config

# Diagnostic health (only when db is disconnected and you want the real error)
curl -H "x-diag-secret: <your TELEMETRY_SECRET>" https://api.hanumanksk.in/health
```
