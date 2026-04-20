package com.hhg.farmers.ui.screens.localvyapar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.data.repo.FarmerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class LocalVyaparSortField { AskingPrice, RequiredDate, RequiredWeight }

data class LocalVyaparUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val ads: List<LocalVyaparAd> = emptyList(),
    val searchQuery: String = "",
    val sortField: LocalVyaparSortField = LocalVyaparSortField.AskingPrice,
    val sortAscending: Boolean = true
)

@HiltViewModel
class LocalVyaparViewModel @Inject constructor(
    private val farmerRepo: FarmerRepository
) : ViewModel() {

    private val _state = MutableStateFlow(LocalVyaparUiState())
    val state: StateFlow<LocalVyaparUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { farmerRepo.getLocalVyaparAds() }
                .onSuccess { list ->
                    _state.update { it.copy(loading = false, ads = list, error = null) }
                }
                .onFailure { e ->
                    _state.update {
                        it.copy(loading = false, ads = emptyList(), error = e.message ?: "error")
                    }
                }
        }
    }

    fun onSearchChange(q: String) {
        _state.update { it.copy(searchQuery = q) }
    }

    fun setSortField(field: LocalVyaparSortField) {
        _state.update { s ->
            if (s.sortField == field) {
                s.copy(sortAscending = !s.sortAscending)
            } else {
                s.copy(sortField = field, sortAscending = true)
            }
        }
    }
}
