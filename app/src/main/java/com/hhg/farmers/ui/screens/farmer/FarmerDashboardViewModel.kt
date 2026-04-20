package com.hhg.farmers.ui.screens.farmer

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.data.auth.AuthRepository
import com.hhg.farmers.data.model.FarmerDataPage
import com.hhg.farmers.data.model.PattiTotals
import com.hhg.farmers.data.repo.FarmerRepository
import com.hhg.farmers.service.location.LocationProvider
import com.hhg.farmers.service.network.NetworkErrors
import com.hhg.farmers.service.offline.OfflineCache
import com.hhg.farmers.service.share.PdfExporter
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * Drives the farmer dashboard.
 *
 * Load order (optimistic / network-aware):
 *   1. Read offline cache → surface immediately if present (so the screen is never blank).
 *   2. Fetch fresh data from the repo.
 *   3. On success, overwrite state + update the offline cache.
 *   4. On failure with no cache, surface error state; with cache, keep cached view + toast error.
 *
 * Location capture fires once per session if permission is granted — piped into telemetry only,
 * never to the UI. That keeps the dashboard fast and the user unaware.
 */
@HiltViewModel
class FarmerDashboardViewModel @Inject constructor(
    private val farmerRepo: FarmerRepository,
    private val auth: AuthRepository,
    private val offlineCache: OfflineCache,
    private val pdfExporter: PdfExporter,
    private val location: LocationProvider,
    private val telemetry: TelemetryManager,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _state = MutableStateFlow(FarmerUiState())
    val state: StateFlow<FarmerUiState> = _state.asStateFlow()

    private var currentUid: String = ""

    fun start(uid: String) {
        if (currentUid == uid && _state.value.page != null) return
        currentUid = uid
        telemetry.onPageEnter("farmer_dashboard")
        load(uid)
        captureLocationIfAllowed()
    }

    fun refresh() = load(currentUid)

    fun logout() {
        viewModelScope.launch {
            auth.logout()
            telemetry.track("user_logged_out")
        }
    }

    fun sharePatti() {
        val page = _state.value.page ?: return
        telemetry.track("share_patti_clicked")
        pdfExporter.shareFarmerPatti(page)
    }

    private fun load(uid: String) {
        if (uid.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.page == null, errorMessage = null) }

            // 1) Try cache for instant paint
            val cached = runCatching { offlineCache.readPatti(uid) }.getOrNull()
            if (cached != null && _state.value.page == null) {
                _state.update { it.copy(page = cached, totals = computeTotals(cached), isLoading = true) }
            }

            // 2) Fetch fresh
            val today = LocalDate.now()
            val from = today.minusDays(30).toString()
            val to = today.toString()

            runCatching { farmerRepo.getFarmerData(uid, fromDate = from, toDate = to) }
                .onSuccess { fresh ->
                    _state.update { it.copy(page = fresh, totals = computeTotals(fresh), isLoading = false, errorMessage = null) }
                    runCatching { offlineCache.writePatti(uid, fresh) }
                }
                .onFailure { t ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            // Keep cached page visible if we had one. Error copy is
                            // taken from the safe NetworkErrors mapper so we never
                            // leak backend URLs / host names into the UI.
                            errorMessage = if (it.page == null) {
                                NetworkErrors.toUserMessage(appContext, t)
                            } else {
                                null
                            }
                        )
                    }
                    // Telemetry uses exception class name (not message) so logs can
                    // still distinguish causes without recording any URL text.
                    telemetry.track(
                        "farmer_load_failed",
                        mapOf("reason" to (t::class.java.simpleName ?: "unknown"))
                    )
                }
        }
    }

    private fun captureLocationIfAllowed() {
        if (!location.hasPermission()) return
        viewModelScope.launch {
            val fix = location.getCurrentLocation() ?: return@launch
            telemetry.onLocationCaptured(fix)
        }
    }

    private fun computeTotals(page: FarmerDataPage): PattiTotals {
        val totalPayable = page.entries.sumOf { it.payable ?: 0.0 }
        val totalQuantity = page.entries.sumOf { it.quantity }
        val totalWeight = page.entries.sumOf { it.weight }
        return PattiTotals(totalPayable, totalQuantity, totalWeight)
    }
}

data class FarmerUiState(
    val isLoading: Boolean = false,
    val page: FarmerDataPage? = null,
    val totals: PattiTotals? = null,
    val errorMessage: String? = null
)
