# Phone Auth — Implementation Playbook (3 Stages)

> Companion to [PHONE_AUTH_ARCHITECTURE.md](./PHONE_AUTH_ARCHITECTURE.md).
> Paste each stage's prompt into a fresh Claude Code session, verify the stage lands clean, then paste the next.
> Each stage is designed to be mergeable on its own — if you stop after Stage 1, nothing breaks.

---

## How to use this doc

- **Stage 1** — Backend foundation. New tables, auth middleware in log-only mode, App Check + rate-limit scaffolding. Nothing in the app changes yet. Safe to deploy to production.
- **Stage 2** — Android phone-auth UI + onboarding + session migration. Behind a Remote Config flag (`auth.phone_required`) so you roll out gradually.
- **Stage 3** — Cutover + hardening. Flip middleware to enforce mode, migrate location pings, enable retention + daily aggregation, delete legacy data, set up billing auto-cutoff.

Between stages: verify with the checklist. Do not skip checklists — they're the rollback net.

---

## Pre-flight (do ONCE, before Stage 1)

Run these yourself; they need your credentials and judgement:

- [ ] **Firestore region check.** Firebase console → Firestore → Settings. Must be `asia-south1` (Mumbai) or `asia-south2` (Delhi). If it's `nam5`/`us-central`, stop — region can't be changed, you need a new Firestore project and a dual-write migration. Open a separate task for that.
- [ ] **Postgres region check.** Should be `ap-south-1` (Mumbai) or close. Railway → service → region.
- [ ] **Upgrade Firebase to Blaze plan.** Spark (free) only allows 10 SMS/day. You will exhaust it in 30 minutes. Blaze is pay-as-you-go; free tiers of other services still apply.
- [ ] **Set GCP Budget alert** at $30 and $50/month in Google Cloud Console → Billing → Budgets → Create. Email to you. (Auto-cutoff Cloud Function comes in Stage 3.)
- [ ] **Set SMS region quota** in Firebase Console → Authentication → Settings → SMS region controls. Cap India at 500/day. Block everything else.
- [ ] **Create privacy policy page** (a simple hosted URL is fine). Needed for the consent screen in Stage 2.
- [ ] **Data audit for existing farmers:**
  ```sql
  SELECT COUNT(*) AS total,
         COUNT(DISTINCT mobilenumber) AS distinct_phones,
         COUNT(*) FILTER (WHERE mobilenumber ~ '^\+?91?[6-9][0-9]{9}$') AS valid_format
  FROM farmers;
  ```
  If `valid_format / total < 0.8`, clean up `farmers.mobilenumber` before Stage 2 auto-link.

---

## Stage 1 — Backend foundation (log-only, zero user-visible change)

### Goal

Add the new data model and auth infrastructure on the backend without any app-side changes. Middleware verifies tokens and logs failures but lets everything through. Safe to deploy immediately.

### Prompt to paste

```
You are working in the repo at /Users/jaideep/projects/hhg apk/android (backend code lives in backend/).
Read docs/PHONE_AUTH_ARCHITECTURE.md first — it is the spec. Your job is Stage 1 only.

Implement the following in the backend:

1. Install dependencies: firebase-admin, express-rate-limit, uuid.

2. Add lib/firebase-admin.js that initializes Firebase Admin from env var
   FIREBASE_SERVICE_ACCOUNT (base64-encoded JSON). Export `auth` and `appCheck` handles.
   Fail fast with a clear error if the env var is missing.

3. Create migrations for Postgres (use the project's existing migration tool; if none, add a simple
   sql-migrate setup). Tables exactly per §4.1 of the architecture doc:
   user_profiles, user_farmer_links, crop_catalog, user_crops, auth_events. Include all indexes.
   Seed crop_catalog with 20 common Indian crops (wheat, paddy, cotton, sugarcane, turmeric,
   soyabean, gram, tur, groundnut, onion, tomato, potato, grapes, pomegranate, banana, maize,
   bajra, jowar, mustard, sunflower) with display_en, display_hi, category.

4. Add middleware/auth.js:
   - Reads Authorization: Bearer <token>
   - verifyIdToken() via firebase-admin
   - LAZY UPSERT into user_profiles (ON CONFLICT DO UPDATE SET last_seen_at = now())
     — this is the bootstrap-race fix from §9
   - Attaches req.user_id and req.phone
   - LOG-ONLY MODE: controlled by env var AUTH_ENFORCE=false (default false in Stage 1).
     When false: verify if token present, log to auth_events, but NEVER reject — even invalid tokens
     pass through with req.user_id = null. When true: reject missing/invalid with 401.
   - Record auth_events: auth.request_authed, auth.request_unauthed, auth.verify_failed.

5. Add middleware/appCheck.js the same way: verifies X-Firebase-AppCheck header. Log-only via
   APPCHECK_ENFORCE=false (default false).

6. Add middleware/rateLimit.js: per-user_id bucket (30 req/min) using express-rate-limit with a
   custom keyGenerator that prefers req.user_id, falls back to IP. Skip in test env.

7. Add middleware/idempotency.js: for POST/PUT/PATCH/DELETE, reads Idempotency-Key header; if
   present, checks a small table idempotency_keys (create the migration too: key TEXT PK,
   user_id TEXT, response_status INT, response_body JSONB, created_at TIMESTAMPTZ). Returns the
   stored response if key seen in last 24h. Otherwise proceeds and stores result.

8. Add lib/phoneHash.js: SHA-256(phone + process.env.PHONE_PEPPER)[0:12]. Never log raw phones.

9. Wire the middleware chain in src/app.js (or the main Express setup file) in order:
   appCheck → auth → rateLimit → (per-route) idempotency.
   Mount on /api/* only; leave /healthz and similar infra routes unauthed.

10. Do NOT change any existing route behavior yet. Existing routes should keep working for old
    clients (because AUTH_ENFORCE=false).

11. Add routes/auth.js with these endpoints (all authed, but work in log-only mode too):
    - GET /api/auth/me → returns profile + active links + crops
    - POST /api/auth/link-farmer { farmer_uid } → link, with soft-cap 10 warn, hard-cap 15 reject,
      and anomaly flag if ≥5 links/day for this user. Record auth_events on every attempt
      (linked_farmer, link_blocked).
    - POST /api/auth/unlink-farmer { farmer_uid } → sets unlinked_at
    - POST /api/auth/onboarding { display_name, village, crops: [crop_key] } → upserts profile
      + user_crops rows, sets onboarded_at
    - POST /api/auth/consent { version } → records consent_version, consent_at
    - DELETE /api/auth/me → soft-delete profile (deleted_at = now), remove user_crops rows, call
      admin.auth().deleteUser(user_id), return 204

12. Add tests (the repo's existing test framework) for:
    - lazy upsert creates profile on first request, updates last_seen_at on second
    - link-farmer enforces caps (10 warn, 15 reject, 5/day flag)
    - auth middleware in log-only lets invalid tokens through with null user_id
    - idempotency middleware returns cached response on repeat key

13. Update backend README.md with the new env vars: FIREBASE_SERVICE_ACCOUNT, PHONE_PEPPER,
    AUTH_ENFORCE, APPCHECK_ENFORCE.

Do NOT:
- Touch any Android code.
- Enable enforce mode anywhere.
- Delete or modify existing routes' behavior.
- Commit FIREBASE_SERVICE_ACCOUNT to the repo.

When done, print: the new env vars required on Railway, the migration commands to run, and a
curl example that hits /api/auth/me with a fake bearer token so I can verify the middleware is
wired and logging (not rejecting).
```

### Stage 1 acceptance checklist

- [ ] All migrations applied on Railway Postgres
- [ ] Env vars set on Railway: `FIREBASE_SERVICE_ACCOUNT` (base64), `PHONE_PEPPER` (random 32-char), `AUTH_ENFORCE=false`, `APPCHECK_ENFORCE=false`
- [ ] `curl -H "Authorization: Bearer garbage" https://<backend>/api/auth/me` — returns **200** (log-only) or the usual response for old clients
- [ ] `SELECT * FROM auth_events ORDER BY ts DESC LIMIT 20;` shows real `auth.verify_failed` rows from that curl
- [ ] Old app in production still works (check Crashlytics / backend logs for 4xx spikes — should be none)
- [ ] Rate limit triggers at 30/min (test with `ab` or a loop)
- [ ] Run Stage 1 in production for **at least 3 days** watching `auth_events` before moving to Stage 2

---

## Stage 2 — Android phone auth + onboarding (behind Remote Config flag)

### Goal

Build the full phone-auth + onboarding UX in the Android app. Ship it to production gated by a Remote Config flag so you canary 5% → 25% → 100%. Backend is still in log-only mode at the end of this stage — we want old app versions to keep working.

### Prompt to paste

```
You are working in /Users/jaideep/projects/hhg apk/android.
Read docs/PHONE_AUTH_ARCHITECTURE.md (§5, §6, §7) and docs/PHONE_AUTH_IMPLEMENTATION.md before you
start. This is Stage 2: Android changes only; backend stays in log-only mode.

Implement:

1. Gradle deps in app/build.gradle.kts:
   - firebase-bom (latest), firebase-auth-ktx, firebase-appcheck-playintegrity,
     firebase-appcheck-debug (debug builds only), firebase-config-ktx (Remote Config).
   - Keep existing Firestore + Crashlytics deps.

2. App startup (MyApplication.kt or equivalent):
   - Initialize Firebase App Check with PlayIntegrityAppCheckProviderFactory in release builds,
     DebugAppCheckProviderFactory in debug.
   - Install it BEFORE any FirebaseAuth / Firestore call.

3. Remote Config:
   - Key auth.phone_required (boolean, default false).
   - Key auth.consent_version (string, default "2026-04-v1").
   - Fetch on app start, 1h minFetchInterval in release, 0 in debug.

4. Data layer:
   - AuthRepository (replace or augment existing UidAuthRepository): wraps FirebaseAuth. Methods:
     startPhoneVerification(phone, activity): sends OTP, returns verificationId + resend token.
     Supports auto-retrieval callback. Pre-flight: reject non-+91 before calling Firebase.
     verifyOtp(verificationId, code): returns FirebaseUser + ID token.
     signOut(): clears FirebaseAuth and SessionStore.
     changePhone(newPhone): uses FirebaseAuth.currentUser.updatePhoneNumber.
   - SessionStore (DataStore): fields user_id, phone_e164, active_farmer_uid (nullable),
     onboarding_done, consent_version, linked_farmer_uids (set).
   - ApiClient (OkHttp):
     - AuthInterceptor attaches Bearer <FirebaseAuth.getAccessToken(false).result.token>
       on every request; refreshes if expired.
     - AppCheckInterceptor attaches X-Firebase-AppCheck.
     - IdempotencyInterceptor attaches Idempotency-Key UUID on POST/PUT/PATCH/DELETE.
     - Retry with exponential backoff on network failures (max 3).

5. UI — new Compose screens in a feature module or package com.hhg.auth:
   a. ConsentScreen: plain-language DPDP consent text, "We collect phone, location, profile.
      Stored in India." Link to privacy policy (URL from Remote Config key auth.privacy_url).
      Big [I agree] button. On accept: POST /api/auth/consent, save consent_version locally.
   b. PhoneEntryScreen: +91 prefixed input, 10-digit validation, [Send OTP].
      Disabled until valid. Shows SMS-region warning if phone doesn't match.
   c. OtpEntryScreen: 6-digit input, auto-fill from SMS retriever, resend with exponential
      backoff timer (30s → 60s → 120s), max 3 resends per hour (tracked in SessionStore),
      max 5 wrong attempts then 30-min local lockout. After 2nd failure offer voice-OTP button.
   d. OnboardingRouterScreen: after OTP success, calls GET /api/auth/me:
      - If is_customer and onboarded_at not null → Home
      - If auto-linked via mobile match → skip to CropScreen
      - Else → FarmerIdChoiceScreen
   e. FarmerIdChoiceScreen: "Do you have an HHG 5-digit ID?" [Yes, link] / [No, show rates].
   f. FarmerIdEntryScreen: 5-digit input, POST /api/auth/link-farmer. Handles 409 cap reached,
      200 + warning at 10+, 200 ok.
   g. NameVillageScreen: shown only for prospects. Name + village required.
   h. CropScreen: multi-select chips from GET /api/crops/catalog. Min 1. "Other..." chip opens
      a text field; submitted to a review queue (just POST to /api/auth/onboarding with a
      crop_key starting with "other:").
   i. PitchScreen: one screen of aspirational copy about live rates and buyers. [Continue] only.

6. Navigation (existing nav graph): intercept app launch. Order:
   FirebaseAuth.currentUser == null
     → Remote Config auth.phone_required == true → Consent → Phone → Otp → OnboardingRouter
     → else → continue to existing Home (legacy path for canary < 100%)
   FirebaseAuth.currentUser != null
     → if SessionStore.onboarding_done → Home
     → else → OnboardingRouter

7. Location tracker (FarmerLocationTracker or equivalent):
   - KEY BY user_id when a Firebase session exists; fall back to legacy farmer_uid when not.
   - Write BOTH paths during Stage 2 (dual-write):
     users/{user_id}/pings AND farmers/{active_farmer_uid}/pings if a farmer is active.
   - Add a ttl field to every new ping = Timestamp.now() + 180 days (for Stage 3 Firestore TTL).

8. Settings screen: three buttons wired per architecture §6.5:
   - Switch Account (dropdown of linked farmers, changes active_farmer_uid)
   - Unlink Farmer (per-row, with confirm)
   - Log Out (red, bottom)
   - Delete my account (red, very bottom, with "This cannot be undone" confirm).

9. Telemetry: every auth/onboarding step emits a POST /api/telemetry event matching the names
   in architecture §10 (auth.otp_requested, auth.otp_sent, auth.otp_verified, etc.).
   Use existing telemetry plumbing if present.

10. Force-update check stays as-is; add minVersionCode bump guidance to the release notes but
    do NOT bump it yet (we want old clients to keep working through canary).

11. String resources: every user-facing string in strings.xml. Include Hindi translations
    (strings-hi/strings.xml) for the onboarding flow and consent screen.

12. Tests:
    - AuthRepository unit tests (mock FirebaseAuth)
    - SessionStore tests
    - Onboarding router tests for each branch
    - Instrumented test for the OTP flow using Firebase Auth test phone numbers
      (set up via Firebase console Test phone numbers).

Do NOT:
- Remove the legacy farmer_uid login path yet — it must keep working when auth.phone_required=false.
- Enable auth.phone_required in production Remote Config; leave at false.
- Delete old Firestore writes; dual-write is required in Stage 2.

When done, print: the Remote Config keys to set in the console, the set of Firebase test
phone numbers to configure for CI, a checklist of manual QA steps to run before flipping the
5% canary, and the app-side env/config that still needs my input.
```

### Stage 2 acceptance checklist

- [ ] App still launches and works for users with `auth.phone_required=false`
- [ ] With the flag on for a test device: full flow works — Consent → OTP → Onboarding → Home
- [ ] Firebase test phone `+91 9876543210` with code `123456` works in CI
- [ ] App Check token appears in backend logs on every request
- [ ] Location pings visible in BOTH `users/{user_id}/pings` and `farmers/{uid}/pings`
- [ ] Telemetry events visible in `auth_events` for the full funnel
- [ ] Delete-my-account button works end-to-end (row soft-deleted, Firebase user gone)
- [ ] Hindi strings render correctly
- [ ] Canary plan: `auth.phone_required.rollout_percent` on Remote Config set to 5 first, watch `auth_events` for 48h, then 25, then 100. Do not skip.

---

## Stage 3 — Cutover, hardening, data cleanup

### Goal

With 100% of users on phone auth and the dual-write running for ≥2 weeks: flip enforce mode, turn on retention, aggregate pings, migrate dashboards, delete legacy data, and install the billing auto-cutoff.

### Prompt to paste

```
You are working in /Users/jaideep/projects/hhg apk/android.
Read docs/PHONE_AUTH_ARCHITECTURE.md (§8, §9, §11) and the previous stages before starting.
Stage 3: cutover + hardening. Pre-condition: auth.phone_required has been at 100% for ≥1 week
and auth_events shows >95% of requests are authed.

Implement:

1. Flip enforcement:
   - Set AUTH_ENFORCE=true and APPCHECK_ENFORCE=true on Railway. Update the backend README
     to reflect new defaults.
   - Add a kill-switch: env var AUTH_DEGRADED=true that, when set, temporarily accepts
     ID-token verifications even if Firebase Admin verify fails (circuit breaker from §9).
     Wire it into middleware/auth.js: if verify throws a 5xx-equivalent (network), check
     AUTH_DEGRADED; if true, accept the token's claimed uid/phone without verification
     (trust but log loudly).
   - Automatic circuit breaker: if >50% of verifies fail in a 60s window, flip to a
     per-process degraded flag for 5 min; log auth.circuit_degraded.

2. Bump minimum app version in /api/config so pre-phone-auth clients are force-updated.

3. Android: remove the dual-write in FarmerLocationTracker. Pings now go ONLY to
   users/{user_id}/pings. Remove the legacy farmer_uid login path entirely
   (FarmerIdChoiceScreen is still reachable during onboarding, but the app no longer boots
   into it without a Firebase session).

4. Firestore retention:
   - Create a native TTL policy on users/{user_id}/pings via gcloud:
     gcloud firestore fields ttls update ttl --collection-group=pings --enable-ttl
     (document the command in docs/).
   - Verify pings older than 180 days start getting auto-deleted.

5. Daily aggregation Cloud Function:
   - New directory cloud-functions/daily-summary/
   - Scheduled function (1AM IST via Cloud Scheduler) that for each users/{user_id}:
     reads yesterday's pings, writes users/{user_id}/daily_summaries/{yyyy-mm-dd} with
     firstPingAt, lastPingAt, centroidLat, centroidLng, distanceMeters, pingCount.
   - Summaries are NEVER TTL'd.
   - Include a small backfill script (one-off) to build summaries for the last 90 days.

6. Billing auto-cutoff:
   - New Cloud Function at cloud-functions/billing-guard/ triggered by a Pub/Sub topic that
     the GCP Budget publishes to when a threshold is exceeded.
   - Function behavior at 100% of budget: call the Service Usage API to DISABLE
     identitytoolkit.googleapis.com (Firebase Auth) for the project. Emit a loud alert
     (email + Slack webhook if configured). Document the manual re-enable command.
   - Document the budget setup steps in docs/OPS_BILLING.md: create GCP Budget with 50%,
     90%, 100% thresholds, Pub/Sub target, deploy this function, test with a low fake budget.

7. Dashboard migration:
   - Update the internal location-tracking dashboard (android/dashboard/ or wherever it lives)
     to query users/{user_id}/pings and join Postgres user_profiles + user_farmer_links +
     user_crops for name/village/crops/customer-vs-prospect filters.
   - Add a "Prospects only" filter (is_customer = false) and a "Crop" multi-select.
   - Keep the old dashboard accessible read-only for one month behind a flag, in case we need
     to compare.

8. Legacy data deletion (MANUAL STEP — do not execute from Claude; print instructions only):
   - Backup first:
     gcloud firestore export gs://hhg-backup/pre-cutover-$(date +%F) --project <project>
   - Verify export size looks sane.
   - Then:
     firebase firestore:delete farmers --recursive --project <project> --force
   - This permanently deletes the old farmers/{uid}/pings tree.
   - Do NOT touch Postgres farmers/entry/vendormemo tables — those are business records.

9. Observability polish:
   - Build the funnel dashboard: a single Postgres view auth_funnel_daily that buckets
     auth_events per day per stage, and a tiny static page (served by the backend at
     /internal/funnel, IP-allowlisted) that charts it.
   - Add an anomaly alert (email) if any stage drops >15% day-over-day.

10. Drop the lazy-upsert performance tax on hot paths:
    - Add a 5-min in-process LRU cache keyed on user_id. If cached, skip the UPSERT (only
      update last_seen_at once every 5 min per user). Invalidate on profile mutation.
    - Keep the UPSERT on write endpoints (auth/onboarding/delete) so the first-time flow
      always persists.

11. Documentation:
    - docs/OPS_BILLING.md — budget setup, auto-cutoff, manual re-enable
    - docs/OPS_RUNBOOK.md — what to do if Firebase Auth is down, if SMS quota hits, if link
      anomaly alerts fire, if a user requests deletion outside the app
    - Update PHONE_AUTH_ARCHITECTURE.md §8 to mark cutover as COMPLETE with the date.

Do NOT:
- Execute the legacy firestore:delete yourself. Print the commands for me to run after I've
  verified the export.
- Remove the kill-switch env vars; keep AUTH_DEGRADED and APPCHECK_ENFORCE overridable.
- Drop any Postgres tables.

When done, print: the exact gcloud/firebase commands to run manually, the Cloud Function
deploy commands, the URL of the new funnel dashboard, and a written confirmation that the
rollback procedure from §8 still works (i.e. setting AUTH_ENFORCE=false and lowering the min
app version is sufficient to accept pre-phone-auth clients again).
```

### Stage 3 acceptance checklist

- [ ] `auth_events` shows 100% authed requests, zero `auth.verify_failed` for >24h
- [ ] Old Firestore `farmers/{uid}/pings` exported to GCS bucket, size verified
- [ ] Legacy Firestore tree deleted
- [ ] TTL policy live; verify a ping from 200 days ago is gone
- [ ] Daily summaries populating for yesterday's date
- [ ] Billing auto-cutoff tested with a fake $1 budget (then reset)
- [ ] Internal dashboard reads new paths, prospects filter works, crop filter works
- [ ] Circuit breaker tested by pointing Firebase Admin at a bad endpoint briefly — requests degrade, then recover
- [ ] Old app versions get force-updated (check Play Console rollout)
- [ ] Privacy policy page live and linked from consent screen
- [ ] Runbook reviewed

---

## Post-launch watchlist (first 30 days)

| Metric | Target | Alarm at |
|---|---|---|
| OTP request → verified | >85% | <70% |
| Onboarding completion | >90% | <75% |
| SMS cost per week | <$20 | >$40 |
| `auth.link_blocked` events | <5/day | >20/day (possible household false positives) |
| `auth.verify_failed` | <1% of requests | >5% |
| Firestore daily writes | Baseline + onboarding spike | 2× sustained |
| p95 `/api/*` latency | <500ms | >1s for 10 min |

If any alarm fires: first question is always "did we just deploy something?", second is "did Firebase have an incident?" (status.firebase.google.com), third is "is this one bad actor?" — check `auth_events` by phone_hash.

---

## Stages NOT in this playbook (future work)

- Migration from Firebase Phone Auth to a direct Indian SMS provider (MSG91/Gupshup) — triggers at ~20k verifying users/month.
- Buyer-side marketplace app — the current pitch screen is aspirational.
- Admin SSO for the internal dashboard — IP allowlist is fine for now.
- Village gazetteer autocomplete — clean the free-text data at 5k users before doing this.
- BigQuery export for analytics — do this when sales queries start taking >2 seconds on Postgres.
