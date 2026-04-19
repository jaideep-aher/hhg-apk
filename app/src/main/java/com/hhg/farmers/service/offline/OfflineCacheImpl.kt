package com.hhg.farmers.service.offline

import com.hhg.farmers.data.model.FarmerDataPage
import com.squareup.moshi.Moshi
import com.squareup.moshi.adapter
import javax.inject.Inject
import javax.inject.Singleton

@OptIn(ExperimentalStdlibApi::class)
@Singleton
class OfflineCacheImpl @Inject constructor(
    private val db: OfflineCacheDb,
    moshi: Moshi
) : OfflineCache {

    private val adapter = moshi.adapter<FarmerDataPage>()

    override suspend fun readPatti(uid: String): FarmerDataPage? = runCatching {
        db.dao().get(uid)?.json?.let(adapter::fromJson)
    }.getOrNull()

    override suspend fun writePatti(uid: String, page: FarmerDataPage) {
        db.dao().upsert(CachedFarmerPage(farmerUid = uid, json = adapter.toJson(page)))
    }
}
