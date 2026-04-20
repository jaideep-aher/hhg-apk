package com.hhg.farmers.ui.screens.settings

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

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isLoggingOut = true) }
            telemetry.track("logout")
            session.clear()
            onDone()
        }
    }
}
