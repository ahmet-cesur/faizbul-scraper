package com.acesur.faizbul.util

import android.content.Context
import android.content.SharedPreferences

object UserPrefs {
    private const val PREF_NAME = "user_prefs"
    private const val KEY_LAST_AMOUNT = "last_amount"
    private const val KEY_LAST_DURATION = "last_duration"
    
    private lateinit var prefs: SharedPreferences
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }
    
    fun saveLastInput(amount: String, duration: String) {
        prefs.edit()
            .putString(KEY_LAST_AMOUNT, amount)
            .putString(KEY_LAST_DURATION, duration)
            .apply()
    }
    
    fun getLastAmount(): String {
        return prefs.getString(KEY_LAST_AMOUNT, "") ?: ""
    }
    
    fun getLastDuration(): String {
        return prefs.getString(KEY_LAST_DURATION, "") ?: ""
    }
}
