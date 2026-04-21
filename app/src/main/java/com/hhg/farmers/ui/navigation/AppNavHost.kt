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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hhg.farmers.R
import com.hhg.farmers.data.model.AppConfig
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.permissions.isLocationGranted
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.contact.ContactScreen
import com.hhg.farmers.ui.screens.onboarding.OnboardingScreen
import com.hhg.farmers.ui.screens.permissions.PermissionSetupScreen
import com.hhg.farmers.ui.screens.settings.SettingsScreen
import com.hhg.farmers.ui.screens.web.WebPaths
import com.hhg.farmers.ui.screens.web.WebViewScreen
import com.hhg.farmers.ui.screens.web.absoluteUrl
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Nav graph. Shape of the app from v6 onward:
 *
 *   Onboarding (native, first launch only)
 *      └── Permission Setup (native, mandatory location gate)
 *             └── Bottom-nav shell
 *                    ├── HOME  ──► webview `/farmers/{id}` if id cached, else `/`
 *                    ├── MARKET_HUB ──► webview `/dailyrate/hundekari`
 *                    ├── AI_TREND ──► webview `/dailyrate/agrisight`
 *                    └── SETTINGS (native — language + logout + version)
 *
 *             + drawer-only destinations (webview): seeds, local vyapar, about
 *             + drawer contact (native — site has no /contact page)
 *             + REMOTE_PAGE for backend-delivered drawer items
 *
 * Crucial UX: the farmer's Aadhaar is remembered in [SessionStore] so they
 * never see the search page after first sign-in. When [WebViewScreen] detects
 * a `/farmers/{id}` URL the id is mirrored into the store, keeping native and
 * web in lockstep.
 */
@Composable
fun AppNavHost(
    navController: NavHostController,
    sessionStore: SessionStore,
    config: AppConfig,
    /** Invoked when a root screen's hamburger menu icon is tapped. */
    onOpenDrawer: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var navStart by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(sessionStore) {
        val onboarded = sessionStore.onboarded.first()
        val permDone = sessionStore.permissionSetupDone.first()
        // Location is a HARD requirement (delivery-app style). Even if the user
        // already completed permission setup on a previous install, if they've
        // since revoked location in system Settings we send them back here.
        val locationOk = isLocationGranted(context)
        navStart = when {
            !onboarded -> Routes.ONBOARDING
            !permDone || !locationOk -> Routes.PERMISSION_SETUP
            else -> Routes.HOME
        }
    }

    if (navStart == null) {
        LoadingState(modifier = modifier.fillMaxSize())
        return
    }

    val start = navStart!!

    /** Utility — mirror a detected farmerId into native SessionStore. */
    val rememberFarmerId: (String) -> Unit = { id ->
        scope.launch { sessionStore.setFarmerId(id) }
    }

    NavHost(
        navController = navController,
        startDestination = start,
        modifier = modifier
    ) {
        /* ───────── onboarding / permissions (native) ──────────────────── */

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

        /* ───────── bottom-nav roots (webview-backed except SETTINGS) ──── */

        composable(Routes.HOME) {
            // On first render decide whether to land on the farmer dashboard
            // (id cached) or the site homepage (search page).
            var startPath by remember { mutableStateOf<String?>(null) }
            LaunchedEffect(Unit) {
                val cached = sessionStore.farmerId.first()
                startPath = if (!cached.isNullOrBlank()) {
                    WebPaths.farmer(cached)
                } else {
                    WebPaths.HOME
                }
            }
            val path = startPath
            if (path == null) {
                LoadingState(modifier = Modifier.fillMaxSize())
            } else {
                WebViewScreen(
                    title = stringResource(R.string.nav_home),
                    url = config.absoluteUrl(path),
                    sessionStore = sessionStore,
                    onBack = { /* HOME is root — no-op; system back exits app */ },
                    onMenu = onOpenDrawer,
                    onFarmerIdDetected = rememberFarmerId
                )
            }
        }

        composable(Routes.MARKET_HUB) {
            WebViewScreen(
                title = stringResource(R.string.nav_market_rate),
                url = config.absoluteUrl(WebPaths.HUNDEKARI_RATES),
                sessionStore = sessionStore,
                onBack = { /* root */ },
                onMenu = onOpenDrawer,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.AI_TREND) {
            WebViewScreen(
                title = stringResource(R.string.nav_ai_trend),
                url = config.absoluteUrl(WebPaths.AI_TREND),
                sessionStore = sessionStore,
                onBack = { /* root */ },
                onMenu = onOpenDrawer,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onLogout = {
                    // SessionStore.clear() wipes farmerId + tokens but preserves
                    // onboarding / language so the user comes back to a clean
                    // signed-out home webview.
                    navController.navigate(Routes.HOME) {
                        popUpTo(0) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }

        /* ───────── drawer-only webview destinations ──────────────────── */

        composable(Routes.SEEDS_LIST) {
            var pathState by remember { mutableStateOf<String?>(null) }
            LaunchedEffect(Unit) {
                val id = sessionStore.farmerId.first()
                // Seeds requires an Aadhaar. If the user hasn't signed in
                // yet, bounce them back to the search page (/) and let the
                // site route to /seeds once they enter an id.
                pathState = if (!id.isNullOrBlank()) WebPaths.seeds(id) else WebPaths.HOME
            }
            val path = pathState
            if (path == null) {
                LoadingState(modifier = Modifier.fillMaxSize())
            } else {
                WebViewScreen(
                    title = stringResource(R.string.menu_seeds),
                    url = config.absoluteUrl(path),
                    sessionStore = sessionStore,
                    onBack = { navController.popBackStack() },
                    onFarmerIdDetected = rememberFarmerId
                )
            }
        }

        composable(Routes.LOCAL_VYAPARI) {
            WebViewScreen(
                title = stringResource(R.string.nav_local_vyapari),
                url = config.absoluteUrl(WebPaths.LOCAL_VYAPARI),
                sessionStore = sessionStore,
                onBack = { navController.popBackStack() },
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.ABOUT) {
            WebViewScreen(
                title = stringResource(R.string.menu_about),
                url = config.absoluteUrl(WebPaths.ABOUT),
                sessionStore = sessionStore,
                onBack = { navController.popBackStack() },
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.CONTACT) {
            // Kept native: the website has no /contact route at time of writing.
            // When it does, swap this for a WebViewScreen pointing at /contact
            // and add "/contact" to WebPaths.
            ContactScreen(onBack = { navController.popBackStack() })
        }

        /* ───────── remote-config generic page (future-proof) ─────────── */

        composable(
            route = Routes.REMOTE_PAGE_PATTERN,
            arguments = listOf(navArgument("path") { type = NavType.StringType })
        ) { entry ->
            val path = entry.arguments?.getString("path").orEmpty()
            WebViewScreen(
                title = stringResource(R.string.app_name_mr),
                url = config.absoluteUrl(path.ifBlank { WebPaths.HOME }),
                sessionStore = sessionStore,
                onBack = { navController.popBackStack() },
                onFarmerIdDetected = rememberFarmerId
            )
        }
    }
}
