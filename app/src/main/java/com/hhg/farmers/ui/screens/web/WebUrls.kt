package com.hhg.farmers.ui.screens.web

import com.hhg.farmers.data.model.AppConfig

/**
 * Single source of truth for mapping Android routes → website paths.
 *
 * The Android app is a native "shell" (Kotlin) that handles navigation,
 * permissions, push, auth, offline cache, and force-update — but all
 * *content* screens are pages from the Next.js site at
 * [AppConfig.webBaseUrl], loaded inside a [WebViewScreen]. Putting every
 * path in one place means:
 *
 *   1. Swapping a route (e.g. renaming `/dailyrate/hundekari`) is a
 *      one-line change.
 *   2. Release notes can stay terse: "v6: shell hosts webview — content is
 *      now owned by hhgfarmers.git".
 *   3. Adding a new section of the app usually means a new `fun xxx(): String`
 *      below plus a drawer entry — no ViewModel, no Hilt, no Retrofit call.
 */
object WebPaths {
    /** Public home — the site's `/` route is the Aadhaar search page. */
    const val HOME = "/"

    /** Farmer transaction dashboard. Path: `/farmers/{aadhaar}`. */
    fun farmer(aadhaar: String) = "/farmers/$aadhaar"

    /** Hundekari-only market rate page. */
    const val HUNDEKARI_RATES = "/dailyrate/hundekari"

    /** AgriSight AI market-trend page. */
    const val AI_TREND = "/dailyrate/agrisight"

    /** Seeds catalog per farmer. Path: `/seeds/{aadhaar}`. */
    fun seeds(aadhaar: String) = "/seeds/$aadhaar"

    /** Local vyapar (seed / pesticide ad board). */
    const val LOCAL_VYAPARI = "/localvyapar"

    /** About HHG page. */
    const val ABOUT = "/about"

    /** Regex that identifies a farmer-detail URL on the hosted site. */
    val FARMER_PATH_REGEX = Regex("""^/farmers/(\d{3,})/?$""")
}

/**
 * Build the absolute URL for a given site-relative path.
 * Trims any trailing slash off [AppConfig.webBaseUrl] so callers can pass
 * `"/about"` without worrying about double slashes.
 */
fun AppConfig.absoluteUrl(path: String): String {
    val base = webBaseUrl.trimEnd('/')
    val normalized = if (path.startsWith("/")) path else "/$path"
    return base + normalized
}
