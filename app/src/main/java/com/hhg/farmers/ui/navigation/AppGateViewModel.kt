package com.hhg.farmers.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.service.update.UpdateGateState
import com.hhg.farmers.service.update.UpdateManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Owns the "is the app version still supported?" state for the whole UI.
 *
 * Triggers [UpdateManager.checkVersionGate] on init so the check fires exactly once
 * per process launch. The returned state flow is observed by [MainScaffold] — while
 * it reports [UpdateGateState.Checking] a spinner is shown; when it reports
 * [UpdateGateState.ForceUpdate] the block screen takes over.
 */
@HiltViewModel
class AppGateViewModel @Inject constructor(
    private val updateManager: UpdateManager
) : ViewModel() {

    val gate: StateFlow<UpdateGateState> = updateManager.gateState

    init {
        viewModelScope.launch {
            updateManager.checkVersionGate()
        }
    }
}
