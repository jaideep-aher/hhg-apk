package com.hhg.farmers.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val errorMessage: String? = null
)

@HiltViewModel
class WeatherViewModel @Inject constructor(
    private val weatherService: WeatherService
) : ViewModel() {

    private val _state = MutableStateFlow(WeatherUiState())
    val state: StateFlow<WeatherUiState> = _state.asStateFlow()

    init { load() }

    fun refresh() = load()

    private fun load() {
        viewModelScope.launch {
            _state.value = WeatherUiState(isLoading = true)
            runCatching { weatherService.getCurrentWeather() }
                .onSuccess { _state.value = WeatherUiState(isLoading = false, weather = it) }
                .onFailure { _state.value = WeatherUiState(isLoading = false, errorMessage = it.message) }
        }
    }
}
