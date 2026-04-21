package com.hhg.farmers.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat

/**
 * Shared helpers for the two-layer location gate.
 *
 * The HHG app treats location as a hard requirement (delivery-app style): weather,
 * area-based market context, and future nearby-listing features all depend on it.
 *
 * Layer 1 — runtime permission: at least ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION
 * must be granted by the user in the OS dialog.
 *
 * Layer 2 — system services: the device's Location/GPS toggle must be on in Settings.
 * A granted permission is useless when the service itself is off.
 */
fun isLocationGranted(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    val coarse = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    return fine || coarse
}

fun isLocationServicesEnabled(context: Context): Boolean {
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return LocationManagerCompat.isLocationEnabled(lm)
}
