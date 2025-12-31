package com.acesur.faizbul.ui.screens

import android.app.Activity
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.acesur.faizbul.R
import com.acesur.faizbul.ui.components.AdBanner
import com.acesur.faizbul.ui.theme.*
import com.acesur.faizbul.util.AdManager
import com.acesur.faizbul.util.ThousandSeparatorTransformation
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun LandingPage(navController: NavController, adManager: AdManager? = null, activity: Activity? = null) {
    var amount by remember { mutableStateOf("5000000") }
    var duration by remember { mutableStateOf("32") }
    var showWeekendWarning by remember { mutableStateOf(false) }
    var weekendWarningDate by remember { mutableStateOf("") }
    var weekendDayName by remember { mutableStateOf("") }
    var selectedDurationChip by remember { mutableStateOf<Int?>(null) }
    
    // Animation for the button
    var isButtonPressed by remember { mutableStateOf(false) }
    val buttonScale by animateFloatAsState(
        targetValue = if (isButtonPressed) 0.96f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "buttonScale"
    )

    // Shimmer animation for button
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = -200f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )

    // Preset duration options
    val durationPresets = listOf(32, 91, 180, 365)

    fun checkAndNavigate() {
        if (amount.isEmpty() || duration.isEmpty()) return
        
        val durationDays = duration.toIntOrNull() ?: return
        
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_YEAR, durationDays)
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        
        if (com.acesur.faizbul.util.HolidayUtils.isHoliday(calendar)) {
            val dateFormat = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
            weekendWarningDate = dateFormat.format(calendar.time)
            
            val holidayName = com.acesur.faizbul.util.HolidayUtils.getHolidayName(calendar)
            weekendDayName = holidayName ?: (if (dayOfWeek == Calendar.SATURDAY) "Cumartesi" else "Pazar")
            showWeekendWarning = true
        } else {
            navController.navigate("result/$amount/$duration")
        }
    }

    // Weekend Warning Dialog with modern styling
    if (showWeekendWarning) {
        AlertDialog(
            onDismissRequest = { showWeekendWarning = false },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⚠️", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Vade Sonu Uyarısı",
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Column {
                    Text(
                        text = "Seçtiğiniz vade $weekendDayName gününe ($weekendWarningDate) denk geliyor.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = WarningOrange.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Bankalar hafta sonları ve resmi tatillerde kapalı olduğundan, vade bitişi bir sonraki iş gününe ertelenebilir.",
                            style = MaterialTheme.typography.bodySmall,
                            color = WarningOrange,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showWeekendWarning = false
                        navController.navigate("result/$amount/$duration")
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                ) {
                    Text("Devam Et", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showWeekendWarning = false },
                    border = ButtonDefaults.outlinedButtonBorder(enabled = true)
                ) {
                    Text("Vadeyi Değiştir")
                }
            }
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                )
            )
    ) {
        // Decorative gradient orb at top
        Box(
            modifier = Modifier
                .size(300.dp)
                .offset(x = (-50).dp, y = (-100).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Emerald500.copy(alpha = 0.15f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))
            
            // Top Row for Settings and Bank Selection
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                IconButton(
                    onClick = { navController.navigate("bankSelection") },
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            CircleShape
                        )
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.List,
                        contentDescription = "Banka Seçimi",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))

                IconButton(
                    onClick = { navController.navigate("settings") },
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            CircleShape
                        )
                ) {
                    Icon(
                        Icons.Default.Settings,
                        contentDescription = stringResource(R.string.settings),
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Logo with glow effect
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(140.dp)
            ) {
                // Glow effect
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    Emerald500.copy(alpha = 0.3f),
                                    Color.Transparent
                                )
                            ),
                            shape = CircleShape
                        )
                )
                // Logo container
                Surface(
                    modifier = Modifier
                        .size(100.dp)
                        .shadow(
                            elevation = 20.dp,
                            shape = CircleShape,
                            ambientColor = Emerald500.copy(alpha = 0.3f),
                            spotColor = Emerald500.copy(alpha = 0.3f)
                        ),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surface,
                    border = ButtonDefaults.outlinedButtonBorder(enabled = true)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        androidx.compose.foundation.Image(
                            painter = painterResource(id = R.drawable.app_logo),
                            contentDescription = null,
                            modifier = Modifier
                                .size(70.dp)
                                .clip(CircleShape)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Title & Subtitle
            Text(
                text = stringResource(id = R.string.landing_title),
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.5).sp
                ),
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = stringResource(id = R.string.landing_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Amount Input Field with premium styling
            PremiumTextField(
                value = amount,
                onValueChange = { if (it.all { char -> char.isDigit() }) amount = it },
                label = stringResource(id = R.string.enter_amount),
                leadingIcon = {
                    Text(
                        "₺",
                        style = MaterialTheme.typography.titleLarge,
                        color = Emerald500,
                        fontWeight = FontWeight.Bold
                    )
                },
                visualTransformation = ThousandSeparatorTransformation(),
                onFocusChange = { if (it) amount = "" }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Duration Input Field
            PremiumTextField(
                value = duration,
                onValueChange = { 
                    duration = it
                    selectedDurationChip = it.toIntOrNull()
                },
                label = stringResource(id = R.string.enter_duration),
                leadingIcon = {
                    Icon(
                        Icons.Default.DateRange,
                        contentDescription = null,
                        tint = Emerald500
                    )
                },
                suffix = {
                    Text(
                        "gün",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onFocusChange = { if (it) duration = "" }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Quick Duration Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                durationPresets.forEach { days ->
                    val isSelected = duration == days.toString()
                    DurationChip(
                        days = days,
                        isSelected = isSelected,
                        onClick = {
                            duration = days.toString()
                            selectedDurationChip = days
                        }
                    )
                }
            }



            // Real-time Value Date Warning (16:00 Rule)
            val calendar = Calendar.getInstance()
            val hour = calendar.get(Calendar.HOUR_OF_DAY)
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
            val isDelayed = hour >= 16 || dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY
            
            if (isDelayed) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Valör Uyarısı",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                            Text(
                                text = "Hafta sonu veya saat 16:00 sonrası açılan hesaplarda paranız hemen bloke edilir, ancak faiz ilk iş günü işlemeye başlar.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Main Action Button with gradient and shimmer
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .scale(buttonScale)
                    .shadow(
                        elevation = 12.dp,
                        shape = RoundedCornerShape(16.dp),
                        ambientColor = Emerald500.copy(alpha = 0.4f),
                        spotColor = Emerald500.copy(alpha = 0.4f)
                    )
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(Emerald600, Emerald500, TealGradient)
                        )
                    )
                    .clickable {
                        isButtonPressed = true
                        checkAndNavigate()
                    },
                contentAlignment = Alignment.Center
            ) {
                // Shimmer overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.White.copy(alpha = 0.2f),
                                    Color.Transparent
                                ),
                                start = Offset(shimmerOffset, 0f),
                                end = Offset(shimmerOffset + 200f, 0f)
                            )
                        )
                )
                
                Text(
                    text = stringResource(id = R.string.find_rates).uppercase(),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    ),
                    color = Color.White
                )
            }

            // Reset button press state
            LaunchedEffect(isButtonPressed) {
                if (isButtonPressed) {
                    kotlinx.coroutines.delay(150)
                    isButtonPressed = false
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            
            AdBanner()
        }
    }
}

@Composable
fun PremiumTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    leadingIcon: @Composable (() -> Unit)? = null,
    suffix: @Composable (() -> Unit)? = null,
    visualTransformation: androidx.compose.ui.text.input.VisualTransformation = androidx.compose.ui.text.input.VisualTransformation.None,
    onFocusChange: (Boolean) -> Unit = {}
) {
    var isFocused by remember { mutableStateOf(false) }
    
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = if (isFocused) 8.dp else 2.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = if (isFocused) Emerald500.copy(alpha = 0.2f) else Color.Transparent
            ),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = if (isFocused) {
            ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                brush = Brush.linearGradient(listOf(Emerald500, TealGradient))
            )
        } else null
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { 
                Text(
                    label,
                    color = if (isFocused) Emerald500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                ) 
            },
            leadingIcon = leadingIcon,
            suffix = suffix,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            visualTransformation = visualTransformation,
            singleLine = true,
            textStyle = TextStyle(
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color.Transparent,
                unfocusedBorderColor = Color.Transparent,
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                cursorColor = Emerald500
            ),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { 
                    isFocused = it.isFocused
                    onFocusChange(it.isFocused)
                }
        )
    }
}

@Composable
fun DurationChip(
    days: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "chipScale"
    )
    
    Surface(
        modifier = Modifier
            .scale(scale)
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) Emerald500 else MaterialTheme.colorScheme.surfaceVariant,
        border = if (!isSelected) ButtonDefaults.outlinedButtonBorder(enabled = true) else null,
        shadowElevation = if (isSelected) 4.dp else 0.dp
    ) {
        Text(
            text = "$days",
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
            ),
            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
        )
    }
}
