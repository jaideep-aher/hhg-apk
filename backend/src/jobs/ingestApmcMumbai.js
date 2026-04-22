/**
 * Mumbai APMC (Vashi) → APMC Postgres ingest — covers veg, fruit, and turbhe
 * (onion/potato/garlic) yards.
 *
 * Mumbai APMC doesn't publish to data.gov.in's Agmarknet feed, but it has a
 * public HTML site at https://apmcmumbai.org that splits the physical yards
 * into three category-scoped URLs. All three share the same 5-column table
 * layout, same per-day historical URL scheme, and the same ~360-day history
 * depth — so a single parser + a category lookup is all that's needed.
 *
 *   Veg:    GET /bajarbhav/daily-bajarbhav-dates/veg        (leafy greens, gourds)
 *   Fruit:  GET /bajarbhav/daily-bajarbhav-dates/fruit      (alphonso, grapes, etc.)
 *   Turbhe: GET /bajarbhav/daily-bajarbhav-dates/turbhe     (onion/potato/garlic)
 *   Historical: GET /bajarbhav/view-daily-bajarbhav/<cat>/YYYY-MM-DD
 *
 * Each page renders a single Bootstrap table with 5 Marathi columns:
 *   शेतमालाचे नाव | आवक | किमान भाव | कमाल भाव | सरासरी भाव
 *   (name        | arrivals | min    | max    | modal/avg)
 *
 * Prices are ₹/quintal (matches our schema), arrivals are in quintals.
 * All three categories roll up to display-market `mumbai-vashi`, with the
 * yard preserved in `market_prices.sub_market` so downstream analysis can
 * still see which yard a price came from.
 *
 * Marathi-name resolution:
 *   Mumbai APMC uses commodity names like "आले (सातारा)" (ginger from Satara),
 *   "भेंडी नंबर १" (okra grade 1), "मिरची ढोबळी" (capsicum, not green chilli),
 *   "कोकण देवगड हापूस" (Devgad Alphonso mango). MAR_COMMODITY_MAP +
 *   MANGO_VARIETIES capture these patterns explicitly — unknown rows are
 *   logged but not inserted, so mapping gaps surface as skips instead of
 *   silent drops onto the wrong commodity.
 *
 * Run modes:
 *   - Scheduled daily via node-cron (see src/index.js, 19:00 + 23:30 IST)
 *     — fires ingest() which hits all three categories in sequence.
 *   - Manual today:      POST /admin/apmc/ingest-mumbai[?category=fruit]
 *   - Manual history:    POST /admin/apmc/backfill-mumbai?days=30[&category=fruit]
 *   - Local:             node -e "require('./src/jobs/ingestApmcMumbai').ingest()"
 */

const { apmc } = require('../db/pool');
const { isSuspectModalPrice } = require('./priceSanity');

const BASE = 'https://apmcmumbai.org';
const MUMBAI_MARKET_SLUG = 'mumbai-vashi';
const SOURCE_TAG = 'apmc-mumbai';
const USER_AGENT = 'HHG-Farmers-App/1.0 (+https://hhg.farm; ingest bot; contact via app)';

// ── Category config ─────────────────────────────────────────────────────────
//
// Each category maps to a distinct Mumbai APMC yard. sub_market here becomes
// market_prices.sub_market so downstream queries can filter by yard even
// though everything rolls up to `mumbai-vashi` at the display-market level.
//
// Note on veg's sub_market: the original veg ingest shipped with
// 'Mumbai (Vashi) APMC' as the value, so we keep that label. The unique
// constraint uses sub_market as part of the key — renaming would strand the
// ~1 year of backfilled rows under a dead label.
const CATEGORY_CONFIG = {
  veg: {
    todayPath:   '/bajarbhav/daily-bajarbhav-dates/veg',
    historyBase: '/bajarbhav/view-daily-bajarbhav/veg',
    subMarket:   'Mumbai (Vashi) APMC',
  },
  fruit: {
    todayPath:   '/bajarbhav/daily-bajarbhav-dates/fruit',
    historyBase: '/bajarbhav/view-daily-bajarbhav/fruit',
    subMarket:   'Mumbai (Vashi) Fruit APMC',
  },
  turbhe: {
    todayPath:   '/bajarbhav/daily-bajarbhav-dates/turbhe',
    historyBase: '/bajarbhav/view-daily-bajarbhav/turbhe',
    subMarket:   'Mumbai (Vashi) Turbhe APMC',
  },
};
const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

// ── Marathi commodity resolver ──────────────────────────────────────────────
//
// Ordered, first-match-wins. More-specific patterns (e.g. "मिरची ढोबळी" →
// capsicum) MUST come before looser ones ("मिरची <variety>" → green-chilli).
// The variety capture group (if any) is stored on market_prices.variety.
const MAR_COMMODITY_MAP = [
  // Special-case disambiguation first
  [/^मिरची\s+ढोबळी$/,              'capsicum'],

  // Chilli varieties — ज्वाला (jwala), लवंगी (lavangi), etc.
  [/^मिरची\s+(.+)$/,               'green-chilli'],

  // Gourds, brinjals, cucumbers with grade / sub-type suffixes
  [/^भेंडी(?:\s+नंबर\s*[०-९\d]+)?$/, 'okra'],
  [/^भेंडी\s+(.+)$/,                'okra'],
  [/^टोमॅटो(?:\s+नंबर\s*[०-९\d]+)?$/, 'tomato'],
  [/^टोमॅटो\s+(.+)$/,              'tomato'],
  [/^काकडी(?:\s+नंबर\s*[०-९\d]+)?$/, 'cucumber'],
  [/^काकडी\s+(.+)$/,               'cucumber'],
  [/^वांगी\s+(.+)$/,               'brinjal'],
  [/^तोंडली\s+(.+)$/,              'ivy-gourd'],
  [/^तोंडली$/,                      'ivy-gourd'],

  // Pumpkins — डांगर (round/yellow) vs दुधी (bottle)
  [/^भोपळा\s*\(\s*डांगर\s*\)$/,    'pumpkin'],
  [/^भोपळा\s*\(\s*दुधी\s*\)$/,     'bottle-gourd'],
  [/^भोपळा\s+दुधी$/,               'bottle-gourd'],
  [/^भोपळा$/,                       'pumpkin'],
  [/^कोहळा$/,                       'white-pumpkin'],

  // Gingers with region/variety parens or suffixes
  [/^आले\s*\(([^)]+)\)$/,          'ginger'],
  [/^आले\s+(.+)$/,                 'ginger'],
  [/^आले$/,                         'ginger'],

  // Leafy greens with sourcing suffixes (नाशिक, पुणे, भाजी = local)
  [/^पालक\s*(.+)?$/,               'spinach'],
  [/^मेथी\s+भाजी$/,                'methi-leaves'],
  [/^मेथी\s*(.+)?$/,               'methi-leaves'],
  [/^कोथिंबीर\s*(.+)?$/,           'coriander-leaves'],
  [/^शेपू\s*(.+)?$/,               'dill'],
  [/^कांदापात\s*(.+)?$/,           'spring-onion'],
  [/^पुदिना$/,                      'mint'],
  [/^कढीपत्ता$/,                    'curry-leaves'],

  // Core single-token commodities
  [/^कोबी$/,                        'cabbage'],
  [/^फ्लावर$/,                      'cauliflower'],
  [/^फ्लॉवर$/,                      'cauliflower'],
  [/^गाजर$/,                        'carrot'],
  [/^कारली$/,                       'bitter-gourd'],
  [/^शिराळी\s+दोडका$/,             'ridge-gourd'],
  [/^दोडका$/,                       'ridge-gourd'],
  [/^वाटाणा$/,                      'peas'],
  [/^गवार$/,                        'cluster-beans'],
  [/^फरसबी$/,                       'french-beans'],
  [/^फरशी$/,                        'french-beans'],
  [/^चवळी\s+शेंग$/,                'cowpea'],
  [/^चवळी$/,                        'cowpea'],
  [/^घेवडा$/,                       'flat-beans'],
  [/^वालवड$/,                       'field-beans'],
  [/^मुळा$/,                        'radish'],
  [/^बीट$/,                         'beetroot'],
  [/^शेवगा\s+शेंग$/,               'drumstick'],
  [/^पडवळ$/,                        'snake-gourd'],
  [/^परवर$/,                        'pointed-gourd'],
  [/^ढेमसे$/,                       'tinda'],
  [/^सुरण$/,                        'yam'],
  [/^आरवी\s*\([^)]+\)$/,           'taro'],
  [/^आरवी$/,                        'taro'],
  [/^रताळी$/,                       'sweet-potato'],
  [/^केळी\s+भाजी$/,                'raw-banana'],
  [/^फणस$/,                         'jackfruit'],
  [/^आवळा$/,                        'amla'],
  [/^कैरी$/,                        'raw-mango'],
  [/^लिंबू$/,                       'lemon'],
  [/^लसूण$/,                        'garlic'],
  [/^कांदा$/,                       'onion'],
  [/^बटाटा$/,                       'potato'],
  [/^भुईमूग\s+शेंगा$/,             'groundnut-green'],

  // ── Fruit yard (/fruit) ──────────────────────────────────────────────────
  //
  // Mango varieties come BEFORE the simpler single-token patterns below —
  // "बदामी" on its own means a mango cultivar, not a separate commodity.
  // MANGO_VARIETIES is a set for exact-match efficiency; the resolver checks
  // it before the regex list. See MANGO_VARIETIES definition.

  // Grade-numbered fruits (e.g. "अननस नं. 1", "मोसंबी नं. 1"). The grade
  // separator varies: "नं.", "नं", "नं ", and the number may be Marathi or
  // ASCII digits.
  [/^अननस(?:\s+नं\.?\s*[०-९\d]+)?$/, 'pineapple'],
  [/^मोसंबी(?:\s+नं\.?\s*[०-९\d]+)?$/, 'mosambi'],
  [/^पपई(?:\s+नं\.?\s*[०-९\d]+)?$/,  'papaya'],
  // Guava: the Mumbai site inconsistently uses both long matra (पेरू) and
  // short matra (पेरु) in the same week, sometimes in the same page.
  [/^पेर[ुू](?:\s*नं\.?\s*[०-९\d]+)?$/, 'guava'],
  [/^संत्रा?(?:\s+नं\.?\s*[०-९\d]+)?$/, 'orange'],
  [/^संत्री(?:\s+नं\.?\s*[०-९\d]+)?$/, 'orange'],

  // Sweet corn — shows up sporadically in the fruit yard.
  [/^मका$/,                            'sweet-corn'],

  // Grapes colour varieties
  [/^द्राक्षे\s+(काळी|सफेद|.+)$/,   'grapes'],
  [/^द्राक्षे?$/,                    'grapes'],

  // Simple single-token fruits
  [/^अंजीर$/,                       'fig'],
  [/^चिकू$/,                        'sapota'],
  [/^कलिंगड$/,                      'watermelon'],
  [/^खरबूज$/,                       'muskmelon'],
  [/^स्ट्रॉबेरी$/,                   'strawberry'],
  [/^डाळिंब$/,                      'pomegranate'],
];

// ── Mango varieties (exact-match set) ───────────────────────────────────────
//
// Mumbai fruit yard lists mangoes not as "आंबा <variety>" but by the variety
// name directly — "कोकण देवगड हापूस" has no "आंबा" prefix. These map to the
// mango commodity with the full Marathi name as variety, preserving the
// region+cultivar detail that matters for price analysis (Devgad Alphonso at
// ₹30k/qtl vs Totapuri at ₹8k/qtl is the same commodity at radically
// different price points).
const MANGO_VARIETIES = new Set([
  'आंबा (मिक्स)',
  'आंबा',
  'कोकण देवगड हापूस',
  'कोकण रत्नागिरी हापूस',
  'कोकण मालवण पायरी',
  'मद्रास हापूस',
  'बदामी',
  'तोतापूरी',
  'पायरी',
  'हापूस',
  'लालबाग',
  'नीलम',
  'केशर',
  'राजापुरी',
]);

function resolveCommodity(marathiName) {
  const clean = marathiName.trim().replace(/\s+/g, ' ');

  // Mangoes first — exact-match set captures region+cultivar variants.
  if (MANGO_VARIETIES.has(clean)) {
    const variety = clean.replace(/^आंबा\s*\(?\s*|\s*\)?$/g, '').trim() || clean;
    return { slug: 'mango', variety: variety.slice(0, 64) };
  }

  for (const [re, slug] of MAR_COMMODITY_MAP) {
    const m = clean.match(re);
    if (m) {
      const rawVariety = (m[1] || '').replace(/[()]/g, '').trim();
      // Preserve grade-like "नंबर १" / "नं. 1" suffix as variety if present.
      const gradeSuffix = clean.match(/(?:नंबर|नं\.?)\s*([०-९\d]+)/);
      const variety = rawVariety || (gradeSuffix ? `नं ${gradeSuffix[1]}` : '');
      return { slug, variety: variety.slice(0, 64) };
    }
  }
  return null;
}

// ── HTML parsing ────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNum(s) {
  if (!s) return null;
  const t = String(s).replace(/[,\s]/g, '').trim();
  if (!t || /^(na|n\/a|-)$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse one rendered page (today or historical).
 * Returns { date, rows: [{ name_mar, arrivals, min, max, modal }] }.
 *
 * Date is extracted from the "बाजारभाव - (DAY, DD MONTH, YYYY)" banner which
 * is in Marathi — we normalise to YYYY-MM-DD via MARATHI_MONTHS.
 */
const MARATHI_MONTHS = {
  'जाने': 1, 'फेब्रु': 2, 'फेब': 2, 'मार्च': 3,
  'एप्रि': 4, 'एप्रिल': 4, 'मे': 5, 'जून': 6,
  'जुलै': 7, 'ऑग': 8, 'ऑगस्ट': 8, 'सप्टें': 9, 'सप्ट': 9,
  'ऑक्टो': 10, 'ऑक्ट': 10, 'नोव्हें': 11, 'नोव्ह': 11,
  'डिसें': 12, 'डिस': 12,
};

function marathiNumsToAscii(s) {
  const map = { '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9' };
  return s.replace(/[०-९]/g, (c) => map[c] || c);
}

function extractDate(html) {
  const m = html.match(/बाजारभाव\s*-\s*\(([^)]+)\)/);
  if (!m) return null;
  const inner = marathiNumsToAscii(m[1]).replace(/[,.]/g, ' ').trim();
  // Expect "<weekday> <DD> <MARATHI_MONTH> <YYYY>" — whitespace-separated tokens.
  const parts = inner.split(/\s+/).filter(Boolean);
  let day = null, year = null, month = null;
  for (const p of parts) {
    if (/^\d{4}$/.test(p)) year = Number(p);
    else if (/^\d{1,2}$/.test(p) && day === null) day = Number(p);
    else if (MARATHI_MONTHS[p] !== undefined) month = MARATHI_MONTHS[p];
  }
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parsePage(html) {
  const date = extractDate(html);

  // The page has two <table>s only when both "Today" and "All" tabs are
  // rendered — but the historical view has only one table. In both cases,
  // the price table is the first (and usually only) <table> with five <th>
  // cells including "आवक". Find it robustly.
  const tableMatches = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)];
  let priceTable = null;
  for (const tm of tableMatches) {
    if (tm[0].includes('आवक') && tm[0].includes('किमान') && tm[0].includes('कमाल')) {
      priceTable = tm[0];
      break;
    }
  }
  if (!priceTable) return { date, rows: [] };

  const rows = [];
  const trMatches = priceTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const trm of trMatches) {
    const tr = trm[1];
    // Skip header rows (they use <th>, data rows use <td>).
    if (/<th\b/i.test(tr)) continue;
    const cells = [...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 5) continue;
    const nameMar = cells[0];
    if (!nameMar) continue;
    const arrivals = parseNum(cells[1]);
    const min = parseNum(cells[2]);
    const max = parseNum(cells[3]);
    const modal = parseNum(cells[4]);
    // All-null price rows are noise.
    if (min === null && max === null && modal === null) continue;
    rows.push({ nameMar, arrivals, min, max, modal });
  }
  return { date, rows };
}

// ── HTTP ────────────────────────────────────────────────────────────────────

async function fetchHtml(pathname) {
  const url = `${BASE}${pathname}`;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'mr-IN,mr;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } finally {
    clearTimeout(to);
  }
}

// ── Upsert ─────────────────────────────────────────────────────────────────

async function upsertMumbaiRow({ marketId, commodityId, priceDate, variety, subMarket, row }) {
  await apmc.query(
    `INSERT INTO market_prices
       (price_date, market_id, commodity_id, variety, grade, sub_market,
        min_price, max_price, modal_price, arrivals_qtl, source, fetched_at)
     VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (price_date, market_id, commodity_id, variety, grade, sub_market)
     DO UPDATE SET
       min_price    = EXCLUDED.min_price,
       max_price    = EXCLUDED.max_price,
       modal_price  = EXCLUDED.modal_price,
       arrivals_qtl = EXCLUDED.arrivals_qtl,
       source       = EXCLUDED.source,
       fetched_at   = EXCLUDED.fetched_at`,
    [
      priceDate, marketId, commodityId, variety, subMarket,
      row.min, row.max, row.modal, row.arrivals, SOURCE_TAG,
    ]
  );
}

// ── Main entry: ingest one page (today or a historical date) ───────────────

/**
 * Ingest one page for one yard category.
 *   category: 'veg' | 'fruit' | 'turbhe'
 *   date:     'today' | 'YYYY-MM-DD'
 * Returns { ok, category, date, upserted, skipped, unknowns, suspects }.
 */
async function ingestOne({ category = 'veg', date = 'today', runId } = {}) {
  if (!apmc) return { ok: false, reason: 'no_apmc_pool' };

  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return { ok: false, reason: 'unknown_category', category };

  const pathname = date === 'today'
    ? cfg.todayPath
    : `${cfg.historyBase}/${date}`;

  const html = await fetchHtml(pathname);
  const page = parsePage(html);
  if (!page.date) {
    return { ok: false, reason: 'no_date_in_page', category, date };
  }

  // Resolve Mumbai market + commodity map once per call.
  const marketRow = (await apmc.query(
    `SELECT id FROM markets WHERE slug = $1 LIMIT 1`,
    [MUMBAI_MARKET_SLUG]
  )).rows[0];
  if (!marketRow) return { ok: false, reason: 'mumbai_market_missing' };
  const marketId = marketRow.id;

  const commoditiesBySlug = new Map(
    (await apmc.query(`SELECT id, slug, category FROM commodities`)).rows
      .map((r) => [r.slug, { id: r.id, category: r.category }])
  );

  let upserted = 0, skipped = 0;
  const unknowns = [];
  const suspects = [];

  for (const row of page.rows) {
    const resolved = resolveCommodity(row.nameMar);
    if (!resolved) {
      unknowns.push(row.nameMar);
      skipped++;
      continue;
    }
    const commodity = commoditiesBySlug.get(resolved.slug);
    if (!commodity) {
      unknowns.push(`${row.nameMar} [slug:${resolved.slug} missing in commodities]`);
      skipped++;
      continue;
    }
    // Sanity floor — same rule the Agmarknet job applies, shared helper.
    if (isSuspectModalPrice({ modal: row.modal, category: commodity.category })) {
      suspects.push({
        commodity: resolved.slug,
        nameMar: row.nameMar,
        variety: resolved.variety,
        date: page.date,
        modal: row.modal, min: row.min, max: row.max,
      });
      skipped++;
      continue;
    }
    try {
      await upsertMumbaiRow({
        marketId,
        commodityId: commodity.id,
        priceDate: page.date,
        variety: resolved.variety,
        subMarket: cfg.subMarket,
        row,
      });
      upserted++;
    } catch (err) {
      skipped++;
      console.warn(
        `[apmc-mumbai/${category}] upsert failed for ${row.nameMar} (${resolved.slug}): ${err.message}`
      );
    }
  }

  if (runId) {
    // Accumulate into an existing parent run (used by backfill). lastSuspects
    // tracks the most recent day's suspect rows; the daily-mode call below
    // records the full suspects array separately.
    await apmc.query(
      `UPDATE ingest_runs
          SET rows_upserted = rows_upserted + $2,
              rows_skipped  = rows_skipped  + $3,
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'lastCategory',  $4::text,
                'lastDate',      $5::text,
                'lastUnknowns',  $6::jsonb,
                'lastSuspects',  $7::jsonb
              )
        WHERE id = $1`,
      [runId, upserted, skipped, category, page.date,
       JSON.stringify(unknowns), JSON.stringify(suspects)]
    ).catch(() => {});
  }

  return { ok: true, category, date: page.date, upserted, skipped, unknowns, suspects };
}

function normalizeCategories(category) {
  if (!category) return [...ALL_CATEGORIES];
  if (Array.isArray(category)) return category.filter((c) => CATEGORY_CONFIG[c]);
  return CATEGORY_CONFIG[category] ? [category] : [];
}

/**
 * Daily/today ingest — the cron + manual-admin entry point.
 *
 * With no args, fetches today for all three yard categories (veg, fruit,
 * turbhe) sequentially. Pass `category` to restrict to one yard. Wraps the
 * whole run in one ingest_runs row so observability stays per-invocation,
 * not per-yard.
 */
async function ingest({ category } = {}) {
  if (!apmc) {
    console.warn('[apmc-mumbai] APMC_DATABASE_URL unset — skipping');
    return { ok: false, reason: 'no_apmc_pool' };
  }

  const categories = normalizeCategories(category);
  if (categories.length === 0) {
    return { ok: false, reason: 'no_valid_categories', requested: category };
  }

  const runRes = await apmc.query(
    `INSERT INTO ingest_runs (source, metadata) VALUES ($1, $2) RETURNING id`,
    [SOURCE_TAG, JSON.stringify({ categories })]
  );
  const runId = runRes.rows[0].id;
  const startedAt = Date.now();

  let totalUpserted = 0, totalSkipped = 0;
  const perCategory = [];
  const allUnknowns = {};
  const allSuspects = [];

  try {
    for (const cat of categories) {
      const r = await ingestOne({ category: cat, date: 'today', runId });
      totalUpserted += r.upserted || 0;
      totalSkipped += r.skipped || 0;
      perCategory.push({
        category: cat,
        ok: r.ok,
        reason: r.reason,
        date: r.date,
        upserted: r.upserted || 0,
        skipped: r.skipped || 0,
        unknownsCount: (r.unknowns || []).length,
        suspectsCount: (r.suspects || []).length,
      });
      if ((r.unknowns || []).length) allUnknowns[cat] = r.unknowns;
      if ((r.suspects || []).length) allSuspects.push(...r.suspects);
      // Micro-delay between category pages so we're not hammering the site.
      await new Promise((ok) => setTimeout(ok, 500));
    }

    const allUnknownsEmpty = Object.keys(allUnknowns).length === 0;
    const allOk = perCategory.every((p) => p.ok);
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
        allOk ? (allUnknownsEmpty ? 'success' : 'partial') : 'failed',
        totalUpserted,
        totalSkipped,
        JSON.stringify({
          perCategory,
          unknowns: allUnknowns,
          suspects: allSuspects,
          durationMs: Date.now() - startedAt,
        }),
      ]
    );
    console.log(
      `[apmc-mumbai] today (${categories.join(',')}) — upserted=${totalUpserted} skipped=${totalSkipped} suspects=${allSuspects.length}`
    );
    return { ok: allOk, runId, perCategory, totalUpserted, totalSkipped, suspects: allSuspects };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await apmc.query(
      `UPDATE ingest_runs SET finished_at = now(), status = 'failed', error_message = $2 WHERE id = $1`,
      [runId, msg]
    ).catch(() => {});
    console.error('[apmc-mumbai] fatal:', msg);
    throw err;
  }
}

/**
 * Historical backfill — fetches the last `days` dates (ending today) for one
 * or more yard categories. Rate-limited to ~1 req/sec per fetch so a 360-day,
 * 3-category backfill takes ~18 minutes total and stays polite.
 *
 * 404s on non-trading days (Sundays, site holidays) are expected and counted
 * as "missing", not failures.
 */
async function backfill({ days = 30, category } = {}) {
  if (!apmc) return { ok: false, reason: 'no_apmc_pool' };

  const categories = normalizeCategories(category);
  if (categories.length === 0) {
    return { ok: false, reason: 'no_valid_categories', requested: category };
  }

  const runRes = await apmc.query(
    `INSERT INTO ingest_runs (source, metadata) VALUES ($1, $2) RETURNING id`,
    [`${SOURCE_TAG}-backfill`, JSON.stringify({ days, categories })]
  );
  const runId = runRes.rows[0].id;
  const startedAt = Date.now();

  const today = new Date();
  const resultsByCategory = Object.fromEntries(categories.map((c) => [c, []]));
  let totalUpserted = 0, totalSkipped = 0, missing = 0;

  try {
    // Process per-category sequentially. Within each category, walk most-
    // recent-first so a partial run still covers the highest-value dates.
    for (const cat of categories) {
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);

        try {
          const r = await ingestOne({ category: cat, date: iso, runId });
          totalUpserted += r.upserted || 0;
          totalSkipped += r.skipped || 0;
          resultsByCategory[cat].push({
            date: iso, upserted: r.upserted || 0, skipped: r.skipped || 0, ok: r.ok,
          });
        } catch (err) {
          const msg = err && err.message ? err.message : String(err);
          if (/HTTP 4\d\d/.test(msg)) {
            missing++;
            resultsByCategory[cat].push({ date: iso, missing: true });
          } else {
            resultsByCategory[cat].push({ date: iso, error: msg });
          }
        }

        await new Promise((ok) => setTimeout(ok, 1000));
      }
    }

    await apmc.query(
      `UPDATE ingest_runs
          SET finished_at = now(),
              status = 'success',
              rows_upserted = $2,
              rows_skipped = $3,
              metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE id = $1`,
      [
        runId,
        totalUpserted,
        totalSkipped,
        JSON.stringify({
          days,
          categories,
          missing,
          durationMs: Date.now() - startedAt,
          perCategory: Object.fromEntries(
            categories.map((c) => [c, {
              total: resultsByCategory[c].length,
              missing: resultsByCategory[c].filter((r) => r.missing).length,
              errored: resultsByCategory[c].filter((r) => r.error).length,
              upsertedSum: resultsByCategory[c].reduce((a, r) => a + (r.upserted || 0), 0),
            }])
          ),
        }),
      ]
    );

    console.log(
      `[apmc-mumbai backfill] ${days}d × ${categories.length} cats — ` +
      `upserted=${totalUpserted} skipped=${totalSkipped} missing=${missing}`
    );
    return { ok: true, runId, totalUpserted, totalSkipped, missing, categories };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await apmc.query(
      `UPDATE ingest_runs SET finished_at = now(), status = 'failed', error_message = $2 WHERE id = $1`,
      [runId, msg]
    ).catch(() => {});
    throw err;
  }
}

module.exports = {
  ingest,
  backfill,
  CATEGORIES: ALL_CATEGORIES,
  // Internals — exported for unit tests and the admin one-off endpoint.
  _internal: { parsePage, resolveCommodity, extractDate, ingestOne, CATEGORY_CONFIG },
};
