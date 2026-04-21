const { Router } = require('express');
const pool = require('../db/pool');
const loginRateLimit = require('../services/loginRateLimit');

const router = Router();

/**
 * Build the 429 response body used by both rate-limit branches. Shape is
 * stable so the Android client can key off `reason` to show the right
 * localized message without parsing `message`.
 */
function rateLimitedResponse(res, info) {
  const message = info.reason === 'TOO_MANY_FAILED'
    ? 'Too many failed Aadhaar attempts from this phone today.'
    : 'Too many different accounts used from this phone today.';
  res.set('Retry-After', String(info.retryAfterSeconds));
  return res.status(429).json({
    error: 'rate_limited',
    reason: info.reason,
    limitPerDay: info.limit,
    retryAfterSeconds: info.retryAfterSeconds,
    message,
  });
}

/**
 * GET /api/farmer/:uid
 *
 * Returns the farmer record + all patti entries.
 * :uid = last 5 digits of Aadhaar (stored in farmers.uid)
 *
 * Schema used:
 *   farmers      — farmerid, uid, farmername, mobilenumber, farmeraddress, status
 *   entry        — transactionid, farmerid, vendorname, item, quantity, weight, date
 *   vendormemo   — entryid (FK→entry.transactionid), rate, payable, paid (BOOLEAN), paiddate
 *
 * NOTE: vendormemo.paid is a boolean (paid yes/no), not an amount.
 *       vendormemo.rate is the actual rate per kg.
 */
router.get('/:uid', async (req, res) => {
  const { uid } = req.params;

  if (!/^\d{5}$/.test(uid)) {
    return res.status(400).json({ error: 'uid must be exactly 5 digits' });
  }

  try {
    // 1. Fetch farmer by uid
    const farmerResult = await pool.query(
      `SELECT
         farmerid,
         uid,
         farmername,
         mobilenumber,
         farmeraddress,
         status
       FROM farmers
       WHERE uid = $1
       LIMIT 1`,
      [uid]
    );

    if (farmerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const farmer = farmerResult.rows[0];

    // 2. Fetch patti entries — entry joined with vendormemo
    //    vendormemo.paid is BOOLEAN; convert to payable amount for the app
    const entriesResult = await pool.query(
      `SELECT
         e.transactionid                          AS entryid,
         e.farmerid,
         TO_CHAR(e.date, 'YYYY-MM-DD')            AS date,
         e.vendorname,
         e.quantity,
         e.weight,
         COALESCE(vm.rate, 0)                     AS rate,
         e.item,
         COALESCE(vm.payable, 0)                  AS payable,
         CASE WHEN vm.paid THEN COALESCE(vm.payable, 0) ELSE 0 END AS paid,
         TO_CHAR(vm.paiddate, 'YYYY-MM-DD')       AS paiddate
       FROM entry e
       LEFT JOIN vendormemo vm ON e.transactionid = vm.entryid
       WHERE e.farmerid = $1
       ORDER BY e.date DESC, e.transactionid DESC`,
      [farmer.farmerid]
    );

    res.json({
      farmer,
      entries:    entriesResult.rows,
      totalCount: entriesResult.rowCount
    });

  } catch (err) {
    console.error('GET /api/farmer/:uid error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/farmer/exists/:uid
 * Quick existence check used by the Home screen search before loading full data.
 */
router.get('/exists/:uid', async (req, res) => {
  const { uid } = req.params;
  if (!/^\d{5}$/.test(uid)) {
    return res.json({ exists: false });
  }

  // Per-device rate limit. Header is set by the Android app
  // (DeviceIdInterceptor). Requests without the header skip the check —
  // the website still hits this endpoint and the limit there is handled
  // separately / not at all for now.
  const rawDeviceId = req.get('X-Device-Id');
  let deviceHash = null;
  if (rawDeviceId) {
    const gate = await loginRateLimit.check(rawDeviceId, uid);
    if (!gate.ok) {
      return rateLimitedResponse(res, gate);
    }
    deviceHash = gate.deviceHash;
  }

  try {
    const result = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM farmers WHERE uid = $1) AS exists`,
      [uid]
    );
    const exists = result.rows[0].exists;

    // Record the attempt for the next day's counters. Fire-and-forget —
    // record() swallows its own errors so we don't affect the response.
    if (deviceHash) {
      loginRateLimit.record({ deviceHash, uid, success: exists }).catch(() => {});
    }

    res.json({ exists });
  } catch (err) {
    console.error('GET /api/farmer/exists/:uid error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
