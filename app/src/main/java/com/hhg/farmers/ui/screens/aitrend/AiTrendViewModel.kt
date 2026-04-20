package com.hhg.farmers.ui.screens.aitrend

import androidx.lifecycle.ViewModel
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

/**
 * Represents a single commodity's trend data for the AI Trend screen.
 *
 * [weeklyRates] — 7 data points, oldest first (Mon → Sun).
 * [trendPct]    — % change vs same day last week; positive = up, negative = down.
 * [narrative]   — One-paragraph AI commentary (will come from backend when wired).
 */
data class CommodityTrend(
    val item: String,
    val itemMr: String,
    val currentRate: Double,        // ₹ per quintal
    val weeklyRates: List<Double>,  // 7 values oldest→newest
    val trendPct: Double,
    val narrative: String
)

data class AiTrendUiState(
    val isLoading: Boolean = true,
    val trends: List<CommodityTrend> = emptyList(),
    val lastUpdated: String = "",
    val errorMessage: String? = null
)

@HiltViewModel
class AiTrendViewModel @Inject constructor(
    private val telemetry: TelemetryManager
) : ViewModel() {

    private val _state = MutableStateFlow(AiTrendUiState())
    val state: StateFlow<AiTrendUiState> = _state.asStateFlow()

    init {
        telemetry.onPageEnter("ai_trend")
        load()
    }

    fun refresh() = load()

    private fun load() {
        // Mock data — replace with actual AI/backend call when endpoint is live.
        // Rates are ₹/quintal (100 kg) — standard Maharashtra APMC unit.
        _state.value = AiTrendUiState(
            isLoading = false,
            lastUpdated = "19 Apr 2025",
            trends = listOf(
                CommodityTrend(
                    item = "Onion", itemMr = "कांदा",
                    currentRate = 1850.0,
                    weeklyRates = listOf(1600.0, 1700.0, 1750.0, 1720.0, 1800.0, 1830.0, 1850.0),
                    trendPct = +15.6,
                    narrative = "Onion rates have risen sharply this week due to reduced arrivals from Lasalgaon. Mumbai wholesale demand remains strong. AI model predicts rates will hold above ₹1,800/qtl through the coming week before slight correction."
                ),
                CommodityTrend(
                    item = "Tomato", itemMr = "टोमॅटो",
                    currentRate = 950.0,
                    weeklyRates = listOf(1200.0, 1150.0, 1100.0, 1050.0, 1000.0, 960.0, 950.0),
                    trendPct = -20.8,
                    narrative = "Tomato prices have corrected from high levels as new arrivals from Nashik increased supply. Short-term softness is expected before stabilisation near upcoming festival season demand spikes."
                ),
                CommodityTrend(
                    item = "Garlic", itemMr = "लसूण",
                    currentRate = 4200.0,
                    weeklyRates = listOf(4000.0, 4050.0, 4100.0, 4150.0, 4180.0, 4200.0, 4200.0),
                    trendPct = +5.0,
                    narrative = "Garlic remains firm with consistent export demand from Southeast Asia. Carry-over stock from last season is low. Quality premium grades are commanding ₹4,500+ in spot markets."
                ),
                CommodityTrend(
                    item = "Potato", itemMr = "बटाटा",
                    currentRate = 1200.0,
                    weeklyRates = listOf(1180.0, 1190.0, 1195.0, 1200.0, 1205.0, 1200.0, 1200.0),
                    trendPct = +1.7,
                    narrative = "Potato rates are stable with a mild upward bias. Punjab cold-storage release is gradual, keeping supply measured. Maharashtra local demand is covering the retail shortfall in urban markets."
                )
            )
        )
    }
}
