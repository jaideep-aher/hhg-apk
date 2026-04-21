package com.hhg.farmers

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.google.firebase.messaging.FirebaseMessaging
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.geo.FarmerLocationTracker
import com.hhg.farmers.service.push.NotificationChannels
import com.hhg.farmers.service.push.PushTokenRegistrar
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Application entry point.
 *
 * Wires:
 *  - Hilt DI graph
 *  - WorkManager with Hilt-aware worker factory (used by TelemetryFlushWorker)
 *  - Initial telemetry session
 *
 * Scaling note: keep this class *thin*. Feature initialization should happen in
 * Hilt modules or via lifecycle observers, not here — otherwise it becomes a god
 * object that every new feature has to touch.
 */
@HiltAndroidApp
class HhgApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var telemetry: TelemetryManager
    @Inject lateinit var sessionStore: SessionStore
    @Inject lateinit var locationTracker: FarmerLocationTracker
    @Inject lateinit var pushTokenRegistrar: PushTokenRegistrar

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    // Application-scoped coroutine scope — outlives any activity, survives
    // config changes. Used for fire-and-forget init tasks that should not
    // block the main thread.
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        // Read the persisted locale off the main thread. On a cold-start
        // cache miss on a cheap 2018 device this can take hundreds of ms;
        // doing it inside runBlocking was an ANR waiting to happen.
        // AppCompatDelegate.setApplicationLocales MUST be called on the
        // main thread, so we hop back after the IO read.
        appScope.launch {
            val tag = withContext(Dispatchers.IO) {
                runCatching { sessionStore.appLanguage.first() }.getOrDefault("mr")
            }
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
        }
        telemetry.onAppStart()

        // Register notification channels exactly once per process start.
        // Channels are a SettingsDB write the first time; subsequent calls
        // are no-ops on the same ID, so this is safe to call on every cold
        // start. Done eagerly so the very first FCM push can find its channel.
        NotificationChannels.registerAll(this)

        // Subscribe every install to the broadcast topic, logged-in or not —
        // "announcement" messages should reach fresh installs too.
        pushTokenRegistrar.subscribeBroadcastTopic()

        // Debug-only: dump the current FCM token so we can copy-paste it into
        // the Firebase Console "Send test message" flow during bring-up. In
        // production the token is already written to Firestore by the
        // registrar below, so there's no need to log it.
        if (BuildConfig.DEBUG) {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Log.i("FcmService", "current FCM token: ${task.result}")
                }
            }
        }

        // Returning-user geo ping + push-token registration. If the farmer is
        // already signed in from a previous session, (1) write an "app_open"
        // location record so we can see active-user geography (not just
        // first-login geography) and (2) refresh the device's FCM token in
        // Firestore so the dashboard can target them with personalised pushes.
        appScope.launch {
            val farmerId = runCatching { sessionStore.farmerId.first() }.getOrNull()
            if (!farmerId.isNullOrBlank()) {
                locationTracker.fireAndForget(
                    farmerId = farmerId,
                    source = FarmerLocationTracker.Source.AppOpen
                )
                pushTokenRegistrar.register(farmerId)
            }
        }
    }
}
