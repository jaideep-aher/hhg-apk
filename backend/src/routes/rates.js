const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

/**
 * GET /api/rates/hundekari
 *
 * Returns the most-recent Hundekari vendor rates — one row per vegetable.
 * Falls back to the last available date if today has no entries yet.
 *
 * Schema:
 *   market_rates — id, vegetable_id (FK), hundekari NUMERIC, date DATE
 *   vegetables   — id, name_eng VARCHAR, name_mar VARCHAR
 */
router.get('/hundekari', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
  try {
    const result = await pool.query(
      `SELECT
         v.name_eng                      AS item,
         v.name_mar                      AS "itemMr",
         TO_CHAR(mr.date, 'YYYY-MM-DD') AS date,
         mr.hundekari                    AS "highestRate"
       FROM market_rates mr
       JOIN vegetables v ON mr.vegetable_id = v.id
       WHERE mr.date = (
         SELECT MAX(date) FROM market_rates WHERE hundekari IS NOT NULL
       )
         AND mr.hundekari IS NOT NULL
       ORDER BY v.name_eng ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/rates/hundekari error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
