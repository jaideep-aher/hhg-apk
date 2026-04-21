const crypto = require('crypto');
const { w } = require('../db/pool');

/**
 * Per-device login rate limiting.
 *
 * Goal:
 *   Stop someone from sitting with one phone and trying tens/hundreds of
 *   different farmer UIDs in a day (either to harvest data or brute-force
 *   the 5-digit UID space — only 100 000 possible values).
 *
 * Signal used:
 *   X-Device-Id header from the client, which is the Android SSAID
 *   (Settings.Secure.ANDROID_ID). It's stable per (app signing key, device,
 *   user) across uninstalls, no permission required, and rotates only on
 *   factory reset. Good enough to block casual abuse.
 *
 * Storage:
 *   Raw ANDROID_ID is never persisted. We store sha256(SALT || rawId) so
 *   leakage of the DB doesn't give anyone cross-service tracking power.
 *   SALT comes from env DEVICE_ID_SALT (falls back to TELEMETRY_SECRET,
 *   then a baked default for local dev).
 *
 * Policy (env-configurable):
 *   DEVICE_DAILY_MAX_ACCOUNTS  distinct *successful* farmer UIDs per device/day [default 5]
 *   DEVICE_DAILY_MAX_FAILED    total *failed* UID attempts per device/day       [default 8]
 *
 * Failure mode:
 *   Fail-open. If the write pool is missing or queries throw, we let the
 *   request through rather than accidentally lock real users out because
 *   of a transient DB issue. The attempt is simply not recorded.
 */

const MAX_ACCOUNTS = parseInt(process.env.DEVICE_DAILY_MAX_ACCOUNTS || '5', 10);
const MAX_FAILED   = parseInt(process.env.DEVICE_DAILY_MAX_FAILED   || '8', 10);

const SALT = process.env.DEVICE_ID_SALT
          || process.env.TELEMETRY_SECRET
          || 'hhg-local-dev-salt-do-not-use-in-prod';

const IST_DATE_EXPR = `(now() AT TIME ZONE 'Asia/Kolkata')::date`;

/** Hash the raw device id with the server-side salt. */
function hashDeviceId(rawId) {
  return crypto.createHash('sha256').update(SALT).update('|').update(rawId).digest('hex');
}

/** Seconds remaining until 00:00 IST tomorrow. Used for the Retry-After header. */
function secondsUntilIstMidnight(now = new Date()) {
  // IST = UTC+5:30, no DST.
  const IST_OFFSET_MIN = 330;
  const nowUtcMs = now.getTime();
  const nowIstMs = nowUtcMs + IST_OFFSET_MIN * 60_000;
  const nowIst = new Date(nowIstMs);
  // Midnight IST = midnight of (nowIst date) in IST wall clock.
  const nextMidnightIstMs = Date.UTC(
    nowIst.getUTCFullYear(),
    nowIst.getUTCMonth(),
    nowIst.getUTCDate() + 1,
    0, 0, 0, 0
  ) - IST_OFFSET_MIN * 60_000;
  return Math.max(1, Math.ceil((nextMidnightIstMs - nowUtcMs) / 1000));
}

/**
 * Check whether a new login attempt from this device should be allowed.
 *
 * Returns:
 *   { ok: true,  deviceHash, uidAlreadySucceededToday }
 *   { ok: false, reason: 'TOO_MANY_FAILED' | 'TOO_MANY_ACCOUNTS',
 *     limit, retryAfterSeconds, deviceHash }
 *
 * Caller is expected to then call record(...) with the real success value
 * after running its own DB lookup.
 */
async function check(rawDeviceId, uid) {
  if (!w || !rawDeviceId) {
    return { ok: true, deviceHash: null, uidAlreadySucceededToday: false };
  }

  const deviceHash = hashDeviceId(rawDeviceId);

  let counts;
  try {
    const result = await w.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE success)                                  AS success_uids,
        COALESCE(SUM(attempts) FILTER (WHERE NOT success), 0)            AS failed_attempts,
        BOOL_OR(success AND uid = $2)                                    AS this_uid_already_success
      FROM device_login_attempts
      WHERE device_hash = $1
        AND attempt_date = ${IST_DATE_EXPR}
      `,
      [deviceHash, uid]
    );
    counts = result.rows[0] || {};
  } catch (err) {
    console.error('[loginRateLimit.check] query failed, failing open:', err && err.message);
    return { ok: true, deviceHash, uidAlreadySucceededToday: false };
  }

  const successUids    = Number(counts.success_uids    || 0);
  const failedAttempts = Number(counts.failed_attempts || 0);
  const uidAlreadySucceededToday = counts.this_uid_already_success === true;

  // Failed-attempt ceiling hits first — it's a hard brute-force guard.
  if (failedAttempts >= MAX_FAILED) {
    return {
      ok: false,
      reason: 'TOO_MANY_FAILED',
      limit: MAX_FAILED,
      retryAfterSeconds: secondsUntilIstMidnight(),
      deviceHash,
    };
  }

  // Distinct-accounts ceiling: only block if THIS uid would *add* to the
  // distinct-success set. Logging back in as the same farmer who already
  // succeeded today is always free.
  if (!uidAlreadySucceededToday && successUids >= MAX_ACCOUNTS) {
    return {
      ok: false,
      reason: 'TOO_MANY_ACCOUNTS',
      limit: MAX_ACCOUNTS,
      retryAfterSeconds: secondsUntilIstMidnight(),
      deviceHash,
    };
  }

  return { ok: true, deviceHash, uidAlreadySucceededToday };
}

/**
 * Record the outcome of a login attempt. Safe to call from inside a route
 * — errors are swallowed so rate-limit bookkeeping never takes down the
 * user's actual request.
 *
 * The PK is (device_hash, attempt_date, uid) so repeat attempts of the
 * same UID on the same day update one row. If an earlier failed attempt
 * is later followed by a success, we upgrade the row to success (but
 * never the other direction — a known-good UID cannot become "failed"
 * later, and even if it did in some race, we'd rather not lock the user
 * out of re-entering it).
 */
async function record({ deviceHash, uid, success }) {
  if (!w || !deviceHash) return;
  try {
    await w.query(
      `
      INSERT INTO device_login_attempts (device_hash, attempt_date, uid, success, attempts, first_seen, last_seen)
      VALUES ($1, ${IST_DATE_EXPR}, $2, $3, 1, now(), now())
      ON CONFLICT (device_hash, attempt_date, uid) DO UPDATE SET
        attempts  = device_login_attempts.attempts + 1,
        success   = device_login_attempts.success OR EXCLUDED.success,
        last_seen = now()
      `,
      [deviceHash, uid, success]
    );
  } catch (err) {
    console.error('[loginRateLimit.record] upsert failed:', err && err.message);
  }
}

module.exports = {
  check,
  record,
  hashDeviceId,
  secondsUntilIstMidnight,
  _config: { MAX_ACCOUNTS, MAX_FAILED },
};
