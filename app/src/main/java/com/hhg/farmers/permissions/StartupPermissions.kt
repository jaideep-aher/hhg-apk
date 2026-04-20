package com.hhg.farmers.permissions

import android.Manifest
import android.os.Build

/**
 * Runtime permissions requested together on first launch (after onboarding).
 * Aligns with [AndroidManifest.xml] declarations.
 */
fun startupPermissionNames(): Array<String> {
    val list = mutableListOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )
    if (Build.VERSION.SDK_INT >= 33) {
        list.add(Manifest.permission.POST_NOTIFICATIONS)
        list.add(Manifest.permission.READ_MEDIA_IMAGES)
        list.add(Manifest.permission.READ_MEDIA_VIDEO)
    } else {
        list.add(Manifest.permission.READ_EXTERNAL_STORAGE)
    }
    return list.toTypedArray()
}
