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
            val allLines = reader.readLines()
            reader.close()

            // Parse CSV into a grid
            val grid = allLines.map { parseCsvLine(it) }
            val MATRIX_BLOCK_SIZE = 50
            val RIGHT_ZONE_START_COL = 50
            
            var rowIdx = 0
            while (rowIdx < grid.size) {
                // Check if this block has a valid bank header in the Right Zone
                // Row 0 relative: "Bank (Manual):" | Name
                if (grid.size > rowIdx && grid[rowIdx].size > RIGHT_ZONE_START_COL) {
                    val labelCell = grid[rowIdx][RIGHT_ZONE_START_COL]
                    if (labelCell.contains("Bank", ignoreCase = true)) {
                        val bankName = grid[rowIdx].getOrNull(RIGHT_ZONE_START_COL + 1) ?: "Unknown"
                        
                        // Row 1 relative: Last Sync
                        val dateStr = grid.getOrNull(rowIdx + 1)?.getOrNull(RIGHT_ZONE_START_COL + 1) ?: ""
                        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                            timeZone = java.util.TimeZone.getTimeZone("UTC")
                        }
                        val timestamp = try { sdf.parse(dateStr)?.time ?: 0L } catch(e: Exception) { 0L }

                        // Row 2 relative: ID, URL
                        val urlStr = grid.getOrNull(rowIdx + 2)?.getOrNull(RIGHT_ZONE_START_COL + 3) ?: ""
                        
                        // Row 3 relative: Headers
                        val headerRowIdx = rowIdx + 3
                        val headerRow = grid.getOrNull(headerRowIdx)
                        
                        if (headerRow != null) {
                            // Collect Amount Ranges from Headers
                            val amountRanges = mutableMapOf<Int, Pair<Double, Double>>()
                            for (c in (RIGHT_ZONE_START_COL + 1) until headerRow.size) {
                                val hText = headerRow[c]
                                val amtRange = parseAmountRange(hText)
                                amountRanges[c] = amtRange
                            }

                            // Iterate Data Rows
                            for (r in 1 until (MATRIX_BLOCK_SIZE - 3)) { // Rows 4 to 49 relative
                                val currRowIdx = headerRowIdx + r
                                if (currRowIdx >= grid.size) break
                                
                                val rowData = grid[currRowIdx]
                                if (rowData.size <= RIGHT_ZONE_START_COL) continue
                                
                                val vadeLabel = rowData[RIGHT_ZONE_START_COL]
                                if (vadeLabel.isBlank()) continue
                                
                                val (minDays, maxDays) = parseDuration(vadeLabel)
                                
                                // Iterate Columns for Rates
                                for (c in (RIGHT_ZONE_START_COL + 1) until rowData.size) {
                                    val rateStr = rowData[c].replace(",", ".")
                                    val rateVal = rateStr.toDoubleOrNull() ?: 0.0
                                    
                                    if (rateVal > 0) {
                                        val (minAmt, maxAmt) = amountRanges[c] ?: (0.0 to 999999999.0)
                                        
                                        rates.add(InterestRate(
                                            bankName = bankName,
                                            description = "Offer", // Generic description as it's lost in matrix flattening
                                            rate = rateVal,
                                            earnings = 0.0,
                                            url = urlStr,
                                            minAmount = minAmt,
                                            maxAmount = maxAmt,
                                            minDays = minDays,
                                            maxDays = maxDays,
                                            timestamp = timestamp,
                                            tableJson = null // Not available in matrix view
                                        ))
                                    }
                                }
                            }
                        }
                    }
                }
                rowIdx += MATRIX_BLOCK_SIZE
            }
            
            cachedRates = rates
            lastFetchTime = System.currentTimeMillis()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        cachedRates ?: emptyList()
    }
    
    private fun parseAmountRange(txt: String): Pair<Double, Double> {
        // Expected: "Label (Min-Max)"
        try {
            val content = txt.substringAfterLast("(", "").substringBeforeLast(")", "")
            if (content.isNotEmpty() && content.contains("-")) {
                val parts = content.split("-")
                val min = parts[0].trim().toDoubleOrNull() ?: 0.0
                val max = parts[1].trim().toDoubleOrNull() ?: 999999999.0
                return min to max
            }
        } catch (e: Exception) { }
        return 0.0 to 999999999.0
    }

    private fun parseDuration(txt: String): Pair<Int, Int> {
        val lower = txt.lowercase()
        val nums = Regex("\\d+").findAll(txt).map { it.value.toInt() }.toList()
        var multiplier = 1
        if ("yıl" in lower || "yil" in lower) multiplier = 365
        else if ("ay" in lower && "gün" !in lower) multiplier = 30
        
        if (nums.size >= 2) return nums[0] * multiplier to nums[1] * multiplier
        if (nums.size == 1) {
            val day = nums[0] * multiplier
            if ("üzeri" in lower || "+" in lower) return day to 99999
            return day to day
        }
        return 0 to 0
    }
    
    suspend fun prefetch() {
        fetchRates(forceRefresh = false)
    }

    /**
     * Trigger GitHub Actions Scraper via REST API.
     * Note: Requires GITHUB_TOKEN with workflow permissions.
     */

    
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
                tokens.add(currentToken.toString().trim()) // Trim to avoid parsing errors
                currentToken.clear()
            } else {
                currentToken.append(c)
            }
            i++
        }
        tokens.add(currentToken.toString().trim())
        return tokens
    }
}
