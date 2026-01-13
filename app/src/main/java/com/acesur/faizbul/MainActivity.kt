package com.acesur.faizbul

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument


import com.acesur.faizbul.ui.screens.LandingPage

import com.acesur.faizbul.ui.screens.ResultPage
import com.acesur.faizbul.ui.screens.SettingsPage
import com.acesur.faizbul.ui.screens.SplashScreen
import com.acesur.faizbul.ui.theme.FaizBulTheme
import com.google.android.gms.ads.MobileAds

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        

        val adManager = com.acesur.faizbul.util.AdManager(this)

        val consentManager = com.acesur.faizbul.util.ConsentManager(this)
        consentManager.gatherConsent(this) { error ->
            if (error != null) {
                // Log error
                android.util.Log.w("MainActivity", "Consent gathering failed: ${error.errorCode} ${error.message}")
            }

            if (consentManager.canRequestAds()) {
                MobileAds.initialize(this) {}
                adManager.loadInterstitial()
            }
        }


        setContent {


            FaizBulTheme(darkTheme = true) {
                var showSplash by remember { mutableStateOf(true) }
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AnimatedContent(
                        targetState = showSplash,
                        transitionSpec = {
                            fadeIn(animationSpec = androidx.compose.animation.core.tween(500)) togetherWith
                            fadeOut(animationSpec = androidx.compose.animation.core.tween(500))
                        },
                        label = "splashTransition"
                    ) { isSplashVisible ->
                        if (isSplashVisible) {
                            SplashScreen(
                                onSplashComplete = { showSplash = false }
                            )
                        } else {
                            val navController = rememberNavController()
                            NavHost(navController = navController, startDestination = "landing") {
                                composable("landing") {
                                    LandingPage(navController, adManager, this@MainActivity)
                                }
                                composable(
                                    "result/{amount}/{duration}",
                                    arguments = listOf(
                                        navArgument("amount") { type = NavType.StringType; defaultValue = "1000" },
                                        navArgument("duration") { type = NavType.StringType; defaultValue = "30" }
                                    )
                                ) { backStackEntry ->
                                    val amount = backStackEntry.arguments?.getString("amount") ?: "0"
                                    val duration = backStackEntry.arguments?.getString("duration") ?: "0"
                                    ResultPage(navController, amount, duration)
                                }
                                composable("settings") {
                                    SettingsPage(navController)
                                }



                            }
                        }
                    }
                }
            }
        }
    }
}