const { Pool, types } = require('pg');
const { parse } = require('pg-connection-string');

// ── Type parsers ──────────────────────────────────────────────────────────────
// node-postgres returns NUMERIC/BIGINT as JS strings by default to avoid
// precision loss. The Android app expects real JSON numbers (Moshi → Double/Long),
// so parse them at the driver layer. Our values (rates, weights, patti ids) are
// safely within Number's precision range.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC / DECIMAL
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10))); // BIGINT (int8)

// ── SSL config ────────────────────────────────────────────────────────────────
// AWS RDS presents a cert signed by Amazon's private CA, which Node's default
// trust store doesn't recognise — OpenSSL reports it as "self-signed in chain"
// and refuses the handshake.
//
// We need `rejectUnauthorized: false` to bypass validation. Passing this via
// the Pool config alone isn't reliable in pg 8.x: if `sslmode=require` is
// present in the connection string, the URL parser overwrites the user-supplied
// SSL object with `ssl: true`, which re-enables verification.
//
// Fix: parse the URL ourselves, drop any URL-level SSL hints, and hand pg the
// discrete fields + our own SSL object. This way our setting always wins.
const parsed = parse(process.env.DATABASE_URL || '');

const pool = new Pool({
  host:     parsed.host,
  port:     parsed.port ? Number(parsed.port) : 5432,
  user:     parsed.user,
  password: parsed.password,
  database: parsed.database,
  ssl:      { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err && err.message ? err.message : err);
});

module.exports = pool;
