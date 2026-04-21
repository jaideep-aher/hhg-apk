package com.hhg.farmers.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Grass
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.outlined.Spa
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.hhg.farmers.R
import com.hhg.farmers.data.model.AppConfig
import com.hhg.farmers.data.model.RemoteMenuItem
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.update.UpdateGateState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.screens.update.ForceUpdateScreen
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface
import kotlinx.coroutines.launch

/**
 * Top-level scaffold.
 *
 * ORDER OF THINGS ON LAUNCH:
 *   1. [AppGateViewModel] fetches GET /api/config once per process.
 *   2. While the fetch is in flight the whole app is a loading spinner.
 *   3. If the backend says our version is below `minVersionCode`, [ForceUpdateScreen]
 *      takes over — no navigation, no back button, no dismiss.
 *   4. Otherwise the live [AppConfig] is passed into [AppContent] so every WebView
 *      screen picks up the runtime-configured `webBaseUrl` and (optional) remote
 *      drawer menu items.
 *
 * Google Play's In-App Updates IMMEDIATE flow runs separately from [MainActivity.onResume]
 * and will overlay its own full-screen Play UI on top of this whenever it succeeds.
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

    val isRootScreen = Routes.bottomNavRoots.any { root ->
        currentRoute == root || currentRoute?.startsWith(root) == true
    }

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    // Swipe-gesture opens the drawer only on root screens — avoids hijacking
    // swipes inside detail screens like the farmer dashboard webview.
    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = isRootScreen,
        drawerContent = {
            AppDrawerContent(
                currentRoute = currentRoute,
                config = config,
                onItemClick = { route ->
                    scope.launch { drawerState.close() }
                    if (route != currentRoute) {
                        navController.navigate(route) {
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
                onOpenDrawer = { scope.launch { drawerState.open() } },
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}

/**
 * Drawer content — pulls items from [AppConfig.menuItems] when non-empty, and
 * falls back to the baked-in default set otherwise. This lets a new page on
 * the website appear in the app the next time someone opens it, with no APK
 * release required.
 */
@Composable
private fun AppDrawerContent(
    currentRoute: String?,
    config: AppConfig,
    onItemClick: (String) -> Unit
) {
    val locale = java.util.Locale.getDefault().language
    val useMarathi = locale.startsWith("mr")

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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Spa,
                        contentDescription = null,
                        tint = HhgOrange500,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                    Text(
                        text = stringResource(R.string.app_name_mr),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp
                    )
                }
                Text(
                    text = stringResource(R.string.menu_tagline),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(Modifier.padding(vertical = 4.dp))

            if (config.menuItems.isNotEmpty()) {
                RemoteDrawerItems(
                    items = config.menuItems,
                    useMarathi = useMarathi,
                    onItemClick = onItemClick
                )
            } else {
                DefaultDrawerItems(
                    currentRoute = currentRoute,
                    onItemClick = onItemClick
                )
            }
            Spacer(Modifier.padding(vertical = 8.dp))
        }
    }
}

/**
 * The built-in drawer used when the backend hasn't supplied a remote menu.
 * Mirrors the website's top nav: Home, Hundekari Rates, AI Trend, Seeds,
 * Local Vyapar, About, Contact, Settings.
 */
@Composable
private fun DefaultDrawerItems(
    currentRoute: String?,
    onItemClick: (String) -> Unit
) {
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
    DrawerItem(
        label = stringResource(R.string.nav_local_vyapari),
        icon = Icons.Filled.Map,
        route = Routes.LOCAL_VYAPARI,
        currentRoute = currentRoute,
        onClick = onItemClick
    )

    Spacer(Modifier.padding(vertical = 4.dp))
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
    Spacer(Modifier.padding(vertical = 4.dp))

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
}

/**
 * Drawer populated from the backend's `menuItems` list. Settings stays pinned
 * at the bottom because it's native-owned (language switch drives
 * `AppCompatDelegate.setApplicationLocales`, logout clears SessionStore) —
 * the website can't replace it with a webview page.
 */
@Composable
private fun RemoteDrawerItems(
    items: List<RemoteMenuItem>,
    useMarathi: Boolean,
    onItemClick: (String) -> Unit
) {
    items.forEach { item ->
        val label = (if (useMarathi) item.titleMr else item.titleEn).ifBlank { item.titleEn }
        NavigationDrawerItem(
            label = { Text(label, fontWeight = FontWeight.Medium) },
            icon = { Icon(Icons.Filled.Language, contentDescription = null) },
            selected = false,
            onClick = { onItemClick(Routes.remotePage(item.path)) },
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
    Spacer(Modifier.padding(vertical = 4.dp))
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
    Spacer(Modifier.padding(vertical = 4.dp))
    DrawerItem(
        label = stringResource(R.string.menu_settings),
        icon = Icons.Filled.Settings,
        route = Routes.SETTINGS,
        currentRoute = null,
        onClick = onItemClick
    )
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
