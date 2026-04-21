package com.hhg.farmers.ui.navigation

import androidx.lifecycle.ViewModel
import com.hhg.farmers.service.geo.FarmerLocationTracker
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/**
 * Fires a GeoTracker ping whenever the active farmer changes during a session.
 *
 * The WebView's onFarmerIdDetected callback fires every time a /farmers/{id} URL
 * is loaded. Without deduplication this would spam Firestore on every in-app
 * navigation. [lastTrackedId] ensures we only ping when the farmer actually changes.
 */
@HiltViewModel
class NavTrackingViewModel @Inject constructor(
    private val locationTracker: FarmerLocationTracker
) : ViewModel() {

    private var lastTrackedId: String? = null

    fun onFarmerDetected(farmerId: String) {
        if (farmerId.isBlank() || farmerId == lastTrackedId) return
        lastTrackedId = farmerId
        locationTracker.fireAndForget(farmerId, FarmerLocationTracker.Source.Login)
    }
}
