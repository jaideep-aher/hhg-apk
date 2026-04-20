package com.hhg.farmers

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
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

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        runBlocking(Dispatchers.IO) {
            val tag = sessionStore.appLanguage.first()
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
        }
        telemetry.onAppStart()
    }
}
