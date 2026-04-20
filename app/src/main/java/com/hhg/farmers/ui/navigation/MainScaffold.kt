package com.hhg.farmers.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Grass
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.hhg.farmers.R
import com.hhg.farmers.service.update.UpdateGateState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.update.ForceUpdateScreen
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface
import kotlinx.coroutines.launch

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

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    // Swipe-gesture opens the drawer only on root screens — avoids hijacking
    // swipes inside detail screens like FarmerDashboardScreen.
    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = isRootScreen,
        drawerContent = {
            AppDrawerContent(
                currentRoute = currentRoute,
                onItemClick = { route ->
                    scope.launch { drawerState.close() }
                    if (route != currentRoute) {
                        navController.navigate(route) {
                            // For root destinations, keep the back stack clean.
                            if (route in Routes.bottomNavRoots) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            } else {
                                launchSingleTop = true
                            }
                        }
                    }
                }
            )
        }
    ) {
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
                onOpenDrawer = { scope.launch { drawerState.open() } },
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}

/**
 * Contents of the side drawer: a brand header plus the full set of app destinations.
 *
 * Items mirror the website's nav: Home, Market Rates, AI Trend, Seeds, About, Contact,
 * Settings. Selected state is driven by the current nav route.
 */
@Composable
private fun AppDrawerContent(
    currentRoute: String?,
    onItemClick: (String) -> Unit
) {
    ModalDrawerSheet {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
        ) {
            // ── Brand header ──────────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = HhgOrange500
                )
                Text(
                    text = stringResource(R.string.menu_tagline),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(Modifier.height(8.dp))

            // ── Root destinations ─────────────────────────────────────────────
            DrawerItem(
                label = stringResource(R.string.menu_home),
                icon = Icons.Filled.Home,
                route = Routes.HOME,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            DrawerItem(
                label = stringResource(R.string.menu_market),
                icon = Icons.Filled.TrendingUp,
                route = Routes.MARKET_HUB,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            DrawerItem(
                label = stringResource(R.string.menu_ai_trend),
                icon = Icons.Filled.AutoAwesome,
                route = Routes.AI_TREND,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            DrawerItem(
                label = stringResource(R.string.menu_seeds),
                icon = Icons.Filled.Grass,
                route = Routes.SEEDS_LIST,
                currentRoute = currentRoute,
                onClick = onItemClick
            )

            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(Modifier.height(8.dp))

            // ── Info destinations ─────────────────────────────────────────────
            DrawerItem(
                label = stringResource(R.string.menu_about),
                icon = Icons.Filled.Info,
                route = Routes.ABOUT,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            DrawerItem(
                label = stringResource(R.string.menu_contact),
                icon = Icons.Filled.Phone,
                route = Routes.CONTACT,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            DrawerItem(
                label = stringResource(R.string.menu_settings),
                icon = Icons.Filled.Settings,
                route = Routes.SETTINGS,
                currentRoute = currentRoute,
                onClick = onItemClick
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun DrawerItem(
    label: String,
    icon: ImageVector,
    route: String,
    currentRoute: String?,
    onClick: (String) -> Unit
) {
    NavigationDrawerItem(
        label = { Text(label, fontWeight = FontWeight.Medium) },
        icon = { Icon(icon, contentDescription = null) },
        selected = currentRoute == route,
        onClick = { onClick(route) },
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = HhgOrange500.copy(alpha = 0.12f),
            selectedIconColor = HhgOrange500,
            selectedTextColor = HhgOrange500,
            unselectedIconColor = OnSurface.copy(alpha = 0.6f),
            unselectedTextColor = OnSurface
        )
    )
}
