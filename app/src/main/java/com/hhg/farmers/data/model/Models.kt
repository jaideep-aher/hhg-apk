package com.hhg.farmers.data.model

import com.squareup.moshi.JsonClass

/**
 * Data classes mirroring the backend shape in `dbfunctions.js`.
 * These are used by both the mock repository and the real Retrofit one — identical surface.
 */

@JsonClass(generateAdapter = true)
data class Farmer(
    val farmerid: Int,
    val uid: String,                // 5-digit Aadhaar last
    val farmername: String,
    val mobilenumber: String?,
    val farmeraddress: String?,
    val status: String              // ACTIVE / INACTIVE / PENDING
)

@JsonClass(generateAdapter = true)
data class PattiEntry(
    val entryid: Long,
    val farmerid: Int,
    val date: String,               // ISO yyyy-MM-dd
    val vendorname: String,
    val quantity: Double,
    val weight: Double,
    val rate: Double,
    val item: String,
    val payable: Double?,
    val paid: Double?,
    val paiddate: String?
)

@JsonClass(generateAdapter = true)
data class FarmerDataPage(
    val farmer: Farmer,
    val entries: List<PattiEntry>,
    val totalCount: Long
)

@JsonClass(generateAdapter = true)
data class Notice(
    val id: String,
    val title: String,
    val content: String,
    val colorHex: String? = null,
    val activeDate: String? = null,
    val customerType: String? = null
)

@JsonClass(generateAdapter = true)
data class MarketRate(
    val date: String,
    val min: Double?,
    val max: Double?,
    val avg: Double?
)

@JsonClass(generateAdapter = true)
data class VendorRate(
    val date: String,
    val item: String,             // English name (vegetables.name_eng)
    val itemMr: String? = null,   // Marathi name (vegetables.name_mar)
    val highestRate: Double
)

/** Returned by GET /api/farmer/exists/:uid */
@JsonClass(generateAdapter = true)
data class FarmerExistsResponse(val exists: Boolean)

/** Returned by GET /api/localvyapar/ads — parity with the website localvyapar listings. */
@JsonClass(generateAdapter = true)
data class LocalVyaparAd(
    val advId: Int,
    val item: String,
    val requiredWeight: Double? = null,
    val askingPrice: Double? = null,
    /** ISO date string from the API. */
    val requiredDate: String? = null,
    val status: String,
    val description: String? = null,
    val vyapariName: String
)

/**
 * Returned by GET /api/config — runtime-tunable values the app reads on every launch.
 * Driving force behind the force-update mechanism: bump `minVersionCode` on the backend
 * and every old APK in the wild will show the blocking update screen on next launch.
 *
 * All fields have fallback defaults so the app still works if the endpoint is unreachable.
 */
@JsonClass(generateAdapter = true)
data class AppConfig(
    val minVersionCode: Int = 1,
    val latestVersionCode: Int = 1,
    /**
     * Play Store listing URL for the "Update now" button.
     *
     * Leave this blank in defaults / backend responses — the UI (see
     * ForceUpdateScreen) derives the correct URL from [android.content.Context.getPackageName]
     * so it always points at the app's real listing regardless of whether the
     * applicationId gets renamed later. Only set this field explicitly if you
     * need to override the default behavior (e.g. redirect to a different
     * listing during a package migration).
     */
    val playStoreUrl: String = "",
    val forceUpdateTitle: String = "अॅप अपडेट करा",
    val forceUpdateMessage: String =
        "पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. " +
        "जुने व्हर्जन आता सपोर्टेड नाही.",

    /**
     * Base origin of the HHG Next.js website whose pages the Android shell
     * hosts inside WebViews. Every content screen (home, farmer dashboard,
     * hundekari rates, AI trends, seeds, local vyapar, about, ...) loads a
     * route under this origin. Shipping this in AppConfig means we can
     * migrate to a production domain (e.g. https://www.hanumanksk.in)
     * without a new APK — just flip WEB_BASE_URL in Railway.
     *
     * Default is the temporary staging host we use until the final domain
     * is provisioned. It MUST NOT be a vercel.app / railway.app URL — those
     * hostnames should never appear to end-users.
     */
    val webBaseUrl: String = "https://1.aher.dev",

    /**
     * Secondary web origin to fall back to if [webBaseUrl] is unreachable
     * (DNS failure, outage, etc.). Leave blank to disable fallback.
     * The WebView layer re-tries the same path on this host exactly once
     * per navigation, never more.
     */
    val webBaseUrlFallback: String = "",

    /**
     * Remote-driven drawer menu. When non-empty, [MainScaffold]'s drawer
     * renders these entries instead of the baked-in defaults — so a new
     * page added to the website can appear in the app without an APK
     * release. Each entry's `path` is appended to [webBaseUrl].
     *
     * Entries whose `requiresFarmerId` is true are only enabled after the
     * farmer has signed in (their Aadhaar is stored in SessionStore); tapping
     * them while signed-out routes to the search page instead.
     */
    val menuItems: List<RemoteMenuItem> = emptyList()
)

/**
 * A single remote-configurable drawer item. Keep titles short (≤24 chars) so
 * they render on a 320dp-wide drawer without wrapping. `path` must start with
 * `/` — it's appended to [AppConfig.webBaseUrl].
 */
@JsonClass(generateAdapter = true)
data class RemoteMenuItem(
    val id: String,
    val titleMr: String,
    val titleEn: String,
    val path: String,
    val requiresFarmerId: Boolean = false
)

@JsonClass(generateAdapter = true)
data class ItemSummary(
    val item: String,
    val count: Int
)

/** Totals computed in the dashboard from the current patti page. */
data class PattiTotals(
    val totalPayable: Double,
    val totalQuantity: Double,
    val totalWeight: Double
)
