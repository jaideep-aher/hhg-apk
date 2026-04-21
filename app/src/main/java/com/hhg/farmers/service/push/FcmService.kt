package com.hhg.farmers.service.push

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hhg.farmers.MainActivity
import com.hhg.farmers.R
import com.hhg.farmers.data.session.SessionStore
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.random.Random

/**
 * Firebase Cloud Messaging receiver.
 *
 * Flow:
 *   FCM server → Google → this device → `onMessageReceived` → NotificationCompat → tray.
 *
 * Payload shape we accept (both data-only and notification+data):
 *   {
 *     "notification": { "title": "...", "body": "..." },   // optional
 *     "data": {
 *       "type":  "generic" | "whatsapp_notice" | "payment_released" | "rate_alert",
 *       "title": "...",    // used if top-level notification missing (data-only)
 *       "body":  "...",    // idem
 *       "deeplink": "..."  // reserved for future in-app routing
 *     }
 *   }
 *
 * Why we always re-post in `onMessageReceived` even when Android already shows
 * the system tray card (notification-payload + backgrounded app): we want
 * per-channel routing based on `data.type`, and the system tray only uses a
 * single default channel. Posting ourselves also lets us fire while the app
 * is foregrounded, which Android skips by default.
 */
@AndroidEntryPoint
class FcmService : FirebaseMessagingService() {

    @Inject lateinit var pushTokenRegistrar: PushTokenRegistrar
    @Inject lateinit var sessionStore: SessionStore

    /**
     * Service-scoped — tied to the FirebaseMessagingService lifetime. We only
     * use it for a one-shot token-rotation write, so cancel-on-service-destroy
     * is good enough; leaks aren't a concern.
     */
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        Log.i(TAG, "FCM token refreshed: $token")
        // Re-register with the current farmerId so the dashboard's
        // token-lookup picks up the fresh token immediately.
        serviceScope.launch {
            val farmerId = runCatching { sessionStore.farmerId.first() }.getOrNull()
            if (!farmerId.isNullOrBlank()) {
                pushTokenRegistrar.register(farmerId)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.notif_fallback_title)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: ""
        Log.i(TAG, "push received: type=$type title=$title")

        showNotification(
            context = this,
            channelId = NotificationChannels.channelFor(type),
            title = title,
            body = body,
        )
    }

    companion object {
        private const val TAG = "FcmService"

        /**
         * Builds and posts a notification. Exposed on the companion so the
         * app can fire the same surface for local (non-FCM) events later —
         * e.g. a scheduled WorkManager task that reminds the farmer to
         * check today's rates.
         */
        fun showNotification(
            context: Context,
            channelId: String,
            title: String,
            body: String,
        ) {
            val nm = NotificationManagerCompat.from(context)
            // If the user denied POST_NOTIFICATIONS on Android 13+, skip silently
            // — posting would throw SecurityException on some OEMs.
            if (!nm.areNotificationsEnabled()) {
                Log.w(TAG, "notifications disabled by user; dropping push")
                return
            }

            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pending = PendingIntent.getActivity(
                context,
                Random.nextInt(),
                tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val accent = ContextCompat.getColor(context, R.color.notification_accent)

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(accent)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pending)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build()

            nm.notify(Random.nextInt(), notification)
        }
    }
}
