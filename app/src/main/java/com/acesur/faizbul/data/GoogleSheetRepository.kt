package com.acesur.faizbul.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.URL

object GoogleSheetRepository {
    private const val SHEET_ID = "1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY"
    private const val CSV_URL = "https://docs.google.com/spreadsheets/d/$SHEET_ID/export?format=csv"

    private var cachedRates: List<InterestRate>? = null
    private var lastFetchTime: Long = 0
    private const val CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

    suspend fun fetchRates(forceRefresh: Boolean = false): List<InterestRate> = withContext(Dispatchers.IO) {
        if (!forceRefresh && cachedRates != null && (System.currentTimeMillis() - lastFetchTime) < CACHE_DURATION_MS) {
            return@withContext cachedRates!!
        }

        val rates = mutableListOf<InterestRate>()
        try {
            val url = URL(CSV_URL)
            val connection = url.openConnection()
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            
            val reader = BufferedReader(InputStreamReader(connection.getInputStream()))
            reader.readLine() // Skip header
            
            var line: String? 
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            
            while (reader.readLine().also { line = it } != null) {
                if (line.isNullOrBlank()) continue
                
                val tokens = parseCsvLine(line!!)
                if (tokens.size >= 9) {
                   try {
                       val dateStr = tokens[0]
                       val bank = tokens[1]
                       val desc = tokens[2]
                       val rate = tokens[3].toDoubleOrNull() ?: 0.0
                       val minAmount = tokens[4].toDoubleOrNull() ?: 0.0
                       val maxAmount = tokens[5].toDoubleOrNull() ?: 0.0
                       val minDays = tokens[6].toIntOrNull() ?: 0
                       val maxDays = tokens[7].toIntOrNull() ?: 99999
                       val urlStr = tokens[8]
                       val tJson = if (tokens.size >= 10) tokens[9] else null
                       
                       val timestamp = try { sdf.parse(dateStr)?.time ?: 0L } catch(e: Exception) { 0L }
                       
                       rates.add(InterestRate(
                           bankName = bank,
                           description = desc,
                           rate = rate,
                           earnings = 0.0, 
                           url = urlStr,
                           minAmount = minAmount,
                           maxAmount = maxAmount,
                           minDays = minDays,
                           maxDays = maxDays,
                           timestamp = timestamp,
                           tableJson = tJson
                       ))
                   } catch (e: Exception) {
                       e.printStackTrace()
                   }
                }
            }
            reader.close()
            
            cachedRates = rates
            lastFetchTime = System.currentTimeMillis()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        cachedRates ?: emptyList()
    }
    
    suspend fun prefetch() {
        fetchRates(forceRefresh = false)
    }

    /**
     * Trigger GitHub Actions Scraper via REST API.
     * Note: Requires GITHUB_TOKEN with workflow permissions.
     */
    suspend fun triggerScraper(token: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val owner = "ahmet-cesur"
            val repo = "faizbul-scraper"
            val workflowId = "scraper.yml"
            val url = URL("https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowId/dispatches")
            
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Authorization", "token $token")
            connection.setRequestProperty("Accept", "application/vnd.github.v3+json")
            connection.doOutput = true
            
            // Body required for workflow_dispatch: "ref" is mandatory
            val jsonBody = "{\"ref\":\"main\"}"
            connection.outputStream.write(jsonBody.toByteArray())
            
            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val errorMsg = connection.errorStream?.bufferedReader()?.readText() ?: "Status: $responseCode"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getBestOffers(): List<BestOffer> = withContext(Dispatchers.IO) {
        val allRates = fetchRates(forceRefresh = false)
        if (allRates.isEmpty()) return@withContext emptyList()
        
        // 1. Find the highest rate
        val maxRate = allRates.maxOfOrNull { it.rate } ?: return@withContext emptyList()
        
        // 2. Filter rates matching the highest rate
        val topRates = allRates.filter { it.rate == maxRate }
        
        // 3. Group by bank and consolidate
        topRates.groupBy { it.bankName }.map { (bankName, rates) ->
            val minAmount = rates.minOf { it.minAmount }
            val dayRanges = rates.map { it.minDays to it.maxDays }.distinct().sortedBy { it.first }
            val latestTimestamp = rates.maxOf { it.timestamp }
            val firstUrl = rates.firstOrNull { it.url.isNotEmpty() }?.url ?: ""
            val firstTable = rates.firstOrNull { it.tableJson != null }?.tableJson
            
            BestOffer(
                bankName = bankName,
                rate = maxRate,
                minAmount = minAmount,
                dayRanges = dayRanges,
                timestamp = latestTimestamp,
                url = firstUrl,
                tableJson = firstTable
            )
        }.sortedBy { it.bankName }
    }

    private fun parseCsvLine(line: String): List<String> {
        val tokens = mutableListOf<String>()
        var inQuotes = false
        val currentToken = StringBuilder()
        
        var i = 0
        while (i < line.length) {
            val c = line[i]
            if (c == '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
                    // Double quote inside quotes -> Literal quote
                    currentToken.append('"')
                    i++ // Skip the second quote
                } else {
                    // Start or end of quoted field
                    inQuotes = !inQuotes
                }
            } else if (c == ',' && !inQuotes) {
                tokens.add(currentToken.toString()) // Don't trim, preserve exact content
                currentToken.clear()
            } else {
                currentToken.append(c)
            }
            i++
        }
        tokens.add(currentToken.toString())
        return tokens
    }
}
