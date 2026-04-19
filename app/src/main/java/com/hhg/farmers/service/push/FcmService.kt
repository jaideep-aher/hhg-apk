package com.hhg.farmers.service.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Cloud Messaging receiver.
 *
 * Activates when `google-services.json` is added to the app module. Until then this class
 * compiles against the Firebase library but is never invoked.
 *
 * Roadmap — payloads we plan to send from the backend:
 *   - `whatsapp_notice` : new WhatsApp-style notice posted by the manager
 *   - `payment_released`: farmer's vendorMemo.paid just flipped true
 *   - `rate_alert`     : user-set threshold crossed in a market
 *   - `force_update`   : tell clients to immediately re-check update status
 */
class FcmService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Log.i(TAG, "FCM token refreshed")
        // TODO POST token + farmerId to backend /api/push/register
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"] ?: "generic"
        val title = message.notification?.title ?: message.data["title"].orEmpty()
        val body = message.notification?.body ?: message.data["body"].orEmpty()
        Log.i(TAG, "push received: type=$type title=$title body=$body")
        // TODO dispatch to NotificationCompat with per-type channel
    }

    companion object { private const val TAG = "FcmService" }
}
