package com.acesur.faizbul.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = Emerald500,
    onPrimary = Color.White,
    primaryContainer = Emerald700,
    onPrimaryContainer = Emerald400,
    
    secondary = Amber500,
    onSecondary = Color.Black,
    secondaryContainer = Amber600,
    onSecondaryContainer = Amber400,
    
    tertiary = TealGradient,
    onTertiary = Color.White,
    
    background = NavyDark,
    onBackground = Color.White,
    
    surface = NavyMedium,
    onSurface = Color.White,
    surfaceVariant = NavyLight,
    onSurfaceVariant = Color(0xFFCBD5E1),
    
    error = ErrorRed,
    onError = Color.White,
    
    outline = SlateGray,
    outlineVariant = Color(0xFF475569)
)



@Composable
fun FaizBulTheme(
    darkTheme: Boolean = true, // Force Dark Mode
    // Disable dynamic color for consistent branding
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorScheme
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}