/**
 * Cross-source price sanity filter.
 *
 * Both Agmarknet (data.gov.in) and apmcmumbai.org occasionally publish rows
 * that look like they were entered in the wrong unit — e.g. ₹20/qtl for
 * coriander, which is really ₹20/bunch mis-keyed into the quintal field.
 * Per quintal, that would be ₹0.20/kg, which is below the cost of fuel to
 * truck the coriander to market. Treat these as data errors, not signal.
 *
 * Rules:
 *   - Only applies to `vegetable` and `fruit` commodities. Field crops,
 *     spices and cash crops can legitimately trade in tight ranges where
 *     ₹50/qtl isn't meaningful either way.
 *   - modal_price < SUSPECT_PRICE_QTL → suspect. A DBA can lower the floor
 *     later, but ₹50/qtl ≈ ₹0.50/kg is a floor no real produce hits wholesale.
 *   - null modal → NOT suspect (the row gets skipped by the all-null check
 *     upstream; we don't want to double-count).
 *
 * Exported constant so the ingest runs log the exact threshold that was
 * applied, for post-hoc analysis if we ever tune it.
 */

const SUSPECT_PRICE_QTL = 50;
const SUSPECT_CATEGORIES = new Set(['vegetable', 'fruit']);

function isSuspectModalPrice({ modal, category }) {
  if (modal === null || modal === undefined) return false;
  if (!SUSPECT_CATEGORIES.has(category)) return false;
  return Number(modal) < SUSPECT_PRICE_QTL;
}

module.exports = { isSuspectModalPrice, SUSPECT_PRICE_QTL };
