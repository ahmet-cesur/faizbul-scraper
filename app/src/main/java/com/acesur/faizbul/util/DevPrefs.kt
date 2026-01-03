package com.acesur.faizbul.util

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object DevPrefs {
    private const val PREF_NAME = "dev_prefs"
    private const val KEY_GITHUB_TOKEN = "github_token"
    
    private val _githubToken = MutableStateFlow("")
    val githubToken: StateFlow<String> = _githubToken.asStateFlow()
    
    private lateinit var prefs: SharedPreferences
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        _githubToken.value = prefs.getString(KEY_GITHUB_TOKEN, "") ?: ""
    }
    
    fun setGithubToken(token: String) {
        _githubToken.value = token
        prefs.edit().putString(KEY_GITHUB_TOKEN, token).apply()
    }
}
