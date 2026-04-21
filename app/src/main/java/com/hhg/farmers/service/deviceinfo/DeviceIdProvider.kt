package com.hhg.farmers.service.deviceinfo

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stable per-device identifier used for anti-abuse throttling.
 *
 * Why ANDROID_ID (Settings.Secure.ANDROID_ID / SSAID):
 *   - No runtime permission required.
 *   - Scoped to (app signing key, device, user) on Android 8+, so it doesn't
 *     leak across apps — perfect for our "same phone" definition.
 *   - Survives uninstall and app-data clear. Rotates on factory reset, which
 *     is an acceptable escape hatch for legitimate second-hand phones.
 *   - IMEI / serial are NOT usable: reading them needs carrier privileges
 *     or a system-app signature from Android 10+.
 *
 * What we do NOT rely on:
 *   - Firebase Installation ID: rotates on uninstall, useless for a "5
 *     accounts per phone per day" cap.
 *   - MAC / hardware serial / GSF ID: blocked or empty on modern Android.
 *
 * Known edge cases we guard against:
 *   - ANDROID_ID is null on rare OEM builds / before first unlock.
 *   - Some pre-Android-8 ROMs return the literal "9774d56d682e549c" bug
 *     value. We treat that the same as null.
 *
 * Fallback:
 *   If ANDROID_ID is unusable we synthesize a random UUID and persist it
 *   in a per-install file. That ID rotates if the user clears app data,
 *   which is worse than real ANDROID_ID but still raises the cost of
 *   switching accounts (each reset burns 30+ seconds of the user's time).
 *   We never send `null` to the backend — no header means "not rate
 *   limited" on the server side, which would defeat the whole point.
 */
@Singleton
class DeviceIdProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {

    @Volatile private var cached: String? = null

    fun deviceId(): String {
        cached?.let { return it }
        synchronized(this) {
            cached?.let { return it }
            val resolved = resolveAndroidId() ?: resolveOrCreateFallback()
            cached = resolved
            return resolved
        }
    }

    @SuppressLint("HardwareIds")
    private fun resolveAndroidId(): String? {
        val raw = runCatching {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        }.getOrNull()
        return when {
            raw.isNullOrBlank() -> null
            raw.equals(BUGGY_ANDROID_ID, ignoreCase = true) -> null
            else -> raw
        }
    }

    private fun resolveOrCreateFallback(): String {
        val prefs = context.getSharedPreferences(FALLBACK_PREFS, Context.MODE_PRIVATE)
        prefs.getString(FALLBACK_KEY, null)?.let { return it }
        val fresh = "fallback-" + UUID.randomUUID().toString()
        prefs.edit().putString(FALLBACK_KEY, fresh).apply()
        return fresh
    }

    private companion object {
        // Historic buggy ANDROID_ID that shipped on a pile of Android 2.x
        // ROMs. If we see it we must treat the device as "unknown".
        const val BUGGY_ANDROID_ID = "9774d56d682e549c"

        const val FALLBACK_PREFS = "hhg_device_id"
        const val FALLBACK_KEY = "fallback_id"
    }
}
