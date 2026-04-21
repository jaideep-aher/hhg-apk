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
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
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
 * Nav graph. Shape of the app from v10 onward (no drawer, Settings is the hub):
 *
 *   Onboarding (native, first launch only)
 *      └── Permission Setup (native, mandatory location gate)
 *             └── Bottom-nav shell
 *                    ├── HOME       → webview `/farmers/{id}` if cached, else `/`
 *                    ├── MARKET_HUB → webview `/dailyrate/hundekari`
 *                    ├── AI_TREND   → webview `/dailyrate/agrisight`
 *                    └── SETTINGS   → native hub
 *                           ├── Seeds / Local Vyapari / About → webview detail
 *                           ├── Contact                       → native
 *                           ├── Language / Logout             → native
 *                           └── Version / App info            → native
 *
 *             + REMOTE_PAGE — backend-driven webview route for future pages
 *
 * Crucial UX: the farmer's Aadhaar is remembered in [SessionStore] so they
 * never see the search page after first sign-in. When [WebViewScreen] detects
 * a `/farmers/{id}` URL the id is mirrored into the store, keeping native
 * and web in lockstep. Logout clears BOTH native session AND the WebView's
 * cookies + localStorage — see [SettingsViewModel.logout].
 */
@Composable
fun AppNavHost(
    navController: NavHostController,
    sessionStore: SessionStore,
    config: AppConfig,
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

    val start = navStart
    if (start == null) {
        LoadingState(modifier = modifier.fillMaxSize())
        return
    }

    /** Utility — mirror a detected farmerId into native SessionStore. */
    val rememberFarmerId: (String) -> Unit = { id ->
        scope.launch { sessionStore.setFarmerId(id) }
    }

    /** Shared back handler for detail screens reached from Settings. */
    val popBack: () -> Unit = { navController.popBackStack() }

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
                    url = config.absoluteUrl(path),
                    sessionStore = sessionStore,
                    onFarmerIdDetected = rememberFarmerId
                )
            }
        }

        composable(Routes.MARKET_HUB) {
            WebViewScreen(
                url = config.absoluteUrl(WebPaths.HUNDEKARI_RATES),
                sessionStore = sessionStore,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.AI_TREND) {
            WebViewScreen(
                url = config.absoluteUrl(WebPaths.AI_TREND),
                sessionStore = sessionStore,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onLogout = {
                    // SettingsViewModel.logout() has already wiped native
                    // SessionStore + WebView cookies + localStorage before
                    // invoking this callback. Bouncing to HOME gives the
                    // user a clean signed-out search page.
                    navController.navigate(Routes.HOME) {
                        popUpTo(0) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onNavigate = { route ->
                    if (route != Routes.SETTINGS) {
                        navController.navigate(route) { launchSingleTop = true }
                    }
                }
            )
        }

        /* ───────── detail screens reached from Settings ──────────────── */

        composable(Routes.SEEDS_LIST) {
            var pathState by remember { mutableStateOf<String?>(null) }
            LaunchedEffect(Unit) {
                val id = sessionStore.farmerId.first()
                // Seeds requires an Aadhaar. If the user isn't signed in, we
                // bounce them to the website's homepage where they can enter
                // an id; the site then redirects to /seeds itself.
                pathState = if (!id.isNullOrBlank()) WebPaths.seeds(id) else WebPaths.HOME
            }
            val path = pathState
            if (path == null) {
                LoadingState(modifier = Modifier.fillMaxSize())
            } else {
                WebViewScreen(
                    url = config.absoluteUrl(path),
                    sessionStore = sessionStore,
                    onBack = popBack,
                    showBackButton = true,
                    onFarmerIdDetected = rememberFarmerId
                )
            }
        }

        composable(Routes.LOCAL_VYAPARI) {
            WebViewScreen(
                url = config.absoluteUrl(WebPaths.LOCAL_VYAPARI),
                sessionStore = sessionStore,
                onBack = popBack,
                showBackButton = true,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.ABOUT) {
            WebViewScreen(
                url = config.absoluteUrl(WebPaths.ABOUT),
                sessionStore = sessionStore,
                onBack = popBack,
                showBackButton = true,
                onFarmerIdDetected = rememberFarmerId
            )
        }

        composable(Routes.CONTACT) {
            // Kept native: the website has no /contact route at time of writing.
            // When it does, swap this for a WebViewScreen pointing at /contact
            // and add "/contact" to WebPaths.
            ContactScreen(onBack = popBack)
        }

        /* ───────── remote-config generic page (future-proof) ─────────── */

        composable(
            route = Routes.REMOTE_PAGE_PATTERN,
            arguments = listOf(navArgument("path") { type = NavType.StringType })
        ) { entry ->
            val path = entry.arguments?.getString("path").orEmpty()
            WebViewScreen(
                url = config.absoluteUrl(path.ifBlank { WebPaths.HOME }),
                sessionStore = sessionStore,
                onBack = popBack,
                showBackButton = true,
                onFarmerIdDetected = rememberFarmerId
            )
        }
    }
}
