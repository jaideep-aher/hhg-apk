package com.hhg.farmers.service.offline

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import com.hhg.farmers.data.model.FarmerDataPage

/**
 * Lightweight offline cache — stores the last-viewed patti page as raw JSON per farmer.
 *
 * Rural connectivity is patchy: when a farmer opens the dashboard without signal, we
 * surface the last successful response instead of an error. Once online, the UI refreshes
 * in the background.
 *
 * Scope kept small on purpose — this is a UX fallback, not a local-first architecture.
 */

@Entity(tableName = "cached_farmer_page")
data class CachedFarmerPage(
    @PrimaryKey val farmerUid: String,
    @ColumnInfo(name = "json") val json: String,
    @ColumnInfo(name = "ts_ms") val tsEpochMs: Long = System.currentTimeMillis()
)

@Dao
interface OfflineCacheDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(page: CachedFarmerPage)

    @Query("SELECT * FROM cached_farmer_page WHERE farmerUid = :uid LIMIT 1")
    suspend fun get(uid: String): CachedFarmerPage?

    @Query("DELETE FROM cached_farmer_page WHERE ts_ms < :olderThanMs")
    suspend fun purgeOlderThan(olderThanMs: Long)
}

@Database(entities = [CachedFarmerPage::class], version = 1, exportSchema = false)
abstract class OfflineCacheDb : RoomDatabase() {
    abstract fun dao(): OfflineCacheDao
    companion object { const val NAME = "offline_cache.db" }
}

/** Contract used by repositories — hides DB + JSON encoding from callers. */
interface OfflineCache {
    suspend fun readPatti(uid: String): FarmerDataPage?
    suspend fun writePatti(uid: String, page: FarmerDataPage)
}
