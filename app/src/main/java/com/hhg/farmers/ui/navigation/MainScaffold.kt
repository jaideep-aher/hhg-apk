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
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface

/**
 * Top-level scaffold that hosts the bottom navigation bar + the full nav graph.
 *
 * The bottom bar is only visible on root-level screens (Home, Market, AI Trend, Settings).
 * Detail screens (Farmer, Hundekari rates, Notice detail, etc.) sit above the root stack
 * and inherit `false` from the visibility check — the bar slides away automatically because
 * Scaffold simply doesn't render it when `bottomBar = {}`.
 */
@Composable
fun MainScaffold(navController: NavHostController) {
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
