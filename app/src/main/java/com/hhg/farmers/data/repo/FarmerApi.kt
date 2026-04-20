package com.hhg.farmers.data.repo

import com.hhg.farmers.data.model.FarmerDataPage
import com.hhg.farmers.data.model.FarmerExistsResponse
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.data.model.VendorRate
import retrofit2.http.GET
import retrofit2.http.Path

/**
 * Retrofit interface for the HHG Farmers Railway backend.
 *
 * Base URL is set in [com.hhg.farmers.di.NetworkModule] via BuildConfig.API_BASE_URL.
 * Switch between mock and real data by toggling BuildConfig.ENABLE_MOCK_REPO in build.gradle.kts.
 */
interface FarmerApi {

    /**
     * Quick existence check — returns { exists: true/false }.
     * Called by HomeScreen before loading the full farmer page.
     */
    @GET("farmer/exists/{uid}")
    suspend fun farmerExists(@Path("uid") uid: String): FarmerExistsResponse

    /**
     * Fetch a farmer + all their patti entries by the last 5 digits of their Aadhaar.
     * Returns 404 if the UID doesn't exist in the database.
     */
    @GET("farmer/{uid}")
    suspend fun getFarmerData(@Path("uid") uid: String): FarmerDataPage

    /**
     * Today's Hundekari vendor rates — highest rate per item.
     * Falls back to the most recent date if today has no entries yet.
     */
    @GET("rates/hundekari")
    suspend fun getHundekariRates(): List<VendorRate>

    /**
     * All active notices shown on the Home screen.
     */
    @GET("notices")
    suspend fun getNotices(): List<Notice>

    /** Local trade listings — same backing query as the website localvyapar page. */
    @GET("localvyapar/ads")
    suspend fun getLocalVyaparAds(): List<LocalVyaparAd>
}
