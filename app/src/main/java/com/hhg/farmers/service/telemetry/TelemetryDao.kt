package com.hhg.farmers.service.telemetry

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface TelemetryDao {

    @Insert suspend fun insert(event: TelemetryEvent): Long

    @Query("SELECT * FROM events WHERE flushed = 0 ORDER BY tsEpochMs ASC LIMIT :limit")
    suspend fun pendingBatch(limit: Int = 200): List<TelemetryEvent>

    @Query("UPDATE events SET flushed = 1 WHERE id IN (:ids)")
    suspend fun markFlushed(ids: List<Long>)

    @Query("DELETE FROM events WHERE flushed = 1 AND tsEpochMs < :olderThanMs")
    suspend fun purgeOldFlushed(olderThanMs: Long)

    @Query("SELECT COUNT(*) FROM events WHERE flushed = 0")
    suspend fun pendingCount(): Int
}
