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

/**
 * Foreground-only, Uber-grade GPS via Fused Location Provider.
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
     * Request a single high-accuracy fix. Returns null if permission missing or GPS failed within 10s.
     * Caller is responsible for obtaining permission first (see [com.hhg.farmers.ui.components.LocationPermissionHandler]).
     */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): LocationFix? {
        if (!hasPermission()) return null
        return runCatching {
            val req = CurrentLocationRequest.Builder()
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .setMaxUpdateAgeMillis(0)       // don't accept stale cached fix
                .setDurationMillis(10_000)       // try up to 10s for a fix
                .build()
            val loc = client.getCurrentLocation(req, null).await() ?: return null
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
