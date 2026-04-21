package com.hhg.farmers.ui.navigation

/**
 * Centralized navigation routes. Every screen registers its route here so the nav graph
 * and call sites stay in sync.
 *
 * From v6 onward almost every content screen is hosted by [WebViewScreen] — the routes
 * below map 1:1 to pages on the Next.js site (see [com.hhg.farmers.ui.screens.web.WebPaths]).
 * The Kotlin shell keeps only the screens that HAVE to be native: onboarding, permission
 * gate, and settings (language switcher drives native locale; logout clears native storage).
 */
object Routes {
    // ── First-launch flow (native) ────────────────────────────────────────────
    const val ONBOARDING = "onboarding"

    /** Runtime permissions prompt — once after onboarding (or on first run if onboarding skipped). */
    const val PERMISSION_SETUP = "permission-setup"

    /** Device-level location services (GPS toggle) gate — shown when perm is granted but GPS is off. */
    const val LOCATION_SERVICES = "location-services"

    // ── Bottom-nav roots ──────────────────────────────────────────────────────
    /** Home tab. Hosts the website's `/` route (or `/farmers/{id}` when an id is cached). */
    const val HOME        = "home"

    /** Market Rates tab — Hundekari rates webview. "Other Markets" has been dropped (no data). */
    const val MARKET_HUB  = "market"

    /** AI Market Trend tab — `/dailyrate/agrisight`. */
    const val AI_TREND    = "ai-trend"

    /** Settings tab — stays native for language + logout + version display. */
    const val SETTINGS    = "settings"

    // ── Drawer (non-tab) webview destinations ─────────────────────────────────
    const val SEEDS_LIST    = "seeds"
    const val LOCAL_VYAPARI = "localvyapari"
    const val ABOUT         = "about"
    const val CONTACT       = "contact"

    // ── Remote-config drawer entry ────────────────────────────────────────────
    /**
     * Generic webview destination for drawer items delivered via
     * [com.hhg.farmers.data.model.AppConfig.menuItems]. The path is URL-encoded
     * into the route so adding a new page on the website = one env-var update
     * in Railway, no APK release.
     */
    const val REMOTE_PAGE_PATTERN = "remote/{path}"
    fun remotePage(path: String): String {
        val encoded = android.net.Uri.encode(path)
        return "remote/$encoded"
    }

    /** Routes that should display the bottom navigation bar. */
    val bottomNavRoots = setOf(HOME, MARKET_HUB, AI_TREND, SETTINGS)
}
