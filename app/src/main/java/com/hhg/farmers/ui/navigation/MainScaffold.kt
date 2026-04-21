package com.hhg.farmers.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.hhg.farmers.data.model.AppConfig
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.update.UpdateGateState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.update.ForceUpdateScreen
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface

/**
 * Top-level scaffold.
 *
 * Navigation model (deliberately simple — one way to reach any screen):
 *
 *   • Bottom tabs (native)   → Home · Market Rate · AI Trend · Settings.
 *     These are the four primary destinations a farmer uses daily.
 *   • Settings (native)      → hub for everything secondary: farmer profile,
 *     seeds, local vyapari, about, contact, language, logout, version.
 *   • WebView links (remote) → deep links inside the website (e.g. farmer
 *     dashboard → seeds) still work via in-WebView navigation.
 *
 * We intentionally dropped the hamburger drawer (was in v8 and earlier).
 * The drawer duplicated the bottom tabs and added a half-dozen detail
 * pages that already belong under Settings, so the top bar is now a
 * clean wordmark strip with no competing navigation affordances.
 *
 * ORDER OF THINGS ON LAUNCH:
 *   1. [AppGateViewModel] fetches GET /api/config once per process.
 *   2. While the fetch is in flight the whole app is a loading spinner.
 *   3. If the backend says our version is below `minVersionCode`,
 *      [ForceUpdateScreen] takes over — no navigation, no back, no dismiss.
 *   4. Otherwise the live [AppConfig] is passed into [AppContent] so every
 *      WebView screen picks up the runtime-configured `webBaseUrl`.
 *
 * Google Play's In-App Updates IMMEDIATE flow runs separately from
 * [MainActivity.onResume] and will overlay its own full-screen Play UI
 * on top of this whenever it succeeds.
 */
@Composable
fun MainScaffold(
    navController: NavHostController,
    sessionStore: SessionStore,
    gateViewModel: AppGateViewModel = hiltViewModel()
) {
    val gate by gateViewModel.gate.collectAsStateWithLifecycle()
    val config by gateViewModel.config.collectAsStateWithLifecycle()

    when (val state = gate) {
        is UpdateGateState.Checking -> LoadingState(modifier = Modifier)
        is UpdateGateState.ForceUpdate -> ForceUpdateScreen(config = state.config)
        is UpdateGateState.Allowed -> AppContent(
            navController = navController,
            sessionStore = sessionStore,
            config = config
        )
    }
}

@Composable
private fun AppContent(
    navController: NavHostController,
    sessionStore: SessionStore,
    config: AppConfig
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Bottom bar shows only on the four root tabs; detail pages (Seeds,
    // Local Vyapari, About, Contact, remote-page) hide it so the page has
    // full vertical height.
    val isRootScreen = Routes.bottomNavRoots.any { root ->
        currentRoute == root || currentRoute?.startsWith(root) == true
    }

    Scaffold(
        bottomBar = {
            if (isRootScreen) {
                NavigationBar {
                    BottomNavItem.items.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = stringResource(item.labelRes)
                                )
                            },
                            label = { Text(stringResource(item.labelRes)) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = HhgOrange500,
                                selectedTextColor = HhgOrange500,
                                indicatorColor = HhgOrange500.copy(alpha = 0.12f),
                                unselectedIconColor = OnSurface.copy(alpha = 0.5f),
                                unselectedTextColor = OnSurface.copy(alpha = 0.5f)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        AppNavHost(
            navController = navController,
            sessionStore = sessionStore,
            config = config,
            modifier = Modifier.padding(innerPadding)
        )
    }
}
