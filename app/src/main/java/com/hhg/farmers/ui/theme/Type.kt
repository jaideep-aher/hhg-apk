package com.hhg.farmers.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.hhg.farmers.R

/**
 * Typography — Noto Sans Devanagari as primary (covers Marathi/Hindi) and Inter as secondary (Latin).
 *
 * Fonts download on first use via Google Fonts provider and cache on-device, so no heavy TTF in the APK.
 */
private val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val notoDevanagari = GoogleFont("Noto Sans Devanagari")
private val inter = GoogleFont("Inter")

private val DevanagariFamily = FontFamily(
    Font(googleFont = notoDevanagari, fontProvider = fontProvider, weight = FontWeight.Normal),
    Font(googleFont = notoDevanagari, fontProvider = fontProvider, weight = FontWeight.Medium),
    Font(googleFont = notoDevanagari, fontProvider = fontProvider, weight = FontWeight.Bold),
    Font(googleFont = notoDevanagari, fontProvider = fontProvider, weight = FontWeight.ExtraBold)
)

private val LatinFamily = FontFamily(
    Font(googleFont = inter, fontProvider = fontProvider, weight = FontWeight.Normal),
    Font(googleFont = inter, fontProvider = fontProvider, weight = FontWeight.Medium),
    Font(googleFont = inter, fontProvider = fontProvider, weight = FontWeight.Bold)
)

// Devanagari-first: Marathi users see the primary font; Latin characters fall back to Inter automatically
// because Compose composites families when the primary doesn't have a glyph.
private val AppFamily = DevanagariFamily

val HhgTypography = Typography(
    displayLarge  = TextStyle(fontFamily = AppFamily, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold),
    headlineLarge = TextStyle(fontFamily = AppFamily, fontSize = 24.sp, fontWeight = FontWeight.Bold),
    headlineMedium= TextStyle(fontFamily = AppFamily, fontSize = 20.sp, fontWeight = FontWeight.Bold),
    titleLarge    = TextStyle(fontFamily = AppFamily, fontSize = 18.sp, fontWeight = FontWeight.Medium),
    titleMedium   = TextStyle(fontFamily = AppFamily, fontSize = 16.sp, fontWeight = FontWeight.Medium),
    bodyLarge     = TextStyle(fontFamily = AppFamily, fontSize = 16.sp),
    bodyMedium    = TextStyle(fontFamily = AppFamily, fontSize = 14.sp),
    labelLarge    = TextStyle(fontFamily = AppFamily, fontSize = 14.sp, fontWeight = FontWeight.Medium)
)
