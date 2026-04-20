package com.hhg.farmers.service.telemetry

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Periodic flush of queued telemetry events to the backend.
 *
 * Current impl: stub. Logs batch sizes and marks events as flushed.
 * To wire real upload: inject a `TelemetryApi` (Retrofit) and POST `batch` to `/api/telemetry/events`.
 *
 * Deliberately decoupled from any specific backend so we can point at:
 *   - a separate Neon/Supabase DB (owned data)
 *   - PostHog Android SDK (if user also wants dashboards)
 *   - both (dual-write)
 */
@HiltWorker
class TelemetryFlushWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val db: TelemetryDb
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val batch = db.events().pendingBatch(limit = 200)
        if (batch.isEmpty()) return Result.success()

        // TODO replace with real POST /api/telemetry/events — see service/telemetry/TelemetryApi.kt
        Log.i(TAG, "Would flush ${batch.size} events; first=${batch.first().name}")

        db.events().markFlushed(batch.map { it.id })

        // Keep the table from growing forever — drop flushed events older than a week.
        val weekAgo = System.currentTimeMillis() - 7L * 24 * 60 * 60 * 1000
        db.events().purgeOldFlushed(weekAgo)

        return Result.success()
    }

    companion object {
        const val UNIQUE_NAME = "telemetry-flush"
        private const val TAG = "TelemetryFlush"
    }
}
