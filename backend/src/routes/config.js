const { Router } = require('express');

const router = Router();

/**
 * GET /api/config
 *
 * Returns runtime-tunable config values for the app.
 * The APK reads this on every launch. If the installed versionCode is
 * below `minVersionCode`, the app shows a blocking "Update Now" screen
 * and refuses to let the user proceed.
 *
 * HOW TO FORCE AN UPDATE (no code change, no redeploy of backend code):
 *   Just update the MIN_VERSION_CODE environment variable in Railway and restart.
 *   Every user on an older APK will immediately see the force-update screen
 *   on their next app launch. No Play Store review needed.
 *
 * HOW IT WORKS:
 *   - minVersionCode      → below this = BLOCK (unskippable, must update)
 *   - latestVersionCode   → below this = SOFT nudge (flexible, dismissible)
 *   - playStoreUrl        → where the Update button takes them
 *   - forceUpdateTitle    → headline on the block screen (Marathi)
 *   - forceUpdateMessage  → body text on the block screen (Marathi)
 */
/**
 * Parse WEB_MENU_ITEMS (JSON array) from env. Malformed JSON is swallowed
 * and the app falls back to its baked-in default menu — we never want a
 * typo in Railway to break every user's drawer.
 */
function parseMenuItems() {
  const raw = process.env.WEB_MENU_ITEMS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');  // always fresh — no CDN caching
  res.json({
    minVersionCode:      parseInt(process.env.MIN_VERSION_CODE      || '1',  10),
    latestVersionCode:   parseInt(process.env.LATEST_VERSION_CODE   || '1',  10),
    // Leave blank by default — the Android client derives the correct URL from
    // its own applicationId (context.packageName) so "Update now" always lands
    // on the real listing even if the app was renamed. Only set PLAY_STORE_URL
    // in Railway if you deliberately want to override (e.g. package migration
    // where you want old users pointed at a new listing).
    playStoreUrl:        process.env.PLAY_STORE_URL || '',
    forceUpdateTitle:    process.env.FORCE_UPDATE_TITLE   || 'अॅप अपडेट करा',
    forceUpdateMessage:  process.env.FORCE_UPDATE_MESSAGE ||
                         'पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. ' +
                         'जुने व्हर्जन आता सपोर्टेड नाही.',

    // Base URL of the Next.js site whose pages the Android shell hosts in
    // WebViews. Override WEB_BASE_URL in Railway to roll out a new domain
    // (e.g. https://www.hanumanksk.in) without cutting a new APK.
    // The default is a temporary staging host — the final production value
    // should be set via the Railway env var before Play Store upload.
    webBaseUrl:          process.env.WEB_BASE_URL || 'https://1.aher.dev',

    // Optional secondary website host used as fallback when the primary
    // host is unreachable. Blank → no fallback.
    webBaseUrlFallback:  process.env.WEB_BASE_URL_FALLBACK || '',

    // Remote drawer. Each item: {id, titleMr, titleEn, path, requiresFarmerId?}
    // Example:
    //   WEB_MENU_ITEMS='[{"id":"schemes","titleMr":"सरकारी योजना","titleEn":"Govt schemes","path":"/schemes"}]'
    // Empty array → Android shell falls back to its baked-in default menu.
    menuItems:           parseMenuItems()
  });
});

module.exports = router;
