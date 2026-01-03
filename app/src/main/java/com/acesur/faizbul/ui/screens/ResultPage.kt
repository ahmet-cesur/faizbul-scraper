package com.acesur.faizbul.ui.screens

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.acesur.faizbul.R
import com.acesur.faizbul.util.HolidayUtils
import com.acesur.faizbul.data.InterestRate
import com.acesur.faizbul.data.ScraperSpec
import com.acesur.faizbul.ui.components.AdBanner
import com.acesur.faizbul.ui.components.RateFetcher
import com.acesur.faizbul.ui.viewmodels.ResultViewModel
import com.acesur.faizbul.ui.theme.*

import com.acesur.faizbul.data.ScraperResultState
import com.acesur.faizbul.data.ScraperStatus
import com.acesur.faizbul.data.ScraperScripts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.window.Dialog
import org.json.JSONObject
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultPage(
    navController: NavController, 
    amount: String, 
    duration: String,
    viewModel: ResultViewModel = viewModel()
) {
    val context = LocalContext.current
    val inputAmount = amount.toDoubleOrNull() ?: 0.0
    val durationDays = duration.toIntOrNull() ?: 30

    LaunchedEffect(Unit) {
        viewModel.initScrapers(context, inputAmount, durationDays)
    }

    // Local scraping component removed - only reading Google Sheets now

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        stringResource(R.string.results_title),
                        fontWeight = FontWeight.Bold
                    ) 
                },
                navigationIcon = {
                    IconButton(
                        onClick = { navController.popBackStack() },
                        modifier = Modifier
                            .padding(8.dp)
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                RoundedCornerShape(12.dp)
                            )
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri")
                    }
                },
                actions = {
                    val isRefreshing by viewModel.isRefreshing
                    if (isRefreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(end = 16.dp).size(24.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        IconButton(
                            onClick = { viewModel.refreshFromSheet(context, inputAmount, durationDays) },
                            modifier = Modifier
                                .padding(end = 8.dp)
                                .background(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                    RoundedCornerShape(12.dp)
                                )
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Yenile", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues).fillMaxSize().padding(16.dp)) {
            
            // Date Info Section
            DateInfoBanner(durationDays)
            
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = String.format(java.util.Locale.getDefault(), stringResource(R.string.search_header_format), inputAmount, durationDays),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
            }

            val sortedResults = viewModel.resultsMap.values.sortedWith(
                compareBy<ScraperResultState> { 
                    when(it.status) {
                        ScraperStatus.SUCCESS -> 0
                        ScraperStatus.WORKING -> 1
                        ScraperStatus.WAITING -> 2
                        ScraperStatus.FAILED -> 3
                    }
                }.thenByDescending { it.rate?.earnings ?: 0.0 }
            )

            if (sortedResults.isEmpty()) {
                EmptyStateView()
            } else {
                LazyColumn(modifier = Modifier.weight(1f)) {
                    val firstSuccess = sortedResults.firstOrNull { it.status == ScraperStatus.SUCCESS }
                    itemsIndexed(items = sortedResults, key = { _, item -> item.spec.name }) { index, resultState ->
                        // Direct render without animation for debugging
                        ResultCard(
                            state = resultState,
                            amount = inputAmount,
                            durationDays = durationDays,
                            isBestDeal = resultState == firstSuccess,
                            onRetry = { viewModel.retryScraper(resultState.spec) }
                        )
                    }

                    // Champion/Best in Session Card - Hidden
                    // Uncomment below to show the best rate card at the bottom
                    /*
                    val sessionBest = viewModel.resultsMap.values
                        .filter { it.status == ScraperStatus.SUCCESS || it.lastSuccessfulRate != null }
                        .mapNotNull { 
                            it.rate ?: if (it.lastSuccessfulRate != null) {
                                val calc = viewModel.calculateDetailedEarnings(inputAmount, it.lastSuccessfulRate, durationDays)
                                InterestRate(
                                    it.spec.bankName, 
                                    it.spec.description, 
                                    it.lastSuccessfulRate, 
                                    calc.net, 
                                    grossEarnings = calc.gross,
                                    taxRate = calc.taxRate,
                                    url = it.spec.url
                                )
                            } else null 
                        }
                        .maxByOrNull { it.rate }

                    if (sessionBest != null) {
                        item {
                            SessionBestCard(sessionBest)
                        }
                    }
                    */
                }
            }
            
            AdBanner()
        }
    }
}

// Helper function to format rate with exactly 2 decimal places
private fun formatRate(rate: Double): String {
    val symbols = DecimalFormatSymbols(java.util.Locale.forLanguageTag("tr-TR"))
    // Change to "0.00" to always show 2 decimal places as requested
    val df = DecimalFormat("0.00", symbols)
    return "%" + df.format(rate)
}

// Animated card entrance wrapper with staggered delay
@Composable
fun AnimatedCardWrapper(
    index: Int,
    content: @Composable () -> Unit
) {
    var isVisible by remember { mutableStateOf(false) }
    
    // Trigger animation after a staggered delay based on index
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(index * 80L) // 80ms delay per card
        isVisible = true
    }
    
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(
            initialOffsetY = { it / 2 },
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        ) + fadeIn(
            animationSpec = tween(durationMillis = 300)
        ),
        exit = slideOutVertically(
            targetOffsetY = { -it / 4 },
            animationSpec = tween(durationMillis = 200)
        ) + fadeOut()
    ) {
        content()
    }
}

@Composable
fun SessionBestCard(rate: InterestRate) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Star, 
                    contentDescription = null, 
                    tint = Color(0xFFFFD700), // Gold
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "GÜNÜN ŞAMPİYON ORANI",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text(rate.bankName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                    Text(rate.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
                }
                val formattedRate = formatRate(rate.rate)
                Text(formattedRate, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black)
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
            Button(
                onClick = { uriHandler.openUri(rate.url) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = MaterialTheme.shapes.medium
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Şampiyon Oranı Almak İçin Siteye Git", style = MaterialTheme.typography.labelLarge)
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.label_amount_bracket), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    Text("1.000 TL - 10.000.000 TL", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.label_duration_bracket), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    Text("32 - 400 Gün", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun ResultCard(state: ScraperResultState, amount: Double, durationDays: Int, isBestDeal: Boolean, onRetry: () -> Unit) {
    val isDarkTheme = MaterialTheme.colorScheme.background == NavyDark
    
    val brandColor = when {
        state.spec.bankName.contains("Garanti") -> if (isDarkTheme) GarantiGreenDark else GarantiGreen
        state.spec.bankName.contains("Enpara") -> if (isDarkTheme) EnparaPurpleDark else EnparaPurple
        state.spec.bankName.contains("Akbank") -> if (isDarkTheme) AkbankRedDark else AkbankRed
        state.spec.bankName.contains("Yapı Kredi") -> if (isDarkTheme) YapiKrediBlueDark else YapiKrediBlue
        state.spec.bankName.contains("İş Bankası") -> if (isDarkTheme) IsBankasiBlueDark else IsBankasiBlue
        state.spec.bankName.contains("Ziraat") -> if (isDarkTheme) ZiraatRedDark else ZiraatRed
        state.spec.bankName.contains("Halkbank") -> if (isDarkTheme) HalkbankBlueDark else HalkbankBlue
        state.spec.bankName.contains("Vakıf") -> if (isDarkTheme) VakifbankGoldDark else VakifbankGold
        state.spec.bankName.contains("Alternatif") -> if (isDarkTheme) AlternatifMaroonDark else AlternatifMaroon
        state.spec.bankName.contains("Odeabank") -> if (isDarkTheme) OdeabankDark else OdeabankBlack
        state.spec.bankName.contains("Denizbank") || state.spec.bankName.contains("DenizBank") -> if (isDarkTheme) DenizbankBlueDark else DenizbankBlue
        state.spec.bankName.contains("Fibabanka") -> if (isDarkTheme) FibabankaNavyDark else FibabankaNavy
        else -> if (isDarkTheme) Emerald400 else Emerald500
    }

    var isExpanded by remember { mutableStateOf(false) }
    var showTableDialog by remember { mutableStateOf(false) }

    val hasHistory = state.lastSuccessfulRate != null && state.lastSuccessfulTimestamp != null
    
    // Check if days are out of table bounds
    val daysOutOfBounds = remember(state.cachedTableJson, durationDays) {
        if (state.cachedTableJson == null) return@remember null
        try {
            val json = org.json.JSONObject(state.cachedTableJson)
            val rows = json.getJSONArray("rows")
            var minDaysInTable = Int.MAX_VALUE
            var maxDaysInTable = Int.MIN_VALUE
            
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                val minDays = row.optInt("minDays", Int.MAX_VALUE)
                val maxDays = row.optInt("maxDays", Int.MIN_VALUE)
                if (minDays < minDaysInTable) minDaysInTable = minDays
                if (maxDays > maxDaysInTable) maxDaysInTable = maxDays
            }
            
            when {
                durationDays < minDaysInTable -> "Vade çok kısa (min: $minDaysInTable gün)"
                durationDays > maxDaysInTable && maxDaysInTable < 99999 -> "Vade çok uzun (max: $maxDaysInTable gün)"
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }

    // Determine if card should show "stale" yellow styling
    val isShowingCachedData = state.isUsingCachedRate || (state.status == ScraperStatus.FAILED && hasHistory)
    
    // Shimmer animation for WORKING status
    val isActivelyWorking = state.status == ScraperStatus.WORKING
    val shimmerTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerAlpha by shimmerTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmerAlpha"
    )
    
    // Animated border color for working state
    val borderColor = when {
        isActivelyWorking -> brandColor.copy(alpha = shimmerAlpha)
        // isShowingCachedData -> brandColor // Use brand color even for stale logic (implied by default fallthrough if we consider it success-like)
        isShowingCachedData -> brandColor
        state.status == ScraperStatus.SUCCESS -> brandColor
        else -> brandColor.copy(alpha = 0.3f)
    }

    // Contrast-aware text colors
    val cardContentColor = when {
        isShowingCachedData && !isDarkTheme -> Color.Black
        isDarkTheme -> Color.White
        else -> Color.Black
    }
    val cardSecondaryColor = cardContentColor.copy(alpha = 0.7f)
    val cardOutlineColor = cardContentColor.copy(alpha = 0.5f)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .shadow(
                elevation = if (isBestDeal && (state.status == ScraperStatus.SUCCESS || isShowingCachedData)) 16.dp else 4.dp,
                shape = RoundedCornerShape(20.dp),
                ambientColor = if (isBestDeal) Amber500.copy(alpha = 0.3f) else brandColor.copy(alpha = 0.15f),
                spotColor = if (isBestDeal) Amber500.copy(alpha = 0.3f) else brandColor.copy(alpha = 0.15f)
            )
            .then(if (state.rate != null) Modifier.clickable { isExpanded = !isExpanded } else Modifier),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isShowingCachedData && !isDarkTheme) Color(0xFFFFF9C4) else MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = if (isActivelyWorking) 2.dp else if (isBestDeal && (state.status == ScraperStatus.SUCCESS || isShowingCachedData)) 2.dp else 1.dp, 
            brush = if (isBestDeal && (state.status == ScraperStatus.SUCCESS || isShowingCachedData)) {
                Brush.linearGradient(listOf(Amber500, Amber400))
            } else {
                Brush.linearGradient(listOf(borderColor, borderColor))
            }
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // "En İyi" tag with premium styling
            if (isBestDeal && (state.status == ScraperStatus.SUCCESS || isShowingCachedData)) {
                Surface(
                    color = Color.Transparent,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .padding(bottom = 8.dp)
                        .background(
                            brush = Brush.linearGradient(listOf(Amber500, Amber400)),
                            shape = RoundedCornerShape(8.dp)
                        )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🏆", style = MaterialTheme.typography.labelSmall)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.best_deal),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.Black,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            // "Geçmiş Oran" (Cached) tag for yellow cards
            if (isShowingCachedData) {
                Row(
                    modifier = Modifier.padding(bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color(0xFFFFB300), // Amber
                        shape = MaterialTheme.shapes.extraSmall
                    ) {
                        Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
                            Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color.Black)
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "Eski Veri",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.Black,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    if (state.tableTimestamp != null) {
                        val dateStr = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(state.tableTimestamp))
                        Text(
                            text = " • Son Güncelleme: $dateStr",
                            style = MaterialTheme.typography.labelSmall,
                            color = cardSecondaryColor
                        )
                    }
                }
            }
            
            // Days out of bounds warning
            if (daysOutOfBounds != null && state.cachedTableJson != null) {
                Surface(
                    color = Color(0xFFFF5722), // Orange
                    shape = MaterialTheme.shapes.extraSmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
                        Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color.White)
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = daysOutOfBounds,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            
            // Layout (unified)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = state.spec.bankName, 
                        style = MaterialTheme.typography.titleMedium, 
                        fontWeight = FontWeight.Bold,
                        color = cardContentColor
                    )
                    Text(
                        text = state.spec.description, 
                        style = MaterialTheme.typography.bodySmall,
                        color = cardSecondaryColor
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        if (state.tableTimestamp != null) {
                            val now = System.currentTimeMillis()
                            val timestampDate = java.util.Date(state.tableTimestamp)
                            val todayStart = java.util.Calendar.getInstance().apply {
                                set(java.util.Calendar.HOUR_OF_DAY, 0)
                                set(java.util.Calendar.MINUTE, 0)
                                set(java.util.Calendar.SECOND, 0)
                                set(java.util.Calendar.MILLISECOND, 0)
                            }.timeInMillis
                            val yesterdayStart = todayStart - 24 * 60 * 60 * 1000
                            
                            val timeFormat = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                            val dateFormat = java.text.SimpleDateFormat("dd.MM.yyyy", java.util.Locale.getDefault())
                            
                            val updateText = when {
                                state.tableTimestamp >= todayStart -> "Bugün ${timeFormat.format(timestampDate)}"
                                state.tableTimestamp >= yesterdayStart -> "Dün ${timeFormat.format(timestampDate)}"
                                else -> "${dateFormat.format(timestampDate)} ${timeFormat.format(timestampDate)}"
                            }
                            
                            Text(
                                text = "Güncelleme: $updateText",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isShowingCachedData && !isDarkTheme) Color(0xFF616161) else cardOutlineColor
                            )
                        }
                    }
                }
                
                // Right side (Current rate)
                when (state.status) {
                    ScraperStatus.WORKING -> {
                        Column(horizontalAlignment = Alignment.End) {
                            if (state.rate != null) {
                                // Show cached rate while updating
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    val formattedRate = formatRate(state.rate.rate)
                                    Text(formattedRate, style = MaterialTheme.typography.titleLarge, color = cardContentColor, fontWeight = FontWeight.Bold)
                                    Icon(if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, contentDescription = null, tint = cardContentColor)
                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                    color = cardContentColor.copy(alpha = shimmerAlpha)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Güncelleniyor...",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = cardContentColor.copy(alpha = shimmerAlpha)
                                )
                            }
                        }
                    }
                    ScraperStatus.SUCCESS -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val formattedRate = formatRate(state.rate?.rate ?: 0.0)
                            Text(formattedRate, style = MaterialTheme.typography.titleLarge, color = cardContentColor, fontWeight = FontWeight.Bold)
                            Icon(if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, contentDescription = null, tint = cardContentColor)
                        }
                    }
                    ScraperStatus.FAILED -> {
                        if (state.rate != null) {
                            // We have a calculated cached rate - treat mostly like success but with valid brand colors
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                val formattedRate = formatRate(state.rate.rate)
                                Text(formattedRate, style = MaterialTheme.typography.titleLarge, color = cardContentColor, fontWeight = FontWeight.Bold)
                                Icon(if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, contentDescription = null, tint = cardContentColor)
                            }
                        } else if (hasHistory) {
                            // History but no detailed calculation (shouldn't happen with new logic, but fallback)
                            val formattedRate = formatRate(state.lastSuccessfulRate ?: 0.0)
                            Text(formattedRate, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        }
                    }
                    ScraperStatus.WAITING -> {
                        Column(horizontalAlignment = Alignment.End) {
                            if (hasHistory) {
                                val formattedRate = formatRate(state.lastSuccessfulRate ?: 0.0)
                                Text(formattedRate, style = MaterialTheme.typography.titleLarge, color = if (isShowingCachedData && !isDarkTheme) Color.Black.copy(0.4f) else cardOutlineColor, fontWeight = FontWeight.Bold)
                            }
                            Text(
                                text = "Sırada...",
                                style = MaterialTheme.typography.labelSmall,
                                color = cardSecondaryColor
                            )
                        }
                    }
                }
            }
            
            // Error / History Timestamp Row (Only for actual failures without cache fallback that looks good)
            if (state.status == ScraperStatus.FAILED && state.rate == null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(state.errorMessage ?: stringResource(R.string.status_failed), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                
                if (hasHistory) {
                    val dateStr = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(state.lastSuccessfulTimestamp!!))
                    Text("Son başarılı: $dateStr", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                }

                Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
                    OutlinedButton(onClick = { uriHandler.openUri(state.spec.url) }) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Siteye Git", style = MaterialTheme.typography.labelMedium)
                    }
                }
            } else if ((state.status == ScraperStatus.WORKING || state.status == ScraperStatus.WAITING) && hasHistory && state.rate == null) {
                // Secondary indication during loading (if we don't have a rate object yet)
                val dateStr = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(state.lastSuccessfulTimestamp!!))
                Text("Geçmiş oran yükleniyor... ($dateStr)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), modifier = Modifier.padding(top = 4.dp))
            }

            AnimatedVisibility(visible = isExpanded && state.rate != null) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    HorizontalDivider(color = brandColor.copy(alpha = 0.1f))
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    val gross = state.rate?.grossEarnings ?: 0.0
                    val taxRate = state.rate?.taxRate ?: 0.0
                    val net = state.rate?.earnings ?: 0.0
                    // Use brand color for display to match success look
                    val displayColor = brandColor
                    
                    DetailRow(stringResource(R.string.label_gross_earnings), String.format(java.util.Locale.getDefault(), "%,.2f TL", gross), color = cardContentColor)
                    DetailRow(stringResource(R.string.label_tax_rate), formatRate(taxRate * 100), color = cardContentColor)
                    DetailRow(stringResource(R.string.label_net_earnings), String.format(java.util.Locale.getDefault(), "%,.2f TL", net), color = cardContentColor)
                    DetailRow(stringResource(R.string.label_total), String.format(java.util.Locale.getDefault(), "%,.2f TL", amount + net), color = cardContentColor, isBold = true)
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
                    
                    // View Table button (if table data exists)
                    if (state.cachedTableJson != null) {
                        OutlinedButton(
                            onClick = { showTableDialog = true },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = displayColor),
                            border = androidx.compose.foundation.BorderStroke(1.dp, displayColor.copy(alpha = 0.5f))
                        ) {
                            Icon(Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Faiz Tablosunu Görüntüle", style = MaterialTheme.typography.labelLarge)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    // Website link button
                    OutlinedButton(
                        onClick = { uriHandler.openUri(state.spec.url) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = displayColor),
                        border = androidx.compose.foundation.BorderStroke(1.dp, displayColor.copy(alpha = 0.5f))
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(if (isShowingCachedData) "Güncel Oranı Kontrol Et" else "Bankanın Web Sitesine Git", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
    
    // Table Dialog
    if (showTableDialog && state.cachedTableJson != null) {
        RateTableDialog(
            bankName = state.spec.bankName,
            tableJson = state.cachedTableJson,
            amount = amount,
            durationDays = durationDays,
            onDismiss = { showTableDialog = false }
        )
    }
}

@Composable
fun DetailRow(label: String, value: String, color: Color = Color.Unspecified, isBold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = if (color == Color.Unspecified) MaterialTheme.colorScheme.onSurface else color)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = if (color == Color.Unspecified) MaterialTheme.colorScheme.onSurface else color, fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal)
    }
}

@Composable
fun ShimmerRow(brandColor: Color) {
    val transition = rememberInfiniteTransition()
    val translateAnim by transition.animateFloat(
        initialValue = 0f, targetValue = 1000f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Restart)
    )
    val brush = Brush.linearGradient(
        colors = listOf(Color.LightGray.copy(0.3f), Color.LightGray.copy(0.1f), Color.LightGray.copy(0.3f)),
        start = Offset.Zero, end = Offset(translateAnim, translateAnim)
    )
    Column {
        Box(modifier = Modifier.fillMaxWidth(0.5f).height(20.dp).background(brush))
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.fillMaxWidth(0.8f).height(12.dp).background(brush))
    }
}

@Composable
fun EmptyStateView() {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
        Spacer(modifier = Modifier.height(16.dp))
        Text(stringResource(R.string.status_failed), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.outline)
    }
}

@Composable
fun RateTableDialog(
    bankName: String,
    tableJson: String,
    amount: Double,
    durationDays: Int,
    onDismiss: () -> Unit
) {
    // Data classes for structured table data
    data class HeaderData(val label: String, val minAmount: Double?, val maxAmount: Double?)
    data class RowData(val label: String, val minDays: Int?, val maxDays: Int?, val rates: List<Double?>)
    
    // Parse JSON with min/max values for matching
    val tableData = remember(tableJson) {
        try {
            val json = JSONObject(tableJson)
            val headersArray = json.getJSONArray("headers")
            val headers = (0 until headersArray.length()).map { i ->
                try {
                    val headerObj = headersArray.getJSONObject(i)
                    HeaderData(
                        label = headerObj.optString("label", ""),
                        minAmount = if (headerObj.has("minAmount")) headerObj.getDouble("minAmount") else null,
                        maxAmount = if (headerObj.has("maxAmount")) headerObj.getDouble("maxAmount") else null
                    )
                } catch (e: Exception) {
                    HeaderData(label = headersArray.getString(i), minAmount = null, maxAmount = null)
                }
            }
            
            val rowsArray = json.getJSONArray("rows")
            val rows = (0 until rowsArray.length()).map { i ->
                val rowObj = rowsArray.getJSONObject(i)
                val label = if (rowObj.has("label")) rowObj.getString("label") 
                           else if (rowObj.has("duration")) rowObj.getString("duration")
                           else {
                               val min = if (rowObj.has("minDays")) rowObj.getInt("minDays") else 0
                               val max = if (rowObj.has("maxDays")) rowObj.getInt("maxDays") else 0
                               if (min == max) "$min gün" else "$min - $max gün"
                           }
                val minDays = if (rowObj.has("minDays") && !rowObj.isNull("minDays")) rowObj.getInt("minDays") else null
                val maxDays = if (rowObj.has("maxDays") && !rowObj.isNull("maxDays")) rowObj.getInt("maxDays") else null
                val ratesArray = rowObj.getJSONArray("rates")
                val rates = (0 until ratesArray.length()).map { j ->
                    if (ratesArray.isNull(j)) null else ratesArray.getDouble(j)
                }
                RowData(label, minDays, maxDays, rates)
            }
            Pair(headers, rows)
        } catch (e: Exception) {
            null
        }
    }
    
    // Find matching column and row indices using "highest min <= input" logic
    // This MUST match the logic used in ScraperSpec.kt scripts
    var bestMinAmount = -1.0
    var bestColIdx = -1
    tableData?.first?.forEachIndexed { index, header ->
        if (header.minAmount != null && header.minAmount <= amount && header.minAmount > bestMinAmount) {
            bestMinAmount = header.minAmount
            bestColIdx = index
        }
    }
    val matchingColIndex = bestColIdx
    
    var bestMinDays = -1
    var bestRowIdx = -1
    tableData?.second?.forEachIndexed { index, row ->
        if (row.minDays != null && row.minDays <= durationDays && row.minDays > bestMinDays) {
            bestMinDays = row.minDays
            bestRowIdx = index
        }
    }
    val matchingRowIndex = bestRowIdx
    
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f) // Limit height to 85% of screen
                .padding(8.dp),
            shape = MaterialTheme.shapes.large,
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "$bankName Faiz Tablosu",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        val amountStr = java.text.DecimalFormat("#,###", java.text.DecimalFormatSymbols(java.util.Locale.forLanguageTag("tr-TR"))).format(amount)
                        Text(
                            text = "Sorgu: $amountStr TL • $durationDays Gün",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Kapat")
                    }
                }
                
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                
                if (tableData != null) {
                    val (headers, rows) = tableData
                    val hScrollState = rememberScrollState()
                    val vScrollState = rememberScrollState()
                    
                    // Highlight colors
                    val isDark = MaterialTheme.colorScheme.background == NavyDark
                    val highlightColor = if (isDark) Emerald400 else Color(0xFF4CAF50)
                    val highlightBgColor = if (isDark) Emerald700.copy(alpha = 0.4f) else Color(0xFFE8F5E9)
                    
                    // Scrollable table
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(hScrollState)
                    ) {
                        Column(
                            modifier = Modifier.verticalScroll(vScrollState)
                        ) {
                            // Header row
                            Row(
                                modifier = Modifier.background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
                            ) {
                                // Duration header
                                Text(
                                    text = "Vade",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.width(100.dp).padding(8.dp)
                                )
                                // Amount headers
                                headers.forEachIndexed { index, header ->
                                    val isMatchingCol = index == matchingColIndex
                                    Text(
                                        text = header.label,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = if (isMatchingCol) FontWeight.ExtraBold else FontWeight.Bold,
                                        color = if (isMatchingCol) highlightColor else Color.Unspecified,
                                        modifier = Modifier
                                            .width(90.dp)
                                            .background(if (isMatchingCol) highlightBgColor else Color.Transparent)
                                            .padding(8.dp)
                                    )
                                }
                            }
                            
                            // Data rows
                            rows.forEachIndexed { rowIndex, row ->
                                val isMatchingRow = rowIndex == matchingRowIndex
                                Row(
                                    modifier = Modifier.background(
                                        when {
                                            isMatchingRow -> highlightBgColor.copy(alpha = 0.5f)
                                            rowIndex % 2 == 0 -> Color.Transparent 
                                            else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                        }
                                    )
                                ) {
                                    // Duration cell
                                    Text(
                                        text = row.label,
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = if (isMatchingRow) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isMatchingRow) highlightColor else MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.width(100.dp).padding(8.dp)
                                    )
                                    // Rate cells
                                    row.rates.forEachIndexed { colIndex, rate ->
                                        val isHighlightedCell = colIndex == matchingColIndex && isMatchingRow
                                        Text(
                                            text = if (rate != null) formatRate(rate) else "-",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = if (isHighlightedCell) FontWeight.ExtraBold else FontWeight.Normal,
                                            color = if (isHighlightedCell) Color.White else MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier
                                                .width(90.dp)
                                                .background(
                                                    if (isHighlightedCell) highlightColor 
                                                    else if (colIndex == matchingColIndex) highlightBgColor.copy(alpha = 0.3f)
                                                    else Color.Transparent
                                                )
                                                .padding(8.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Text(
                        text = "Tablo verisi yüklenemedi",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}
data class DateInfo(
    val valorDate: String,
    val maturityDate: String,
    val isDelayed: Boolean, // True if after 16:00 or weekend
    val reason: String? = null
)

@Composable
fun DateInfoBanner(durationDays: Int) {
    val dateInfo = remember(durationDays) { calculateDates(durationDays) }
    
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.DateRange, 
                    contentDescription = null, 
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.width(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Valör: ",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = dateInfo.valorDate,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(Modifier.width(16.dp))
                    Text(
                        text = "Vade Sonu: ",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = dateInfo.maturityDate,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
            if (dateInfo.isDelayed && dateInfo.reason != null) {
                Text(
                    text = dateInfo.reason,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 4.dp, start = 32.dp)
                )
            }
        }
    }
}


fun calculateDates(durationDays: Int): DateInfo {
    val now = java.util.Calendar.getInstance()
    val hour = now.get(java.util.Calendar.HOUR_OF_DAY)
    
    val valorDate = now.clone() as java.util.Calendar
    
    // Check if it's past 16:00 or it's a holiday (including weekends)
    val isAfter16 = hour >= 16
    val isTodayHoliday = HolidayUtils.isHoliday(now)
    val isDelayed = isAfter16 || isTodayHoliday
    
    if (isDelayed) {
        // Find next business day
        do {
            valorDate.add(java.util.Calendar.DAY_OF_MONTH, 1)
        } while (HolidayUtils.isHoliday(valorDate))
    }
    
    val maturityDate = valorDate.clone() as java.util.Calendar
    maturityDate.add(java.util.Calendar.DAY_OF_MONTH, durationDays)
    
    val sdf = java.text.SimpleDateFormat("dd.MM.yyyy", java.util.Locale.getDefault())
    return DateInfo(
        valorDate = sdf.format(valorDate.time),
        maturityDate = sdf.format(maturityDate.time),
        isDelayed = isDelayed
    )
}
