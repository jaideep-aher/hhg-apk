package com.hhg.farmers.service.update

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.hhg.farmers.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles Play In-App Updates — the mechanism to both nudge and *force* users off old versions.
 *
 * Force-update logic:
 *   - The backend exposes a `min_supported_version_code` (via Remote Config or a JSON endpoint).
 *   - If the installed versionCode < min_supported_version_code, we launch the Play update in
 *     [AppUpdateType.IMMEDIATE] mode. The update UI blocks app usage until the user upgrades.
 *   - Otherwise, we offer a flexible update (non-blocking, user can dismiss).
 *
 * For now the minimum-version check is a stub — replace [fetchMinSupportedVersionCode] with a
 * Remote Config / REST call when the backend is live.
 */
@Singleton
class UpdateManager @Inject constructor(@ApplicationContext private val context: Context) {

    private val manager = AppUpdateManagerFactory.create(context)

    /**
     * Call from `MainActivity.onResume()`.
     * Returns [UpdateDecision] describing what was done so the Activity can react (e.g. show a UI).
     */
    suspend fun checkForUpdate(activity: Activity): UpdateDecision = runCatching {
        val info = manager.appUpdateInfo.await()

        if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) {
            return UpdateDecision.UpToDate
        }

        val minSupported = fetchMinSupportedVersionCode()
        val current = BuildConfig.VERSION_CODE

        return if (current < minSupported && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
            // Force the update — blocks the app until user upgrades.
            manager.startUpdateFlowForResult(info, AppUpdateType.IMMEDIATE, activity, REQ_UPDATE)
            UpdateDecision.ForcedImmediate
        } else if (info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
            manager.startUpdateFlowForResult(info, AppUpdateType.FLEXIBLE, activity, REQ_UPDATE)
            UpdateDecision.Flexible
        } else {
            UpdateDecision.UpToDate
        }
    }.getOrElse { t ->
        Log.w(TAG, "Update check failed", t); UpdateDecision.Error(t)
    }

    /**
     * TODO: replace with a real Remote Config / REST lookup.
     * The stub returns 1 — effectively "no forced minimum yet" — so the flow stays flexible until
     * a breaking change needs to be enforced.
     */
    private suspend fun fetchMinSupportedVersionCode(): Int = 1

    companion object {
        private const val TAG = "UpdateManager"
        const val REQ_UPDATE = 4711
    }
}

sealed interface UpdateDecision {
    data object UpToDate : UpdateDecision
    data object Flexible : UpdateDecision
    data object ForcedImmediate : UpdateDecision
    data class Error(val cause: Throwable) : UpdateDecision
}
