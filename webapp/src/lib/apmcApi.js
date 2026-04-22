/**
 * Thin client for the Express `/api/apmc/*` endpoints backed by the Railway
 * APMC Postgres. All functions return already-parsed JSON or throw; callers
 * (React Query queryFns) decide how to surface errors.
 *
 * Base URL comes from NEXT_PUBLIC_API_BASE_URL and defaults to the live API
 * host, so local dev "just works" against production read-only data unless
 * you deliberately override it.
 */

const BASE =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'https://api.hanumanksk.in';

async function jsonFetch(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `APMC API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`
    );
  }
  return res.json();
}

export function fetchMarkets() {
  return jsonFetch('/api/apmc/markets');
}

export function fetchCommodities(category) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return jsonFetch(`/api/apmc/commodities${qs}`);
}

export function fetchPrices({ market, commodity, days = 7 }) {
  const qs = new URLSearchParams({ market, commodity, days: String(days) });
  return jsonFetch(`/api/apmc/prices?${qs.toString()}`);
}

export function fetchBestMarkets({ commodity, days = 1 }) {
  const qs = new URLSearchParams({ commodity, days: String(days) });
  return jsonFetch(`/api/apmc/best?${qs.toString()}`);
}

export function fetchTodaySnapshot(market) {
  const qs = new URLSearchParams({ market });
  return jsonFetch(`/api/apmc/today?${qs.toString()}`);
}
