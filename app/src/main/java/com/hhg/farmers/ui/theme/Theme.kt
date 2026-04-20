package com.hhg.farmers.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Light color scheme — Apple-style clean white surfaces.
 *
 * Rural users are almost universally on the system default. We also had user feedback
 * explicitly asking for a white, "Apple-like" look — so dark mode is intentionally
 * NOT wired. If we ever need it we'll re-introduce a DarkColors palette and take
 * `isSystemInDarkTheme()` back into [HhgTheme], but for now the app is always light.
 */
private val LightColors = lightColorScheme(
    primary = HhgOrange500,
    onPrimary = Color.White,
    primaryContainer = HhgOrange100,
    onPrimaryContainer = HhgOrange600,
    secondary = Purple600,
    onSecondary = Color.White,
    secondaryContainer = Purple100,
    background = Color.White,
    onBackground = OnSurface,
    surface = Color.White,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = MutedForeground,
    outline = Border,
    error = Error500
)

@Composable
fun HhgTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = HhgTypography,
        content = content
    )
}
