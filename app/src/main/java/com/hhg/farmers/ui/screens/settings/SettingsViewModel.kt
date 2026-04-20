package com.hhg.farmers.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val farmerId: String? = null,
    val appVersion: String = BuildConfig.VERSION_NAME,
    val isLoggingOut: Boolean = false
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
            _state.update { it.copy(farmerId = session.farmerId.first()) }
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
