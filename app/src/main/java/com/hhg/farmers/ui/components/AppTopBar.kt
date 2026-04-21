package com.hhg.farmers.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hhg.farmers.R
import com.hhg.farmers.ui.theme.Border
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.OnSurface
import com.hhg.farmers.ui.theme.TopBarSurface

/**
 * Shared app bar — deliberately compact (48 dp vs Material's default ~64 dp)
 * and brand-only. Rules:
 *
 *   • The title is ALWAYS the हनुमान हुंडेकरी wordmark — no per-page text.
 *     Page identity is communicated by the bottom nav tabs + drawer, not the
 *     top bar. This avoids stacking redundant labels when we host webviews.
 *   • Leading icon priority:
 *       1. Hamburger when [onMenuClick] is provided  → root / webview screens
 *       2. Back arrow when [onBack] is provided and no menu  → native-only
 *          detail screens (Contact, occasional settings sub-pages)
 *       3. Nothing otherwise  → force-update, onboarding
 *   • The bar draws its own 1 dp bottom border so the wordmark strip reads
 *     as distinct from the content below without stealing extra vertical
 *     space with elevation.
 *
 * This replaces our previous Material3 CenterAlignedTopAppBar which was too
 * tall and rendered a per-page title below the wordmark when hosting a
 * webview that also had its own header.
 */
@Suppress("UNUSED_PARAMETER")
@Composable
fun AppTopBar(
    /** Pass a non-null lambda to show the back arrow. Ignored when [onMenuClick] is set. */
    onBack: (() -> Unit)? = null,
    /** Pass a non-null lambda to show the hamburger menu icon (opens the side drawer). */
    onMenuClick: (() -> Unit)? = null,
    /**
     * DEPRECATED — retained only so legacy native screens still compile.
     * The bar now always renders the हनुमान हुंडेकरी wordmark and ignores
     * per-page titles. Page identity is conveyed by the drawer + tabs.
     */
    title: String? = null,
    /**
     * DEPRECATED — retained only so legacy native screens still compile.
     * Back-button visibility is now driven purely by whether [onBack] is set.
     */
    showBack: Boolean = false,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(TOP_BAR_HEIGHT)
            .background(TopBarSurface)
            .drawBehind {
                val stroke = 1.dp.toPx()
                drawLine(
                    color = Border,
                    start = Offset(0f, size.height - stroke / 2),
                    end = Offset(size.width, size.height - stroke / 2),
                    strokeWidth = stroke
                )
            }
    ) {
        // Leading icon (hamburger > back > nothing).
        Row(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .fillMaxHeight(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            when {
                onMenuClick != null -> {
                    IconButton(
                        onClick = onMenuClick,
                        modifier = Modifier.size(TOP_BAR_HEIGHT)
                    ) {
                        Icon(
                            Icons.Default.Menu,
                            contentDescription = stringResource(R.string.menu_open),
                            tint = OnSurface
                        )
                    }
                }
                onBack != null -> {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(TOP_BAR_HEIGHT)
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = null,
                            tint = OnSurface
                        )
                    }
                }
            }
        }

        // Centered wordmark — हनुमान हुंडेकरी, always.
        Text(
            text = stringResource(R.string.app_name_mr),
            color = HhgOrange500,
            fontFamily = FontFamily.Monospace,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.align(Alignment.Center)
        )

        // Trailing actions slot.
        Row(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .fillMaxHeight()
                .padding(end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            content = actions
        )
    }
}

private val TOP_BAR_HEIGHT = 48.dp
