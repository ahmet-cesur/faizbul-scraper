package com.acesur.faizbul.ui.viewmodels

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.acesur.faizbul.data.InterestRate
import com.acesur.faizbul.data.ScraperResultState
import com.acesur.faizbul.data.ScraperSpec
import com.acesur.faizbul.data.ScraperStatus
import com.acesur.faizbul.data.ScraperScripts
import kotlinx.coroutines.launch
import org.json.JSONObject

class ResultViewModel : ViewModel() {
    val resultsMap = mutableStateMapOf<String, ScraperResultState>()
    val executionQueue = mutableStateListOf<ScraperSpec>()
    val retryCounts = mutableStateMapOf<String, Int>()
    
    var isInitialized = false
    var isAppInBackground = false // This would ideally be updated by Lifecycle observer

    fun initScrapers(context: android.content.Context, amount: Double, days: Int) {
        if (isInitialized) return
        isInitialized = true
        
        val prefs = context.getSharedPreferences("scraper_prefs", android.content.Context.MODE_PRIVATE)
        val allScrapers = ScraperSpec.allScrapers.filter { spec ->
            prefs.getBoolean(spec.name, true)
        }
        
        android.util.Log.d("FaizBul", "Initializing ${allScrapers.size} scrapers")
        
        // Calculate start of today for stale check
        val calendar = java.util.Calendar.getInstance()
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0)
        calendar.set(java.util.Calendar.MINUTE, 0)
        calendar.set(java.util.Calendar.SECOND, 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        val todayStart = calendar.timeInMillis

        // IMMEDIATELY add all scrapers to resultsMap with WAITING status
        // This ensures all cards appear in the UI right away
        allScrapers.forEach { spec ->
            resultsMap[spec.name] = ScraperResultState(
                spec = spec,
                status = ScraperStatus.WAITING,
                rate = null
            )
        }
        
        android.util.Log.d("FaizBul", "Added ${resultsMap.size} scrapers to resultsMap immediately")

        // Then launch coroutine to load cached data and build queue
        viewModelScope.launch {
            val scrapersToQueue = mutableListOf<ScraperSpec>()
            
            allScrapers.forEach { spec ->
                android.util.Log.d("FaizBul", "Processing scraper: ${spec.name}")
                
                val lastHistory = com.acesur.faizbul.FaizBulApp.database.rateHistoryDao()
                    .getLastRate(spec.bankName, spec.description)
                val cachedTable = com.acesur.faizbul.FaizBulApp.database.rateTableDao()
                    .getTable(spec.name)
                
                val isStale = cachedTable == null || cachedTable.timestamp < todayStart
                
                // Best source of truth is the cached table, matched against CURRENT inputs
                var rateToUse: Double? = null
                if (cachedTable != null) {
                    rateToUse = extractRateFromTable(cachedTable.tableJson, amount, days)
                }
                
                // Fallback to last successful rate if table matching failed
                if (rateToUse == null) {
                    rateToUse = lastHistory?.rate
                }

                val cachedRate = if (rateToUse != null) {
                    val calc = calculateDetailedEarnings(amount, rateToUse, days)
                    InterestRate(
                        bankName = spec.bankName,
                        description = spec.description,
                        rate = rateToUse,
                        earnings = calc.net,
                        grossEarnings = calc.gross,
                        taxRate = calc.taxRate,
                        url = spec.url
                    )
                } else null
                
                // Update with cached data if available
                resultsMap[spec.name] = ScraperResultState(
                    spec = spec,
                    status = if (cachedRate != null && !isStale) ScraperStatus.SUCCESS else ScraperStatus.WAITING,
                    rate = cachedRate,
                    lastSuccessfulRate = lastHistory?.rate,
                    lastSuccessfulTimestamp = lastHistory?.timestamp,
                    cachedTableJson = cachedTable?.tableJson,
                    tableTimestamp = cachedTable?.timestamp,
                    isUsingCachedRate = cachedRate != null && isStale
                )
                
                android.util.Log.d("FaizBul", "Updated ${spec.name}, status=${if (cachedRate != null && !isStale) "SUCCESS" else "WAITING"}")
                
                // Queue stale or missing tables for update
                if (isStale) {
                    scrapersToQueue.add(spec)
                }
            }
            
            android.util.Log.d("FaizBul", "Final ResultsMap size: ${resultsMap.size}, Queue size: ${scrapersToQueue.size}")
            
            // Shuffle and add stale scrapers to queue
            executionQueue.addAll(scrapersToQueue.shuffled())
        }
    }
    
    // Mark the current scraper as actively working
    fun markAsWorking(spec: ScraperSpec) {
        val current = resultsMap[spec.name]
        if (current != null && (current.status == ScraperStatus.WAITING || 
            (current.status == ScraperStatus.SUCCESS && current.isUsingCachedRate))) {
            resultsMap[spec.name] = current.copy(status = ScraperStatus.WORKING)
        }
    }

    fun onRateFound(context: android.content.Context, spec: ScraperSpec, result: com.acesur.faizbul.ui.components.ScraperResult, amount: Double, days: Int) {
        viewModelScope.launch {
            val rate = result.rate
            val tableJson = result.tableJson
            val errorCode = result.errorCode
            
            if (rate != null && rate.rate >= 0) {
                val r = rate.rate
                val calc = calculateDetailedEarnings(amount, r, days)
                val finalRate = rate.copy(
                    earnings = calc.net,
                    grossEarnings = calc.gross,
                    taxRate = calc.taxRate
                )
                
                val now = System.currentTimeMillis()
                resultsMap[spec.name] = resultsMap[spec.name]!!.copy(
                    status = ScraperStatus.SUCCESS,
                    rate = finalRate,
                    cachedTableJson = tableJson ?: resultsMap[spec.name]?.cachedTableJson,
                    tableTimestamp = if (tableJson != null) now else resultsMap[spec.name]?.tableTimestamp,
                    isUsingCachedRate = false,
                    errorCode = null,
                    errorMessage = null
                )
                
                // Persistence - Rate History
                com.acesur.faizbul.FaizBulApp.database.rateHistoryDao().insert(
                    com.acesur.faizbul.data.local.RateHistory(
                        bankName = spec.bankName,
                        description = spec.description,
                        rate = r,
                        amount = amount,
                        duration = days
                    )
                )
                
                // Persistence - Table Data
                if (tableJson != null) {
                    com.acesur.faizbul.FaizBulApp.database.rateTableDao().insertOrUpdate(
                        com.acesur.faizbul.data.local.RateTable(
                            scraperName = spec.name,
                            bankName = spec.bankName,
                            tableJson = tableJson,
                            timestamp = now
                        )
                    )
                }

                // Notification if background logic (simplified)
                if (isAppInBackground) {
                    com.acesur.faizbul.util.NotificationHelper.showResultNotification(context, spec.bankName, r)
                }

                removeFromQueue(spec)
            } else {
                handleFailure(spec, amount, days, errorCode)
            }
        }
    }

    private suspend fun handleFailure(spec: ScraperSpec, amount: Double, days: Int, errorCode: com.acesur.faizbul.data.ScraperError? = null) {
        val currentRetry = retryCounts[spec.name] ?: 0
        if (currentRetry < 4) {
            retryCounts[spec.name] = currentRetry + 1
            if (executionQueue.isNotEmpty() && executionQueue.first() == spec) {
                executionQueue.removeFirst()
                executionQueue.add(spec)
                resultsMap[spec.name] = resultsMap[spec.name]!!.copy(status = ScraperStatus.WAITING)
            }
        } else {
            val lastHistory = com.acesur.faizbul.FaizBulApp.database.rateHistoryDao()
                .getLastRate(spec.bankName, spec.description)
            val cachedTable = com.acesur.faizbul.FaizBulApp.database.rateTableDao()
                .getTable(spec.name)
            
            // Try to find the correct rate in the cached table for CURRENT inputs first
            var rateToUse: Double? = null
            if (cachedTable != null) {
                rateToUse = extractRateFromTable(cachedTable.tableJson, amount, days)
            }
            if (rateToUse == null) {
                rateToUse = lastHistory?.rate
            }

            // If we have cached rate, create a rate object from it
            val cachedRate = if (rateToUse != null) {
                val calc = calculateDetailedEarnings(amount, rateToUse, days)
                InterestRate(
                    bankName = spec.bankName,
                    description = spec.description,
                    rate = rateToUse,
                    earnings = calc.net,
                    grossEarnings = calc.gross,
                    taxRate = calc.taxRate,
                    url = spec.url
                )
            } else null
            
            val errorMessage = when (errorCode) {
                com.acesur.faizbul.data.ScraperError.TIMEOUT -> "Zaman aşımı (Bağlantı çok yavaş)"
                com.acesur.faizbul.data.ScraperError.BLOCKED -> "Banka tarafından geçici olarak engellendi"
                com.acesur.faizbul.data.ScraperError.PARSING_ERROR -> "Veriler alınırken hata oluştu"
                com.acesur.faizbul.data.ScraperError.NETWORK_ERROR -> "İnternet bağlantı hatası"
                com.acesur.faizbul.data.ScraperError.NO_MATCH -> "Bu tutar/vade için oran bulunamadı"
                else -> "Zaman aşımı veya oran bulunamadı"
            }

            resultsMap[spec.name] = resultsMap[spec.name]!!.copy(
                status = ScraperStatus.FAILED,
                errorMessage = errorMessage,
                errorCode = errorCode,
                rate = cachedRate,
                lastSuccessfulRate = lastHistory?.rate,
                lastSuccessfulTimestamp = lastHistory?.timestamp,
                cachedTableJson = cachedTable?.tableJson,
                tableTimestamp = cachedTable?.timestamp,
                isUsingCachedRate = cachedRate != null
            )
            removeFromQueue(spec)
        }
    }

    fun stopScraping(amount: Double, days: Int) {
        viewModelScope.launch {
            resultsMap.keys.forEach { name ->
                val r = resultsMap[name]
                if (r != null && (r.status == ScraperStatus.WAITING || r.status == ScraperStatus.WORKING)) {
                    // Try to use cached data
                    val cachedRate = if (r.lastSuccessfulRate != null) {
                        val calc = calculateDetailedEarnings(amount, r.lastSuccessfulRate, days)
                        InterestRate(
                            bankName = r.spec.bankName,
                            description = r.spec.description,
                            rate = r.lastSuccessfulRate,
                            earnings = calc.net,
                            grossEarnings = calc.gross,
                            taxRate = calc.taxRate,
                            url = r.spec.url
                        )
                    } else null
                    
                    resultsMap[name] = r.copy(
                        status = ScraperStatus.FAILED, 
                        errorMessage = "Kullanıcı tarafından durduruldu",
                        rate = cachedRate,
                        isUsingCachedRate = cachedRate != null
                    )
                }
            }
            executionQueue.clear()
        }
    }

    fun retryScraper(spec: ScraperSpec) {
        retryCounts[spec.name] = 0
        resultsMap[spec.name] = resultsMap[spec.name]!!.copy(status = ScraperStatus.WAITING, errorMessage = null)
        if (!executionQueue.contains(spec)) {
            executionQueue.add(spec)
        }
    }

    private fun removeFromQueue(spec: ScraperSpec) {
        if (executionQueue.isNotEmpty() && executionQueue.first() == spec) {
            executionQueue.removeFirst()
        }
    }

    data class EarningsCalc(val net: Double, val gross: Double, val taxRate: Double)

    fun calculateDetailedEarnings(principal: Double, rate: Double, days: Int): EarningsCalc {
        if (rate <= 0) return EarningsCalc(0.0, 0.0, 0.0)
        val grossEarnings = (principal * rate * days) / 36500
        // Stopaj oranları (GVK Geçici 67. Madde)
        val taxRate = when {
            days <= 182 -> 0.175 // Vadesiz ve 6 aya kadar (6 ay dahil): %17,50
            days <= 365 -> 0.15  // 1 yıla kadar (1 yıl dahil): %15
            else -> 0.10         // 1 yıldan uzun: %10
        }
        val net = grossEarnings * (1 - taxRate)
        return EarningsCalc(net, grossEarnings, taxRate)
    }

    private fun extractRateFromTable(tableJson: String, amount: Double, days: Int): Double? {
        try {
            val json = JSONObject(tableJson)
            val headersArray = json.getJSONArray("headers")
            
            // Find matching column index (amount branch) using "highest minAmount <= input"
            var bestMinAmount = -1.0
            var matchingColIndex = -1
            for (i in 0 until headersArray.length()) {
                val headerObj = headersArray.getJSONObject(i)
                val minAmt = if (headerObj.has("minAmount") && !headerObj.isNull("minAmount")) headerObj.getDouble("minAmount") else null
                if (minAmt != null && minAmt <= amount && minAmt > bestMinAmount) {
                    bestMinAmount = minAmt
                    matchingColIndex = i
                }
            }
            
            if (matchingColIndex == -1) return null
            
            // Find matching row index (duration) using "highest minDays <= input"
            val rowsArray = json.getJSONArray("rows")
            var bestMinDays = -1
            var matchingRowIndex = -1
            for (i in 0 until rowsArray.length()) {
                val rowObj = rowsArray.getJSONObject(i)
                val minDays = if (rowObj.has("minDays") && !rowObj.isNull("minDays")) rowObj.getInt("minDays") else null
                if (minDays != null && minDays <= days && minDays > bestMinDays) {
                    bestMinDays = minDays
                    matchingRowIndex = i
                }
            }
            
            if (matchingRowIndex == -1) return null
            
            // Extract the rate from the selected cell
            val ratesArray = rowsArray.getJSONObject(matchingRowIndex).getJSONArray("rates")
            if (matchingColIndex < ratesArray.length() && !ratesArray.isNull(matchingColIndex)) {
                return ratesArray.getDouble(matchingColIndex)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }
}
