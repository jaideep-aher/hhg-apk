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
    val playStoreUrl: String = "https://play.google.com/store/apps/details?id=com.hhg.farmers",
    val forceUpdateTitle: String = "अॅप अपडेट करा",
    val forceUpdateMessage: String =
        "पुढे जाण्यासाठी कृपया अॅपचे नवीन व्हर्जन इन्स्टॉल करा. " +
        "जुने व्हर्जन आता सपोर्टेड नाही."
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
