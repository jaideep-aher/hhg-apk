package com.hhg.farmers.service.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.content.ContextCompat
import com.hhg.farmers.R

/**
 * Single source of truth for notification channels.
 *
 * Android groups notifications by channel in Settings › Apps › Hundekari ›
 * Notifications. Farmers can mute a channel independently (e.g. mute
 * `rate_alert` but keep `payment_released` loud). Each FCM payload we send
 * carries a `type` in `data` — we map it here.
 *
 * Rules:
 *  - Never rename a channel id after shipping: the user's mute/importance
 *    choice is keyed by id. Add a new id if you need a behaviour change.
 *  - Importance `HIGH` pops a heads-up; reserve for things the farmer will
 *    actually want interrupted for (payment released, rate threshold hit).
 *  - Channels are no-ops on API < 26 but this helper is still safe to call.
 */
object NotificationChannels {

    const val GENERIC = "generic"
    const val WHATSAPP_NOTICE = "whatsapp_notice"
    const val PAYMENT_RELEASED = "payment_released"
    const val RATE_ALERT = "rate_alert"

    /** Map an FCM `data.type` string to a known channel, defaulting to generic. */
    fun channelFor(type: String?): String = when (type) {
        WHATSAPP_NOTICE -> WHATSAPP_NOTICE
        PAYMENT_RELEASED -> PAYMENT_RELEASED
        RATE_ALERT -> RATE_ALERT
        else -> GENERIC
    }

    fun registerAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ContextCompat.getSystemService(context, NotificationManager::class.java) ?: return

        val channels = listOf(
            NotificationChannel(
                GENERIC,
                context.getString(R.string.notif_channel_generic_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = context.getString(R.string.notif_channel_generic_desc)
            },
            NotificationChannel(
                WHATSAPP_NOTICE,
                context.getString(R.string.notif_channel_whatsapp_notice_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = context.getString(R.string.notif_channel_whatsapp_notice_desc)
            },
            NotificationChannel(
                PAYMENT_RELEASED,
                context.getString(R.string.notif_channel_payment_released_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = context.getString(R.string.notif_channel_payment_released_desc)
                enableVibration(true)
            },
            NotificationChannel(
                RATE_ALERT,
                context.getString(R.string.notif_channel_rate_alert_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = context.getString(R.string.notif_channel_rate_alert_desc)
            },
        )
        nm.createNotificationChannels(channels)
    }
}
