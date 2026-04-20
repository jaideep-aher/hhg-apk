package com.hhg.farmers.data.repo

import com.hhg.farmers.data.model.FarmerDataPage
import com.hhg.farmers.data.model.ItemSummary
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.data.model.MarketRate
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.data.model.VendorRate

/**
 * Domain-layer contract for everything the app reads from the backend.
 * Mock and real impls both implement this; the UI never knows which is active.
 *
 * Mirrors the server actions in `webapp/src/server/dbfunctions.js`.
 */
interface FarmerRepository {

    suspend fun farmerExists(uid: String): Boolean

    suspend fun getFarmerData(
        uid: String,
        fromDate: String,
        toDate: String,
        page: Int = 1,
        limit: Int = 10
    ): FarmerDataPage

    suspend fun getNotifications(): List<Notice>

    suspend fun getMarketRates(market: String, vegetableId: Int): List<MarketRate>

    suspend fun getAllItems(): List<ItemSummary>

    suspend fun getVendorItemRatesForItem(item: String): List<VendorRate>

    suspend fun getHundekariRatesToday(): List<VendorRate>

    suspend fun getLocalVyaparAds(): List<LocalVyaparAd>
}
