const { Pool, types } = require('pg');

// ── Type parsers ──────────────────────────────────────────────────────────────
// node-postgres returns NUMERIC/BIGINT as JS strings by default to avoid
// precision loss. The Android app expects real JSON numbers (Moshi → Double/Long),
// so parse them at the driver layer. Our values (rates, weights, patti ids) are
// safely within Number's precision range.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC / DECIMAL
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10))); // BIGINT (int8)

/**
 * Shared Postgres pool. Railway injects env vars from its dashboard; for local
 * dev copy .env.example → .env.
 *
 * Why `ssl: { rejectUnauthorized: false }`:
 *   AWS RDS presents a cert signed by Amazon's private CA, which the node-pg
 *   default trust store doesn't recognise. Disabling validation is the same
 *   posture the webapp uses — encryption is still on, but no CA verification.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err && err.message ? err.message : err);
});

module.exports = pool;
