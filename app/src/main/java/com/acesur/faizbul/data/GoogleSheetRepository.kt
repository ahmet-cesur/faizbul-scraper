package com.acesur.faizbul.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.URL

object GoogleSheetRepository {
    private const val SHEET_ID = "1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY"
    private const val CSV_URL = "https://docs.google.com/spreadsheets/d/$SHEET_ID/export?format=csv"

    suspend fun fetchRates(): List<InterestRate> = withContext(Dispatchers.IO) {
        val rates = mutableListOf<InterestRate>()
        try {
            val url = URL(CSV_URL)
            val connection = url.openConnection()
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            
            val reader = BufferedReader(InputStreamReader(connection.getInputStream()))
            reader.readLine() // Skip header
            
            var line: String? 
            while (reader.readLine().also { line = it } != null) {
                if (line.isNullOrBlank()) continue
                
                val tokens = parseCsvLine(line!!)
                // Updated Column mappings for the new Matrix scraper format:
                // 0: Date, 1: Bank, 2: Description, 3: Rate, 4: MinAmount, 5: MaxAmount, 
                // 6: MinDays, 7: MaxDays, 8: URL
                if (tokens.size >= 9) {
                   try {
                       val bank = tokens[1]
                       val desc = tokens[2]
                       val rate = tokens[3].toDoubleOrNull() ?: 0.0
                       val minAmount = tokens[4].toDoubleOrNull() ?: 0.0
                       val maxAmount = tokens[5].toDoubleOrNull() ?: 0.0
                       val minDays = tokens[6].toIntOrNull() ?: 0
                       val maxDays = tokens[7].toIntOrNull() ?: 99999
                       val urlStr = tokens[8]
                       
                       rates.add(InterestRate(
                           bankName = bank,
                           description = desc,
                           rate = rate,
                           earnings = 0.0, 
                           url = urlStr,
                           minAmount = minAmount,
                           maxAmount = maxAmount,
                           minDays = minDays,
                           maxDays = maxDays
                       ))
                   } catch (e: Exception) {
                       e.printStackTrace()
                   }
                }
            }
            reader.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        rates
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
    
    private fun parseCsvLine(line: String): List<String> {
        val tokens = mutableListOf<String>()
        var inQuotes = false
        var currentToken = StringBuilder()
        
        for (char in line) {
            if (char == '"') {
                inQuotes = !inQuotes
            } else if (char == ',' && !inQuotes) {
                tokens.add(currentToken.toString().trim())
                currentToken = StringBuilder()
            } else {
                currentToken.append(char)
            }
        }
        tokens.add(currentToken.toString().trim())
        return tokens
    }
}
