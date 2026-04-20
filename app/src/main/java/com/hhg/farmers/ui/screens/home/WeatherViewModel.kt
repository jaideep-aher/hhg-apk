package com.hhg.farmers.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.service.location.LocationProvider
import com.hhg.farmers.service.weather.WeatherLocation
import com.hhg.farmers.service.weather.WeatherResponse
import com.hhg.farmers.service.weather.WeatherService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WeatherUiState(
    val isLoading: Boolean = true,
    val weather: WeatherResponse? = null,
    val errorMessage: String? = null,
    /** True when the request used device GPS; false when using Ghargaon fallback. */
    val usedDeviceLocation: Boolean = false
)

@HiltViewModel
class WeatherViewModel @Inject constructor(
    private val weatherService: WeatherService,
    private val locationProvider: LocationProvider
) : ViewModel() {

    private val _state = MutableStateFlow(WeatherUiState())
    val state: StateFlow<WeatherUiState> = _state.asStateFlow()

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            _state.value = WeatherUiState(isLoading = true)
            val fix = if (locationProvider.hasPermission()) {
                locationProvider.getCurrentLocation()
            } else {
                null
            }
            val usedDevice = fix != null
            val lat = fix?.latitude ?: WeatherLocation.GHARGAON_LAT
            val lon = fix?.longitude ?: WeatherLocation.GHARGAON_LON
            runCatching { weatherService.getCurrentWeather(lat, lon) }
                .onSuccess {
                    _state.value = WeatherUiState(
                        isLoading = false,
                        weather = it,
                        usedDeviceLocation = usedDevice
                    )
                }
                .onFailure {
                    _state.value = WeatherUiState(isLoading = false, errorMessage = it.message)
                }
        }
    }
}
