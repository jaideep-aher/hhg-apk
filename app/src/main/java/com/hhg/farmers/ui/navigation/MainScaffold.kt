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
import com.hhg.farmers.service.update.UpdateGateState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.update.ForceUpdateScreen
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface

/**
 * Top-level scaffold.
 *
 * TWO THINGS HAPPEN BEFORE ANY SCREEN IS SHOWN:
 *   1. [AppGateViewModel] fetches GET /api/config on launch.
 *   2. Until the result lands, the whole app is a loading spinner.
 *
 * If the backend says our version is below `minVersionCode`, [ForceUpdateScreen]
 * takes over the entire surface — no navigation, no back button, no dismiss.
 * This is our primary force-update path and works for both Play Store and sideloaded APKs.
 *
 * Google Play's In-App Updates IMMEDIATE flow runs separately from [MainActivity.onResume]
 * and will overlay its own full-screen Play UI on top of this whenever it succeeds.
 */
@Composable
fun MainScaffold(
    navController: NavHostController,
    gateViewModel: AppGateViewModel = hiltViewModel()
) {
    val gate by gateViewModel.gate.collectAsStateWithLifecycle()

    when (val state = gate) {
        is UpdateGateState.Checking -> LoadingState(modifier = Modifier)
        is UpdateGateState.ForceUpdate -> ForceUpdateScreen(config = state.config)
        is UpdateGateState.Allowed -> AppContent(navController = navController)
    }
}

@Composable
private fun AppContent(navController: NavHostController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Strip query-param suffix so "notice?title=…" still matches Routes.NOTICE_DETAIL
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
                                    // Pop up to the graph start so back-stack stays clean
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
            modifier = Modifier.padding(innerPadding)
        )
    }
}
