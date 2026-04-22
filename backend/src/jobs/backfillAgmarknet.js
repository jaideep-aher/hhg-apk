/**
 * Historical Agmarknet backfill — currently disabled.
 *
 * The data.gov.in resource we use (9ef84268-d588-465a-a308-a864a43d0070,
 * "Current Daily Price of Various Commodities from Various Markets (Mandi)")
 * is *today-only*: the `filters[arrival_date]` parameter is accepted but
 * silently ignored, and every request returns the same current snapshot.
 * Verified live on 2026-04-21 by running the same filter against 21/04/2026
 * and 15/04/2026 — both returned the exact same total row count and the
 * exact same single arrival_date.
 *
 * Consequence:
 *   - We cannot fill in history from this endpoint. Calling /admin/apmc/backfill
 *     would hit data.gov.in N times and upsert the same current snapshot N
 *     times — a pure waste of API quota.
 *   - History instead accumulates forward from the day we first ingest: every
 *     successful run writes that day's prices, and the /api/apmc/prices chart
 *     grows organically. Week 1 = 1 day of history; month 1 = 30 days.
 *
 * This shim stays so the /admin/apmc/backfill route doesn't 404, and so a
 * future rewrite (against a different Agmarknet resource, or a scraper) can
 * drop into the same function signature.
 */

const { apmc } = require('../db/pool');

async function backfill({ days = 30, onlyMarket, onlyCommodity } = {}) {
  const reason =
    'Agmarknet "Current Daily Price" endpoint is today-only; ' +
    'backfill is not supported. Data accumulates via the daily ingest.';
  console.warn(`[agmarknet-backfill] disabled — ${reason}`);

  if (apmc) {
    // Log the attempt so /api/apmc/runs makes the "we tried, here's why not"
    // state visible instead of looking like a silent success.
    await apmc.query(
      `INSERT INTO ingest_runs
         (source, started_at, finished_at, status, error_message, metadata)
       VALUES ('agmarknet-backfill', now(), now(), 'disabled', $1, $2::jsonb)`,
      [reason, JSON.stringify({ days, onlyMarket, onlyCommodity, note: 'endpoint_today_only' })]
    ).catch(() => {});
  }

  return { ok: false, reason };
}

module.exports = { backfill };
