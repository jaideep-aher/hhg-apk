package com.hhg.farmers.service.update

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.model.AppConfig
import com.hhg.farmers.data.repo.AppConfigApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Two-layer force-update system — the same pattern used by WhatsApp, PhonePe, and banking apps.
 *
 * Layer 1 — Our own version gate (works even for sideloaded APKs):
 *   - On launch, fetches GET /api/config → [AppConfig].
 *   - If BuildConfig.VERSION_CODE < config.minVersionCode, emits [UpdateGateState.ForceUpdate]
 *     → a full-screen Compose blocker takes over the app. No back button, no dismiss.
 *   - The only way out is tapping "Update Now" which opens the Play Store.
 *
 * Layer 2 — Google Play In-App Updates (when user is on Play Store):
 *   - [checkForUpdate] kicks off the Play API's IMMEDIATE flow, which shows a non-dismissible
 *     full-screen Play UI that downloads and installs the update in-place. If below min version
 *     it's IMMEDIATE; otherwise FLEXIBLE (dismissible banner).
 *
 * Both layers run in parallel. Whichever completes first takes over the UI.
 *
 * HOW TO FORCE AN UPDATE IN PROD (no code change):
 *   1. Release v2 on the Play Store.
 *   2. In Railway, set env var MIN_VERSION_CODE=2 and restart the service.
 *   3. Every v1 APK in the wild sees the block screen on next launch. Done.
 */
@Singleton
class UpdateManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val configApi: AppConfigApi
) {

    private val playManager = AppUpdateManagerFactory.create(context)

    private val _gateState = MutableStateFlow<UpdateGateState>(UpdateGateState.Checking)

    /** Observed by MainScaffold — when [UpdateGateState.ForceUpdate], the whole app is gated. */
    val gateState: StateFlow<UpdateGateState> = _gateState.asStateFlow()

    /**
     * Last-known remote config. Seeded with hard-coded defaults so callers
     * (drawer, webview screens, etc.) always have a usable value even before
     * the first /api/config fetch completes, or if the backend is unreachable.
     */
    private val _config = MutableStateFlow(AppConfig())
    val config: StateFlow<AppConfig> = _config.asStateFlow()

    /* ─────────────────── Layer 1: our own version gate ─────────────────────── */

    /**
     * Call once when the app launches. Fetches /api/config and decides whether to block.
     * Fail-open: if the config endpoint is unreachable, we allow the app through so users
     * on flaky 2G aren't locked out. (The backend is our only source of truth; a dead
     * backend is a separate kind of outage.)
     */
    suspend fun checkVersionGate() {
        _gateState.value = UpdateGateState.Checking
        val config = runCatching { configApi.getConfig() }
            .getOrElse { err ->
                Log.w(TAG, "Config fetch failed, allowing through (fail-open)", err)
                _gateState.value = UpdateGateState.Allowed
                return
            }

        val currentVersion = BuildConfig.VERSION_CODE
        Log.i(TAG, "Version gate: installed=$currentVersion, min=${config.minVersionCode}, latest=${config.latestVersionCode}")

        _config.value = config
        _gateState.value = when {
            currentVersion < config.minVersionCode ->
                UpdateGateState.ForceUpdate(config)
            else ->
                UpdateGateState.Allowed
        }
    }

    /* ─────────────── Layer 2: Google Play In-App Updates ────────────────────── */

    /**
     * Call from `MainActivity.onResume()`.
     * Uses Google's Play API for the best-in-class UX when the user has the Play Store.
     * Separate from [checkVersionGate] so we can run both layers in parallel.
     */
    suspend fun checkPlayUpdate(activity: Activity): UpdateDecision = runCatching {
        val info = playManager.appUpdateInfo.await()

        if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) {
            return UpdateDecision.UpToDate
        }

        // If our backend has declared this version unsupported, force IMMEDIATE.
        val currentState = _gateState.value
        val shouldForce = currentState is UpdateGateState.ForceUpdate

        return when {
            shouldForce && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE) -> {
                playManager.startUpdateFlowForResult(info, AppUpdateType.IMMEDIATE, activity, REQ_UPDATE)
                UpdateDecision.ForcedImmediate
            }
            info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) -> {
                playManager.startUpdateFlowForResult(info, AppUpdateType.FLEXIBLE, activity, REQ_UPDATE)
                UpdateDecision.Flexible
            }
            else -> UpdateDecision.UpToDate
        }
    }.getOrElse { t ->
        Log.w(TAG, "Play update check failed", t); UpdateDecision.Error(t)
    }

    companion object {
        private const val TAG = "UpdateManager"
        const val REQ_UPDATE = 4711
    }
}

/**
 * State the UI observes to decide whether to gate the whole app.
 * [Checking] is the initial state on launch; the splash stays up until we resolve.
 */
sealed interface UpdateGateState {
    data object Checking : UpdateGateState
    data object Allowed : UpdateGateState
    data class ForceUpdate(val config: AppConfig) : UpdateGateState
}

sealed interface UpdateDecision {
    data object UpToDate : UpdateDecision
    data object Flexible : UpdateDecision
    data object ForcedImmediate : UpdateDecision
    data class Error(val cause: Throwable) : UpdateDecision
}
