const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

/**
 * GET /api/localvyapar/ads
 *
 * Same data as the Next.js site `getAllAds()` (localvyapar page).
 * JSON uses camelCase for the mobile app (Moshi).
 */
router.get('/ads', async (req, res) => {
  try {
    const query = `
      SELECT advId, item, requiredWeight, askingPrice, requiredDate, status, description, name as vyapariName
      FROM advertisement
      JOIN localVyapari ON advertisement.vyapariId = localVyapari.vyapariId
      WHERE status IN ('Active', 'Pending')
      ORDER BY requiredDate;
    `;
    const result = await pool.query(query);
    const rows = result.rows.map((r) => ({
      advId: r.advid,
      item: r.item,
      requiredWeight: r.requiredweight != null ? Number(r.requiredweight) : null,
      askingPrice: r.askingprice != null ? Number(r.askingprice) : null,
      requiredDate: r.requireddate,
      status: r.status,
      description: r.description,
      vyapariName: r.vyapariname,
    }));
    res.json(rows);
  } catch (err) {
    console.error('GET /api/localvyapar/ads error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
