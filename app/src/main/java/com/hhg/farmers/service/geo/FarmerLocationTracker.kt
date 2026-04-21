package com.hhg.farmers.service.geo

import android.os.Build
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.service.location.LocationProvider
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Writes "this farmer was at (lat,lng) at this time" records to Firestore.
 *
 * Separate from the main read-only PostgreSQL database on purpose: location
 * data is high-churn write traffic, not the canonical farmer record.
 *
 * Collections:
 *   farmers/{farmerId}                     — latest summary, upserted each ping
 *   farmers/{farmerId}/pings/{autoId}      — append-only history for analytics
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
     * Best-effort: get the current GPS fix and write it to Firestore + emit a
     * Firebase Analytics event. Safe to call on any coroutine scope.
     *
     * Returns true if a fix was captured (regardless of network write success,
     * since Firestore queues offline writes).
     */
    suspend fun recordLocation(farmerId: String, source: Source): Boolean {
        if (farmerId.isBlank()) return false

        // Attribute all downstream Analytics events to this farmer.
        runCatching { analytics.setUserId(farmerId) }

        val fix = runCatching { locationProvider.getCurrentLocation() }.getOrNull()
        if (fix == null) {
            // Still log that the farmer opened the app — useful even without GPS.
            runCatching {
                analytics.logEvent("farmer_activity") {
                    param("source", source.label)
                    param("has_location", 0L)
                }
            }
            return false
        }

        val summary = mapOf(
            "lastLat" to fix.latitude,
            "lastLng" to fix.longitude,
            "lastAccuracyM" to fix.accuracyMeters.toDouble(),
            "lastSeenAt" to FieldValue.serverTimestamp(),
            "lastSource" to source.label,
            "appVersion" to BuildConfig.VERSION_NAME,
            "appVersionCode" to BuildConfig.VERSION_CODE.toLong(),
            "deviceModel" to Build.MODEL,
            "deviceManufacturer" to Build.MANUFACTURER,
            "androidSdk" to Build.VERSION.SDK_INT.toLong()
        )
        val ping = mapOf(
            "lat" to fix.latitude,
            "lng" to fix.longitude,
            "accuracyM" to fix.accuracyMeters.toDouble(),
            "at" to FieldValue.serverTimestamp(),
            "source" to source.label,
            "appVersion" to BuildConfig.VERSION_NAME
        )

        runCatching {
            val doc = firestore.collection("farmers").document(farmerId)
            doc.set(summary, SetOptions.merge()).await()
            doc.collection("pings").add(ping).await()
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
