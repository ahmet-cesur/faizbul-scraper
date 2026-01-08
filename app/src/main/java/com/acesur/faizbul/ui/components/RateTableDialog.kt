package com.acesur.faizbul.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.acesur.faizbul.ui.theme.*
import org.json.JSONObject
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols

fun formatSharedRate(rate: Double): String {
    val symbols = DecimalFormatSymbols(java.util.Locale.forLanguageTag("tr-TR"))
    val df = DecimalFormat("0.00", symbols)
    return df.format(rate) + "%"
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
                .fillMaxHeight(0.85f)
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
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                        )
                        val amountStr = DecimalFormat("#,###", DecimalFormatSymbols(java.util.Locale.forLanguageTag("tr-TR"))).format(amount)
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
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 10.sp,
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    modifier = Modifier.width(80.dp).padding(4.dp)
                                )
                                // Amount headers
                                headers.forEachIndexed { index, header ->
                                    val isMatchingCol = index == matchingColIndex
                                    Text(
                                        text = header.label,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 10.sp,
                                        fontWeight = if (isMatchingCol) androidx.compose.ui.text.font.FontWeight.ExtraBold else androidx.compose.ui.text.font.FontWeight.Bold,
                                        color = if (isMatchingCol) highlightColor else Color.Unspecified,
                                        modifier = Modifier
                                            .width(70.dp)
                                            .background(if (isMatchingCol) highlightBgColor else Color.Transparent)
                                            .padding(4.dp)
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
                                        style = MaterialTheme.typography.labelSmall,
                                        fontSize = 10.sp,
                                        fontWeight = if (isMatchingRow) androidx.compose.ui.text.font.FontWeight.Bold else androidx.compose.ui.text.font.FontWeight.Normal,
                                        color = if (isMatchingRow) highlightColor else MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.width(80.dp).padding(4.dp)
                                    )
                                    // Rate cells
                                    row.rates.forEachIndexed { colIndex, rate ->
                                        val isHighlightedCell = colIndex == matchingColIndex && isMatchingRow
                                        Text(
                                            text = if (rate != null) formatSharedRate(rate) else "-",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            fontWeight = if (isHighlightedCell) androidx.compose.ui.text.font.FontWeight.ExtraBold else androidx.compose.ui.text.font.FontWeight.Normal,
                                            color = if (isHighlightedCell) Color.White else MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier
                                                .width(70.dp)
                                                .background(
                                                    if (isHighlightedCell) highlightColor 
                                                    else if (colIndex == matchingColIndex) highlightBgColor.copy(alpha = 0.3f)
                                                    else Color.Transparent
                                                )
                                                .padding(4.dp)
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
