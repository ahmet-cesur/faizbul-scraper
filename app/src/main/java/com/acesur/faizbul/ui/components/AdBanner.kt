package com.acesur.faizbul.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView

@Composable
fun AdBanner(modifier: Modifier = Modifier) {
    val adsEnabled by com.acesur.faizbul.util.AdPrefs.adsEnabled.collectAsState()

    if (adsEnabled) {
        AndroidView(
            modifier = modifier.fillMaxWidth(),
            factory = { context ->
                AdView(context).apply {
                    setAdSize(AdSize.BANNER)
                    // Ad Unit ID for Banner
                    adUnitId = "ca-app-pub-6223654168327818/3703407791" 
                    loadAd(AdRequest.Builder().build())
                }
            }
        )
    }
}
