package com.hhg.farmers.ui.navigation

import android.net.Uri

/**
 * Centralized navigation routes. Every screen registers its route here so the nav graph
 * and call sites stay in sync.
 *
 * Bottom-nav roots: ONBOARDING → HOME, MARKET_HUB, AI_TREND, SETTINGS.
 * Detail screens (FARMER, HUNDEKARI_RATES, OTHER_MARKETS, NOTICE_DETAIL) sit above the stack
 * and hide the bottom bar.
 */
object Routes {
    // ── Onboarding (shown once on first launch) ──────────────────────────────
    const val ONBOARDING = "onboarding"

    // ── Bottom-nav roots ──────────────────────────────────────────────────────
    const val HOME        = "home"
    const val MARKET_HUB  = "market"
    const val AI_TREND    = "ai-trend"
    const val SETTINGS    = "settings"

    // ── Market sub-screens ────────────────────────────────────────────────────
    const val HUNDEKARI_RATES = "market/hundekari"
    const val OTHER_MARKETS   = "market/other"

    // ── Farmer detail ─────────────────────────────────────────────────────────
    const val FARMER = "farmer/{uid}"
    fun farmer(uid: String) = "farmer/$uid"

    // ── Notice detail (title + content URL-encoded as query params) ───────────
    const val NOTICE_DETAIL = "notice?title={title}&content={content}"
    fun noticeDetail(title: String, content: String) =
        "notice?title=${Uri.encode(title)}&content=${Uri.encode(content)}"

    // ── Future / placeholder ──────────────────────────────────────────────────
    const val SEEDS = "seeds/{uid}"
    fun seeds(uid: String) = "seeds/$uid"

    // ── Drawer routes (accessible from the hamburger menu on root screens) ────
    const val ABOUT         = "about"
    const val CONTACT       = "contact"
    const val SEEDS_LIST    = "seeds"
    const val LOCAL_VYAPARI = "localvyapari"

    /** Routes that should display the bottom navigation bar. */
    val bottomNavRoots = setOf(HOME, MARKET_HUB, AI_TREND, SETTINGS)
}
