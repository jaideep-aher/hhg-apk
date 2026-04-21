package com.hhg.farmers.ui.screens.home

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.data.auth.AuthRepository
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.data.repo.FarmerRepository
import com.hhg.farmers.service.geo.FarmerLocationTracker
import com.hhg.farmers.service.network.NetworkErrors
import com.hhg.farmers.service.telemetry.TelemetryManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Drives the home screen.
 *
 * Responsibilities:
 *   - Load notices for the carousel
 *   - Validate and look up a 5-digit Aadhaar via [AuthRepository]
 *   - Emit one-shot [HomeEvent]s for navigation
 *
 * The screen never talks to the repo directly — it observes [state] and dispatches intents.
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val auth: AuthRepository,
    private val farmerRepo: FarmerRepository,
    private val telemetry: TelemetryManager,
    private val locationTracker: FarmerLocationTracker,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private val _events = MutableStateFlow<HomeEvent?>(null)
    val events: StateFlow<HomeEvent?> = _events.asStateFlow()

    init {
        telemetry.onPageEnter("home")
        loadNotices()
    }

    fun onAadhaarChange(value: String) {
        // Only accept digits, cap at 5. This matches the web input behavior.
        val sanitized = value.filter { it.isDigit() }.take(5)
        _state.update { it.copy(aadhaar = sanitized, searchError = null) }
    }

    fun onSearch() {
        val uid = _state.value.aadhaar
        if (uid.length != 5) {
            _state.update { it.copy(searchError = SearchError.Invalid) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isSearching = true, searchError = null) }
            telemetry.track("home_search_submitted", mapOf("uid_len" to uid.length))
            val result = auth.loginWithUid(uid)
            _state.update { it.copy(isSearching = false) }
            result
                .onSuccess {
                    telemetry.track("home_search_success")
                    // App-scoped fire-and-forget: survives navigation away from
                    // HomeScreen. If we used viewModelScope, the VM gets
                    // cleared on NavigateToFarmer and the GPS fix + Firestore
                    // write gets cancelled mid-flight (typical 3-5s).
                    locationTracker.fireAndForget(
                        farmerId = uid,
                        source = FarmerLocationTracker.Source.Login
                    )
                    _events.value = HomeEvent.NavigateToFarmer(uid)
                }
                .onFailure { t ->
                    // Log by exception type only — never forward the raw message to
                    // telemetry or UI, because retrofit/okhttp messages can embed
                    // backend URLs.
                    telemetry.track(
                        "home_search_failed",
                        mapOf("reason" to (t::class.java.simpleName ?: "unknown"))
                    )
                    val err = when {
                        t is IllegalArgumentException -> SearchError.Invalid
                        // Check "not found" marker on our own repo exception FIRST,
                        // before network classification, since a real 404 comes back
                        // as an HttpException but our repo may wrap it.
                        t.message?.contains("not found", ignoreCase = true) == true -> SearchError.NotFound
                        !NetworkErrors.isOnline(appContext) -> SearchError.Offline
                        t is UnknownHostException || t is ConnectException ||
                            t is SocketTimeoutException || t is IOException -> SearchError.Offline
                        else -> SearchError.Generic
                    }
                    _state.update { it.copy(searchError = err) }
                }
        }
    }

    fun onEventHandled() { _events.value = null }

    private fun loadNotices() {
        viewModelScope.launch {
            _state.update { it.copy(noticesLoading = true) }
            runCatching { farmerRepo.getNotifications() }
                .onSuccess { list -> _state.update { it.copy(notices = list, noticesLoading = false) } }
                .onFailure { _state.update { it.copy(notices = emptyList(), noticesLoading = false) } }
        }
    }
}

data class HomeUiState(
    val aadhaar: String = "",
    val isSearching: Boolean = false,
    val searchError: SearchError? = null,
    val notices: List<Notice> = emptyList(),
    val noticesLoading: Boolean = false
)

enum class SearchError { Invalid, NotFound, Generic, Offline }

sealed interface HomeEvent {
    data class NavigateToFarmer(val uid: String) : HomeEvent
}
