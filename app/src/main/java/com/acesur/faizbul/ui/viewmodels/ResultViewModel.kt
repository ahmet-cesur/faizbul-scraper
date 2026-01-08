package com.acesur.faizbul.ui.viewmodels

import androidx.compose.runtime.mutableStateMapOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.acesur.faizbul.data.InterestRate
import com.acesur.faizbul.data.ScraperResultState
import com.acesur.faizbul.data.ScraperSpec
import com.acesur.faizbul.data.ScraperStatus
import com.acesur.faizbul.data.GoogleSheetRepository
import kotlinx.coroutines.launch
import org.json.JSONObject

class ResultViewModel : ViewModel() {
    val resultsMap = mutableStateMapOf<String, ScraperResultState>()
    
    var isInitialized = false
    var isAppInBackground = false
    var isRefreshing = androidx.compose.runtime.mutableStateOf(false)

    fun initScrapers(context: android.content.Context, amount: Double, days: Int) {
        if (isInitialized) return
        isInitialized = true
        
        val allScrapers = ScraperSpec.allScrapers
        
        android.util.Log.d("FaizBul", "Initializing ${allScrapers.size} scrapers")
        
        // IMMEDIATELY add all scrapers to resultsMap with WAITING status
        allScrapers.forEach { spec ->
            resultsMap[spec.name] = ScraperResultState(
                spec = spec,
                status = ScraperStatus.WAITING,
                rate = null
            )
        }
        
        viewModelScope.launch {
            loadAllData(context, amount, days)
        }
    }

    fun refreshFromSheet(context: android.content.Context, amount: Double, days: Int) {
        viewModelScope.launch {
            isRefreshing.value = true
            loadAllData(context, amount, days)
            isRefreshing.value = false
        }
    }

    private suspend fun loadAllData(context: android.content.Context, amount: Double, days: Int) {
        val allScrapers = ScraperSpec.allScrapers

        // Calculate start of today for stale check
        val calendar = java.util.Calendar.getInstance()
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0)
        calendar.set(java.util.Calendar.MINUTE, 0)
        calendar.set(java.util.Calendar.SECOND, 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        val todayStart = calendar.timeInMillis

        // Try fetching from Google Sheet first
        val sheetRates = try {
            GoogleSheetRepository.fetchRates(forceRefresh = isRefreshing.value)
        } catch (e: Exception) {
            emptyList<InterestRate>()
        }
        android.util.Log.d("FaizBul", "Fetched ${sheetRates.size} rates from Google Sheet")

        allScrapers.forEach { spec ->
            // 1. Check Google Sheet Data with Bracket Matching
            val sheetRate = sheetRates.filter { 
                it.bankName == spec.bankName && 
                (it.description == spec.description || spec.description.contains(it.description) || it.description.contains(spec.description)) 
            }.find { 
                amount >= it.minAmount && amount <= it.maxAmount &&
                days >= it.minDays && days <= it.maxDays
            }
            
            if (sheetRate != null) {
                 // Prioritize extracting the precise rate from the table if available
                 var finalRateValue = sheetRate.rate
                 if (sheetRate.tableJson != null) {
                     val extracted = extractRateFromTable(sheetRate.tableJson, amount, days)
                     if (extracted != null && extracted > 0) {
                         finalRateValue = extracted
                     }
                 }

                 if (finalRateValue > 0) {
                     val calc = calculateDetailedEarnings(amount, finalRateValue, days)
                     val finalRate = sheetRate.copy(
                        rate = finalRateValue,
                        earnings = calc.net,
                        grossEarnings = calc.gross,
                        taxRate = calc.taxRate,
                        url = if (sheetRate.url.isNotEmpty()) sheetRate.url else spec.url
                     )
                     
                     val isSheetRateStale = sheetRate.timestamp < todayStart
                     
                     resultsMap[spec.name] = ScraperResultState(
                        spec = spec,
                        status = ScraperStatus.SUCCESS,
                        rate = finalRate,
                        isUsingCachedRate = isSheetRateStale,
                        tableTimestamp = sheetRate.timestamp,
                        cachedTableJson = sheetRate.tableJson
                    )
                    return@forEach
                 }
            }

            // 2. Fallback to Local Cache
            val lastHistory = com.acesur.faizbul.FaizBulApp.database.rateHistoryDao()
                .getLastRate(spec.bankName, spec.description)
            val cachedTable = com.acesur.faizbul.FaizBulApp.database.rateTableDao()
                .getTable(spec.name)
            
            val isStale = cachedTable == null || cachedTable.timestamp < todayStart
            
            var rateToUse: Double? = null
            if (cachedTable != null) {
                rateToUse = extractRateFromTable(cachedTable.tableJson, amount, days)
            }
            
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
        }
    }
    
    fun calculateDetailedEarnings(principal: Double, rate: Double, days: Int): EarningsCalc {
        if (rate <= 0) return EarningsCalc(0.0, 0.0, 0.0)
        val grossEarnings = (principal * rate * days) / 36500
        val taxRate = when {
            days <= 182 -> 0.175
            days <= 365 -> 0.15
            else -> 0.10
        }
        val net = grossEarnings * (1 - taxRate)
        return EarningsCalc(net, grossEarnings, taxRate)
    }

    private fun extractRateFromTable(tableJson: String, amount: Double, days: Int): Double? {
        try {
            val json = JSONObject(tableJson)
            val headersArray = json.getJSONArray("headers")
            
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
            
            val ratesArray = rowsArray.getJSONObject(matchingRowIndex).getJSONArray("rates")
            if (matchingColIndex < ratesArray.length() && !ratesArray.isNull(matchingColIndex)) {
                return ratesArray.getDouble(matchingColIndex)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    data class EarningsCalc(val net: Double, val gross: Double, val taxRate: Double)
}
