require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/pool');

const farmerRouter    = require('./routes/farmer');
const ratesRouter     = require('./routes/rates');
const noticesRouter   = require('./routes/notices');
const telemetryRouter = require('./routes/telemetry');
const configRouter    = require('./routes/config');
const localvyaparRouter = require('./routes/localvyapar');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
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

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HHG Farmers API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
