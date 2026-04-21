package com.hhg.farmers.data.repo

import com.hhg.farmers.data.auth.LoginRateLimitedException
import com.hhg.farmers.data.model.FarmerDataPage
import com.hhg.farmers.data.model.ItemSummary
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.data.model.MarketRate
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.data.model.VendorRate
import org.json.JSONObject
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real network implementation of [FarmerRepository].
 *
 * Activated when BuildConfig.ENABLE_MOCK_REPO = false.
 * Calls the HHG Farmers Railway backend → AWS RDS PostgreSQL.
 *
 * Error handling:
 *   - farmerExists / getNotifications: failures return safe defaults (false / emptyList)
 *   - getFarmerData: 404 → NoSuchElementException; other errors rethrow
 *   - getHundekariRatesToday: errors rethrow (caller shows error state)
 *   - getMarketRates / getAllItems / getVendorItemRatesForItem: not yet backed by an
 *     API route — return empty lists so screens show EmptyState rather than crashing.
 */
@Singleton
class RetrofitFarmerRepository @Inject constructor(
    private val api: FarmerApi
) : FarmerRepository {

    /* ── Existence check ────────────────────────────────────────────────────── */

    /**
     * Distinguishes "not found" from "network down":
     *   - HTTP 404      → false (farmer genuinely doesn't exist)
     *   - IO/timeout/5xx → rethrow so the caller can show a retry-able
     *                      "check your connection" state instead of the
     *                      misleading "Farmer not found" message.
     */
    override suspend fun farmerExists(uid: String): Boolean = runCatching {
        api.farmerExists(uid).exists
    }.getOrElse { err ->
        when {
            err is HttpException && err.code() == 404 -> false
            err is HttpException && err.code() == 429 -> throw toRateLimitException(err)
            else -> throw err
        }
    }

    /**
     * Parse the 429 body emitted by backend/src/routes/farmer.js:
     *   { reason: "TOO_MANY_ACCOUNTS" | "TOO_MANY_FAILED",
     *     limitPerDay: 5, retryAfterSeconds: 12345 }
     *
     * Both Retry-After header and the JSON field are checked; whichever is
     * present wins. If the server ever changes the shape, we still surface a
     * usable [LoginRateLimitedException] so the UI shows the generic
     * "try tomorrow" message instead of a raw error.
     */
    private fun toRateLimitException(err: HttpException): LoginRateLimitedException {
        val response = err.response()
        val bodyText = runCatching { response?.errorBody()?.string() }.getOrNull()
        val json = bodyText?.let { runCatching { JSONObject(it) }.getOrNull() }

        val reason = when (json?.optString("reason")) {
            "TOO_MANY_FAILED"   -> LoginRateLimitedException.Reason.TOO_MANY_FAILED
            "TOO_MANY_ACCOUNTS" -> LoginRateLimitedException.Reason.TOO_MANY_ACCOUNTS
            else -> LoginRateLimitedException.Reason.UNKNOWN
        }
        val limit = json?.optInt("limitPerDay", 0)?.takeIf { it > 0 } ?: 0
        val retryAfterHeader = response?.headers()?.get("Retry-After")?.toLongOrNull()
        val retryAfterBody = json?.optLong("retryAfterSeconds", -1L)?.takeIf { it > 0 }
        val retryAfter = retryAfterHeader ?: retryAfterBody ?: 0L

        return LoginRateLimitedException(
            reason = reason,
            limitPerDay = limit,
            retryAfterSeconds = retryAfter
        )
    }

    /* ── Full farmer page (all patti entries) ───────────────────────────────── */

    /**
     * page / limit / date filters are accepted for interface compatibility but
     * the current backend returns the full sorted list in one shot.
     * Pagination will be wired once the backend adds cursor-based pagination.
     */
    override suspend fun getFarmerData(
        uid: String,
        fromDate: String,
        toDate: String,
        page: Int,
        limit: Int
    ): FarmerDataPage = runCatching {
        api.getFarmerData(uid)
    }.getOrElse { err ->
        if (err is HttpException && err.code() == 404)
            throw NoSuchElementException("Farmer $uid not found")
        else throw err
    }

    /* ── Notices (whatsapp_messages) ────────────────────────────────────────── */

    override suspend fun getNotifications(): List<Notice> = runCatching {
        api.getNotices()
    }.getOrElse { emptyList() }  // non-critical — Home screen shows nothing if this fails

    /* ── Hundekari rates (market_rates JOIN vegetables) ─────────────────────── */

    override suspend fun getHundekariRatesToday(): List<VendorRate> = runCatching {
        api.getHundekariRates()
    }.getOrElse { throw it }

    /* ── Not yet backed by API routes — return empty until added ─────────────── */

    override suspend fun getMarketRates(market: String, vegetableId: Int): List<MarketRate> =
        emptyList()

    override suspend fun getAllItems(): List<ItemSummary> =
        emptyList()

    override suspend fun getVendorItemRatesForItem(item: String): List<VendorRate> =
        emptyList()

    override suspend fun getLocalVyaparAds(): List<LocalVyaparAd> = runCatching {
        api.getLocalVyaparAds()
    }.getOrElse { throw it }
}
