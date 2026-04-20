require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/pool');

const farmerRouter    = require('./routes/farmer');
const ratesRouter     = require('./routes/rates');
const noticesRouter   = require('./routes/notices');
const telemetryRouter = require('./routes/telemetry');
const configRouter    = require('./routes/config');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Health check — Railway uses this to confirm the service is alive ──────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/farmer',    farmerRouter);
app.use('/api/rates',     ratesRouter);
app.use('/api/notices',   noticesRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/config',    configRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HHG Farmers API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
