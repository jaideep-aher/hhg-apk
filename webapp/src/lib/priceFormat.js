/**
 * Centralised price formatting so every screen shows rates the same way.
 *
 * Agmarknet always publishes in ₹ per quintal (100 kg) — that's the APMC
 * standard. Farmers, especially small vegetable growers, often think in ₹/kg
 * though. So we show BOTH: the quintal price (authoritative) and a kg
 * companion in smaller type.
 *
 * Exceptions we respect:
 *   - unit === 'tonne'  → show ₹/tonne primary, no per-kg (rare; sugarcane FRP)
 *   - unit === 'kg'     → show ₹/kg primary only (no conversion needed)
 *   - everything else   → treat as ₹/quintal, show ₹/kg companion
 */

const UNIT_LABEL_MR = {
  quintal: 'क्विंटल',
  kg: 'किलो',
  tonne: 'टन',
};

const UNIT_LABEL_EN = {
  quintal: 'quintal',
  kg: 'kg',
  tonne: 'tonne',
};

export function inr(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return null;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Returns { primary, secondary } display strings.
 *   primary   → "₹1,800 / क्विंटल"
 *   secondary → "(₹18 / किलो)" or null if not applicable
 */
export function formatPrice(value, unit = 'quintal', lang = 'mr') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return { primary: '—', secondary: null };
  }
  const labels = lang === 'mr' ? UNIT_LABEL_MR : UNIT_LABEL_EN;

  if (unit === 'kg') {
    return { primary: `₹${num.toLocaleString('en-IN')} / ${labels.kg}`, secondary: null };
  }
  if (unit === 'tonne') {
    return { primary: `₹${num.toLocaleString('en-IN')} / ${labels.tonne}`, secondary: null };
  }

  const perKg = num / 100;
  const perKgRounded =
    perKg >= 10
      ? Math.round(perKg).toLocaleString('en-IN')
      : perKg.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return {
    primary: `₹${num.toLocaleString('en-IN')} / ${labels.quintal}`,
    secondary: `₹${perKgRounded} / ${labels.kg}`,
  };
}

/** Compact "₹X" (no unit) — for tight table cells where unit is in the column header. */
export function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Converts quintal → kg for table cells when the user has toggled kg view. */
export function toKg(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num / 100;
}
