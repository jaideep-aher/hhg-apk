# Webapp → Backend API migration plan

**Goal:** make `android/backend/` (Express, `api.hanumanksk.in`) the **only**
service that talks to Postgres. The Next.js webapp (`android/webapp/`, hosted
on Railway at a separate service — currently `1.aher.dev`) should fetch every
piece of data from the Express API instead of opening its own DB pool.

## Why this matters

Today the webapp holds **its own `DATABASE_URLR` env var** and runs queries
against Postgres directly from server actions in `src/server/dbfunctions.js`.
That means:

- Database credentials live in **two** Railway services instead of one.
  Rotating a password = touching two services and hoping neither caches an
  old connection.
- The same query is implemented twice — once in Express, once in the webapp —
  and the two can drift. A farmer could theoretically see different balances
  on the native Android home screen vs. the WebView farmer dashboard.
- The `pg` pool in Next.js has burned us on cold starts before (first request
  after deploy = 5–15s latency). Calling a warm Express service instead is
  materially faster for users.
- Writes from two services to one DB is a bug waiting to happen.

## End state

```
Android shell ──────────────►  Express  ─────►  Postgres
                                │
Next.js webapp ─────────────────┘
```

- `android/webapp/src/server/` folder is **deleted**.
- `android/webapp/package.json` no longer depends on `pg` or `dotenv`.
- Railway service for the webapp has **zero** DB env vars.
- Every data read in the webapp is `fetch('https://api.hanumanksk.in/api/...')`
  (or through a tiny typed client at `src/lib/api.js`).
- Every UI string about "connection error" comes from our localized catalog,
  never from a thrown DB error message — no hostnames, no query text.

## Slice A (done)

- [x] Removed the `submitInterest` feature from the webapp. With it gone, the
      webapp no longer has any write path, so `DATABASE_URLW` must not be
      provisioned on the webapp Railway service.
- [x] Deleted `runPriviligedQuery` from `src/server/dbfunctions.js`.
- [x] Backend config (`android/backend/.env.example`) and app defaults
      updated to stop exposing `hhgfarmers.vercel.app` and to carry a
      fallback URL.

## Slice B (next — do in order, each is independent)

| # | Webapp function to retire | Existing Express endpoint | Work needed |
|--:|---|---|---|
| 1 | `getFarmerDataUsingId` | `GET /api/farmer/:id?from=&to=&page=&limit=` | Check signature matches; swap `runQuery` → `fetch`. |
| 2 | `getAllAds` | `GET /api/localvyapar/ads` | Swap `runQuery` → `fetch`. |
| 3 | `getMarketRates` | `GET /api/rates/hundekari?item=&from=&to=` | Confirm date-range params match. |
| 4 | `getNotificationsForFarmers` | `GET /api/notices` | Direct swap. |
| 5 | `farmerExists` | `GET /api/farmer/:id/exists` (add) | Add 10-line Express route. |
| 6 | `getFarmerMonthlyIncomeDataUsingId` | `GET /api/farmer/:id/income-monthly` (add) | Port query from `dbfunctions.js` to `android/backend/src/routes/farmer.js`. |
| 7 | `getVendorItemRatesForItem` | `GET /api/rates/vendor?item=` (add) | Port query. |
| 8 | `getAllItems` | `GET /api/localvyapar/items` (add) | Port query. |
| 9 | `getAllBags` | `GET /api/seeds/bags` (add) | Port query; probably means a new `routes/seeds.js`. |

Per item, the workflow is:

1. Add / update the Express endpoint in `android/backend/src/routes/`.
2. Deploy Express (Railway redeploys automatically on push to `main`).
3. In `android/webapp/src/app/...`, replace the `await fn(...)` call with
   `await fetch('${API_BASE_URL}/api/...').then(r => r.json())`. API base URL
   should come from `process.env.NEXT_PUBLIC_API_BASE_URL`.
4. Delete the corresponding function from `dbfunctions.js`.
5. Deploy webapp. Verify the page still loads; hit the Android app to confirm
   nothing regressed.

Once all nine are migrated:

- Delete `android/webapp/src/server/dbfunctions.js`, `Context.js`, and the
  whole `src/server/` folder.
- Remove `pg` and `dotenv` from `android/webapp/package.json`.
- Remove `DATABASE_URLR` from the webapp Railway service's variables.

## Error-message contract

Whether a query lands in Express or in Next.js, **no user-facing error is
allowed to contain a hostname, a SQL statement, or a stack trace**. The
Android shell enforces this via `NetworkErrors.kt`. The webapp should do the
same: every `catch` should set a localized Marathi/English string like
"सेवा सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा." and log
the underlying exception *class name* (not `.message`) to PostHog if at all.

## What not to do

- Don't expose `api.hanumanksk.in` in any error string. Use "सेवा" /
  "service" / "network" — never the hostname.
- Don't add new DB queries to `dbfunctions.js` in the meantime. Any new data
  need should go straight into Express and be consumed via `fetch`.
- Don't give the webapp Railway service `DATABASE_URLW`. It has no write
  path anymore.
