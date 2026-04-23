package com.hhg.farmers.service.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

private const val MAX_ACCEPTABLE_ACCURACY_M = 30f
private const val MAX_FIX_WAIT_MS = 15_000L
private const val MAX_CACHED_AGE_MS = 60_000L

/**
 * Foreground-only location via Fused Location Provider.
 *
 * Intentionally *no* background tracking — we only request location while the user is actively
 * using the app. This keeps us out of Play Store's "background location" review bucket and
 * respects battery on 2018-era phones.
 *
 * Accuracy expectations (open sky):
 *   - Flagship phone: 3–8 m
 *   - 2018 mid-range : 5–15 m
 *   - Dense tree canopy: 10–25 m
 */
@Singleton
class LocationProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val client by lazy { LocationServices.getFusedLocationProviderClient(context) }

    /** True if the user has already granted fine or coarse location permission. */
    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * Request a single fix suitable for activity tracking.
     * - Accepts cached fixes up to 60s old (faster on weak devices/networks)
     * - Waits up to 15s for a fresh reading
     * - Accepts accuracy up to 30m
     */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): LocationFix? {
        if (!hasPermission()) return null
        return runCatching {
            val req = CurrentLocationRequest.Builder()
                .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                .setMaxUpdateAgeMillis(MAX_CACHED_AGE_MS)
                .setDurationMillis(MAX_FIX_WAIT_MS)
                .build()
            val loc = client.getCurrentLocation(req, null).await() ?: return null
            if (!loc.hasAccuracy() || loc.accuracy > MAX_ACCEPTABLE_ACCURACY_M) return null
            LocationFix(
                latitude = loc.latitude,
                longitude = loc.longitude,
                accuracyMeters = loc.accuracy,
                tsEpochMs = loc.time
            )
        }.getOrNull()
    }
}

data class LocationFix(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val tsEpochMs: Long
)
