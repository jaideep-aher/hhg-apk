package com.hhg.farmers.ui.screens.othermarkets

import androidx.lifecycle.ViewModel
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class ApmcRate(
    val item: String,
    val itemMr: String,
    val minRate: Double,
    val maxRate: Double,
    val modalRate: Double   // most common price — used for farmer planning
)

data class MarketData(
    val marketName: String,
    val marketNameMr: String,
    val date: String,
    val rates: List<ApmcRate>
)

data class OtherMarketsUiState(
    val isLoading: Boolean = true,
    val markets: List<MarketData> = emptyList(),
    val selectedMarketIndex: Int = 0,
    val errorMessage: String? = null
)

@HiltViewModel
class OtherMarketsViewModel @Inject constructor(
    private val telemetry: TelemetryManager
) : ViewModel() {

    private val _state = MutableStateFlow(OtherMarketsUiState())
    val state: StateFlow<OtherMarketsUiState> = _state.asStateFlow()

    init {
        telemetry.onPageEnter("other_markets")
        load()
    }

    fun selectMarket(index: Int) {
        _state.value = _state.value.copy(selectedMarketIndex = index)
        telemetry.track("market_selected", mapOf("market" to (_state.value.markets.getOrNull(index)?.marketName ?: "")))
    }

    fun refresh() = load()

    private fun load() {
        // Mock data — replace with real APMC / data.gov.in API call.
        // API: https://agmarknet.gov.in (free, no key) or data.gov.in commodity prices dataset.
        _state.value = OtherMarketsUiState(
            isLoading = false,
            markets = listOf(
                MarketData(
                    marketName = "Lasalgaon", marketNameMr = "लासलगाव",
                    date = "19 Apr 2025",
                    rates = listOf(
                        rate("Onion",  "कांदा",   1600.0, 2100.0, 1850.0),
                        rate("Tomato", "टोमॅटो",  700.0,  1100.0, 950.0),
                        rate("Garlic", "लसूण",    3800.0, 4800.0, 4200.0),
                        rate("Potato", "बटाटा",   1000.0, 1400.0, 1200.0)
                    )
                ),
                MarketData(
                    marketName = "Pune", marketNameMr = "पुणे",
                    date = "19 Apr 2025",
                    rates = listOf(
                        rate("Onion",  "कांदा",   1700.0, 2200.0, 1950.0),
                        rate("Tomato", "टोमॅटो",  800.0,  1200.0, 1000.0),
                        rate("Garlic", "लसूण",    4000.0, 5000.0, 4400.0),
                        rate("Potato", "बटाटा",   1100.0, 1500.0, 1300.0)
                    )
                ),
                MarketData(
                    marketName = "Mumbai", marketNameMr = "मुंबई",
                    date = "19 Apr 2025",
                    rates = listOf(
                        rate("Onion",  "कांदा",   1800.0, 2300.0, 2050.0),
                        rate("Tomato", "टोमॅटो",  900.0,  1400.0, 1100.0),
                        rate("Garlic", "लसूण",    4200.0, 5200.0, 4600.0),
                        rate("Potato", "बटाटा",   1200.0, 1600.0, 1400.0)
                    )
                ),
                MarketData(
                    marketName = "Nashik", marketNameMr = "नाशिक",
                    date = "19 Apr 2025",
                    rates = listOf(
                        rate("Onion",  "कांदा",   1550.0, 2050.0, 1800.0),
                        rate("Tomato", "टोमॅटो",  650.0,  1050.0, 900.0),
                        rate("Garlic", "लसूण",    3700.0, 4700.0, 4100.0),
                        rate("Potato", "बटाटा",   950.0,  1350.0, 1150.0)
                    )
                )
            )
        )
    }
}

/** Convenience builder to avoid repeating named params for every row. */
private fun rate(item: String, itemMr: String, min: Double, max: Double, modal: Double) =
    ApmcRate(item = item, itemMr = itemMr, minRate = min, maxRate = max, modalRate = modal)
