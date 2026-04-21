package com.hhg.farmers.ui.screens.settings

import android.webkit.CookieManager
import android.webkit.WebStorage
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class SettingsUiState(
    val farmerId: String? = null,
    val appVersion: String = BuildConfig.VERSION_NAME,
    val isLoggingOut: Boolean = false,
    val appLanguageCode: String = SessionStore.LANGUAGE_MR
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val session: SessionStore,
    private val telemetry: TelemetryManager
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        telemetry.onPageEnter("settings")
        viewModelScope.launch {
            combine(session.farmerId, session.appLanguage) { fid, lang ->
                Pair(fid, lang)
            }.collect { (fid, lang) ->
                _state.update {
                    it.copy(farmerId = fid, appLanguageCode = lang)
                }
            }
        }
    }

    fun setAppLanguage(languageCode: String) {
        val code = if (languageCode == SessionStore.LANGUAGE_EN) SessionStore.LANGUAGE_EN else SessionStore.LANGUAGE_MR
        viewModelScope.launch {
            session.setAppLanguage(code)
            withContext(Dispatchers.Main.immediate) {
                AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(code))
            }
            telemetry.track("language_change", mapOf("to" to code))
        }
    }

    /**
     * Signs the farmer out across BOTH halves of the app. Order matters —
     * if we cleared the native [SessionStore] first, the next webview load
     * would still find `localStorage.farmerId` from the previous session
     * and our [farmerIdBridgeScript] would push it right back into native,
     * effectively re-logging-the-user-in. That was the Version 9 bug.
     *
     * Steps:
     *   1. Wipe all WebView cookies (auth, session, analytics).
     *   2. Wipe all WebView localStorage / IndexedDB / WebSQL — this is
     *      where the site stashes `farmerId` and `farmerData2`.
     *   3. Clear the native [SessionStore] (farmerId + tokens).
     *   4. Invoke [onDone] so the nav host can bounce to HOME.
     *
     * WebStorage.deleteAllData() and CookieManager.removeAllCookies()
     * are safe to call even if no WebView is currently alive — they
     * operate on the app-global Chromium storage.
     */
    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isLoggingOut = true) }
            telemetry.track("logout")
            withContext(Dispatchers.Main.immediate) {
                with(CookieManager.getInstance()) {
                    removeAllCookies(null)
                    flush()
                }
                WebStorage.getInstance().deleteAllData()
            }
            session.clear()
            onDone()
        }
    }
}
