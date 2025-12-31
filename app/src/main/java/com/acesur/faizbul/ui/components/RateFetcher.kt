package com.acesur.faizbul.ui.components

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.acesur.faizbul.data.InterestRate
import org.json.JSONArray
import org.json.JSONObject
import com.acesur.faizbul.data.ScraperScripts

// Result with optional table data
data class ScraperResult(
    val rate: InterestRate?,
    val tableJson: String? = null,
    val errorCode: com.acesur.faizbul.data.ScraperError? = null
)

class WebAppInterface(
    private val url: String, 
    private val onResult: (ScraperResult) -> Unit
) {
    @JavascriptInterface
    fun sendRate(rate: Double, description: String, bankName: String) {
        onResult(ScraperResult(InterestRate(bankName, description, rate, 0.0, url = url)))
    }
    
    @JavascriptInterface
    fun sendRateWithTable(rate: Double, description: String, bankName: String, tableJson: String) {
        // Validate table size - must be at least 3x3 for all banks
        val isValidTable = try {
            val json = JSONObject(tableJson)
            val headers = json.getJSONArray("headers")
            val rows = json.getJSONArray("rows")
            headers.length() >= 3 && rows.length() >= 3
        } catch (e: Exception) {
            false
        }
        
        if (!isValidTable) {
            android.util.Log.w("WebViewScraper", "Table rejected: size is less than 3x3 for $bankName")
            onResult(ScraperResult(InterestRate(bankName, description, -1.0, 0.0, url = url), null))
            return
        }
        
        onResult(ScraperResult(
            InterestRate(bankName, description, rate, 0.0, url = url),
            tableJson
        ))
    }
    
    @JavascriptInterface
    fun sendError(errorCode: String) {
        val error = try {
            com.acesur.faizbul.data.ScraperError.valueOf(errorCode.uppercase())
        } catch (e: Exception) {
            com.acesur.faizbul.data.ScraperError.PARSING_ERROR
        }
        onResult(ScraperResult(null, null, error))
    }
    
    @JavascriptInterface
    fun log(message: String) {
        android.util.Log.d("WebViewScraper", message)
    }
}

@Composable
fun RateFetcher(
    url: String,
    description: String,
    bankName: String,
    amount: Double,
    durationDays: Int,
    customJsScript: ((Double, Int) -> String)? = null,
    timeoutMs: Long = 40000L,
    onRateFound: (ScraperResult) -> Unit
) {
    val context = LocalContext.current
    
    // Default JS (Garanti style tables) - now extracts full table
    val defaultJsCode = """
        (function() {
            try {
                var amount = $amount;
                var duration = $durationDays;
                
                function parseAmount(txt) {
                    var val = txt.toLowerCase().replace(/\./g, '').replace(/,/g, '.').replace('tl', '').replace(' ', '').trim();
                    if (val.indexOf('milyon') > -1) return parseFloat(val.replace('milyon', '')) * 1000000;
                    if (val.indexOf('bin') > -1) return parseFloat(val.replace('bin', '')) * 1000;
                    return parseFloat(val);
                }
                
                // Convert "X ay" to approximate days
                function parseDurationText(txt) {
                    var lower = txt.toLowerCase();
                    
                    // Special case: 12 ay = 1 year = 365 days (for Garanti bank)
                    if (lower.indexOf('12') > -1 && lower.indexOf('ay') > -1 && lower.indexOf('gün') === -1) {
                        return { min: 365, max: 365 };
                    }
                    
                    // Determine the unit multiplier
                    var multiplier = 1;
                    if (lower.indexOf('yıl') > -1 || lower.indexOf('yil') > -1) {
                        multiplier = 365;
                    } else if (lower.indexOf('ay') > -1 && lower.indexOf('gün') === -1) {
                        multiplier = 30;
                    }
                    // else it's days (gün), multiplier = 1
                    
                    // Handle day/month/year range
                    var nums = txt.match(/\d+/g);
                    if (nums && nums.length >= 2) {
                        return { min: parseInt(nums[0]) * multiplier, max: parseInt(nums[1]) * multiplier };
                    } else if (nums && nums.length === 1) {
                        var val = parseInt(nums[0]) * multiplier;
                        if (lower.indexOf('üzeri') > -1 || txt.indexOf('+') > -1) {
                            return { min: val, max: 99999 };
                        }
                        return { min: val, max: val };
                    }
                    return null;
                }

                function extractTableAndFindRate() {
                    var tables = document.querySelectorAll('table');
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        var rows = table.rows;
                        if (!rows || rows.length < 2) continue;
                        
                        var headerRow = rows[0];
                        if (headerRow.innerText.indexOf('Vade') === -1 && headerRow.innerText.indexOf('Gün') === -1) continue;
                        
                        // Extract headers (amount brackets) with min/max
                        // Find column with highest minAmount that is <= input amount
                        var headers = [];
                        var colIndex = -1;
                        var bestMinAmount = -1;
                        for (var i = 1; i < headerRow.cells.length; i++) {
                            var txt = headerRow.cells[i].innerText.trim();
                            var headerObj = { label: txt, minAmount: null, maxAmount: null };
                            
                            if (txt.indexOf('-') > -1) {
                                var parts = txt.split('-');
                                headerObj.minAmount = parseAmount(parts[0]);
                                headerObj.maxAmount = parseAmount(parts[1]);
                            } else if (txt.indexOf('+') > -1 || txt.toLowerCase().indexOf('üzeri') > -1) {
                                headerObj.minAmount = parseAmount(txt.replace('+', '').replace(/üzeri/gi, ''));
                                headerObj.maxAmount = 999999999;
                            }
                            headers.push(headerObj);
                            
                            // Select column with highest minAmount that is still <= input amount
                            if (headerObj.minAmount && headerObj.minAmount <= amount && headerObj.minAmount > bestMinAmount) {
                                bestMinAmount = headerObj.minAmount;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1) continue;
                        
                        // Extract all rows and find best using highest minDays <= input
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.cells;
                            if (cells.length < 2) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var parsed = parseDurationText(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rateStr = cells[c].innerText.replace('%', '').replace(',', '.').trim();
                                var rate = parseFloat(rateStr);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            // Store structured row data with minDays/maxDays
                            tableRows.push({
                                label: durTxt,
                                minDays: parsed ? parsed.min : null,
                                maxDays: parsed ? parsed.max : null,
                                rates: rowRates
                            });
                            
                            // Find row with highest minDays <= input duration
                            if (parsed && parsed.min <= duration && parsed.min > bestMinDays) {
                                bestMinDays = parsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex === -1) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: headers,
                                rows: tableRows
                            });
                            Android.sendRateWithTable(bestRate, '$description', '$bankName', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${ScraperScripts.checkBotDetectionJs}

                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) {
                        clearInterval(interval);
                        Android.sendError('BLOCKED');
                        return;
                    }
                    if (extractTableAndFindRate()) { clearInterval(interval); } 
                    else if (++attempts > 40) { 
                        clearInterval(interval);
                        // Check if at least some tables were found but no match
                        var allTables = document.querySelectorAll('table');
                        if (allTables.length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    val finalJsCode = customJsScript?.invoke(amount, durationDays) ?: defaultJsCode

    // Ensure callback is only invoked once
    val hasResponded = remember { androidx.compose.runtime.mutableStateOf(false) }
    
    val safeCallback: (ScraperResult) -> Unit = { result ->
        if (!hasResponded.value) {
            hasResponded.value = true
            onRateFound(result)
        }
    }

    // Native Timeout Failsafe
    androidx.compose.runtime.LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(timeoutMs)
        if (!hasResponded.value) {
            safeCallback(ScraperResult(null, null, com.acesur.faizbul.data.ScraperError.TIMEOUT))
        }
    }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                addJavascriptInterface(WebAppInterface(url, safeCallback), "Android")
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        view?.evaluateJavascript(finalJsCode, null)
                    }
                    
                    override fun onReceivedError(
                        view: WebView?,
                        request: android.webkit.WebResourceRequest?,
                        error: android.webkit.WebResourceError?
                    ) {
                        super.onReceivedError(view, request, error)
                        if (request?.isForMainFrame == true) {
                            safeCallback(ScraperResult(null, null, com.acesur.faizbul.data.ScraperError.NETWORK_ERROR))
                        }
                    }
                }
                loadUrl(url)
            }
        }, 
        update = { /* no-op */ },
        onRelease = { webView ->
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.destroy()
        }
    )
}
