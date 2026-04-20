package com.hhg.farmers.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

/**
 * Shared helper for the "location is required" gate.
 *
 * The HHG app treats location as a hard requirement (delivery-app style): weather,
 * area-based market context, and future nearby-listing features all depend on it.
 * We block the UI until at least ONE of [ACCESS_FINE_LOCATION] or
 * [ACCESS_COARSE_LOCATION] is granted. Coarse is acceptable because the farmer-
 * facing features just need "which region are you in", not GPS precision.
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
