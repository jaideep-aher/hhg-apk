/**
 * Agmarknet → APMC Postgres ingest.
 *
 * Pulls the "Current Daily Price of Various Commodities from Various Markets
 * (Mandi)" dataset from data.gov.in and upserts into market_prices. Source of
 * truth for which markets/commodities to fetch is the DB itself (`markets.active`
 * and `commodities.active`), so you can enable/disable rows without redeploying.
 *
 * Resource ID and API contract:
 *   https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
 *   Filters we use: state, market, commodity (all three required to cap
 *   result size per request — Agmarknet's server is slow on unfiltered queries).
 *   NOTE: This resource is "today-only" — arrival_date is ignored as a filter.
 *   Historical backfill is not supported by this endpoint.
 *
 * Sub-market handling:
 *   One display-city (e.g. "Pune") maps to many Agmarknet names (e.g.
 *   "Pune(Pimpri) APMC", "Pune(Moshi) APMC", "Khed(Chakan) APMC"). The ingest
 *   fans out over `markets.agmarknet_markets[]` and rolls every sub-yard into
 *   the same display market_id, with the sub-yard preserved in market_prices.sub_market
 *   so variety-level analysis is still possible later.
 *
 * Run modes:
 *   - Scheduled daily via node-cron (wired in src/index.js)
 *   - Manual via POST /admin/apmc/ingest with x-admin-secret header
 *   - Local: `node -e "require('./src/jobs/ingestAgmarknet').ingest()"` from
 *     android/backend with APMC_DATABASE_URL + DATA_GOV_IN_KEY in the env.
 */

const { apmc } = require('../db/pool');
const { isSuspectModalPrice, SUSPECT_PRICE_QTL } = require('./priceSanity');

const DATA_GOV_URL =
  'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

/** Parse Agmarknet's 'DD/MM/YYYY' date or ISO date → 'YYYY-MM-DD'. */
function normalizeDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Strip commas, empty strings, NA-ish values → Number | null. */
function parseNum(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s || /^(na|n\/a|nr|-)$/i.test(s)) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function fetchPage({ apiKey, state, market, commodity, offset = 0, limit = 200 }) {
  const url = new URL(DATA_GOV_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('filters[state.keyword]', state);
  url.searchParams.set('filters[market.keyword]', market);
  url.searchParams.set('filters[commodity.keyword]', commodity);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`data.gov.in ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(to);
  }
}

async function upsertRow({ marketId, commodityId, subMarket, commodity, row }) {
  const priceDate = normalizeDate(row.arrival_date || row.Arrival_Date);
  if (!priceDate) return { skipped: true, reason: 'bad_date' };

  const min = parseNum(row.min_price ?? row.Min_x0020_Price);
  const max = parseNum(row.max_price ?? row.Max_x0020_Price);
  const modal = parseNum(row.modal_price ?? row.Modal_x0020_Price);
  const arrivals = parseNum(row.arrivals ?? row.Arrivals);

  if (min === null && max === null && modal === null) {
    return { skipped: true, reason: 'all_null' };
  }

  // Sanity floor: Agmarknet occasionally publishes leafy-green rows at "per
  // bunch" pricing that got keyed into the quintal field — e.g. Pune coriander
  // at ₹20/qtl. These are data errors, not cheap vegetables. Skip and expose
  // via ingest_runs.metadata.suspects so a human can review.
  if (isSuspectModalPrice({ modal, category: commodity.category })) {
    return {
      skipped: true,
      reason: 'suspect_low_modal',
      suspect: {
        commodity: commodity.slug,
        subMarket,
        date: priceDate,
        modal, min, max,
      },
    };
  }

  const variety = (row.variety || '').toString().slice(0, 64);
  const grade = (row.grade || '').toString().slice(0, 32);

  await apmc.query(
    `INSERT INTO market_prices
       (price_date, market_id, commodity_id, variety, grade, sub_market,
        min_price, max_price, modal_price, arrivals_qtl, source, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'agmarknet', now())
     ON CONFLICT (price_date, market_id, commodity_id, variety, grade, sub_market)
     DO UPDATE SET
       min_price    = EXCLUDED.min_price,
       max_price    = EXCLUDED.max_price,
       modal_price  = EXCLUDED.modal_price,
       arrivals_qtl = EXCLUDED.arrivals_qtl,
       source       = EXCLUDED.source,
       fetched_at   = EXCLUDED.fetched_at`,
    [priceDate, marketId, commodityId, variety, grade, subMarket, min, max, modal, arrivals]
  );
  return { skipped: false };
}

/** Fetch every page for one (sub-market, commodity) pair and upsert each row. */
async function ingestSubMarket({ apiKey, state, subMarket, marketId, commodity }) {
  let upserted = 0;
  let skipped = 0;
  const suspects = [];
  let offset = 0;
  const limit = 200;

  for (;;) {
    const json = await fetchPage({
      apiKey,
      state,
      market: subMarket,
      commodity: commodity.agmarknet_name,
      offset,
      limit,
    });
    const records = json && Array.isArray(json.records) ? json.records : [];
    if (records.length === 0) break;

    for (const row of records) {
      const r = await upsertRow({
        marketId,
        commodityId: commodity.id,
        subMarket,
        commodity,
        row,
      });
      if (r.skipped) {
        skipped++;
        if (r.suspect) suspects.push(r.suspect);
      } else {
        upserted++;
      }
    }

    if (records.length < limit) break;
    offset += limit;
    if (offset > 2000) break; // hard cap per sub-market
  }

  return { upserted, skipped, suspects };
}

/**
 * Fetch one (market, commodity) by fanning out over every sub-market string
 * attached to this display-market row. Empty arrays short-circuit so inactive
 * cities cost nothing.
 */
async function ingestPair({ apiKey, market, commodity }) {
  const subs = Array.isArray(market.agmarknet_markets) ? market.agmarknet_markets : [];
  if (subs.length === 0) {
    return { upserted: 0, skipped: 0, subMarkets: 0, empty: true };
  }

  let upserted = 0;
  let skipped = 0;
  const suspects = [];

  for (const subMarket of subs) {
    const r = await ingestSubMarket({
      apiKey,
      state: market.agmarknet_state,
      subMarket,
      marketId: market.id,
      commodity,
    });
    upserted += r.upserted;
    skipped += r.skipped;
    if (r.suspects && r.suspects.length) suspects.push(...r.suspects);
    // Light rate-limit courtesy between sub-market calls.
    await new Promise((ok) => setTimeout(ok, 150));
  }

  return { upserted, skipped, suspects, subMarkets: subs.length, empty: false };
}

async function ingest({ onlyMarket, onlyCommodity } = {}) {
  if (!apmc) {
    console.warn('[agmarknet] APMC_DATABASE_URL unset — skipping');
    return { ok: false, reason: 'no_apmc_pool' };
  }
  const apiKey = process.env.DATA_GOV_IN_KEY;
  if (!apiKey) {
    console.warn('[agmarknet] DATA_GOV_IN_KEY unset — skipping');
    return { ok: false, reason: 'no_api_key' };
  }

  const runRes = await apmc.query(
    `INSERT INTO ingest_runs (source, metadata) VALUES ('agmarknet', $1) RETURNING id`,
    [{ onlyMarket, onlyCommodity }]
  );
  const runId = runRes.rows[0].id;
  const startedAt = Date.now();

  try {
    const markets = (await apmc.query(
      `SELECT id, slug, agmarknet_state, agmarknet_markets
         FROM markets
        WHERE active = TRUE ${onlyMarket ? 'AND slug = $1' : ''}
          AND COALESCE(array_length(agmarknet_markets, 1), 0) > 0
        ORDER BY sort_order`,
      onlyMarket ? [onlyMarket] : []
    )).rows;

    const commodities = (await apmc.query(
      `SELECT id, slug, agmarknet_name, category
         FROM commodities
        WHERE active = TRUE ${onlyCommodity ? 'AND slug = $1' : ''}
        ORDER BY sort_order`,
      onlyCommodity ? [onlyCommodity] : []
    )).rows;

    let upserted = 0;
    let skipped = 0;
    const failures = [];
    const suspects = [];
    let pairsHit = 0;

    for (const market of markets) {
      for (const commodity of commodities) {
        try {
          const r = await ingestPair({ apiKey, market, commodity });
          upserted += r.upserted;
          skipped += r.skipped;
          if (r.suspects && r.suspects.length) suspects.push(...r.suspects);
          pairsHit++;
        } catch (err) {
          const msg = err && err.message ? err.message : String(err);
          console.error(`[agmarknet] ${market.slug}/${commodity.slug} failed: ${msg}`);
          failures.push({ market: market.slug, commodity: commodity.slug, error: msg });
        }
      }
    }

    await apmc.query(
      `UPDATE ingest_runs
          SET finished_at = now(),
              status = $2,
              rows_upserted = $3,
              rows_skipped = $4,
              metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb
        WHERE id = $1`,
      [
        runId,
        failures.length === 0 ? 'success' : 'partial',
        upserted,
        skipped,
        JSON.stringify({
          markets: markets.length,
          commodities: commodities.length,
          pairsHit,
          failures,
          suspects,
          suspectThresholdQtl: SUSPECT_PRICE_QTL,
          durationMs: Date.now() - startedAt,
        }),
      ]
    );

    console.log(
      `[agmarknet] done in ${Date.now() - startedAt}ms — ` +
      `upserted=${upserted} skipped=${skipped} pairs=${pairsHit}/` +
      `${markets.length * commodities.length} ` +
      `failures=${failures.length} suspects=${suspects.length}`
    );
    return { ok: true, upserted, skipped, failures, suspects, runId };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await apmc.query(
      `UPDATE ingest_runs
          SET finished_at = now(), status = 'failed', error_message = $2
        WHERE id = $1`,
      [runId, msg]
    ).catch(() => {});
    console.error('[agmarknet] fatal:', msg);
    throw err;
  }
}

module.exports = { ingest };
