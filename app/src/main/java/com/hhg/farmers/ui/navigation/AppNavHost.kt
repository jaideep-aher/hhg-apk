package com.hhg.farmers.ui.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hhg.farmers.R
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.about.AboutScreen
import com.hhg.farmers.ui.screens.aitrend.AiTrendScreen
import com.hhg.farmers.ui.screens.contact.ContactScreen
import com.hhg.farmers.ui.screens.farmer.FarmerDashboardScreen
import com.hhg.farmers.ui.screens.home.HomeScreen
import com.hhg.farmers.ui.screens.localvyapar.LocalVyaparScreen
import com.hhg.farmers.ui.screens.marketrate.HundekariRatesScreen
import com.hhg.farmers.ui.screens.marketrate.MarketRateHubScreen
import com.hhg.farmers.ui.screens.notice.NoticeDetailScreen
import com.hhg.farmers.ui.screens.onboarding.OnboardingScreen
import com.hhg.farmers.ui.screens.othermarkets.OtherMarketsScreen
import com.hhg.farmers.ui.screens.permissions.PermissionSetupScreen
import com.hhg.farmers.ui.screens.placeholder.PlaceholderScreen
import com.hhg.farmers.ui.screens.settings.SettingsScreen
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun AppNavHost(
    navController: NavHostController,
    sessionStore: SessionStore,
    /** Invoked when a root screen's hamburger menu icon is tapped. */
    onOpenDrawer: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var navStart by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(sessionStore) {
        val onboarded = sessionStore.onboarded.first()
        val permDone = sessionStore.permissionSetupDone.first()
        navStart = when {
            !onboarded -> Routes.ONBOARDING
            !permDone -> Routes.PERMISSION_SETUP
            else -> Routes.HOME
        }
    }

    if (navStart == null) {
        LoadingState(modifier = modifier.fillMaxSize())
        return
    }

    val start = navStart!!

    NavHost(
        navController = navController,
        startDestination = start,
        modifier = modifier
    ) {
        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onFinished = {
                    scope.launch {
                        sessionStore.setOnboarded()
                        navController.navigate(Routes.PERMISSION_SETUP) {
                            popUpTo(Routes.ONBOARDING) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Routes.PERMISSION_SETUP) {
            PermissionSetupScreen(
                onFinished = {
                    scope.launch {
                        sessionStore.setPermissionSetupDone()
                        sessionStore.setLocationPermissionAsked()
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.PERMISSION_SETUP) { inclusive = true }
                        }
                    }
                }
            )
        }

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

        composable(Routes.LOCAL_VYAPARI) {
            LocalVyaparScreen(onBack = { navController.popBackStack() })
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
                navArgument("title") { type = NavType.StringType; defaultValue = "" },
                navArgument("content") { type = NavType.StringType; defaultValue = "" }
            )
        ) { entry ->
            NoticeDetailScreen(
                title = entry.arguments?.getString("title").orEmpty(),
                content = entry.arguments?.getString("content").orEmpty(),
                onBack = { navController.popBackStack() }
            )
        }
    }
}
