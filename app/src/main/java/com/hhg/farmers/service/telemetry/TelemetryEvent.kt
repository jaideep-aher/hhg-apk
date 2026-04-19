package com.hhg.farmers.service.telemetry

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import androidx.room.TypeConverters

/**
 * Queued telemetry event. Written locally, flushed in batches by [TelemetryFlushWorker]
 * to the separate telemetry backend (NOT the read-only operational DB).
 */
@Entity(tableName = "events")
@TypeConverters(TelemetryTypeConverters::class)
data class TelemetryEvent(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val farmerId: String?,
    val name: String,                          // e.g. "page_view", "session_start", "location_captured"
    val page: String?,                         // e.g. "home", "farmer_dashboard"
    val propsJson: String,                     // arbitrary key/value payload serialized as JSON
    val tsEpochMs: Long = System.currentTimeMillis(),
    val flushed: Boolean = false
)

class TelemetryTypeConverters {
    @TypeConverter fun fromMap(m: Map<String, Any?>): String =
        // intentionally lightweight: the real serialization happens via Moshi in TelemetryManager.
        m.entries.joinToString(",") { "${it.key}=${it.value}" }
}
