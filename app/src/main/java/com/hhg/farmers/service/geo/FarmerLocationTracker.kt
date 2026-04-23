package com.hhg.farmers.service.geo

import android.os.Build
import android.util.Log
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.service.location.LocationProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "GeoTracker"

/**
 * Writes "this farmer was at (lat,lng) at this time" records to Firestore.
 *
 * Separate from the main read-only PostgreSQL database on purpose: location
 * data is high-churn write traffic, not the canonical farmer record.
 *
 * Collections:
 *   farmers/{farmerId}   — latest summary, upserted each ping (one doc per farmer)
 *
 * This class never throws. Callers invoke it fire-and-forget; a failed write
 * should never block login or impact the farmer's core app experience.
 */
@Singleton
class FarmerLocationTracker @Inject constructor(
    private val locationProvider: LocationProvider,
    private val firestore: FirebaseFirestore,
    private val analytics: FirebaseAnalytics
) {

    enum class Source(val label: String) {
        Login("login"),
        AppOpen("app_open"),
        Foreground("foreground")
    }

    /**
     * Application-scoped — outlives any ViewModel. Callers of [fireAndForget]
     * can navigate away / have their VM cleared without killing the write.
     */
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Fire a geo ping in the background. Returns immediately. Use this from
     * ViewModels and Activities — the write survives screen transitions.
     */
    fun fireAndForget(farmerId: String, source: Source) {
        // Log.w (not Log.i) so it survives R8's -assumenosideeffects rule
        // that strips Log.i/d/v from release builds. We need release-build
        // visibility to confirm Firestore writes are actually firing.
        Log.w(TAG, "fireAndForget(farmerId=$farmerId, source=${source.label}) queued")
        appScope.launch {
            runCatching { recordLocation(farmerId, source) }
                .onFailure { Log.e(TAG, "recordLocation failed", it) }
        }
    }

    /**
     * Best-effort: get the current GPS fix and write it to Firestore + emit a
     * Firebase Analytics event. Safe to call on any coroutine scope.
     *
     * Returns true if a fix was captured (regardless of network write success,
     * since Firestore queues offline writes).
     */
    suspend fun recordLocation(farmerId: String, source: Source): Boolean {
        if (farmerId.isBlank()) {
            Log.w(TAG, "recordLocation aborted — empty farmerId")
            return false
        }
        Log.w(TAG, "recordLocation start: uid=$farmerId source=${source.label} " +
            "hasLocPerm=${locationProvider.hasPermission()}")

        // Attribute all downstream Analytics events to this farmer.
        runCatching { analytics.setUserId(farmerId) }

        val hasPermission = locationProvider.hasPermission()
        if (!hasPermission) {
            Log.w(TAG, "recordLocation: permission missing, writing no-gps marker")
        } else {
            Log.w(TAG, "requesting GPS fix (up to 15s timeout, accepts <=30m)...")
        }
        val fix = runCatching { locationProvider.getCurrentLocation() }
            .onFailure { Log.e(TAG, "LocationProvider threw", it) }
            .getOrNull()
        Log.w(TAG, "GPS fix = ${fix?.let { "(${it.latitude}, ${it.longitude}) ±${it.accuracyMeters}m" } ?: "null"}")

        val hasFix = fix != null

        val summary = mapOf(
            "lastLat" to (fix?.latitude ?: 0.0),
            "lastLng" to (fix?.longitude ?: 0.0),
            "lastAccuracyM" to (fix?.accuracyMeters?.toDouble() ?: -1.0),
            "lastSeenAt" to FieldValue.serverTimestamp(),
            "lastSource" to if (hasFix) source.label else "${source.label}_nogps",
            "appVersion" to BuildConfig.VERSION_NAME,
            "appVersionCode" to BuildConfig.VERSION_CODE.toLong(),
            "deviceModel" to Build.MODEL,
            "deviceManufacturer" to Build.MANUFACTURER,
            "androidSdk" to Build.VERSION.SDK_INT.toLong()
        )

        runCatching {
            Log.w(TAG, "writing to Firestore farmers/$farmerId ...")
            firestore.collection("farmers").document(farmerId)
                .set(summary, SetOptions.merge()).await()
            Log.w(TAG, "Firestore write OK for uid=$farmerId")
        }.onFailure { Log.e(TAG, "Firestore write FAILED for uid=$farmerId", it) }

        if (!hasFix) {
            runCatching {
                analytics.logEvent("farmer_activity") {
                    param("source", source.label)
                    param("has_location", 0L)
                }
            }
            return false
        }

        runCatching {
            analytics.logEvent("farmer_activity") {
                param("source", source.label)
                param("has_location", 1L)
                // Bucket to 0.1° (~11 km) so the event stream can't be used to
                // triangulate an individual farmer from Analytics alone.
                param("lat_bucket", round1(fix.latitude))
                param("lng_bucket", round1(fix.longitude))
            }
        }

        return true
    }

    private fun round1(v: Double): Double = Math.round(v * 10.0) / 10.0
}

/** Convenience for the Firebase Analytics KTX param builder (avoids an import). */
private inline fun FirebaseAnalytics.logEvent(
    name: String,
    block: ParamBuilder.() -> Unit
) {
    val builder = ParamBuilder()
    builder.block()
    logEvent(name, builder.bundle)
}

private class ParamBuilder {
    val bundle = android.os.Bundle()
    fun param(key: String, value: String) { bundle.putString(key, value) }
    fun param(key: String, value: Long)   { bundle.putLong(key, value) }
    fun param(key: String, value: Double) { bundle.putDouble(key, value) }
}
