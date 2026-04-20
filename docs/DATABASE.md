# Database architecture

The app never talks to Postgres directly. Everything flows through the Express
backend in `backend/`, which is deployed to Railway and exposed on
`https://api.hanumanksk.in`. The backend keeps **three logical pools** so read,
write, and analytics traffic are isolated.

```
Android app (Retrofit)
        │  HTTPS
        ▼
Railway ── hhg-apk service (Express)
        │
        ├── pool.r    → AWS RDS (read-only user)   — farmers, patti, rates, notices
        ├── pool.w    → AWS RDS (postgres user)    — telemetry inserts, future writes
        └── pool.neon → Neon Postgres              — AgriSight market-trend data
```

## Why three pools?

1. **Least privilege.** Almost every request the app makes is a read. Running
   those through a `ro` Postgres user means a SQL-injection bug in one of the
   read routes can never `UPDATE` or `DELETE` production rows.
2. **Different source of truth.** AgriSight / market-trend data lives on a
   separate Neon database owned by the data team. Keeping that as its own pool
   means a Neon outage doesn't take down farmer logins, and vice versa.
3. **Future write split.** Telemetry already needs writes. When the app grows
   features like "mark farmer interest" or "request callback", they'll land on
   `pool.w` without the rest of the codebase having to change.

## Environment variables

Set these in Railway → your service → **Variables**. Each is optional; anything
unset falls back to the legacy single `DATABASE_URL` so older deploys keep
working without changes.

| Variable | Pool | Purpose |
|---|---|---|
| `DATABASE_URLR` | `r` | AWS RDS read-only connection string |
| `DATABASE_URLW` | `w` | AWS RDS read-write connection string |
| `NEON_DB_CONNECTION_STRING` | `neon` | Neon Postgres (AgriSight) |
| `DATABASE_URL` | `r` and `w` fallback | Legacy single URL — only read if the specific var above is missing |

Accepted aliases (some deployments use underscored names):
- `DATABASE_URL_R` → same as `DATABASE_URLR`
- `DATABASE_URL_W` → same as `DATABASE_URLW`
- `NEON_DATABASE_URL` → same as `NEON_DB_CONNECTION_STRING`

### Example connection strings

```
DATABASE_URLR=postgresql://ro:<password>@database-1.crmeg4w68enj.ap-south-1.rds.amazonaws.com/hhg
DATABASE_URLW=postgresql://postgres:<password>@database-1.crmeg4w68enj.ap-south-1.rds.amazonaws.com/hhg
NEON_DB_CONNECTION_STRING=postgresql://neondb_owner:<password>@ep-xxxxx.aws.neon.tech/neondb?sslmode=require
```

`?sslmode=require` in the URL is **optional** — the backend forces its own
SSL config (`rejectUnauthorized: false`) regardless, so the parameter is
ignored. It is safe to leave it in or strip it out.

## How each route picks a pool

| Route | Pool | SQL target |
|---|---|---|
| `GET /api/farmer/:uid` | `r` | `farmers`, `entry`, `vendormemo` |
| `GET /api/farmer/exists/:uid` | `r` | `farmers` |
| `GET /api/rates/hundekari` | `r` | `market_rates`, `vegetables` |
| `GET /api/notices` | `r` | `whatsapp_messages` |
| `GET /api/config` | none | reads env vars only |
| `POST /api/telemetry` | `w` | `telemetry_events` |
| *(future)* `GET /api/agrisight/...` | `neon` | AgriSight-owned tables |
| `GET /health` | `r` | `SELECT 1` |

A route selects a pool by destructuring from the shared module:

```js
const { w: pool } = require('../db/pool');   // writes
// or
const pool = require('../db/pool');          // default → r (reads)
```

The default export is still the `r` pool for backwards compatibility with older
route files that used `require('../db/pool')` and immediately called `.query()`.

## Driver config (what `pool.js` does)

- **NUMERIC → Number** and **BIGINT → Number** type parsers are registered
  globally. Without this, node-pg returns NUMERIC as a JS string, which Moshi
  on the Android side cannot deserialize into `Double`.
- SSL is configured programmatically as `{ rejectUnauthorized: false }`. AWS
  RDS presents a cert signed by Amazon's private CA that Node's default trust
  store doesn't recognize. We still get encryption in transit — we only skip
  the trust-chain verification step.
- Pool size is capped at `max: 10` per pool with a 10 s connect timeout. Three
  pools × 10 connections is well under RDS's default connection limit.

## Known quirks

- **`sslmode=require` in the URL** triggers a `pg-connection-string` warning
  at startup: *"treated as an alias for 'verify-full'"*. Harmless — we override
  with the explicit `ssl` option. Strip the `?sslmode=require` suffix to
  silence the warning.
- **Numeric scaling.** The webapp stores some rates as `rate × 10`. If a route
  ever exposes those directly, divide by 10 before returning. The current
  `GET /api/rates/hundekari` returns `market_rates.hundekari` which is already
  in rupees.
- **`DATABASE_URL` is optional on Railway** as soon as the three named URLs are
  set. Keep it set to the R connection string during the transition so
  anything still reading the legacy name keeps working.

## Health and diagnostics

- `GET /health` — public, returns `{ status, db, ts }`. No infra details.
- `GET /health` with header `x-diag-secret: <TELEMETRY_SECRET>` — returns the
  real pg error, code, and host when the DB is down. Use this for one-off
  debugging without opening Railway logs.
- Railway logs (`Deployments → <id> → Logs`) are the source of truth for pool
  errors; every pool failure prints `[pg pool:<label>] <message>`.

## Changing credentials or rotating secrets

1. Update the RDS/Neon password in AWS/Neon.
2. Update the matching Railway variable (`DATABASE_URLR`, etc.).
3. Railway auto-redeploys. Check `/health` flips back to `connected` within
   ~30 seconds of the new deploy going live.

No Android rebuild is needed — credentials live in the backend only.

## Security notes

- Credentials never leave Railway. The Android app only ever sees
  `api.hanumanksk.in`, which is HTTPS and has no direct database access.
- Telemetry writes require `x-telemetry-secret` matching `TELEMETRY_SECRET`.
- The RDS security group must allow inbound 5432 from Railway's outbound IPs.
  If it currently allows the webapp's IPs but not Railway's, enable
  **Settings → Static Outbound IPs** on the Railway service and whitelist that
  IP in AWS, or open 5432 to 0.0.0.0/0 as a quick unblock.
