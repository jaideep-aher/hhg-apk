package com.hhg.farmers.ui.screens.marketrate

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.data.model.VendorRate
import com.hhg.farmers.data.repo.FarmerRepository
import com.hhg.farmers.service.network.NetworkErrors
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Drives the "today's Hundekari rates" screen.
 *
 * Pulls a flat list of (item, rate) tuples and exposes it as [HundekariRatesUiState]. Single-load
 * on screen entry; user can pull-to-refresh via [refresh].
 */
@HiltViewModel
class HundekariRatesViewModel @Inject constructor(
    private val farmerRepo: FarmerRepository,
    private val telemetry: TelemetryManager,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _state = MutableStateFlow(HundekariRatesUiState())
    val state: StateFlow<HundekariRatesUiState> = _state.asStateFlow()

    init {
        telemetry.onPageEnter("hundekari_rates")
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching { farmerRepo.getHundekariRatesToday() }
                .onSuccess { rates ->
                    _state.update { it.copy(isLoading = false, rates = rates) }
                }
                .onFailure { t ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = NetworkErrors.toUserMessage(appContext, t)
                        )
                    }
                }
        }
    }
}

data class HundekariRatesUiState(
    val isLoading: Boolean = false,
    val rates: List<VendorRate> = emptyList(),
    val errorMessage: String? = null
)
