package com.acesur.faizbul.util

import android.app.Activity
import android.content.Context
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

class AdManager(private val context: Context) {
    private var interstitialAd: InterstitialAd? = null

    companion object {
        private var appStartTime: Long = System.currentTimeMillis()
        private var lastInterstitialShowTime: Long = 0
        
        private const val THREE_MINUTES_MS = 3 * 60 * 1000L
        private const val FIVE_MINUTES_MS = 5 * 60 * 1000L
    }

    fun loadInterstitial() {
        val adRequest = AdRequest.Builder().build()
        // Test Ad Unit ID for Interstitial
        InterstitialAd.load(context, "ca-app-pub-3940256099942544/1033173712", adRequest, object : InterstitialAdLoadCallback() {
            override fun onAdFailedToLoad(adError: LoadAdError) {
                interstitialAd = null
            }

            override fun onAdLoaded(ad: InterstitialAd) {
                interstitialAd = ad
            }
        })
    }

    fun showInterstitial(activity: Activity, onAdDismissed: () -> Unit = { }) {
        val adsEnabled = AdPrefs.adsEnabled.value
        if (!adsEnabled) {
            onAdDismissed()
            return
        }

        val currentTime = System.currentTimeMillis()
        
        // 1. Check for 3 minute usage before first interstitial
        if (lastInterstitialShowTime == 0L) {
            if (currentTime - appStartTime < THREE_MINUTES_MS) {
                onAdDismissed()
                return
            }
        } 
        // 2. Check for 5 minute gap between interstitial ads
        else if (currentTime - lastInterstitialShowTime < FIVE_MINUTES_MS) {
            onAdDismissed()
            return
        }
        
        if (interstitialAd != null) {
            interstitialAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    lastInterstitialShowTime = System.currentTimeMillis()
                    loadInterstitial() // Reload for next time
                    onAdDismissed()
                }

                override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                    interstitialAd = null
                    onAdDismissed()
                }
            }
            interstitialAd?.show(activity)
        } else {
            onAdDismissed()
            loadInterstitial() // Attempt to load if it wasn't ready
        }
    }
}
