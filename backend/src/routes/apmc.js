const { Router } = require('express');
const { apmc, r: ratesRead } = require('../db/pool');

const router = Router();

// ── Hundekari merge helpers ────────────────────────────────────────────────
//
// Hundekari is our own vendor's daily rate and lives on the legacy RDS
// (rates DB, `market_rates.hundekari`). It's the price Hundekari is paying
// farmers today — so it belongs in the "where is my crop selling best?"
// ranking alongside Mumbai, Pune etc.
//
// Two awkward bits we paper over here:
// 1. Cross-DB join — we can't JOIN across APMC-Postgres and the RDS rates
//    DB, so we look up commodity names on the APMC side first, then query
//    RDS with those names and stitch the result in JS.
// 2. Unit mismatch — `market_prices.modal_price` is ₹/quintal throughout
//    the APMC set. `market_rates.hundekari` has historically been stored in
//    ₹/kg (typical vendor-to-farmer unit). We auto-detect: if the raw value
//    is under 500 we treat it as ₹/kg and scale ×100 so it ranks correctly
//    next to APMC's ₹/qtl values. Anything ≥500 is assumed already-per-qtl.
const HUNDEKARI_KG_THRESHOLD = 500;

async function fetchHundekariForCommodity(commoditySlug) {
  if (!ratesRead) return null;
  // 1) Resolve the commodity's English/Marathi names in the APMC DB.
  const cRes = await apmc.query(
    `SELECT name_eng, name_mar, aliases
       FROM commodities WHERE slug = $1 LIMIT 1`,
    [commoditySlug]
  );
  if (!cRes.rows.length) return null;
  const { name_eng: nameEn, name_mar: nameMr, aliases } = cRes.rows[0];
  // Build a broader match list so "Tomato" on one side and "tamatar"/"टोमॅटो"
  // on the other still line up. Aliases is already a text[] from the APMC
  // commodities table; combine + lowercase + dedupe.
  const candidates = [nameEn, nameMr, ...(Array.isArray(aliases) ? aliases : [])]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0);
  if (!candidates.length) return null;

  // 2) Ask RDS for the most recent non-null Hundekari rate whose vegetable
  //    name matches any of our candidates (case-insensitive).
  const lowered = candidates.map((s) => s.toLowerCase());
  try {
    const res = await ratesRead.query(
      `SELECT mr.hundekari AS rate,
              TO_CHAR(mr.date, 'YYYY-MM-DD') AS date,
              v.name_eng,
              v.name_mar
         FROM market_rates mr
         JOIN vegetables   v  ON v.id = mr.vegetable_id
        WHERE mr.hundekari IS NOT NULL
          AND (LOWER(v.name_eng) = ANY($1::text[])
               OR v.name_mar = ANY($2::text[]))
          AND mr.date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY mr.date DESC
        LIMIT 1`,
      [lowered, candidates]
    );
    if (!res.rows.length) return null;

    const raw = Number(res.rows[0].rate);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    // ₹/kg → ₹/qtl when the value looks like a per-kg price.
    const perQtl = raw < HUNDEKARI_KG_THRESHOLD ? raw * 100 : raw;

    return {
      marketSlug: 'hundekari',
      nameEn:     'Hundekari',
      nameMr:     'हुंडेकरी',
      date:       res.rows[0].date,
      minPrice:   null,
      maxPrice:   null,
      modalPrice: perQtl,
      isHundekari: true,
    };
  } catch (err) {
    // Rates DB hiccup shouldn't break the whole /best response — we still
    // return APMC markets. Log once and move on.
    console.warn('[apmc/best] hundekari lookup failed:', err.message);
    return null;
  }
}

/**
 * All APMC routes read from the Railway `apmc` pool (fresh empty DB, filled
 * daily by jobs/ingestAgmarknet.js). Responses are shaped to be easy for the
 * Android app (Moshi) and the Next.js webapp (plain JSON) to consume.
 *
 * Marathi names come straight from the DB (markets.name_mar, commodities.name_mar)
 * so adding a new APMC is a pure SQL insert — no code change.
 *
 * 503 is returned if APMC_DATABASE_URL is not configured, so callers can tell
 * the difference between "no data yet" (200, empty array) and "feature off".
 */

function requireApmc(res) {
  if (!apmc) {
    res.status(503).json({ error: 'apmc_db_not_configured' });
    return false;
  }
  return true;
}

// GET /api/apmc/markets — list of *reporting* APMCs for the dropdown.
//
// A market only appears if it posted at least one price in the last 3 days,
// so dead-looking mandis (Agmarknet gaps, holidays, ingest failures) quietly
// drop out instead of showing empty dropdowns to farmers. The inner EXISTS
// beats a LEFT JOIN + GROUP BY on a table this small and lets Postgres stop
// as soon as it finds the first row.
//
// Priority order:
//   1. Mumbai (Vashi)        — highest volume, our scraper source
//   2. Pune                  — second highest volume
//   3. Everyone else         — by sort_order ascending, then name
//
// The CASE expression pins Mumbai/Pune regardless of sort_order drift in the
// DB, so a future seed change can't silently reshuffle the top of the list.
router.get('/markets', async (_req, res) => {
  if (!requireApmc(res)) return;
  try {
    const { rows } = await apmc.query(
      `SELECT m.id, m.slug,
              m.name_eng AS "nameEn", m.name_mar AS "nameMr",
              m.state_eng AS "stateEn", m.district_eng AS "districtEn",
              m.lat, m.lon,
              (SELECT MAX(mp.price_date) FROM market_prices mp
                WHERE mp.market_id = m.id) AS "lastPriceDate"
         FROM markets m
        WHERE m.active = TRUE
          AND EXISTS (
                SELECT 1 FROM market_prices mp
                 WHERE mp.market_id = m.id
                   AND mp.price_date >= CURRENT_DATE - INTERVAL '3 days'
              )
        ORDER BY
          CASE m.slug
            WHEN 'mumbai-vashi' THEN 0
            WHEN 'pune'         THEN 1
            ELSE 2
          END,
          m.sort_order,
          m.name_eng`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/apmc/markets error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apmc/commodities — list of all active commodities (for the dropdown)
// Optional ?category=vegetable|fruit|cereal|pulse|oilseed|fibre|spice|cash
router.get('/commodities', async (req, res) => {
  if (!requireApmc(res)) return;
  try {
    const cat = (req.query.category || '').toString().trim();
    const params = [];
    let where = 'WHERE active = TRUE';
    if (cat) { params.push(cat); where += ` AND category = $${params.length}`; }

    const { rows } = await apmc.query(
      `SELECT id, slug,
              name_eng AS "nameEn", name_mar AS "nameMr",
              category, icon_emoji AS "iconEmoji", unit,
              COALESCE(aliases, '{}') AS aliases
         FROM commodities
         ${where}
        ORDER BY sort_order, name_eng`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/apmc/commodities error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apmc/prices?market=pune&commodity=tomato&days=7
// Returns a series for charts: one row per day with min/max/modal/arrivals.
// If multiple varieties exist for a day, they're aggregated (avg of avg etc).
router.get('/prices', async (req, res) => {
  if (!requireApmc(res)) return;

  const marketSlug = (req.query.market || '').toString().trim().toLowerCase();
  const commoditySlug = (req.query.commodity || '').toString().trim().toLowerCase();
  const days = Math.max(1, Math.min(90, parseInt(req.query.days, 10) || 7));

  if (!marketSlug || !commoditySlug) {
    return res.status(400).json({ error: 'market and commodity are required' });
  }

  try {
    const { rows } = await apmc.query(
      `SELECT
          TO_CHAR(mp.price_date, 'YYYY-MM-DD') AS date,
          ROUND(AVG(mp.min_price)::numeric,   2) AS "minPrice",
          ROUND(AVG(mp.max_price)::numeric,   2) AS "maxPrice",
          ROUND(AVG(mp.modal_price)::numeric, 2) AS "modalPrice",
          ROUND(SUM(mp.arrivals_qtl)::numeric, 2) AS "arrivalsQtl"
         FROM market_prices mp
         JOIN markets m      ON m.id = mp.market_id
         JOIN commodities c  ON c.id = mp.commodity_id
        WHERE m.slug = $1
          AND c.slug = $2
          AND mp.price_date >= CURRENT_DATE - ($3 || ' days')::interval
        GROUP BY mp.price_date
        ORDER BY mp.price_date ASC`,
      [marketSlug, commoditySlug, String(days)]
    );

    // Also return the latest record's metadata for the header in the UI.
    res.json({
      market: marketSlug,
      commodity: commoditySlug,
      days,
      rows,
    });
  } catch (err) {
    console.error('GET /api/apmc/prices error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apmc/today?market=pune
// Compact snapshot for the home screen: every commodity's latest price in one market.
// Uses DISTINCT ON so we pick each commodity's most-recent day independently.
router.get('/today', async (req, res) => {
  if (!requireApmc(res)) return;
  const marketSlug = (req.query.market || '').toString().trim().toLowerCase();
  if (!marketSlug) return res.status(400).json({ error: 'market is required' });

  try {
    const { rows } = await apmc.query(
      `SELECT DISTINCT ON (c.id)
              c.slug                            AS "commoditySlug",
              c.name_eng                        AS "nameEn",
              c.name_mar                        AS "nameMr",
              c.icon_emoji                      AS "iconEmoji",
              c.category,
              TO_CHAR(mp.price_date,'YYYY-MM-DD') AS date,
              mp.min_price                      AS "minPrice",
              mp.max_price                      AS "maxPrice",
              mp.modal_price                    AS "modalPrice",
              mp.arrivals_qtl                   AS "arrivalsQtl"
         FROM market_prices mp
         JOIN markets m     ON m.id = mp.market_id
         JOIN commodities c ON c.id = mp.commodity_id
        WHERE m.slug = $1
          AND mp.price_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY c.id, mp.price_date DESC`,
      [marketSlug]
    );
    res.json({ market: marketSlug, rows });
  } catch (err) {
    console.error('GET /api/apmc/today error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apmc/best?commodity=tomato&days=1
// "Best APMC today" — ranks every market by modal price for a commodity,
// including our own Hundekari vendor rate (from the legacy rates DB) so the
// farmer sees all real buying options in a single list. Great acquisition
// hook: "where is tomato selling best today?"
router.get('/best', async (req, res) => {
  if (!requireApmc(res)) return;
  const commoditySlug = (req.query.commodity || '').toString().trim().toLowerCase();
  const days = Math.max(1, Math.min(7, parseInt(req.query.days, 10) || 1));
  if (!commoditySlug) return res.status(400).json({ error: 'commodity is required' });

  try {
    // APMC rows + Hundekari lookup run in parallel — the Hundekari query
    // hits a different DB (RDS) and the two don't depend on each other.
    const [apmcRes, hundekari] = await Promise.all([
      apmc.query(
        `SELECT DISTINCT ON (m.id)
                m.slug                            AS "marketSlug",
                m.name_mar                        AS "nameMr",
                m.name_eng                        AS "nameEn",
                TO_CHAR(mp.price_date,'YYYY-MM-DD') AS date,
                mp.min_price                      AS "minPrice",
                mp.max_price                      AS "maxPrice",
                mp.modal_price                    AS "modalPrice"
           FROM market_prices mp
           JOIN markets m     ON m.id = mp.market_id
           JOIN commodities c ON c.id = mp.commodity_id
          WHERE c.slug = $1
            AND mp.price_date >= CURRENT_DATE - ($2 || ' days')::interval
          ORDER BY m.id, mp.price_date DESC`,
        [commoditySlug, String(days)]
      ),
      fetchHundekariForCommodity(commoditySlug),
    ]);

    const rows = apmcRes.rows;
    if (hundekari) rows.push(hundekari);
    rows.sort((a, b) => (Number(b.modalPrice) || 0) - (Number(a.modalPrice) || 0));
    res.json({ commodity: commoditySlug, rows });
  } catch (err) {
    console.error('GET /api/apmc/best error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apmc/runs — last 10 ingest runs (observability / debug)
router.get('/runs', async (_req, res) => {
  if (!requireApmc(res)) return;
  try {
    const { rows } = await apmc.query(
      `SELECT id, source, started_at AS "startedAt", finished_at AS "finishedAt",
              status, rows_upserted AS "rowsUpserted", rows_skipped AS "rowsSkipped",
              error_message AS "errorMessage", metadata
         FROM ingest_runs
        ORDER BY started_at DESC
        LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/apmc/runs error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
