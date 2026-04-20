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
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');  // always fresh — no CDN caching
  res.json({
    minVersionCode:      parseInt(process.env.MIN_VERSION_CODE      || '1',  10),
    latestVersionCode:   parseInt(process.env.LATEST_VERSION_CODE   || '1',  10),
    playStoreUrl:        process.env.PLAY_STORE_URL ||
                         'https://play.google.com/store/apps/details?id=com.hhg.farmers',
    forceUpdateTitle:    process.env.FORCE_UPDATE_TITLE   || 'अॅप अपडेट करा',
    forceUpdateMessage:  process.env.FORCE_UPDATE_MESSAGE ||
                         'पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. ' +
                         'जुने व्हर्जन आता सपोर्टेड नाही.'
  });
});

module.exports = router;
