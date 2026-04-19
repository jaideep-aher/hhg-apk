package com.hhg.farmers.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Light/dark color schemes. Dark support is wired but not user-facing yet — rural users are
 * almost universally on the system default, which is Light on Android 11-14. Enabling it later
 * is a no-code flip.
 */
private val LightColors = lightColorScheme(
    primary = HhgOrange500,
    onPrimary = Color.White,
    primaryContainer = HhgOrange100,
    onPrimaryContainer = HhgOrange600,
    secondary = Purple600,
    onSecondary = Color.White,
    secondaryContainer = Purple100,
    background = SurfaceLight,
    onBackground = OnSurface,
    surface = SurfaceLight,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = MutedForeground,
    outline = Border,
    error = Error500
)

private val DarkColors = darkColorScheme(
    primary = HhgOrange500,
    onPrimary = Color.White,
    primaryContainer = HhgOrange600,
    secondary = Purple600,
    background = Color(0xFF0B0F1A),
    surface = Color(0xFF111827),
    onSurface = Color(0xFFE2E8F0)
)

@Composable
fun HhgTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = HhgTypography,
        content = content
    )
}
