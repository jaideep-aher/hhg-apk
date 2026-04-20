package com.hhg.farmers.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hhg.farmers.R
import com.hhg.farmers.ui.theme.Border
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface
import com.hhg.farmers.ui.theme.SurfaceLight

/**
 * Shared app bar. Can render one of three leading icons, in priority order:
 *   1. Back arrow, when [onBack] is set — for detail screens.
 *   2. Hamburger menu, when [onMenuClick] is set — for root screens that host the drawer.
 *   3. None.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    /** Pass a non-null lambda to show the back arrow. Wins over [onMenuClick] if both are set. */
    onBack: (() -> Unit)? = null,
    /** Convenience flag — when true and [onBack] is null, icon is shown but non-functional. */
    showBack: Boolean = onBack != null,
    /** Pass a non-null lambda to show the hamburger menu icon (opens the side drawer). */
    onMenuClick: (() -> Unit)? = null,
    /** Optional custom title. Defaults to the app name in brand orange. */
    title: String? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    CenterAlignedTopAppBar(
        modifier = Modifier.drawBehind {
            val stroke = 1.dp.toPx()
            drawLine(
                color = Border,
                start = Offset(0f, size.height - stroke / 2),
                end = Offset(size.width, size.height - stroke / 2),
                strokeWidth = stroke
            )
        },
        title = {
            Row(modifier = Modifier.padding(horizontal = 4.dp)) {
                if (title != null) {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold
                    )
                } else {
                    // Same centered wordmark as the mobile site header (mono + extrabold orange).
                    Text(
                        text = stringResource(R.string.app_name_mr),
                        color = HhgOrange500,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }
        },
        navigationIcon = {
            when {
                showBack || onBack != null -> {
                    IconButton(onClick = { onBack?.invoke() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null)
                    }
                }
                onMenuClick != null -> {
                    IconButton(onClick = onMenuClick) {
                        Icon(Icons.Default.Menu, contentDescription = stringResource(R.string.menu_open))
                    }
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            containerColor = SurfaceLight,
            scrolledContainerColor = SurfaceLight,
            navigationIconContentColor = OnSurface,
            titleContentColor = HhgOrange500,
            actionIconContentColor = OnSurface
        )
    )
}
