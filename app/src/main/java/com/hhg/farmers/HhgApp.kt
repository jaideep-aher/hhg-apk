package com.hhg.farmers

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.geo.FarmerLocationTracker
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

        // Returning-user geo ping. If the farmer is already signed in from a
        // previous session, write an "app_open" location record so we can see
        // active-user geography (not just first-login geography).
        appScope.launch {
            val farmerId = runCatching { sessionStore.farmerId.first() }.getOrNull()
            if (!farmerId.isNullOrBlank()) {
                runCatching {
                    locationTracker.recordLocation(
                        farmerId = farmerId,
                        source = FarmerLocationTracker.Source.AppOpen
                    )
                }
            }
        }
    }
}
