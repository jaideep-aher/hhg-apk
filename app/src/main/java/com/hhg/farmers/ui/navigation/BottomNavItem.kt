package com.hhg.farmers.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.ui.graphics.vector.ImageVector
import com.hhg.farmers.R

/**
 * Defines the four tabs shown in the bottom navigation bar.
 * Each item maps to a root-level route so back-stack state is saved/restored on tab switch.
 */
sealed class BottomNavItem(
    val route: String,
    val icon: ImageVector,
    @StringRes val labelRes: Int
) {
    object Home     : BottomNavItem(Routes.HOME,       Icons.Filled.Home,        R.string.nav_home)
    object Market   : BottomNavItem(Routes.MARKET_HUB, Icons.Filled.TrendingUp,  R.string.nav_market_rate)
    object AiTrend  : BottomNavItem(Routes.AI_TREND,   Icons.Filled.AutoAwesome, R.string.nav_ai_trend)
    object SettingsTab : BottomNavItem(Routes.SETTINGS, Icons.Filled.Settings,   R.string.nav_settings)

    companion object {
        val items = listOf(Home, Market, AiTrend, SettingsTab)
    }
}
