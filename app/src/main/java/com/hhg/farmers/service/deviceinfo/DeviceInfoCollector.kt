package com.hhg.farmers.service.deviceinfo

import android.content.Context
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.util.DisplayMetrics
import com.hhg.farmers.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Collects the free-no-permission device facts that go into every telemetry event.
 * Everything here is cheap and permission-free.
 */
@Singleton
class DeviceInfoCollector @Inject constructor(@ApplicationContext private val context: Context) {

    fun snapshot(): DeviceSnapshot {
        val dm = context.resources.displayMetrics
        val firstInstall = runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).firstInstallTime
        }.getOrDefault(0L)
        val lastUpdate = runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
        }.getOrDefault(0L)

        return DeviceSnapshot(
            model = Build.MODEL,
            manufacturer = Build.MANUFACTURER,
            osVersion = "Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})",
            appVersionName = BuildConfig.VERSION_NAME,
            appVersionCode = BuildConfig.VERSION_CODE,
            locale = Locale.getDefault().toLanguageTag(),
            timezone = TimeZone.getDefault().id,
            screenWidthPx = dm.widthPixels,
            screenHeightPx = dm.heightPixels,
            densityDpi = dm.densityDpi,
            densityBucket = densityBucket(dm),
            batteryPercent = batteryPercent(),
            firstInstallEpochMs = firstInstall,
            lastUpdateEpochMs = lastUpdate
        )
    }

    private fun densityBucket(dm: DisplayMetrics): String = when (dm.densityDpi) {
        in 0..DisplayMetrics.DENSITY_LOW -> "ldpi"
        in DisplayMetrics.DENSITY_LOW + 1..DisplayMetrics.DENSITY_MEDIUM -> "mdpi"
        in DisplayMetrics.DENSITY_MEDIUM + 1..DisplayMetrics.DENSITY_HIGH -> "hdpi"
        in DisplayMetrics.DENSITY_HIGH + 1..DisplayMetrics.DENSITY_XHIGH -> "xhdpi"
        in DisplayMetrics.DENSITY_XHIGH + 1..DisplayMetrics.DENSITY_XXHIGH -> "xxhdpi"
        else -> "xxxhdpi+"
    }

    private fun batteryPercent(): Int? = runCatching {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }.getOrNull()
}

data class DeviceSnapshot(
    val model: String,
    val manufacturer: String,
    val osVersion: String,
    val appVersionName: String,
    val appVersionCode: Int,
    val locale: String,
    val timezone: String,
    val screenWidthPx: Int,
    val screenHeightPx: Int,
    val densityDpi: Int,
    val densityBucket: String,
    val batteryPercent: Int?,
    val firstInstallEpochMs: Long,
    val lastUpdateEpochMs: Long
)
