package com.hhg.farmers.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hhg.farmers.R
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.ui.screens.about.AboutScreen
import com.hhg.farmers.ui.screens.aitrend.AiTrendScreen
import com.hhg.farmers.ui.screens.contact.ContactScreen
import com.hhg.farmers.ui.screens.farmer.FarmerDashboardScreen
import com.hhg.farmers.ui.screens.home.HomeScreen
import com.hhg.farmers.ui.screens.marketrate.HundekariRatesScreen
import com.hhg.farmers.ui.screens.marketrate.MarketRateHubScreen
import com.hhg.farmers.ui.screens.notice.NoticeDetailScreen
import com.hhg.farmers.ui.screens.onboarding.OnboardingScreen
import com.hhg.farmers.ui.screens.othermarkets.OtherMarketsScreen
import com.hhg.farmers.ui.screens.placeholder.PlaceholderScreen
import com.hhg.farmers.ui.screens.settings.SettingsScreen

@Composable
fun AppNavHost(
    navController: NavHostController,
    sessionStore: SessionStore? = null,
    /** Invoked when a root screen's hamburger menu icon is tapped. */
    onOpenDrawer: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Routes.ONBOARDING,
        modifier = modifier
    ) {
        // ── Onboarding ────────────────────────────────────────────────────────
        composable(Routes.ONBOARDING) {
            // If already onboarded, jump straight to Home
            LaunchedEffect(Unit) {
                // Check is done by the caller via sessionStore; if not passed,
                // the screen handles "Skip / Get Started" to navigate to HOME.
            }
            OnboardingScreen(
                onFinished = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                }
            )
        }

        // ── Bottom-nav roots ──────────────────────────────────────────────────
        composable(Routes.HOME) {
            HomeScreen(
                onFarmerFound = { uid ->
                    navController.navigate(Routes.farmer(uid)) {
                        popUpTo(Routes.HOME) { inclusive = false }
                    }
                },
                onAiTrendClick = { navController.navigate(Routes.AI_TREND) },
                onNoticeClick = { title, content ->
                    navController.navigate(Routes.noticeDetail(title, content))
                },
                onMenuClick = onOpenDrawer
            )
        }

        composable(Routes.MARKET_HUB) {
            MarketRateHubScreen(
                onBack = { navController.popBackStack() },
                onHundekariClick = { navController.navigate(Routes.HUNDEKARI_RATES) },
                onOtherMarketsClick = { navController.navigate(Routes.OTHER_MARKETS) }
            )
        }

        composable(Routes.AI_TREND) {
            AiTrendScreen()
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onLogout = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(0) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }

        // ── Drawer destinations (About, Contact, Seeds) ───────────────────────
        composable(Routes.ABOUT) {
            AboutScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.CONTACT) {
            ContactScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.SEEDS_LIST) {
            PlaceholderScreen(
                title = stringResource(R.string.menu_seeds),
                onBack = { navController.popBackStack() }
            )
        }

        // ── Detail / sub-screens (bottom bar hidden) ──────────────────────────
        composable(
            route = Routes.FARMER,
            arguments = listOf(navArgument("uid") { type = NavType.StringType })
        ) { entry ->
            val uid = entry.arguments?.getString("uid").orEmpty()
            FarmerDashboardScreen(
                uid = uid,
                onBack = { navController.popBackStack() },
                onOpenMarketRates = { navController.navigate(Routes.MARKET_HUB) },
                onOpenAiTrend = { navController.navigate(Routes.AI_TREND) },
                onLogout = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HUNDEKARI_RATES) {
            HundekariRatesScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.OTHER_MARKETS) {
            OtherMarketsScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Routes.NOTICE_DETAIL,
            arguments = listOf(
                navArgument("title")   { type = NavType.StringType; defaultValue = "" },
                navArgument("content") { type = NavType.StringType; defaultValue = "" }
            )
        ) { entry ->
            NoticeDetailScreen(
                title   = entry.arguments?.getString("title").orEmpty(),
                content = entry.arguments?.getString("content").orEmpty(),
                onBack  = { navController.popBackStack() }
            )
        }
    }
}
