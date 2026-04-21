# Phone Auth & Unified Identity — Architecture

> Status: Design locked. Ready for staged implementation.
> Owner: Jaideep. Last review: 2026-04-21.
> Scale target: 2k users today, clean path to 20k. Region: India (DPDP Act 2023 applies).

---

## 1. Why this exists

Today the app has three problems:

1. **No real identity.** The only "login" is typing a 5-digit farmer UID. Anyone who guesses a UID gets that farmer's data. The backend (`backend/src/routes/farmer.js`) trusts the URL blindly.
2. **Scraping / abuse risk.** No way to tell a real user from a script. No way to rate-limit per-human.
3. **Non-customers are invisible.** People open the app to check market rates without entering a UID — we never learn who they are or where demand exists. That's a lost sales funnel.

The fix: make **Firebase Phone Auth** the gate for the whole app, key every record on a stable `user_id`, and collect a minimum onboarding profile (name, village, crops grown) from everyone — customer or prospect.

---

## 2. Core mental model

> **Phone = authentication.** Proves who opened the app.
> **5-digit farmer ID = business linkage.** Proves you're an HHG customer.
> **user_id (Firebase UID) = canonical key everywhere.**

These are three different things. Today they're tangled. Untangling them is the real win.

| Concept | Source of truth | Lifetime | Example |
|---|---|---|---|
| `user_id` | Firebase Auth | Permanent, immutable | `k3Jf9aP...` (28 char) |
| `phone_e164` | Firebase Auth | Mutable (user can change) | `+919876543210` |
| `farmer_uid` | Postgres `farmers` table | Assigned by HHG | `12345` |

**Internal code uses `user_id`, never `firebase_uid`.** Firebase is an implementation detail of the auth middleware; the rest of the codebase is vendor-neutral. If we ever move to Cognito/Auth0/custom, only the middleware changes.

---

## 3. Decisions locked

| # | Decision | Rationale |
|---|---|---|
| D1 | Firebase Phone Auth is required for every app open | Accountability + anti-scraping |
| D2 | `user_id` is the canonical key in Postgres + Firestore; phone stored as attribute | Phone numbers recycle; UID is immutable |
| D3 | One phone → many farmer IDs (soft-cap 10, hard-cap 15) | Rural households share phones |
| D4 | Three session actions: **Switch Account**, **Unlink Farmer**, **Log Out** | Different user intents, WhatsApp Business pattern |
| D5 | Prospects and customers live in one `user_profiles` table, flagged `is_customer` | One pipeline, one dashboard |
| D6 | Crops stored in dedicated `user_crops` table with controlled vocabulary | JSONB kills the sales query "farmers in district X growing crop Y" |
| D7 | No explicit bootstrap endpoint — auth middleware lazy-upserts profile | Eliminates the bootstrap race |
| D8 | App Check + Play Integrity enforced on all `/api/*` | Blocks scrapers even with a valid OTP token |
| D9 | Firestore pings keyed by `users/{user_id}/pings`, 180-day TTL + daily aggregation | Cost control, fast queries |
| D10 | Billing hard-cap with auto-disable Cloud Function | Outage > bankruptcy |
| D11 | Firestore region = `asia-south1` (Mumbai); RDS = `ap-south-1` | DPDP data residency |
| D12 | Consent screen + "Delete my account" endpoint | DPDP Act 2023 |

---

## 4. Data model

### 4.1 Postgres (business data, new)

```sql
-- Everyone who verifies a phone number ends up here.
CREATE TABLE user_profiles (
  user_id          TEXT PRIMARY KEY,              -- Firebase UID; internally user_id
  phone_e164       TEXT UNIQUE NOT NULL,
  phone_hash       TEXT NOT NULL,                 -- never log raw phone
  display_name     TEXT,
  village          TEXT,
  district         TEXT,
  state            TEXT,
  is_customer      BOOLEAN NOT NULL DEFAULT false,
  onboarded_at     TIMESTAMPTZ,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_version      TEXT,
  device_model     TEXT,
  consent_version  TEXT,                          -- DPDP audit trail
  consent_at       TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ                    -- soft delete for DPDP erasure
);
CREATE INDEX ON user_profiles (phone_e164);
CREATE INDEX ON user_profiles (is_customer, village);
CREATE INDEX ON user_profiles (last_seen_at);

-- Many-to-many: one phone can own multiple farmer IDs (household case).
CREATE TABLE user_farmer_links (
  user_id             TEXT NOT NULL REFERENCES user_profiles(user_id),
  farmer_uid          TEXT NOT NULL,              -- soft FK to legacy farmers.uid
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at         TIMESTAMPTZ,
  link_count_snapshot INT,                        -- Nth link for audit
  flagged             BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, farmer_uid)
);
CREATE INDEX ON user_farmer_links (farmer_uid);
CREATE INDEX ON user_farmer_links (user_id) WHERE unlinked_at IS NULL;

CREATE TABLE crop_catalog (
  crop_key    TEXT PRIMARY KEY,                   -- 'turmeric', 'paddy', ...
  display_en  TEXT NOT NULL,
  display_hi  TEXT,
  category    TEXT,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE user_crops (
  user_id    TEXT NOT NULL REFERENCES user_profiles(user_id),
  crop_key   TEXT NOT NULL REFERENCES crop_catalog(crop_key),
  season     TEXT,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, crop_key)
);
CREATE INDEX ON user_crops (crop_key) WHERE removed_at IS NULL;

CREATE TABLE auth_events (
  id         BIGSERIAL PRIMARY KEY,
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  event      TEXT NOT NULL,
  user_id    TEXT,
  phone_hash TEXT,
  meta       JSONB
);
CREATE INDEX ON auth_events (event, ts);
CREATE INDEX ON auth_events (user_id, ts);
```

**Legacy `farmers`, `entry`, `vendormemo` tables are untouched.** They keep their own primary keys. New user records reference them via `user_farmer_links.farmer_uid`.

### 4.2 Firestore (location)

```
users/{user_id}
  phone, lastLat, lastLng, lastPingAt, linkedFarmerIds[], appVersion

users/{user_id}/pings/{autoId}             # raw pings; native TTL 180 days
  lat, lng, accuracy, source, ts, appVer, ttl

users/{user_id}/daily_summaries/{yyyy-mm-dd}   # kept forever
  firstPingAt, lastPingAt, centroidLat, centroidLng, distanceMeters, pingCount
```

Old `farmers/{uid}/pings` tree will be **deleted** after cutover (§8). Backup first: `gcloud firestore export gs://<bucket>/backup-pre-cutover`.

---

## 5. Component architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Android App (Kotlin + Compose)                                 │
│                                                                 │
│  AuthRepository ──────────► FirebaseAuth (Play Integrity gated) │
│       │                          │                              │
│       │                          ▼                              │
│       │                     OTP SMS (India region, quota-capped)│
│       ▼                                                         │
│  SessionStore (DataStore):                                      │
│    user_id, phone_e164, active_farmer_uid (nullable),           │
│    onboarding_done, consent_version                             │
│       │                                                         │
│       ▼                                                         │
│  ApiClient (OkHttp):                                            │
│    - Auth interceptor: Bearer <FirebaseIdToken>                 │
│    - App Check interceptor: X-Firebase-AppCheck                 │
│    - Idempotency interceptor: Idempotency-Key on writes         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Express, Railway, Node 20)                            │
│                                                                 │
│  middleware/appCheck.js   → verifyAppCheckToken()               │
│  middleware/auth.js       → verifyIdToken() + lazy upsert       │
│  middleware/rateLimit.js  → per-user_id & per-route buckets     │
│  middleware/idempotency.js→ Idempotency-Key dedupe              │
│                                                                 │
│  routes/                                                        │
│    auth.js        (me, link, unlink, delete)                    │
│    onboarding.js  (name, village, crops)                        │
│    farmer.js      (scoped to req.user_id)                       │
│    rates.js, notices.js   (authed)                              │
│                                                                 │
│  lib/firebase-admin.js  (service account from env var)          │
│  lib/telemetry.js       (auth_events writer)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
         ┌───────────────┐         ┌───────────────┐
         │  Postgres     │         │  Firestore    │
         │  (RDS Mumbai) │         │  (asia-south1)│
         └───────────────┘         └───────────────┘

Ops / guardrails
  GCP Billing budget + Cloud Function auto-disable
  Firebase Auth SMS daily quota (hard cap)
  Scheduled Cloud Function: daily_summaries rollup
  Firestore native TTL policy on users/*/pings
```

---

## 6. User flows

### 6.1 First-time user (happy path)

```
┌──────────┐
│ App Open │
└────┬─────┘
     ▼
┌─────────────────────┐ no session  ┌──────────────────────┐
│ Firebase persisted  ├────────────▶│ Consent screen (DPDP)│
│ session?            │             │  Phone, location,    │
└────┬────────────────┘             │  profile. India only.│
     │ yes                          │   [I agree]          │
     ▼                              └────┬─────────────────┘
 (skip to 6.2)                           ▼
                                    ┌──────────────────┐
                                    │ Phone entry +91  │
                                    └────┬─────────────┘
                                         ▼
                       Play Integrity + App Check gate
                                         ▼
                                    ┌──────────────────┐
                                    │ OTP sent         │
                                    │ max 3/hr/phone   │
                                    └────┬─────────────┘
                                         ▼
                                    ┌──────────────────┐
                                    │ OTP entry (6)    │
                                    │ 5 attempts max   │
                                    │ voice fallback   │
                                    │ after 2nd fail   │
                                    └────┬─────────────┘
                                         ▼ verified
                                    ┌──────────────────────────┐
                                    │ First authed API call    │
                                    │  → middleware lazy-upsert│
                                    │    user_profiles row     │
                                    └────┬─────────────────────┘
                                         ▼
                              ┌──────────────────────────┐
                              │ "Do you have an HHG      │
                              │  5-digit farmer ID?"     │
                              │  [Yes]       [Show rates]│
                              └───┬───────────────┬──────┘
                                  │Yes            │No
                                  ▼               ▼
                          ┌──────────────┐   ┌──────────────────┐
                          │ Enter 5-digit│   │ Name + Village   │
                          │ Lookup in    │   │ required         │
                          │ farmers tbl  │   └────┬─────────────┘
                          │ Create link  │        │
                          │ Pull name/   │        │
                          │ village      │        │
                          │ is_customer= │        │
                          │ true         │        │
                          └──────┬───────┘        │
                                 └────────┬───────┘
                                          ▼
                              ┌──────────────────────────┐
                              │ "What do you grow?"      │
                              │ chips, multi-select,     │
                              │ min 1; Other→review Q    │
                              └──────┬───────────────────┘
                                     ▼
                              ┌──────────────────────────┐
                              │ Pitch screen             │
                              │ Live rates + buyers      │
                              │  [Continue]              │
                              └──────┬───────────────────┘
                                     ▼
                                ┌──────────┐
                                │   Home   │
                                └──────────┘
```

### 6.2 Returning user

```
App Open → cached Firebase session → silent ID-token refresh
        → first API call lazy-upserts last_seen_at → Home
```

Instant. Majority case.

### 6.3 Reinstall / new device (same phone)

```
App Open → no local session → OTP → verified
        → backend sees existing user_id
        → loads linked farmer IDs + saved crops
        → skip onboarding, straight to Home
```

### 6.4 Linking another farmer ID

```
Home → menu → "Add farmer account" → enter 5-digit UID
     → backend:
         - count active links
         - if ≥10: warning, confirm
         - if ≥15: reject 409
         - if 5+ links in last 24h: flag + suspend
     → on success: link row created
```

### 6.5 Three session actions

| Action | What it does | Re-OTP? | Location |
|---|---|---|---|
| **Switch Account** | Change `active_farmer_uid` in SessionStore | No | Top-bar dropdown |
| **Unlink Farmer** | Set `unlinked_at` on one link row | No | Settings → Linked Accounts |
| **Log Out** | `FirebaseAuth.signOut()` + clear SessionStore | Yes next open | Settings → red |
| **Delete my account** (DPDP) | Soft-delete profile, wipe pings, revoke Firebase user | Permanent | Settings → bottom |

### 6.6 Backend request (every API call)

```
App request
  Headers:
    Authorization: Bearer <Firebase ID token>
    X-Firebase-AppCheck: <App Check token>
    Idempotency-Key: <uuid>    (writes only)
   │
   ▼
appCheck middleware       reject if missing/invalid
   ▼
auth middleware           verifyIdToken()
                          lazy-upsert user_profiles ON CONFLICT
                          set req.user_id, req.phone
   ▼
rateLimit middleware      per-user_id bucket (30/min)
   ▼
idempotency middleware    dedupe on key (writes only, 24h)
   ▼
route handler             queries scoped to req.user_id
```

---

## 7. Security & compliance

### 7.1 Threat model

| Threat | Mitigation |
|---|---|
| Scraping `/api/farmer/:uid` | Auth middleware; farmer routes require `user_farmer_links` membership |
| OTP bombing (burn SMS budget) | App Check + Firebase per-phone throttle + backend rate limit + SMS daily hard cap |
| Token theft | 1h token lifetime + App Check bound to signed APK |
| Phone recycling → new user inherits old data | Canonical key is `user_id`, not phone |
| Household abused to link 100 farmer IDs | Hard cap 15, anomaly flag at 5/day |
| Fake device / emulator | Play Integrity |
| Replay of writes on flaky rural networks | Idempotency-Key on every mutating endpoint |

### 7.2 DPDP Act 2023 checklist

- [x] Data residency (Firestore `asia-south1`, RDS `ap-south-1`)
- [x] Informed consent screen before data collection
- [x] Purpose limitation documented in privacy policy
- [x] Right to erasure — "Delete my account"
- [x] Audit trail — `consent_version`, `consent_at`, `auth_events`
- [x] No raw phone numbers in logs — hash first
- [x] Minimum data principle

### 7.3 Secrets

| Secret | Where | Rotation |
|---|---|---|
| Firebase Admin service account JSON | Railway env `FIREBASE_SERVICE_ACCOUNT` (base64) | Yearly |
| Upload keystore | Local `upload-keystore.jks`, gitignored | Never (Play Store pin) |
| `google-services.json` prod | `android/app/`, gitignored | On Firebase key rotation |

---

## 8. Cutover plan (safe, reversible)

1. **Backend auth middleware in log-only mode.** 3–5 days.
2. **New tables empty.** App unchanged.
3. **App phone-auth behind Remote Config flag** `auth.phone_required` rolled 5% → 25% → 100% over a week.
4. **`farmers.mobilenumber` data audit:**
   ```sql
   SELECT COUNT(*) AS total,
          COUNT(DISTINCT mobilenumber) AS distinct_phones,
          COUNT(*) FILTER (WHERE mobilenumber ~ '^\+?91?[6-9][0-9]{9}$') AS valid_format
   FROM farmers;
   ```
   If `valid_format/total < 0.8`, fix before auto-link.
5. **Dual-write pings** to `farmers/{uid}/pings` AND `users/{user_id}/pings` for 2 weeks.
6. **Enable App Check + Play Integrity.**
7. **Force-update minimum app version** via `/api/config`.
8. **Flip auth middleware log-only → enforce.**
9. **Dashboard migration** to new Firestore paths.
10. **Stop dual-write.**
11. **Backup + delete old Firestore tree:**
    ```bash
    gcloud firestore export gs://hhg-backup/pre-cutover-$(date +%F)
    firebase firestore:delete farmers --recursive --project <project-id>
    ```

### Rollback

| Stage | Rollback |
|---|---|
| 1–2 | Remove middleware |
| 3 | Remote Config → 0% |
| 5 | Stop new writes, dashboards read old path |
| 7–8 | Lower min version; middleware back to log-only |
| 11 | Restore from export bucket |

---

## 9. Guardrails (mechanisms, not intentions)

| Mechanism | Where | Trigger |
|---|---|---|
| Lazy-upsert auth middleware | `backend/src/middleware/auth.js` | Every authed request |
| Anomaly detector on linking | `routes/auth.js` link endpoint | 5+ links/day → flag, suspend at 8 |
| Hard cap on farmer links | Same | 15 active → 409 |
| OTP retry limits | Android + Firebase | 3 sends/hr, 5 wrong → 30-min lockout |
| Exponential resend backoff | Android | 30s → 60s → 120s |
| Voice-OTP fallback | `PhoneAuthProvider` | After 2nd failed SMS |
| Per-user rate limit | `express-rate-limit` | 30 req/min |
| SMS daily hard cap | Firebase console | 500/day India |
| GCP billing hard-cap | Cloud Function on budget Pub/Sub | Disables Firebase Auth API on budget exceed |
| Firestore native TTL | Policy on `users/*/pings` | 180 days |
| Daily aggregation | Scheduled Cloud Function | Rolls pings → `daily_summaries` |
| Circuit breaker on verify | Auth middleware | >50% fail for 60s → degraded read-only |
| Pre-flight phone format | Android | Reject non-+91 pre-SMS |
| Idempotency keys | Write middleware | 24h dedupe |
| Telemetry funnel | `auth_events` | See §10 |
| Canary rollout | Remote Config | `auth.phone_required.rollout_percent` |

---

## 10. Observability

Emit to `auth_events`:

```
auth.otp_requested       { phone_prefix, app_version }
auth.otp_sent            { phone_prefix, latency_ms }
auth.otp_verified        { phone_prefix, attempts }
auth.otp_failed          { phone_prefix, reason, attempts }
auth.profile_created     { is_customer, had_prefilled_data }
auth.onboarding_complete { crops_count, is_customer }
auth.linked_farmer       { link_count_for_user }
auth.link_blocked        { reason, link_count_for_user }
auth.delete_requested    { reason }
```

Single funnel dashboard (Postgres view + tiny chart). Alert if any stage drops >15% DoD.

**Never log raw phone numbers.** Hash `SHA-256(phone + pepper)[0:12]` or prefix-only `+9198765xxxxx`.

---

## 11. Scalability ceilings

| Pillar | 2k | 20k | 200k |
|---|---|---|---|
| Postgres (Railway → RDS) | Fine | Fine, indexes | Read replica, partition `auth_events` |
| Firestore pings (w/ TTL+agg) | ~$1/mo | ~$15/mo | ~$80/mo |
| Firebase Auth SMS | ~$5/mo | ~$80/mo | Migrate to MSG91/Gupshup, ~$400/mo |
| Express on Railway | Fine | Autoscale or Cloud Run | Cloud Run/k8s + CDN |
| Sales queries | Trivial | Indexes | BigQuery nightly export |
| Ops | One person | Runbooks | On-call rotation |

**First real choke at 20k is SMS cost.** Plan provider migration then, not now.

---

## 12. Explicitly out of scope (frugality)

- Redis / distributed cache
- Admin SSO for internal dashboard (IP allowlist is enough)
- Multi-region deployment
- Own feature-flag framework (Remote Config is enough)
- Marketplace/buyer-side app (pitch screen is aspirational v1)
- Village gazetteer autocomplete (free-text now; clean at 5k users)
- Crop "Other" moderation UI (Google Sheet queue)

---

## 13. Open questions for the product owner

1. Crop vocabulary — starter list for the region?
2. Privacy policy URL?
3. SMS hard-cap value — **500/day** proposed.
4. `/api/rates/*` — require auth (captures prospect phones) or public?
5. Delete-my-account grace period — **0 days** (immediate) proposed.

---

## 14. Glossary

- **user_id** — internal canonical user key. Equal to Firebase UID today.
- **farmer_uid** — 5-digit HHG customer ID. A business record, not a person.
- **E.164** — `+919876543210`.
- **App Check** — Firebase attestation that the request came from your signed APK.
- **Play Integrity** — Google device/app attestation; App Check's Android provider.
- **DPDP** — Digital Personal Data Protection Act, India, 2023.
- **Idempotency key** — client UUID per write; backend dedupes retries.
