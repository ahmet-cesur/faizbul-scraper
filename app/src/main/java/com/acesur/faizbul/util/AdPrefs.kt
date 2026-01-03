package com.acesur.faizbul.util

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object AdPrefs {
    private const val PREF_NAME = "ad_prefs"
    private const val KEY_ADS_ENABLED = "ads_enabled"
    
    private val _adsEnabled = MutableStateFlow(true)
    val adsEnabled: StateFlow<Boolean> = _adsEnabled.asStateFlow()
    
    private lateinit var prefs: SharedPreferences
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        _adsEnabled.value = prefs.getBoolean(KEY_ADS_ENABLED, true)
    }
    
    fun setAdsEnabled(enabled: Boolean) {
        _adsEnabled.value = enabled
        prefs.edit().putBoolean(KEY_ADS_ENABLED, enabled).apply()
    }
}
