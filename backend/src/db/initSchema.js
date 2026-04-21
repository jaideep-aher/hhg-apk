const { w } = require('./pool');

/**
 * Idempotent bootstrap for tables this backend owns (vs. legacy RDS tables
 * that are managed externally). Runs once at server start — safe to call on
 * every boot because every statement is IF NOT EXISTS.
 *
 * Currently only creates device_login_attempts, which powers per-device
 * login rate limiting (see services/loginRateLimit.js). That table is a
 * pure anti-abuse concern owned by the API; it's not part of the farmer
 * business-data schema, so we don't wait on a manual DBA migration.
 *
 * NOTE: attempt_date is deliberately the IST date, not UTC. Cutover at
 * 00:00 IST feels right for Indian farmers — UTC midnight (5:30 AM IST)
 * would look like "the block reset in the middle of the night for no
 * reason" from their perspective.
 */
async function ensureSchema() {
  if (!w) {
    console.warn('[initSchema] no write pool configured — skipping table bootstrap');
    return;
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS device_login_attempts (
      device_hash   TEXT        NOT NULL,
      attempt_date  DATE        NOT NULL,
      uid           TEXT        NOT NULL,
      success       BOOLEAN     NOT NULL,
      attempts      INTEGER     NOT NULL DEFAULT 1,
      first_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (device_hash, attempt_date, uid)
    );
    CREATE INDEX IF NOT EXISTS idx_dla_device_date
      ON device_login_attempts (device_hash, attempt_date);
  `;

  try {
    await w.query(sql);
    console.log('[initSchema] device_login_attempts ready');
  } catch (err) {
    // Don't crash the server if this fails — the rate limiter is fail-open
    // on DB errors (see loginRateLimit.check). Logging the reason is enough.
    console.error('[initSchema] failed to ensure schema:', err && err.message);
  }
}

module.exports = { ensureSchema };
