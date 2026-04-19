package com.hhg.farmers.ui.navigation

/**
 * Centralized navigation routes. Every screen registers its route here so the nav graph
 * and call sites stay in sync.
 */
object Routes {
    const val HOME = "home"
    const val FARMER = "farmer/{uid}"
    fun farmer(uid: String) = "farmer/$uid"

    const val MARKET_HUB = "market"
    const val HUNDEKARI_RATES = "market/hundekari"
    const val OTHER_MARKETS = "market/other"
    const val AI_TREND = "market/ai-trend"

    const val SEEDS = "seeds/{uid}"
    fun seeds(uid: String) = "seeds/$uid"

    const val LOCAL_VYAPARI = "localvyapari"
    const val ABOUT = "about"
}
