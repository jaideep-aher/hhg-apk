const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

/**
 * GET /api/notices
 *
 * Returns active notices from the whatsapp_messages table.
 * "Active" = active_date IS NULL  OR  active_date >= today.
 *
 * Schema:
 *   whatsapp_messages — message_id SERIAL, message TEXT,
 *                       active_date DATE, customer_type VARCHAR
 *
 * NOTE: The table has no separate `title` column.
 *       We derive a short title from the first non-empty line of the message
 *       (max 70 chars) so the Android model's `title` field is always populated.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         message_id::text AS id,
         message          AS content,
         active_date      AS "activeDate",
         customer_type    AS "customerType"
       FROM whatsapp_messages
       WHERE active_date IS NULL
          OR active_date >= CURRENT_DATE
       ORDER BY message_id DESC
       LIMIT 20`
    );

    // Derive a short title from the first line of the message body
    const rows = result.rows.map(row => ({
      ...row,
      title: (row.content || '')
        .split('\n')
        .map(l => l.trim())
        .find(l => l.length > 0)
        ?.slice(0, 70) ?? 'सूचना'
    }));

    res.json(rows);
  } catch (err) {
    console.error('GET /api/notices error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
