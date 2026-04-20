package com.hhg.farmers.service.telemetry

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.deviceinfo.DeviceInfoCollector
import com.hhg.farmers.service.deviceinfo.InstallReferrerProvider
import com.hhg.farmers.service.deviceinfo.NetworkTypeProvider
import com.hhg.farmers.service.location.LocationFix
import com.squareup.moshi.Moshi
import com.squareup.moshi.adapter
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single entry point for recording telemetry.
 *
 * Captures (all free, no permission except location):
 *   - Session start / end / duration
 *   - Page visits + time on page
 *   - User ID (farmer UID)
 *   - Device model, OS, app version
 *   - Network type (WiFi / cellular)
 *   - Locale, timezone, screen size, battery
 *   - Install referrer + first install time + last update
 *   - Location (when user grants permission)
 *
 * Events are written to the local Room DB and flushed periodically by [TelemetryFlushWorker].
 * Nothing leaves the device synchronously — keeps screens fast.
 *
 * Scaling note: to add a new event, call `track("your_event", props)`. Anywhere. No schema change.
 */
@OptIn(ExperimentalStdlibApi::class)
@Singleton
class TelemetryManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val db: TelemetryDb,
    private val session: SessionStore,
    private val device: DeviceInfoCollector,
    private val network: NetworkTypeProvider,
    private val installReferrer: InstallReferrerProvider,
    moshi: Moshi
) {
    private val mapAdapter = moshi.adapter<Map<String, Any?>>()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val sessionId = UUID.randomUUID().toString()
    private val sessionStartMs = System.currentTimeMillis()
    private val currentPage = AtomicReference<PageEntry?>(null)
    private var onAppStartCalled = false

    /** Called once from [com.hhg.farmers.HhgApp.onCreate]. */
    fun onAppStart() {
        if (onAppStartCalled) return
        onAppStartCalled = true
        schedulePeriodicFlush()
        scope.launch {
            val dev = device.snapshot()
            val net = network.currentNetwork()
            val referrer = runCatching { installReferrer.fetch() }.getOrNull()
            track(
                name = "session_start",
                props = buildMap {
                    putAll(dev.toMap())
                    put("network", net)
                    referrer?.let {
                        put("install_referrer", it.referrerUrl)
                        put("install_begin_epoch_s", it.installBeginEpochSec)
                        put("referrer_click_epoch_s", it.referrerClickEpochSec)
                    }
                }
            )
        }
    }

    /** Called from lifecycle observer when the app goes to background. */
    fun onAppBackground() {
        val durationMs = System.currentTimeMillis() - sessionStartMs
        track("session_end", mapOf("duration_ms" to durationMs))
    }

    /** Called when user navigates to a new screen. Auto-tracks time on previous page. */
    fun onPageEnter(page: String) {
        val now = System.currentTimeMillis()
        val prev = currentPage.getAndSet(PageEntry(page, now))
        prev?.let {
            track(
                "page_exit",
                mapOf("page" to it.name, "duration_ms" to (now - it.enteredAtMs))
            )
        }
        track("page_view", mapOf("page" to page))
    }

    /** Record a precise GPS fix alongside the active page. Never stores stale/low-quality fixes. */
    fun onLocationCaptured(fix: LocationFix) {
        track(
            "location_captured",
            mapOf(
                "lat" to fix.latitude,
                "lng" to fix.longitude,
                "accuracy_m" to fix.accuracyMeters,
                "page" to currentPage.get()?.name
            )
        )
    }

    /** Generic event entry point. Any caller, any time. */
    fun track(name: String, props: Map<String, Any?> = emptyMap()) {
        scope.launch {
            val farmerId = session.farmerId.first()
            db.events().insert(
                TelemetryEvent(
                    sessionId = sessionId,
                    farmerId = farmerId,
                    name = name,
                    page = currentPage.get()?.name,
                    propsJson = mapAdapter.toJson(props)
                )
            )
        }
    }

    private fun schedulePeriodicFlush() {
        val req = PeriodicWorkRequestBuilder<TelemetryFlushWorker>(
            15, TimeUnit.MINUTES
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        ).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            TelemetryFlushWorker.UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            req
        )
    }

    private fun com.hhg.farmers.service.deviceinfo.DeviceSnapshot.toMap() = mapOf(
        "device_model" to model,
        "device_manufacturer" to manufacturer,
        "os_version" to osVersion,
        "app_version" to appVersionName,
        "app_version_code" to appVersionCode,
        "locale" to locale,
        "timezone" to timezone,
        "screen_w_px" to screenWidthPx,
        "screen_h_px" to screenHeightPx,
        "density_dpi" to densityDpi,
        "density_bucket" to densityBucket,
        "battery_pct" to batteryPercent,
        "first_install_epoch_ms" to firstInstallEpochMs,
        "last_update_epoch_ms" to lastUpdateEpochMs
    )

    private data class PageEntry(val name: String, val enteredAtMs: Long)
}
