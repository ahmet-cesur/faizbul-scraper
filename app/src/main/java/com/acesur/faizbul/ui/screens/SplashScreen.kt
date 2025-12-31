package com.acesur.faizbul.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.acesur.faizbul.R
import com.acesur.faizbul.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    // Animation states
    var startAnimation by remember { mutableStateOf(false) }
    
    // Logo scale animation with spring
    val logoScale by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.3f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "logoScale"
    )
    
    // Logo alpha
    val logoAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 800),
        label = "logoAlpha"
    )
    
    // Glow pulse animation
    val infiniteTransition = rememberInfiniteTransition(label = "glowPulse")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glowAlpha"
    )
    
    // Text slide up animation
    val textOffsetY by animateFloatAsState(
        targetValue = if (startAnimation) 0f else 50f,
        animationSpec = tween(durationMillis = 600, delayMillis = 300),
        label = "textOffsetY"
    )
    
    val textAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 600, delayMillis = 300),
        label = "textAlpha"
    )
    
    // Subtitle animation
    val subtitleAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 500, delayMillis = 600),
        label = "subtitleAlpha"
    )
    
    // Trigger animations and navigation
    LaunchedEffect(Unit) {
        startAnimation = true
        delay(2000) // Show splash for 2 seconds
        onSplashComplete()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        NavyDark,
                        NavyMedium,
                        NavyDark
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Decorative gradient orbs
        Box(
            modifier = Modifier
                .size(400.dp)
                .offset(x = (-100).dp, y = (-200).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Emerald500.copy(alpha = 0.15f),
                            Color.Transparent
                        )
                    )
                )
        )
        
        Box(
            modifier = Modifier
                .size(300.dp)
                .offset(x = 150.dp, y = 250.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            TealGradient.copy(alpha = 0.1f),
                            Color.Transparent
                        )
                    )
                )
        )
        
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Animated Logo with glow
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .scale(logoScale)
                    .alpha(logoAlpha)
            ) {
                // Glow effect
                Box(
                    modifier = Modifier
                        .size(200.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    Emerald500.copy(alpha = glowAlpha),
                                    Color.Transparent
                                )
                            ),
                            shape = CircleShape
                        )
                )
                
                // Logo container
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .shadow(
                            elevation = 24.dp,
                            shape = CircleShape,
                            ambientColor = Emerald500.copy(alpha = 0.4f),
                            spotColor = Emerald500.copy(alpha = 0.4f)
                        )
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Emerald600,
                                    Emerald500,
                                    TealGradient
                                )
                            ),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.app_logo),
                        contentDescription = null,
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // App Name with animation
            Text(
                text = "FaizBul",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 42.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-1).sp
                ),
                color = Color.White,
                modifier = Modifier
                    .offset(y = textOffsetY.dp)
                    .alpha(textAlpha)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Subtitle
            Text(
                text = "En İyi Faiz Oranını Bul",
                style = MaterialTheme.typography.bodyLarge,
                color = SlateGray,
                modifier = Modifier.alpha(subtitleAlpha)
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Loading indicator with brand colors
            Box(
                modifier = Modifier
                    .alpha(subtitleAlpha)
            ) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Emerald500,
                    strokeWidth = 2.dp
                )
            }
        }
        
        // Version at bottom
        Text(
            text = "A.C. Bros 2025",
            style = MaterialTheme.typography.labelSmall,
            color = SlateGray.copy(alpha = 0.5f),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
                .alpha(subtitleAlpha)
        )
    }
}

private val EaseInOutCubic = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)
