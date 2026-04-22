const { Pool, types } = require('pg');
const { parse } = require('pg-connection-string');

// ── Type parsers ──────────────────────────────────────────────────────────────
// node-postgres returns NUMERIC/BIGINT as JS strings by default to avoid
// precision loss. The Android app expects real JSON numbers (Moshi → Double/Long),
// so parse them at the driver layer. Our values (rates, weights, patti ids) are
// safely within Number's precision range.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC / DECIMAL
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10))); // BIGINT (int8)

/**
 * Build a pg Pool from a libpq-style URL, forcing our own SSL config.
 *
 * We parse the URL with pg-connection-string and hand pg the discrete fields
 * so pg's internal handling of `sslmode=require` (which treats it as
 * `verify-full` and rejects the RDS Amazon CA as self-signed) is bypassed.
 * Returns null if the URL env var is missing, so callers can fall back.
 */
function makePool(url, label) {
  if (!url) return null;
  const cfg = parse(url);
  const pool = new Pool({
    host:     cfg.host,
    port:     cfg.port ? Number(cfg.port) : 5432,
    user:     cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl:      { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => {
    console.error(`[pg pool:${label}]`, err && err.message ? err.message : err);
  });
  return pool;
}

// ── Four logical databases ────────────────────────────────────────────────────
// r    → read-only on AWS RDS: farmer / patti / rates / notices reads
// w    → read-write on AWS RDS: telemetry inserts and future writes
// neon → Neon Postgres: AgriSight market-trend data (separate owner DB)
// apmc → Railway Postgres (fresh, empty): APMC mandi prices from Agmarknet etc.
//        Kept isolated from RDS so ingest churn + schema changes don't touch
//        production farmer data. Reads and writes go through this single pool.
//
// Each URL var is optional. If a specific R/W var is unset we fall back to the
// legacy single DATABASE_URL so existing Railway deploys keep working unchanged.
const primaryUrl = process.env.DATABASE_URLR
                || process.env.DATABASE_URL_R
                || process.env.DATABASE_URL;

const writeUrl   = process.env.DATABASE_URLW
                || process.env.DATABASE_URL_W
                || process.env.DATABASE_URL;

const neonUrl    = process.env.NEON_DB_CONNECTION_STRING
                || process.env.NEON_DATABASE_URL;

const apmcUrl    = process.env.APMC_DATABASE_URL
                || process.env.APMC_DB_URL;

const r    = makePool(primaryUrl, 'r');
const w    = makePool(writeUrl,   'w');
const neon = makePool(neonUrl,    'neon');
const apmc = makePool(apmcUrl,    'apmc');

// Default export is the read pool — `require('../db/pool')` still returns a
// Pool-like object with `.query()` for older call sites. Named exports (`r`,
// `w`, `neon`, `apmc`) let new code pick the right pool explicitly.
module.exports = r || { query: () => Promise.reject(new Error('No read DB configured')) };
module.exports.r = r;
module.exports.w = w;
module.exports.neon = neon;
module.exports.apmc = apmc;
