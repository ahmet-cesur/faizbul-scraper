package com.acesur.faizbul.util

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.ump.ConsentDebugSettings
import com.google.android.ump.ConsentForm
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import java.util.concurrent.atomic.AtomicBoolean

class ConsentManager(private val context: Context) {
    private val consentInformation: ConsentInformation = UserMessagingPlatform.getConsentInformation(context)

    /**
     * Interface definition for a callback to be invoked when consent gathering is complete.
     */
    fun interface OnConsentGatheringCompleteListener {
        fun consentGatheringComplete(error: com.google.android.ump.FormError?)
    }

    /**
     * Helper method to call the UMP SDK methods to request consent information and load/show a
     * consent form if necessary.
     */
    fun gatherConsent(
        activity: Activity,
        onConsentGatheringCompleteListener: OnConsentGatheringCompleteListener
    ) {
        // For testing purposes, you can force a debug geography.
        val debugSettings = ConsentDebugSettings.Builder(context)
            // .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
            // .addTestDeviceHashedId("TEST-DEVICE-HASHED-ID")
            .build()

        val params = ConsentRequestParameters.Builder()
            // .setConsentDebugSettings(debugSettings)
            .setTagForUnderAgeOfConsent(false)
            .build()

        // Requesting an update to consent information should be called on every app launch.
        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                    activity
                ) { formError ->
                    // Consent gathering process is complete.
                    onConsentGatheringCompleteListener.consentGatheringComplete(formError)
                }
            },
            { requestConsentError ->
                Log.w("ConsentManager", String.format("%s: %s", requestConsentError.errorCode, requestConsentError.message))
                onConsentGatheringCompleteListener.consentGatheringComplete(requestConsentError)
            }
        )
    }

    /**
     * Helper method to check if ads can be requested.
     */
    fun canRequestAds(): Boolean {
        // According to AdMob, we can request ads if consent is gathered or not required.
        // Actually we should rely on MobileAds.initialize which handles this internally usually,
        // but UMP doc says: "If the user has consented to receive ads, you can request ads."
        return consentInformation.canRequestAds()
    }
    
    /**
     * Resets consent state for testing purposes.
     */
    fun resetConsent() {
        consentInformation.reset()
    }
}
