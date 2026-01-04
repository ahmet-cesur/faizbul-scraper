package com.acesur.faizbul.ui.viewmodels

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.acesur.faizbul.data.BestOffer
import com.acesur.faizbul.data.GoogleSheetRepository
import kotlinx.coroutines.launch

class QuickResultViewModel : ViewModel() {
    private val _offers = mutableStateOf<List<BestOffer>>(emptyList())
    val offers: State<List<BestOffer>> = _offers

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    init {
        loadBestOffers()
    }

    fun loadBestOffers() {
        viewModelScope.launch {
            _isLoading.value = true
            _offers.value = GoogleSheetRepository.getBestOffers()
            _isLoading.value = false
        }
    }
}
