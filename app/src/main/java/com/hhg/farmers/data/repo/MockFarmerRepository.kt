package com.hhg.farmers.data.repo

import com.hhg.farmers.data.model.Farmer
import com.hhg.farmers.data.model.FarmerDataPage
import com.hhg.farmers.data.model.ItemSummary
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.data.model.MarketRate
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.data.model.PattiEntry
import com.hhg.farmers.data.model.VendorRate
import kotlinx.coroutines.delay
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.random.Random

/**
 * In-memory mock repository. Provides realistic data for the demo Aadhaar "55555"
 * and makes the whole UI usable before the REST backend exists.
 *
 * Every method includes a small artificial delay so loading states are exercised.
 */
@Singleton
class MockFarmerRepository @Inject constructor() : FarmerRepository {

    private val mockFarmer = Farmer(
        farmerid = 1001,
        uid = "55555",
        farmername = "रामराव पाटील",
        mobilenumber = "9876543210",
        farmeraddress = "घारगाव, ता. संगमनेर, जि. अहमदनगर",
        status = "ACTIVE"
    )

    private val mockNotices = listOf(
        Notice(
            id = "n1",
            title = "AI स्मार्ट मार्केट ट्रेंड्स — मागील २ वर्षांचे विश्लेषण",
            content = "आता AI वापरून मागील दोन वर्षांच्या बाजारातील ट्रेंड, सीझनल बदल आणि अंदाज मिळवा.",
            colorHex = "#F3E8FF"
        ),
        Notice(
            id = "n2",
            title = "2026 वर्षाच्या शुभेच्छा",
            content = "नूतन वर्षाच्या सर्व शेतकरी व व्यापारी बांधवाना हार्दिक शुभेच्छा.",
            colorHex = "#DCFCE7"
        )
    )

    private val items = listOf("कांदा", "टोमॅटो", "बटाटा", "मिरची", "कोथिंबीर", "मेथी", "पालक")
    private val vendors = listOf("शिवाजी ट्रेडर्स", "अशोक ट्रेडिंग", "कृष्णा ट्रेडर्स", "मुंबई दलाल")

    private fun generateEntries(farmerId: Int, count: Int): List<PattiEntry> {
        val today = LocalDate.now()
        return (0 until count).map { i ->
            val date = today.minusDays(i.toLong())
            val rate = Random.nextDouble(15.0, 60.0)
            val quantity = Random.nextInt(5, 50).toDouble()
            val weight = quantity * Random.nextDouble(8.0, 25.0)
            val payable = weight * rate
            PattiEntry(
                entryid = 100_000L + i,
                farmerid = farmerId,
                date = date.toString(),
                vendorname = vendors.random(),
                quantity = quantity,
                weight = weight,
                rate = rate,
                item = items.random(),
                payable = payable,
                paid = if (i > 5) payable else null,
                paiddate = if (i > 5) date.plusDays(3).toString() else null
            )
        }
    }

    override suspend fun farmerExists(uid: String): Boolean {
        delay(400)
        return uid == "55555" || uid == "12345"
    }

    override suspend fun getFarmerData(
        uid: String,
        fromDate: String,
        toDate: String,
        page: Int,
        limit: Int
    ): FarmerDataPage {
        delay(600)
        val all = generateEntries(mockFarmer.farmerid, 45)
        val start = (page - 1) * limit
        val pageEntries = all.drop(start).take(limit)
        return FarmerDataPage(
            farmer = mockFarmer.copy(uid = uid),
            entries = pageEntries,
            totalCount = all.size.toLong()
        )
    }

    override suspend fun getNotifications(): List<Notice> {
        delay(300)
        return mockNotices
    }

    override suspend fun getMarketRates(market: String, vegetableId: Int): List<MarketRate> {
        delay(500)
        val today = LocalDate.now()
        return (0..6).map { d ->
            val date = today.minusDays(d.toLong()).toString()
            val base = Random.nextDouble(20.0, 50.0)
            MarketRate(
                date = date,
                min = base - Random.nextDouble(2.0, 5.0),
                max = base + Random.nextDouble(3.0, 8.0),
                avg = base
            )
        }.reversed()
    }

    override suspend fun getAllItems(): List<ItemSummary> {
        delay(250)
        return items.map { ItemSummary(item = it, count = Random.nextInt(3, 20)) }
    }

    override suspend fun getVendorItemRatesForItem(item: String): List<VendorRate> {
        delay(400)
        val today = LocalDate.now()
        return (0..6).map { d ->
            VendorRate(
                date = today.minusDays(d.toLong()).toString(),
                item = item,
                highestRate = Random.nextDouble(20.0, 60.0)
            )
        }
    }

    override suspend fun getHundekariRatesToday(): List<VendorRate> {
        delay(350)
        val today = LocalDate.now().toString()
        return items.map { item ->
            VendorRate(
                date = today,
                item = item,
                highestRate = Random.nextDouble(18.0, 55.0)
            )
        }
    }

    override suspend fun getLocalVyaparAds(): List<LocalVyaparAd> {
        delay(400)
        val today = LocalDate.now().toString()
        return listOf(
            LocalVyaparAd(
                advId = 1,
                item = "कांदा",
                requiredWeight = 500.0,
                askingPrice = 18.0,
                requiredDate = today,
                status = "Active",
                description = "उत्पादक दराने — नमुना जाहिरात",
                vyapariName = "दुकान A"
            ),
            LocalVyaparAd(
                advId = 2,
                item = "टोमॅटो",
                requiredWeight = 200.0,
                askingPrice = 25.0,
                requiredDate = today,
                status = "Pending",
                description = null,
                vyapariName = "दुकान B"
            )
        )
    }
}
