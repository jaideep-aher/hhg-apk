package com.hhg.farmers.service.push

import android.os.Build
import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import com.hhg.farmers.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Writes the current FCM token to Firestore under the farmer's profile, and
 * manages the global "all_farmers" topic subscription used for broadcast sends.
 *
 * Why Firestore, not our Postgres backend:
 *   - The dashboard (android/dashboard, Next.js) already uses `firebase-admin`
 *     and reads the `farmers/{id}` collection. Putting tokens there means the
 *     dashboard can send pushes directly without a round-trip through
 *     api.hanumanksk.in.
 *   - Adding a new Postgres table + endpoints on every deploy just to hold
 *     FCM tokens is strictly more infra for the same outcome.
 *
 * Schema:
 *   farmers/{farmerId}/devices/{installationId}
 *     {
 *       token:         "<FCM token>",
 *       platform:      "android",
 *       appVersion:    BuildConfig.VERSION_NAME,
 *       versionCode:   BuildConfig.VERSION_CODE,
 *       sdk:           Build.VERSION.SDK_INT,
 *       deviceModel:   Build.MODEL,
 *       updatedAt:     <server timestamp>
 *     }
 *
 * `installationId` comes from FirebaseInstallations — it is stable across
 * token rotations for the lifetime of the app install, so rotation updates
 * the same doc rather than creating a new one each time.
 *
 * Concurrency: every public entry point is fire-and-forget on an app-scoped
 * supervisor — callers never need to handle failures, and network hiccups
 * never block UI or app startup.
 */
@Singleton
class PushTokenRegistrar @Inject constructor(
    private val firestore: FirebaseFirestore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Idempotent: safe to call every cold start. Writes the current token
     * to `farmers/{farmerId}/devices/{installationId}` and subscribes the
     * device to the global broadcast topic.
     *
     * No-ops if [farmerId] is blank — the farmer hasn't signed in yet, so
     * there's no user profile to attach the device to. Re-call this after
     * login completes.
     */
    fun register(farmerId: String) {
        if (farmerId.isBlank()) {
            Log.d(TAG, "register() skipped: farmerId blank")
            return
        }
        scope.launch {
            runCatching {
                val token = FirebaseMessaging.getInstance().token.await()
                val installationId = FirebaseInstallations.getInstance().id.await()

                val device = mapOf(
                    "token" to token,
                    "platform" to "android",
                    "appVersion" to BuildConfig.VERSION_NAME,
                    "versionCode" to BuildConfig.VERSION_CODE.toLong(),
                    "sdk" to Build.VERSION.SDK_INT.toLong(),
                    "deviceModel" to Build.MODEL,
                    "deviceManufacturer" to Build.MANUFACTURER,
                    "updatedAt" to FieldValue.serverTimestamp(),
                )
                firestore.collection("farmers")
                    .document(farmerId)
                    .collection("devices")
                    .document(installationId)
                    .set(device, SetOptions.merge())
                    .await()
                Log.i(TAG, "registered device=$installationId for farmer=$farmerId")
            }.onFailure { Log.w(TAG, "register() failed", it) }
        }

        subscribeBroadcastTopic()
    }

    /**
     * Called on logout. Deletes the device doc so we don't keep pinging a
     * farmer's old device after they hand the phone to someone else, and
     * leaves the broadcast topic alone (broadcasts are device-wide, not
     * farmer-wide — unrelated to auth state).
     */
    fun unregister(farmerId: String) {
        if (farmerId.isBlank()) return
        scope.launch {
            runCatching {
                val installationId = FirebaseInstallations.getInstance().id.await()
                firestore.collection("farmers")
                    .document(farmerId)
                    .collection("devices")
                    .document(installationId)
                    .delete()
                    .await()
                Log.i(TAG, "unregistered device for farmer=$farmerId")
            }.onFailure { Log.w(TAG, "unregister() failed", it) }
        }
    }

    /**
     * Subscribe every install to the broadcast topic. Safe to call
     * repeatedly — FCM dedupes. Kept separate from [register] so we can
     * also reach out to users who haven't logged in yet.
     */
    fun subscribeBroadcastTopic() {
        FirebaseMessaging.getInstance().subscribeToTopic(TOPIC_ALL_FARMERS)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Log.i(TAG, "subscribed to topic=$TOPIC_ALL_FARMERS")
                } else {
                    Log.w(TAG, "subscribe to $TOPIC_ALL_FARMERS failed", task.exception)
                }
            }
    }

    companion object {
        private const val TAG = "PushTokenRegistrar"
        /** Must match the topic the dashboard publishes to for broadcasts. */
        const val TOPIC_ALL_FARMERS = "all_farmers"
    }
}
