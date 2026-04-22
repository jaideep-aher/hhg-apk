require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const pool    = require('./db/pool');
const { ensureSchema }      = require('./db/initSchema');
const { ensureApmcSchema }  = require('./db/initApmcSchema');
const { ingest: ingestAgmarknet } = require('./jobs/ingestAgmarknet');
const { backfill: backfillAgmarknet } = require('./jobs/backfillAgmarknet');
const { ingest: ingestApmcMumbai, backfill: backfillApmcMumbai } =
  require('./jobs/ingestApmcMumbai');

const farmerRouter    = require('./routes/farmer');
const ratesRouter     = require('./routes/rates');
const noticesRouter   = require('./routes/notices');
const telemetryRouter = require('./routes/telemetry');
const configRouter    = require('./routes/config');
const localvyaparRouter = require('./routes/localvyapar');
const apmcRouter      = require('./routes/apmc');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  // Allow the app (and any web origin) to read Retry-After so the client
  // can render a sensible "try again in X" message on 429 responses.
  exposedHeaders: ['Retry-After'],
}));
app.use(express.json({ limit: '1mb' }));

// ── Health check — Railway uses this to confirm the service is alive ──────────
// Public response stays minimal so nothing about the DB host / pg error / stack
// leaks to anyone who hits this endpoint. The full error is logged server-side
// (visible in Railway logs) and is also returned if the caller presents the
// shared TELEMETRY_SECRET via x-diag-secret for one-off diagnosis.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('Health check DB error:', err && err.code, message);

    const body = { status: 'error', db: 'disconnected' };
    const secret = process.env.TELEMETRY_SECRET;
    if (secret && req.headers['x-diag-secret'] === secret) {
      body.error = message;
      body.code = err && err.code;
      try { body.host = new URL(process.env.DATABASE_URL || '').host; } catch {}
    }
    res.status(503).json(body);
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/farmer',    farmerRouter);
app.use('/api/rates',     ratesRouter);
app.use('/api/notices',   noticesRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/config',    configRouter);
app.use('/api/localvyapar', localvyaparRouter);
app.use('/api/apmc',      apmcRouter);

// ── Admin: trigger an Agmarknet ingest on demand (shared-secret guarded) ──────
// Useful for seeding the DB immediately after provisioning, and for debugging
// a specific market/commodity pair without waiting for the cron.
//   POST /admin/apmc/ingest            — full run
//   POST /admin/apmc/ingest?market=pune&commodity=tomato  — single pair
app.post('/admin/apmc/ingest', async (req, res) => {
  const secret = process.env.ADMIN_SECRET || process.env.TELEMETRY_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const onlyMarket    = (req.query.market    || '').toString().trim() || undefined;
  const onlyCommodity = (req.query.commodity || '').toString().trim() || undefined;

  // Fire and forget — ingesting every pair can take minutes, and we don't
  // want Railway's proxy timing out the request. Caller can poll /api/apmc/runs.
  ingestAgmarknet({ onlyMarket, onlyCommodity }).catch((err) => {
    console.error('[admin/apmc/ingest] run failed:', err && err.message);
  });
  res.json({ started: true, onlyMarket, onlyCommodity });
});

// POST /admin/apmc/backfill?days=30[&market=pune&commodity=tomato]
// Historical backfill is disabled — the upstream data.gov.in resource is
// today-only (see jobs/backfillAgmarknet.js for the full explanation). The
// route still exists so callers get a clear 200 with reason instead of a 404,
// and so a future rewrite against a different resource can drop in without
// changing the contract.
app.post('/admin/apmc/backfill', async (req, res) => {
  const secret = process.env.ADMIN_SECRET || process.env.TELEMETRY_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
  const onlyMarket    = (req.query.market    || '').toString().trim() || undefined;
  const onlyCommodity = (req.query.commodity || '').toString().trim() || undefined;

  const result = await backfillAgmarknet({ days, onlyMarket, onlyCommodity })
    .catch((err) => ({ ok: false, reason: err && err.message }));
  res.json(result);
});

// ── Admin: Mumbai APMC (apmcmumbai.org scraper) ──────────────────────────────
// POST /admin/apmc/ingest-mumbai[?category=veg|fruit|turbhe]
//     — scrape today's table for one or all yards (default: all three).
// POST /admin/apmc/backfill-mumbai?days=30[&category=veg|fruit|turbhe]
//     — walk last N days via the per-date HTML URL (≤365). All categories by
//       default; pass `category` to restrict.
//
// Backfill is fire-and-forget for large runs to avoid proxy timeouts;
// progress is visible via GET /api/apmc/runs.
const MUMBAI_CATEGORIES = new Set(['veg', 'fruit', 'turbhe']);
function parseCategoryParam(raw) {
  if (!raw) return undefined;
  const list = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const valid = list.filter((c) => MUMBAI_CATEGORIES.has(c));
  if (valid.length === 0) return null; // explicit-but-invalid → reject
  return valid.length === 1 ? valid[0] : valid;
}

app.post('/admin/apmc/ingest-mumbai', async (req, res) => {
  const secret = process.env.ADMIN_SECRET || process.env.TELEMETRY_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const category = parseCategoryParam(req.query.category);
  if (category === null) {
    return res.status(400).json({ error: 'invalid_category', valid: [...MUMBAI_CATEGORIES] });
  }
  // Today is a few pages — fast enough to await so the caller sees results.
  try {
    const r = await ingestApmcMumbai({ category });
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err && err.message });
  }
});

app.post('/admin/apmc/backfill-mumbai', async (req, res) => {
  const secret = process.env.ADMIN_SECRET || process.env.TELEMETRY_SECRET;
  if (!secret || req.get('x-admin-secret') !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
  const category = parseCategoryParam(req.query.category);
  if (category === null) {
    return res.status(400).json({ error: 'invalid_category', valid: [...MUMBAI_CATEGORIES] });
  }

  // Rate-limited to 1 req/sec per fetch. 365d × 3 categories ~= 18min total.
  // Fire-and-forget to survive Railway's request timeout.
  backfillApmcMumbai({ days, category }).catch((err) => {
    console.error('[admin/apmc/backfill-mumbai] run failed:', err && err.message);
  });
  res.json({
    started: true,
    days,
    category: category ?? 'all',
    note: 'Poll /api/apmc/runs for progress.',
  });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────
// Kick off schema bootstraps (idempotent). We do NOT await them so a slow
// connection can't hold up the Railway health check — worst case, the first
// few requests for a specific table skip silently until the table exists.
ensureSchema().catch((err) => {
  console.error('[startup] ensureSchema rejected:', err && err.message);
});
ensureApmcSchema().catch((err) => {
  console.error('[startup] ensureApmcSchema rejected:', err && err.message);
});

// ── Daily Agmarknet ingest ────────────────────────────────────────────────────
// Agmarknet typically publishes rates between 6pm and 9pm IST. We fire at
// 20:30 IST and again at 23:00 IST — upsert is idempotent, so the second run
// just catches markets that posted late. Disable by leaving APMC_DATABASE_URL
// or DATA_GOV_IN_KEY unset (the job self-skips).
if (process.env.APMC_INGEST_CRON !== 'off') {
  cron.schedule('30 20 * * *', () => {
    ingestAgmarknet().catch((err) => console.error('[cron 20:30 IST] ingest:', err.message));
  }, { timezone: 'Asia/Kolkata' });
  cron.schedule('0 23 * * *', () => {
    ingestAgmarknet().catch((err) => console.error('[cron 23:00 IST] ingest:', err.message));
  }, { timezone: 'Asia/Kolkata' });
  console.log('[cron] Agmarknet ingest scheduled at 20:30 and 23:00 IST');

  // apmcmumbai.org publishes earlier in the evening. Two runs mirror the
  // Agmarknet pattern so late-posted data still gets captured. The second
  // run no-ops fast on already-present rows thanks to upsert idempotency.
  cron.schedule('0 19 * * *', () => {
    ingestApmcMumbai().catch((err) => console.error('[cron 19:00 IST] apmc-mumbai:', err.message));
  }, { timezone: 'Asia/Kolkata' });
  cron.schedule('30 23 * * *', () => {
    ingestApmcMumbai().catch((err) => console.error('[cron 23:30 IST] apmc-mumbai:', err.message));
  }, { timezone: 'Asia/Kolkata' });
  console.log('[cron] Mumbai APMC scrape (veg+fruit+turbhe) scheduled at 19:00 and 23:30 IST');
}

app.listen(PORT, () => {
  console.log(`HHG Farmers API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
