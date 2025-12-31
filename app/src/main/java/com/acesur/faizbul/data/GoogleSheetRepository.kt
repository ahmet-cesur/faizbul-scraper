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
            // Note: The sheet must be "Published to the web" or "Anyone with the link can view"
            val connection = url.openConnection()
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            
            val reader = BufferedReader(InputStreamReader(connection.getInputStream()))
            // Skip header
            reader.readLine() 
            
            var line: String? 
            while (reader.readLine().also { line = it } != null) {
                if (line.isNullOrBlank()) continue
                
                val tokens = parseCsvLine(line!!)
                // Expected: Date, Bank, Description, Rate, Min Amount, Max Amount, Duration, URL
                if (tokens.size >= 8) {
                   try {
                       val bank = tokens[1]
                       val desc = tokens[2]
                       val rate = tokens[3].toDoubleOrNull() ?: 0.0
                       val urlStr = tokens[7]
                       
                       // Create InterestRate object. 
                       // Note: earnings are calculated based on input amount, here we just fetch raw rates.
                       // We might need a different data model or adapt InterestRate.
                       // For now, initializing with 0.0 earnings.
                       rates.add(InterestRate(
                           bankName = bank,
                           description = desc,
                           rate = rate,
                           earnings = 0.0, 
                           url = urlStr
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
