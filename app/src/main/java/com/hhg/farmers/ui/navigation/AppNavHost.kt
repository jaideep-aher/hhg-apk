package com.hhg.farmers.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hhg.farmers.ui.screens.farmer.FarmerDashboardScreen
import com.hhg.farmers.ui.screens.home.HomeScreen
import com.hhg.farmers.ui.screens.marketrate.HundekariRatesScreen
import com.hhg.farmers.ui.screens.marketrate.MarketRateHubScreen
import com.hhg.farmers.ui.screens.placeholder.PlaceholderScreen

@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Routes.HOME,
        modifier = modifier
    ) {
        composable(Routes.HOME) {
            HomeScreen(
                onFarmerFound = { uid ->
                    navController.navigate(Routes.farmer(uid)) {
                        popUpTo(Routes.HOME) { inclusive = false }
                    }
                },
                onAiTrendClick = { navController.navigate(Routes.AI_TREND) }
            )
        }

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
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.MARKET_HUB) {
            MarketRateHubScreen(
                onBack = { navController.popBackStack() },
                onHundekariClick = { navController.navigate(Routes.HUNDEKARI_RATES) },
                onOtherMarketsClick = { navController.navigate(Routes.OTHER_MARKETS) }
            )
        }

        composable(Routes.HUNDEKARI_RATES) {
            HundekariRatesScreen(onBack = { navController.popBackStack() })
        }

        // Screens 5–9: stubs for now, implemented in follow-up passes.
        composable(Routes.OTHER_MARKETS) { PlaceholderScreen("Other market rates") { navController.popBackStack() } }
        composable(Routes.AI_TREND)      { PlaceholderScreen("AI Market Trend")    { navController.popBackStack() } }
        composable(Routes.LOCAL_VYAPARI) { PlaceholderScreen("Local Vyapari")      { navController.popBackStack() } }
        composable(Routes.ABOUT)         { PlaceholderScreen("About")              { navController.popBackStack() } }
        composable(
            route = Routes.SEEDS,
            arguments = listOf(navArgument("uid") { type = NavType.StringType })
        ) { PlaceholderScreen("Seeds")   { navController.popBackStack() } }
    }
}
