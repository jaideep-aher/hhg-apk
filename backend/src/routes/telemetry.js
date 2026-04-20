const { Router } = require('express');
const { w: pool } = require('../db/pool');  // telemetry inserts → write pool

const router = Router();

/**
 * POST /api/telemetry
 *
 * Receives batched telemetry events from TelemetryFlushWorker in the Android app.
 * Protected by a shared secret header to prevent public writes.
 *
 * Body: { events: [{ sessionId, farmerId, name, page, propsJson, createdAt }] }
 */
router.post('/', async (req, res) => {
  const secret = req.headers['x-telemetry-secret'];
  if (secret !== process.env.TELEMETRY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array required' });
  }

  try {
    // Bulk insert all events in one query
    const values = events.map((e, i) => {
      const base = i * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(', ');

    const params = events.flatMap(e => [
      e.sessionId,
      e.farmerId  || null,
      e.name,
      e.page      || null,
      e.propsJson || '{}',
      e.createdAt || new Date().toISOString()
    ]);

    await pool.query(
      `INSERT INTO telemetry_events
         (session_id, farmer_id, name, page, props, created_at)
       VALUES ${values}
       ON CONFLICT DO NOTHING`,
      params
    );

    res.json({ inserted: events.length });

  } catch (err) {
    console.error('POST /api/telemetry error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
