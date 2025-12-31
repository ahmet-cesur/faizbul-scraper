package com.acesur.faizbul.data

data class InterestRate(
    val bankName: String,
    val description: String,
    val rate: Double,
    val earnings: Double, // Net
    val grossEarnings: Double = 0.0,
    val taxRate: Double = 0.0,
    val url: String = ""
)

enum class ScraperStatus { WAITING, WORKING, SUCCESS, FAILED }

enum class ScraperError { TIMEOUT, BLOCKED, PARSING_ERROR, NETWORK_ERROR, NO_MATCH }

data class ScraperResultState(
    val spec: ScraperSpec,
    val status: ScraperStatus = ScraperStatus.WAITING,
    val rate: InterestRate? = null,
    val errorMessage: String? = null,
    val errorCode: ScraperError? = null,
    val lastSuccessfulRate: Double? = null,
    val lastSuccessfulTimestamp: Long? = null,
    val cachedTableJson: String? = null,  // Full table JSON for display
    val tableTimestamp: Long? = null,      // When the table was last updated
    val isUsingCachedRate: Boolean = false // True if showing rate from cached table
)

data class ScraperSpec(
    val name: String,
    val url: String,
    val description: String,
    val bankName: String,
    val customJs: ((amount: Double, days: Int) -> String)? = null,
    val timeoutMs: Long = 40000L
) {
    companion object {
        val allScrapers = listOf(
            ScraperSpec("Ziraat Bankası", "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesapi", "İnternet Şubesi Vadeli TL", "Ziraat Bankası", { a, d -> ScraperScripts.getZiraatJs(a, d, "İnternet Şubesi Vadeli TL") }),
            ScraperSpec("Garanti - Hoş Geldin", "https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi", "Hoş Geldin Faizi", "Garanti BBVA", { a, d -> ScraperScripts.getGarantiJs(a, d, "Hoş Geldin Faizi") }),
            ScraperSpec("Garanti - Standart", "https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap", "Standart E-Vadeli", "Garanti BBVA", { a, d -> ScraperScripts.getGarantiJs(a, d, "Standart E-Vadeli") }),
            ScraperSpec("Enpara", "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi", "Vadeli Mevduat", "Enpara.com", { a, d -> ScraperScripts.getEnparaJs(a, d, "Vadeli Mevduat") }),
            ScraperSpec("Akbank - Tanışma", "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi", "Tanışma Faizi", "Akbank", { a, d -> ScraperScripts.getAkbankJs(a, d, "Tanışma Faizi") }),
            ScraperSpec("Akbank - Standart", "https://www.akbank.com/mevduat-yatirim/mevduat/vadeli-mevduat-hesaplari/vadeli-mevduat-hesabi", "Standart Vadeli", "Akbank", { a, d -> ScraperScripts.getAkbankJs(a, d, "Standart Vadeli") }),
            ScraperSpec("Yapı Kredi - Standart", "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama", "e-Mevduat", "Yapı Kredi", ScraperScripts::getYapiKrediStandardJs),
            ScraperSpec("Yapı Kredi - Yeni Param", "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama", "Yeni Param (Hoş Geldin)", "Yapı Kredi", ScraperScripts::getYapiKrediWelcomeJs),
            ScraperSpec("İş Bankası", "https://www.isbank.com.tr/vadeli-tl", "İşCep Vadeli TL", "İş Bankası", { a, d -> ScraperScripts.getIsBankasiJs(a, d, "İşCep Vadeli TL") }),
            ScraperSpec("Halkbank", "https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari", "İnternet Vadeli TL", "Halkbank", { a, d -> ScraperScripts.getHalkbankJs(a, d, "İnternet Vadeli TL") }),
            ScraperSpec("VakıfBank - Tanışma", "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari", "Tanışma Kampanyası", "VakıfBank", { a, d -> ScraperScripts.getVakifbankJs(a, d, "Tanışma Kampanyası") }),
            ScraperSpec("VakıfBank - Standart", "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari", "E-Vadeli Hesabı", "VakıfBank", { a, d -> ScraperScripts.getVakifbankEVadeliJs(a, d, "E-Vadeli Hesabı") }),
            ScraperSpec("Alternatif Bank", "https://www.alternatifbank.com.tr/bilgi-merkezi/faiz-oranlari#mevduat", "E-Mevduat TRY", "Alternatif Bank", { a, d -> ScraperScripts.getAlternatifBankJs(a, d, "E-Mevduat TRY") }),
            ScraperSpec("Odeabank", "https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat", "İnternet/Mobil Vadeli", "Odeabank", { a, d -> ScraperScripts.getOdeabankJs(a, d, "İnternet/Mobil Vadeli") }),
            ScraperSpec("Denizbank", "https://www.denizbank.com/hesap/e-mevduat", "E-Mevduat", "DenizBank", { a, d -> ScraperScripts.getDenizbankJs(a, d, "E-Mevduat") })
        )
    }
}

object ScraperScripts {
    /**
     * Smart number parsing JavaScript utility that handles locale-agnostic decimal detection.
     * 
     * Logic:
     * - If the last '.' or ',' has exactly 2 digits after it, it's the decimal separator
     * - This handles: "5.000,00" (Turkish) → 5000.00, "5,000.00" (English) → 5000.00
     * - Also handles rate strings like "34.50", "34,50", "%34,5"
     * 
     * Usage: Include this at the start of scraper scripts, then call smartParseNumber(str)
     */
    val smartParseNumberJs = """
        function smartParseNumber(str) {
            if (!str) return NaN;
            // Remove %, TL, spaces, 've üzeri', 'ÜZERİ'
            var cleaned = str.replace(/%/g, '').replace(/TL/gi, '').replace(/ve üzeri/gi, '')
                             .replace(/ÜZERİ/gi, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
                             .replace(/\s/g, '').trim();
            if (!cleaned) return NaN;
            
            // Find positions of last '.' and last ','
            var lastDot = cleaned.lastIndexOf('.');
            var lastComma = cleaned.lastIndexOf(',');
            
            // Determine which is the decimal separator
            // Rule: If the last separator has exactly 2 digits after it, it's the decimal
            var decimalSep = null;
            var thousandSep = null;
            
            if (lastDot > lastComma) {
                // '.' comes after ',' - check if it's decimal
                var afterDot = cleaned.substring(lastDot + 1);
                if (afterDot.length === 2 || afterDot.length === 1) {
                    decimalSep = '.';
                    thousandSep = ',';
                } else {
                    // '.' is thousands separator (e.g., "1.000.000")
                    thousandSep = '.';
                    decimalSep = ',';
                }
            } else if (lastComma > lastDot) {
                // ',' comes after '.' - check if it's decimal
                var afterComma = cleaned.substring(lastComma + 1);
                if (afterComma.length === 2 || afterComma.length === 1) {
                    decimalSep = ',';
                    thousandSep = '.';
                } else {
                    // ',' is thousands separator
                    thousandSep = ',';
                    decimalSep = '.';
                }
            } else if (lastDot > -1) {
                // Only dots, no commas
                var afterDot = cleaned.substring(lastDot + 1);
                if (afterDot.length === 2 || afterDot.length === 1) {
                    decimalSep = '.';
                } else {
                    thousandSep = '.';
                }
            } else if (lastComma > -1) {
                // Only commas, no dots
                var afterComma = cleaned.substring(lastComma + 1);
                if (afterComma.length === 2 || afterComma.length === 1) {
                    decimalSep = ',';
                } else {
                    thousandSep = ',';
                }
            }
            
            // Remove thousands separator, replace decimal with '.'
            var normalized = cleaned;
            if (thousandSep) {
                normalized = normalized.split(thousandSep).join('');
            }
            if (decimalSep && decimalSep !== '.') {
                normalized = normalized.replace(decimalSep, '.');
            }
            
            return parseFloat(normalized);
        }
    """.trimIndent()
    
    /**
     * Common bot detection strings patterns
     */
    val checkBotDetectionJs = """
        function isBotDetected() {
            var text = document.body.innerText.toLowerCase();
            var title = document.title.toLowerCase();
            var indicators = [
                'bot detection', 'access denied', 'permission denied', 
                'site protection', 'cloudflare', 'distil networks',
                'güvenlik kontrolü', 'robot değilim', 'captcha'
            ];
            for (var i = 0; i < indicators.length; i++) {
                if (text.indexOf(indicators[i]) > -1 || title.indexOf(indicators[i]) > -1) return true;
            }
            return false;
        }
    """.trimIndent()

    /**
     * Duration parsing JavaScript utility that handles yıl (year) and ay (month) conversions.
     * 
     * Conversions:
     * - "yıl" (year) = 365 days
     * - "ay" (month) = 30 days  
     * - "gün" (day) = 1 day
     * 
     * Usage: Include this after smartParseNumberJs, then call parseDuration(txt)
     */
    val parseDurationJs = """
        function parseDuration(txt) {
            var lower = txt.toLowerCase();
            var nums = txt.match(/\d+/g);
            if (!nums) return null;
            
            // Determine the unit multiplier
            var multiplier = 1;
            if (lower.indexOf('yıl') > -1 || lower.indexOf('yil') > -1) {
                multiplier = 365;
            } else if (lower.indexOf('ay') > -1 && lower.indexOf('gün') === -1) {
                multiplier = 30;
            }
            // else it's days (gün), multiplier = 1
            
            if (nums.length >= 2) {
                return { min: parseInt(nums[0]) * multiplier, max: parseInt(nums[1]) * multiplier };
            } else if (nums.length === 1) {
                var day = parseInt(nums[0]) * multiplier;
                if (lower.indexOf('üzeri') > -1 || txt.indexOf('+') > -1) {
                    return { min: day, max: 99999 };
                }
                return { min: day, max: day };
            }
            return null;
        }
    """.trimIndent()

    fun getAkbankJs(amount: Double, days: Int, description: String = "Tanışma Faizi") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function extractAkbankTable() {
                    var table = document.querySelector('table.faizTablo');
                    if (!table) {
                        // Fallback: look for table with specific text
                        var allTables = document.querySelectorAll('table');
                        for (var i = 0; i < allTables.length; i++) {
                             if (allTables[i].innerText.indexOf('Akbank İnternet') > -1 || allTables[i].innerText.indexOf('Mevduat Faizleri') > -1) {
                                 table = allTables[i];
                                 break;
                             }
                        }
                    }
                    if (!table) return false;
                    
                    var rows = table.rows;
                    if (!rows || rows.length < 3) return false;
                    
                    // First row has the headers (amount brackets)
                    var headerRow = rows[0];
                    var headers = [];
                    var colIndex = -1;
                    var bestMinAmount = -1;
                    
                    for (var i = 1; i < headerRow.cells.length; i++) {
                        var cellTxt = headerRow.cells[i].innerText.trim();
                        var minAmt = 0, maxAmt = 999999999;
                        
                        if (cellTxt.indexOf('-') > -1) {
                            var parts = cellTxt.split('-');
                            minAmt = smartParseNumber(parts[0]);
                            maxAmt = smartParseNumber(parts[1]);
                        } else if (cellTxt.toLowerCase().indexOf('üzeri') > -1 || cellTxt.indexOf('+') > -1) {
                            minAmt = smartParseNumber(cellTxt);
                            maxAmt = 999999999;
                        }
                        
                        headers.push({
                            label: cellTxt,
                            minAmount: minAmt,
                            maxAmount: maxAmt
                        });
                        
                        // Find column with highest minAmount <= input amount
                        if (minAmt <= amount && minAmt > bestMinAmount) {
                            bestMinAmount = minAmt;
                            colIndex = i;
                        }
                    }
                    
                    if (colIndex === -1 || headers.length < 3) return false;
                    
                    // Extract all rows and find best row using largest minDays <= input
                    var tableRows = [];
                    var bestRowIndex = -1;
                    var bestMinDays = -1;
                    
                    for (var r = 1; r < rows.length; r++) {
                        var row = rows[r];
                        var cells = row.cells;
                        if (cells.length < 2) continue;
                        
                        var durTxt = cells[0].innerText.trim();
                        var durParsed = parseDuration(durTxt);
                        
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        
                        var rowIdx = tableRows.length;
                        tableRows.push({
                            label: durTxt,
                            minDays: durParsed ? durParsed.min : null,
                            maxDays: durParsed ? durParsed.max : null,
                            rates: rowRates
                        });
                        
                        // Find row with highest minDays <= input duration
                        if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                            bestMinDays = durParsed.min;
                            bestRowIndex = rowIdx;
                        }
                    }
                    
                    if (tableRows.length < 3 || bestRowIndex === -1) return false;
                    
                    var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                    if (!bestRate || bestRate <= 0) return false;
                    
                    var tableJson = JSON.stringify({ headers: headers, rows: tableRows });
                    Android.sendRateWithTable(bestRate, '$description', 'Akbank', tableJson);
                    return true;
                }
                
                ${checkBotDetectionJs}
                
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) {
                        clearInterval(interval);
                        Android.sendError('BLOCKED');
                        return;
                    }
                    if (extractAkbankTable()) {
                        clearInterval(interval);
                    } else if (++attempts > 40) {
                        clearInterval(interval);
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

    fun getEnparaJs(amount: Double, days: Int, description: String = "Vadeli Mevduat") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                
                ${smartParseNumberJs}
                
                function extractEnparaTable() {
                    // Find the TRY table (Turkish Lira)
                    var table = document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY');
                    if (!table) table = document.querySelector('.enpara-deposit-interest-rates__flex-table');
                    if (!table) return false;
                    
                    var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item'));
                    if (allItems.length < 10) return false;
                    
                    // The table is structured as rows of 5 items each:
                    // Column 0: Amount bracket (e.g., "0 - 150.000 TL")
                    // Columns 1-4: Duration headers with rates (32 gün, 46 gün, 92 gün, 181 gün)
                    
                    // First, extract the duration headers from the first row
                    var durationHeaders = [];  // Will hold {label, minDays, maxDays}
                    for (var i = 1; i <= 4 && i < allItems.length; i++) {
                        var headEl = allItems[i].querySelector('.enpara-deposit-interest-rates__flex-table-head');
                        if (headEl) {
                            var daysTxt = headEl.innerText.trim();
                            var daysNum = parseInt(daysTxt.replace(/[^0-9]/g, ''));
                            durationHeaders.push({
                                label: daysTxt,
                                minDays: daysNum,
                                maxDays: daysNum
                            });
                        }
                    }
                    
                    if (durationHeaders.length < 3) return false;
                    
                    // Now extract the data rows (starting from item 5, in groups of 5)
                    var tableRows = [];
                    var colIndex = -1;
                    var bestMinAmount = -1;
                    var headers = [];  // Amount brackets as "headers" for compatibility
                    
                    for (var rowStart = 5; rowStart < allItems.length; rowStart += 5) {
                        // First item is the amount bracket
                        var amountItem = allItems[rowStart];
                        if (!amountItem) continue;
                        
                        var valEl = amountItem.querySelector('.enpara-deposit-interest-rates__flex-table-value');
                        if (!valEl) continue;
                        
                        var amountTxt = valEl.innerText.trim();
                        var minAmt = 0, maxAmt = 999999999;
                        
                        if (amountTxt.indexOf('-') > -1) {
                            var parts = amountTxt.split('-');
                            minAmt = smartParseNumber(parts[0]);
                            maxAmt = smartParseNumber(parts[1]);
                        } else if (amountTxt.toLowerCase().indexOf('üzeri') > -1 || amountTxt.indexOf('+') > -1) {
                            minAmt = smartParseNumber(amountTxt);
                            maxAmt = 999999999;
                        }
                        
                        headers.push({
                            label: amountTxt,
                            minAmount: minAmt,
                            maxAmount: maxAmt
                        });
                        
                        // Track which row matches the input amount
                        var rowIndex = headers.length - 1;
                        if (minAmt <= amount && minAmt > bestMinAmount) {
                            bestMinAmount = minAmt;
                            colIndex = rowIndex;  // In Enpara, "columns" are amount brackets displayed as rows
                        }
                        
                        // Extract rates for this amount bracket
                        var rowRates = [];
                        for (var c = 1; c <= 4 && (rowStart + c) < allItems.length; c++) {
                            var rateItem = allItems[rowStart + c];
                            var rateValEl = rateItem ? rateItem.querySelector('.enpara-deposit-interest-rates__flex-table-value') : null;
                            if (rateValEl) {
                                var rate = smartParseNumber(rateValEl.innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            } else {
                                rowRates.push(null);
                            }
                        }
                        
                        // Store as a row with duration as the label
                        tableRows.push({
                            label: amountTxt,
                            minDays: null,
                            maxDays: null,
                            rates: rowRates
                        });
                    }
                    
                    if (headers.length < 3 || tableRows.length < 3) return false;
                    
                    // Now find the best rate based on amount (colIndex) and duration
                    // Find which duration column to use
                    var durColIndex = -1;
                    var bestMinDays = -1;
                    for (var d = 0; d < durationHeaders.length; d++) {
                        if (durationHeaders[d].minDays <= duration && durationHeaders[d].minDays > bestMinDays) {
                            bestMinDays = durationHeaders[d].minDays;
                            durColIndex = d;
                        }
                    }
                    
                    if (colIndex === -1 || durColIndex === -1) return false;
                    
                    var bestRate = tableRows[colIndex].rates[durColIndex];
                    if (!bestRate || bestRate <= 0) return false;
                    
                    // Build a proper table JSON - transpose to match other banks format:
                    // Headers = amount brackets (columns), Rows = duration (rows)
                    var outputHeaders = headers.map(function(h) {
                        return { label: h.label, minAmount: h.minAmount, maxAmount: h.maxAmount };
                    });
                    
                    // Transpose: each duration becomes a row, each amount becomes a column
                    var outputRows = durationHeaders.map(function(d, dIdx) {
                        var ratesForDuration = [];
                        for (var aIdx = 0; aIdx < tableRows.length; aIdx++) {
                            ratesForDuration.push(tableRows[aIdx].rates[dIdx]);
                        }
                        return {
                            label: d.label,
                            minDays: d.minDays,
                            maxDays: d.maxDays,
                            rates: ratesForDuration
                        };
                    });
                    
                    var tableJson = JSON.stringify({ headers: outputHeaders, rows: outputRows });
                    Android.sendRateWithTable(bestRate, '$description', 'Enpara.com', tableJson);
                    return true;
                }
                
                ${checkBotDetectionJs}
                
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) {
                        clearInterval(interval);
                        Android.sendError('BLOCKED');
                        return;
                    }
                    if (extractEnparaTable()) {
                        clearInterval(interval);
                    } else if (++attempts > 40) {
                        clearInterval(interval);
                        if (document.querySelector('.enpara-deposit-interest-rates__flex-table')) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getYapiKrediStandardJs(amount: Double, days: Int) = getYapiKrediApiJs(amount, days, true, "e-Mevduat")
    fun getYapiKrediWelcomeJs(amount: Double, days: Int) = getYapiKrediApiJs(amount, days, false, "Yeni Param (Hoş Geldin)")

    private fun getYapiKrediApiJs(amount: Double, days: Int, isStandard: Boolean, description: String) = """
        (function() {
            try {
                var amt = $amount; 
                var dur = $days;
                
                ${smartParseNumberJs}
                
                ${checkBotDetectionJs}
                
                function runApi() {
                    if (typeof ${'$'}.Page === 'undefined' || typeof ${'$'}.Page.GetCalculationTool === 'undefined') {
                        // Wait a bit if API is not loaded yet
                        return false;
                    }
                    
                    $.Page.GetCalculationTool($isStandard, "YTL").done(function(response) {
                        try {
                            if (!response || !response.Data || !response.Data.RateList || response.Data.RateList.length === 0) {
                                Android.sendError('PARSING_ERROR');
                                return;
                            }
                            
                            var rateData = response.Data.RateList[0];
                            var rateLevels = rateData.RateLevelList;
                            var groupedRates = rateData.GroupedRateList;
                            
                            if (!rateLevels || !groupedRates) {
                                Android.sendError('PARSING_ERROR');
                                return;
                            }
                            
                            // 1. Build Headers (Amount Brackets)
                            // API returns structured MinAmount/MaxAmount
                            var headers = [];
                            var colIndex = -1;
                            var bestMinAmount = -1;
                            
                            for (var i = 0; i < rateLevels.length; i++) {
                                var level = rateLevels[i];
                                var minAmt = level.MinAmount;
                                var maxAmt = level.MaxAmount;
                                
                                headers.push({
                                    label: level.Description, // e.g. "25-100 BİN"
                                    minAmount: minAmt,
                                    maxAmount: maxAmt
                                });
                                
                                // Find column with highest minAmount <= input amount
                                if (minAmt <= amt && minAmt > bestMinAmount) {
                                    bestMinAmount = minAmt;
                                    colIndex = i;
                                }
                            }
                            
                            if (colIndex === -1) {
                                // Amount might be too low or too high? Use closest?
                                // Usually if amount < min of first bracket, no rate.
                                Android.sendError('NO_MATCH');
                                return;
                            }
                            
                            // 2. Build Rows (Duration Ranges) and find best rate
                            var tableRows = [];
                            var bestRate = 0;
                            
                            for (var r = 0; r < groupedRates.length; r++) {
                                var group = groupedRates[r];
                                var minD = group.StartTenor;
                                var maxD = group.EndTenor;
                                var rates = group.Rates; // Array of rates corresponding to headers indices
                                
                                var rowRates = [];
                                // Copy rates to match our generic format (nullable doubles)
                                for (var c = 0; c < rates.length; c++) {
                                    rowRates.push(rates[c]);
                                }
                                
                                tableRows.push({
                                    label: minD + "-" + maxD + " Gün",
                                    minDays: minD,
                                    maxDays: maxD,
                                    rates: rowRates
                                });
                                
                                // Check if this row matches our duration
                                if (minD <= dur && maxD >= dur) {
                                    var rate = rates[colIndex];
                                    if (rate > 0) bestRate = rate;
                                }
                            }
                            
                            if (bestRate > 0) {
                                var tableJson = JSON.stringify({ headers: headers, rows: tableRows });
                                Android.sendRateWithTable(bestRate, '$description', 'Yapı Kredi', tableJson);
                            } else {
                                Android.sendError('NO_MATCH');
                            }
                            
                        } catch(e) { 
                            Android.log('Error parsing API response: ' + e);
                            Android.sendError('PARSING_ERROR'); 
                        }
                    }).fail(function() {
                        Android.sendError('NETWORK_ERROR');
                    });
                    
                    return true;
                }
                
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) {
                        clearInterval(interval);
                        Android.sendError('BLOCKED');
                        return;
                    }
                    
                    if (runApi()) {
                        clearInterval(interval);
                    } else if (++attempts > 20) {
                        clearInterval(interval);
                        Android.sendError('TIMEOUT'); // script didn't load in time
                    }
                }, 500);
                
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()
    
    fun getIsBankasiJs(amount: Double, days: Int, description: String = "İşCep Vadeli TL") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    // Use smartParseNumber to handle any locale format
                    var val = txt.replace('TL', '').replace('ÜZERİ', '').trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    return { min: smartParseNumber(val), max: 999999999 };
                }
                
                // İş Bankası specific: extract value from span.content or fall back to text
                function getCellValue(cell) {
                    var contentSpan = cell.querySelector('span.content');
                    if (contentSpan) {
                        return contentSpan.innerText.trim();
                    }
                    // Fallback: try to get text after removing any header spans
                    var headerSpan = cell.querySelector('span.headres');
                    if (headerSpan) {
                        var fullText = cell.innerText;
                        var headerText = headerSpan.innerText;
                        // Remove the header text from the full text
                        return fullText.replace(headerText, '').trim();
                    }
                    return cell.innerText.trim();
                }
                
                function findIsBankasiRate() {
                    var tables = document.querySelectorAll('table');
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        
                        // İş Bankası uses thead for headers and tbody for data
                        var thead = table.querySelector('thead');
                        var tbody = table.querySelector('tbody');
                        
                        // Get header row - prefer thead, fall back to first row
                        var headerRow = thead ? thead.querySelector('tr') : (table.rows && table.rows[0]);
                        if (!headerRow) continue;
                        
                        // Check if this is an interest rate table by looking for 'vade' in header
                        var headerText = headerRow.innerText.toLowerCase();
                        if (headerText.indexOf('vade') === -1) continue;
                        
                        // Get header cells - can be th or td
                        var headerCells = headerRow.querySelectorAll('th, td');
                        if (headerCells.length < 2) continue;
                        
                        // Find column for amount - use highest minAmount that is <= input amount
                        var colIndex = -1;
                        var headers = [];
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var amtRange = parseAmountRange(cellTxt);
                            headers.push({
                                label: cellTxt,
                                minAmount: amtRange.min,
                                maxAmount: amtRange.max
                            });
                            // Find column with highest minAmount that is still <= input amount
                            if (amtRange.min <= amount && amtRange.min > bestMinAmount) {
                                bestMinAmount = amtRange.min;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1) continue;
                        
                        // Get data rows from tbody, or all rows after first if no tbody
                        var dataRows = tbody ? tbody.querySelectorAll('tr') : [];
                        if (dataRows.length === 0 && table.rows) {
                            dataRows = Array.from(table.rows).slice(1);
                        }
                        
                        // Find row for duration - use highest minDays <= input
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 0; r < dataRows.length; r++) {
                            var row = dataRows[r];
                            var cells = row.querySelectorAll('td');
                            if (cells.length < 2) continue;
                            
                            // First cell is the duration - use getCellValue to extract properly
                            var durTxt = getCellValue(cells[0]);
                            var durParsed = parseDuration(durTxt);
                            
                            // Extract rates from each cell using getCellValue
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rateTxt = getCellValue(cells[c]);
                                var rate = smartParseNumber(rateTxt);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            // Find row with highest minDays <= input duration
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: headers,
                                rows: tableRows
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'İş Bankası', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) {
                        clearInterval(interval);
                        Android.sendError('BLOCKED');
                        return;
                    }
                    if (findIsBankasiRate()) {
                        clearInterval(interval);
                    } else if (++attempts > 40) {
                        clearInterval(interval);
                        if (document.querySelectorAll('table').length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getZiraatJs(amount: Double, days: Int, description: String = "İnternet Şubesi Vadeli TL") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    // Use smartParseNumber to handle any locale format
                    var val = txt.replace('TL', '').replace('ve üzeri', '').trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    return { min: smartParseNumber(val), max: 999999999 };
                }
                
                function extractZiraatTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Found ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        
                        // Ziraat uses tbody only, no thead. First row is header.
                        var tbody = table.querySelector('tbody');
                        var allRows = tbody ? tbody.querySelectorAll('tr') : table.rows;
                        if (!allRows || allRows.length < 3) continue;
                        
                        // First row is header
                        var headerRow = allRows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        
                        // IMPORTANT: Skip tables with less than 4 columns (small amounts table has only 3)
                        // We want the main table with 5 columns
                        if (headerCells.length < 4) {
                            Android.log('Skipping table ' + t + ' - only ' + headerCells.length + ' columns');
                            continue;
                        }
                        
                        var headerText = headerRow.innerText.toLowerCase();
                        if (headerText.indexOf('vade') === -1) continue;
                        
                        Android.log('Processing table ' + t + ' with ' + headerCells.length + ' columns and ' + allRows.length + ' rows');
                        
                        // Find column for amount - use highest minAmount that is <= input amount
                        var colIndex = -1;
                        var headers = [];
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var amtRange = parseAmountRange(cellTxt);
                            Android.log('Header ' + i + ': ' + cellTxt + ' -> min=' + amtRange.min);
                            headers.push({
                                label: cellTxt,
                                minAmount: amtRange.min,
                                maxAmount: amtRange.max
                            });
                            // Find column with highest minAmount that is still <= input amount
                            if (amtRange.min <= amount && amtRange.min > bestMinAmount) {
                                bestMinAmount = amtRange.min;
                                colIndex = i;
                            }
                        }
                        
                        Android.log('Selected column ' + colIndex + ' for amount ' + amount);
                        
                        if (colIndex === -1 || headers.length < 3) continue;
                        
                        // Find row for duration - use highest minDays <= input
                        // Data rows start from index 1 (skip header at index 0)
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < allRows.length; r++) {
                            var row = allRows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < 2) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            // Find row with highest minDays <= input duration
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: headers,
                                rows: tableRows
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'Ziraat Bankası', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        if (step === 0) {
                            // Step 0: Click accordion button to expand
                            var accordion = document.querySelector('button#accordion1');
                            if (!accordion) {
                                // Try finding by text content
                                var buttons = document.querySelectorAll('button');
                                for (var i = 0; i < buttons.length; i++) {
                                    if (buttons[i].innerText.indexOf('Vadeli Türk Lirası Mevduat Faiz Oranları') > -1) {
                                        accordion = buttons[i];
                                        break;
                                    }
                                }
                            }
                            if (accordion && accordion.getAttribute('aria-expanded') !== 'true') {
                                accordion.click();
                            }
                            step = 1;
                        } else if (step === 1) {
                            // Step 1: Click "İnternet Şube Oranları" radio button for digital rates
                            var radioLabel = document.querySelector('label[for="rdIntBranchVadeliTL"]');
                            if (radioLabel) {
                                radioLabel.click();
                            } else {
                                // Try finding by text
                                var labels = document.querySelectorAll('label');
                                for (var i = 0; i < labels.length; i++) {
                                    if (labels[i].innerText.indexOf('İnternet Şube') > -1) {
                                        labels[i].click();
                                        break;
                                    }
                                }
                            }
                            step = 2;
                        } else if (step === 2) {
                            // Step 2: Extract table
                            if (extractZiraatTable()) {
                                clearInterval(interval);
                                return;
                            }
                        }
                    } catch(innerE) { Android.sendError('PARSING_ERROR'); }
                    
                    if (++attempts > 60) { 
                        clearInterval(interval);
                        Android.sendError('PARSING_ERROR'); 
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getHalkbankJs(amount: Double, days: Int, description: String = "İnternet Vadeli TL") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    var val = txt.replace('TL', '').replace(',', '.').replace(/\./g, function(m, i, s) {
                        // Keep only the last dot as decimal
                        return (s.lastIndexOf('.') === i) ? '.' : '';
                    }).trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    return { min: smartParseNumber(val), max: 999999999 };
                }
                
                function extractHalkbankTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Found ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        
                        // Halkbank has 7 columns
                        if (headerCells.length < 4) continue;
                        
                        var headerText = headerRow.innerText.toLowerCase();
                        if (headerText.indexOf('vade') === -1) continue;
                        
                        Android.log('Processing table with ' + headerCells.length + ' columns');
                        
                        // Find column for amount
                        var colIndex = -1;
                        var headers = [];
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var amtRange = parseAmountRange(cellTxt);
                            Android.log('Header ' + i + ': ' + cellTxt + ' -> min=' + amtRange.min);
                            headers.push({
                                label: cellTxt,
                                minAmount: amtRange.min,
                                maxAmount: amtRange.max
                            });
                            if (amtRange.min <= amount && amtRange.min > bestMinAmount) {
                                bestMinAmount = amtRange.min;
                                colIndex = i;
                            }
                        }
                        
                        Android.log('Selected column ' + colIndex + ' for amount ' + amount);
                        
                        if (colIndex === -1 || headers.length < 3) continue;
                        
                        // Find row for duration
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < 2) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        Android.log('Selected row ' + bestRowIndex + ' for duration ' + duration);
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: headers,
                                rows: tableRows
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'Halkbank', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        if (step === 0) {
                            // Step 0: Select "İnternet/Mobil Şube" rates from dropdown
                            // Halkbank uses select2 jQuery dropdown
                            if (typeof $ !== 'undefined' && $('#type').length) {
                                $('#type').val('1').trigger('change');
                                Android.log('Selected Internet rates via jQuery');
                            } else {
                                // Fallback: find and click the dropdown
                                var select = document.querySelector('#type');
                                if (select) {
                                    select.value = '1';
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                    Android.log('Selected Internet rates via native');
                                }
                            }
                            step = 1;
                        } else if (step === 1) {
                            // Step 1: Wait a bit for table to update, then extract
                            if (extractHalkbankTable()) {
                                clearInterval(interval);
                                return;
                            }
                        }
                    } catch(innerE) { 
                        Android.log('Error: ' + innerE.message);
                    }
                    
                    if (++attempts > 60) { 
                        clearInterval(interval);
                        var tables = document.querySelectorAll('table');
                        if (tables.length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getVakifbankJs(amount: Double, days: Int, description: String = "Tanışma Kampanyası") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    var val = txt.replace('TL', '').trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    var num = smartParseNumber(val);
                    if (val.toLowerCase().indexOf('üzeri') > -1 || val.indexOf('+') > -1) {
                        return { min: num, max: 999999999 };
                    }
                    return { min: num, max: num };
                }
                
                // VakıfBank has TRANSPOSED table: Amounts in ROWS, Durations in COLUMNS
                function extractVakifbankTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Found ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        
                        if (headerCells.length < 4) continue;
                        
                        // First column is "Tutar Aralığı", rest are duration ranges
                        var firstHeader = headerCells[0].innerText.toLowerCase();
                        if (firstHeader.indexOf('tutar') === -1) continue;
                        
                        Android.log('Processing VakifBank table with ' + headerCells.length + ' columns');
                        
                        // Parse header columns (duration ranges)
                        var headers = [];
                        var colIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var durParsed = parseDuration(cellTxt);
                            Android.log('Duration header ' + i + ': ' + cellTxt + ' -> min=' + (durParsed ? durParsed.min : 'null'));
                            headers.push({
                                label: cellTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null
                            });
                            // Find column with highest minDays <= input duration
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                colIndex = i;
                            }
                        }
                        
                        Android.log('Selected column ' + colIndex + ' for duration ' + duration);
                        
                        if (colIndex === -1 || headers.length < 3) continue;
                        
                        // Find row for amount
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinAmount = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < 2) continue;
                            
                            // First cell is amount range
                            var amtTxt = cells[0].innerText.trim();
                            var amtParsed = parseAmountRange(amtTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: amtTxt,
                                minAmount: amtParsed.min,
                                maxAmount: amtParsed.max,
                                rates: rowRates
                            });
                            
                            // Find row with highest minAmount <= input amount
                            if (amtParsed.min <= amount && amtParsed.min > bestMinAmount) {
                                bestMinAmount = amtParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        Android.log('Selected row ' + bestRowIndex + ' for amount ' + amount);
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            // Convert to standard format for table display
                            var tableJson = JSON.stringify({
                                headers: tableRows.map(function(r) { return { label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount }; }),
                                rows: headers.map(function(h, idx) {
                                    return {
                                        label: h.label,
                                        minDays: h.minDays,
                                        maxDays: h.maxDays,
                                        rates: tableRows.map(function(r) { return r.rates[idx]; })
                                    };
                                })
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'VakıfBank', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        if (step === 0) {
                            // Step 0: Click "Tanışma Kampanyası" button for best rates
                            var buttons = document.querySelectorAll('a.btn');
                            for (var i = 0; i < buttons.length; i++) {
                                if (buttons[i].innerText.indexOf('Tanışma Kampanyası') > -1) {
                                    buttons[i].click();
                                    Android.log('Clicked Tanışma Kampanyası button');
                                    break;
                                }
                            }
                            step = 1;
                        } else if (step === 1) {
                            // Step 1: Extract table
                            if (extractVakifbankTable()) {
                                clearInterval(interval);
                                return;
                            }
                        }
                    } catch(innerE) { 
                        Android.log('Error: ' + innerE.message);
                    }
                    
                    if (++attempts > 60) { 
                        clearInterval(interval);
                        var tables = document.querySelectorAll('table');
                        if (tables.length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    // VakıfBank E-Vadeli (standard rates, not promotional)
    fun getVakifbankEVadeliJs(amount: Double, days: Int, description: String = "E-Vadeli Hesabı") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    var val = txt.replace('TL', '').trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    var num = smartParseNumber(val);
                    if (val.toLowerCase().indexOf('üzeri') > -1 || val.indexOf('+') > -1) {
                        return { min: num, max: 999999999 };
                    }
                    return { min: num, max: num };
                }
                
                // VakıfBank has TRANSPOSED table: Amounts in ROWS, Durations in COLUMNS
                function extractVakifbankTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Found ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        
                        if (headerCells.length < 4) continue;
                        
                        var firstHeader = headerCells[0].innerText.toLowerCase();
                        if (firstHeader.indexOf('tutar') === -1) continue;
                        
                        Android.log('Processing VakifBank E-Vadeli table');
                        
                        var headers = [];
                        var colIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var durParsed = parseDuration(cellTxt);
                            headers.push({
                                label: cellTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null
                            });
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1 || headers.length < 3) continue;
                        
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinAmount = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < 2) continue;
                            
                            var amtTxt = cells[0].innerText.trim();
                            var amtParsed = parseAmountRange(amtTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: amtTxt,
                                minAmount: amtParsed.min,
                                maxAmount: amtParsed.max,
                                rates: rowRates
                            });
                            
                            if (amtParsed.min <= amount && amtParsed.min > bestMinAmount) {
                                bestMinAmount = amtParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: tableRows.map(function(r) { return { label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount }; }),
                                rows: headers.map(function(h, idx) {
                                    return {
                                        label: h.label,
                                        minDays: h.minDays,
                                        maxDays: h.maxDays,
                                        rates: tableRows.map(function(r) { return r.rates[idx]; })
                                    };
                                })
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'VakıfBank', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        if (step === 0) {
                            // Step 0: Click "E-Vadeli Hesabı" button for standard rates
                            var buttons = document.querySelectorAll('a.btn');
                            for (var i = 0; i < buttons.length; i++) {
                                if (buttons[i].innerText.indexOf('E-Vadeli Hesabı') > -1) {
                                    buttons[i].click();
                                    Android.log('Clicked E-Vadeli Hesabı button');
                                    break;
                                }
                            }
                            step = 1;
                        } else if (step === 1) {
                            if (extractVakifbankTable()) {
                                clearInterval(interval);
                                return;
                            }
                        }
                    } catch(innerE) { 
                        Android.log('Error: ' + innerE.message);
                    }
                    
                    if (++attempts > 60) { 
                        clearInterval(interval);
                        var tables = document.querySelectorAll('table');
                        if (tables.length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getAlternatifBankJs(amount: Double, days: Int, description: String = "E-Mevduat TRY") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function parseAmountRange(txt) {
                    // Alternatif Bank format: "999.99-10000" or "1000000-5000000"
                    var val = txt.replace(/\s/g, '').trim();
                    if (val.indexOf('-') > -1) {
                        var parts = val.split('-');
                        return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                    }
                    var num = smartParseNumber(val);
                    return { min: num, max: 999999999 };
                }
                
                function extractAlternatifTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Found ' + tables.length + ' tables');
                    
                    // Alternatif Bank has many tables, need to find the right one
                    // Looking for table with "VADE" in header and valid rate data
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        
                        // Check if table is visible
                        var rect = table.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) continue;
                        
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        
                        if (headerCells.length < 4) continue;
                        
                        // Check for VADE in first column header
                        var firstHeader = headerCells[0].innerText.toUpperCase();
                        if (firstHeader.indexOf('VADE') === -1) continue;
                        
                        Android.log('Processing table ' + t + ' with ' + headerCells.length + ' columns');
                        
                        // Parse amount column headers
                        var headers = [];
                        var colIndex = -1;
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var amtRange = parseAmountRange(cellTxt);
                            Android.log('Header ' + i + ': ' + cellTxt + ' -> min=' + amtRange.min);
                            headers.push({
                                label: cellTxt,
                                minAmount: amtRange.min,
                                maxAmount: amtRange.max
                            });
                            if (amtRange.min <= amount && amtRange.min > bestMinAmount) {
                                bestMinAmount = amtRange.min;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1 || headers.length < 3) continue;
                        
                        Android.log('Selected column ' + colIndex + ' for amount ' + amount);
                        
                        // Parse duration rows
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < 2) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex === -1 || tableRows.length < 2) continue;
                        
                        Android.log('Selected row ' + bestRowIndex + ' for duration ' + duration);
                        
                        var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                        if (bestRate && bestRate > 0) {
                            var tableJson = JSON.stringify({
                                headers: headers,
                                rows: tableRows
                            });
                            Android.sendRateWithTable(bestRate, '$description', 'Alternatif Bank', tableJson);
                            return true;
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        if (extractAlternatifTable()) {
                            clearInterval(interval);
                            return;
                        }
                    } catch(innerE) { 
                        Android.log('Error: ' + innerE.message);
                    }
                    
                    if (++attempts > 60) { 
                        clearInterval(interval);
                        var tables = document.querySelectorAll('table');
                        if (tables.length > 0) {
                            Android.sendError('NO_MATCH');
                        } else {
                            Android.sendError('PARSING_ERROR');
                        }
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getOdeabankJs(amount: Double, days: Int, description: String = "İnternet/Mobil Vadeli") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function cleanText(txt) {
                    // Remove zero-width spaces and other invisible chars
                    return txt.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                }
                
                function parseAmountRange(txt) {
                    var cleaned = cleanText(txt);
                    // Handle range like "1.000 - 10.000"
                    if (cleaned.indexOf('-') > -1) {
                        var parts = cleaned.split('-');
                        return { 
                            min: smartParseNumber(parts[0]), 
                            max: smartParseNumber(parts[1]) 
                        };
                    }
                    // Handle "1.000.001+" or "1.000.001 ve üzeri"
                    var num = smartParseNumber(cleaned);
                    return { min: num, max: 999999999 };
                }
                
                function extractOdeabankTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Checking ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        
                        // Check if table is visible - it needs some height
                        var rect = table.getBoundingClientRect();
                        if (rect.height < 10) continue;
                        
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('td, th');
                        if (headerCells.length < 3) continue;
                        
                        
                        var firstHeader = cleanText(headerCells[0].innerText || headerCells[0].textContent).toUpperCase();
                        if (firstHeader.indexOf('VADE') === -1) continue;
                        
                        // New filter: The table should be for TL (usually has a label nearby)
                        var containerText = (table.closest('.accordion-content') || table.parentElement).innerText;
                        if (containerText.indexOf('TL') === -1) {
                            Android.log('Found VADE table but not in TL context, skipping');
                            continue;
                        }

                        Android.log('Found potential Odeabank table at index ' + t);
                        
                        var headers = [];
                        var colIndex = -1;
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText;
                            var amtRange = parseAmountRange(cellTxt);
                            headers.push({
                                label: cellTxt.trim(),
                                minAmount: amtRange.min,
                                maxAmount: amtRange.max
                            });
                            if (amtRange.min <= amount && amtRange.min > bestMinAmount) {
                                bestMinAmount = amtRange.min;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1) {
                            Android.log('No amount column matched for ' + amount);
                            continue;
                        }
                        
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < colIndex + 1) continue;
                            
                            var durTxt = cells[0].innerText;
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt.trim(),
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex !== -1) {
                            var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                            if (bestRate && bestRate > 0) {
                                var tableJson = JSON.stringify({
                                    headers: headers,
                                    rows: tableRows
                                });
                                Android.sendRateWithTable(bestRate, '$description', 'Odeabank', tableJson);
                                return true;
                            }
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        
                        if (step === 0) {
                            // Find and click the accordion
                            var accordion = document.getElementById('accordion-2');
                            if (!accordion) {
                                var labels = document.querySelectorAll('button, .accordion-title, h2, h3');
                                for (var i = 0; i < labels.length; i++) {
                                    if (labels[i].innerText.indexOf('İnternet/Mobil') > -1) {
                                        accordion = labels[i];
                                        break;
                                    }
                                }
                            }
                            
                            if (accordion) {
                                // Some buttons wrap the click target
                                var clickTarget = accordion.querySelector('button') || accordion;
                                if (accordion.getAttribute('aria-expanded') !== 'true') {
                                    clickTarget.click();
                                    Android.log('Odeabank: Clicked accordion');
                                }
                                step = 1;
                                attempts = 0; // Reset attempts to wait for expansion
                            } else {
                                Android.log('Odeabank: Accordion not found');
                            }
                        } else {
                            if (extractOdeabankTable()) {
                                clearInterval(interval);
                                return;
                            }
                        }
                    } catch(e) {
                        Android.log('Odeabank Error: ' + e.message);
                    }
                    
                    if (++attempts > 40) {
                        clearInterval(interval);
                        Android.sendError('NO_MATCH');
                    }
                }, 800); // Slightly slower interval to allow for animation
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getDenizbankJs(amount: Double, days: Int, description: String = "E-Mevduat") = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var step = 0;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                function extractDenizbankTable() {
                    var tables = document.querySelectorAll('table');
                    Android.log('Denizbank: Checking ' + tables.length + ' tables');
                    
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 3) continue;
                        
                        // Denizbank tables often have a double header or nested structure
                        // Find the row that actually contains amount ranges (e.g. "1.000 - 24.999")
                        var headerRowIndex = -1;
                        var headerCells = [];
                        
                        for (var r = 0; r < Math.min(rows.length, 3); r++) {
                            var cells = rows[r].querySelectorAll('td, th');
                            var hasAmount = false;
                            for (var c = 0; c < cells.length; c++) {
                                var txt = cells[c].innerText;
                                if (txt.indexOf('-') > -1 && txt.match(/\d/)) {
                                    hasAmount = true;
                                    break;
                                }
                            }
                            if (hasAmount) {
                                headerRowIndex = r;
                                headerCells = cells;
                                break;
                            }
                        }
                        
                        if (headerRowIndex === -1) continue;
                        
                        var firstCellTxt = rows[headerRowIndex].cells[0].innerText.toUpperCase();
                        if (firstCellTxt.indexOf('GÜN') === -1 && firstCellTxt.indexOf('VADE') === -1) continue;
                        
                        Android.log('Denizbank: Found table at index ' + t + ' with header row ' + headerRowIndex);
                        
                        var headers = [];
                        var colIndex = -1;
                        var bestMinAmount = -1;
                        
                        for (var i = 1; i < headerCells.length; i++) {
                            var cellTxt = headerCells[i].innerText.trim();
                            var minVal = smartParseNumber(cellTxt);
                            
                            var maxVal = 999999999;
                            if (cellTxt.indexOf('-') > -1) {
                                var parts = cellTxt.split('-');
                                maxVal = smartParseNumber(parts[1]);
                            }
                            
                            headers.push({
                                label: cellTxt,
                                minAmount: minVal,
                                maxAmount: maxVal
                            });
                            
                            if (minVal <= amount && minVal > bestMinAmount) {
                                bestMinAmount = minVal;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1) continue;
                        
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = headerRowIndex + 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < colIndex + 1) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            var rowIdx = tableRows.length;
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = rowIdx;
                            }
                        }
                        
                        if (bestRowIndex !== -1) {
                            var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                            if (bestRate && bestRate > 0) {
                                var tableJson = JSON.stringify({
                                    headers: headers,
                                    rows: tableRows
                                });
                                Android.sendRateWithTable(bestRate, '$description', 'DenizBank', tableJson);
                                return true;
                            }
                        }
                    }
                    return false;
                }
                
                ${checkBotDetectionJs}
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        
                        if (extractDenizbankTable()) {
                            clearInterval(interval);
                            return;
                        }
                        
                    } catch(e) {
                        Android.log('Denizbank Error: ' + e.message);
                    }
                    
                    if (++attempts > 40) {
                        clearInterval(interval);
                        Android.sendError('NO_MATCH');
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()

    fun getGarantiJs(amount: Double, days: Int, description: String) = """
        (function() {
            try {
                var amount = $amount;
                var duration = $days;
                var attempts = 0;
                
                ${smartParseNumberJs}
                
                ${parseDurationJs}
                
                ${checkBotDetectionJs}
                
                function extractGarantiTable() {
                    var tables = document.querySelectorAll('table');
                    for (var t = 0; t < tables.length; t++) {
                        var table = tables[t];
                        // Garanti tables might be hidden in tabs. Check visibility? 
                        // Usually parsing all tables is fine if we check regex.
                        
                        var rows = table.querySelectorAll('tr');
                        if (rows.length < 2) continue;
                        
                        var headerRow = rows[0];
                        var headerCells = headerRow.querySelectorAll('th, td');
                        if (headerCells.length < 2) continue;
                        
                        // Check first header cell. Usually empty or "Vade" or "Tutar"
                        // If it's Garanti, typically Columns are Amounts, Rows are Durations
                        
                        var headers = [];
                        var colIndex = -1;
                        var bestMinAmount = -1;
                        
                        // Parse Header for Amount Ranges
                        for (var i = 1; i < headerCells.length; i++) {
                            var txt = headerCells[i].innerText.trim();
                            // Handle: "1.000 - 100.000 TL", "100.000 - 250.000", "5.000.000 +"
                            
                            var minAmt = 0, maxAmt = 999999999;
                            
                            // Check for range
                            if (txt.indexOf('-') > -1) {
                                var parts = txt.split('-');
                                minAmt = smartParseNumber(parts[0]);
                                maxAmt = smartParseNumber(parts[1]);
                            } else if (txt.indexOf('+') > -1 || txt.toLowerCase().indexOf('üzeri') > -1 || txt.toLowerCase().indexOf('ve üstü') > -1) {
                                minAmt = smartParseNumber(txt);
                            } else {
                                // Maybe just a number? Assume it's a min threshold
                                var n = smartParseNumber(txt);
                                if (!isNaN(n)) minAmt = n;
                            }
                            
                            headers.push({
                                label: txt,
                                minAmount: minAmt,
                                maxAmount: maxAmt
                            });
                            
                            if (minAmt <= amount && minAmt > bestMinAmount) {
                                bestMinAmount = minAmt;
                                colIndex = i;
                            }
                        }
                        
                        if (colIndex === -1 || headers.length === 0) continue;
                        
                        // Parse Rows for Duration
                        var tableRows = [];
                        var bestRowIndex = -1;
                        var bestMinDays = -1;
                        
                        for (var r = 1; r < rows.length; r++) {
                            var row = rows[r];
                            var cells = row.querySelectorAll('td, th');
                            if (cells.length < headerCells.length) continue;
                            
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            
                            var rowRates = [];
                            // Get rates
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            
                            tableRows.push({
                                label: durTxt,
                                minDays: durParsed ? durParsed.min : null,
                                maxDays: durParsed ? durParsed.max : null,
                                rates: rowRates
                            });
                            
                            if (durParsed && durParsed.min <= duration && durParsed.min > bestMinDays) {
                                bestMinDays = durParsed.min;
                                bestRowIndex = tableRows.length - 1;
                            }
                        }
                        
                        if (bestRowIndex > -1) {
                            var bestRate = tableRows[bestRowIndex].rates[colIndex - 1];
                            
                            if (bestRate && bestRate > 0) {
                                var tableJson = JSON.stringify({
                                     headers: headers,
                                     rows: tableRows
                                });
                                Android.sendRateWithTable(bestRate, '$description', 'Garanti BBVA', tableJson);
                                return true;
                            }
                        }
                    }
                    return false;
                }
                
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) {
                            clearInterval(interval);
                            Android.sendError('BLOCKED');
                            return;
                        }
                        
                        if (extractGarantiTable()) {
                            clearInterval(interval);
                            return;
                        }
                    } catch(e) { Android.log('Garanti error: ' + e); }
                    
                    if (++attempts > 40) {
                        clearInterval(interval);
                        Android.sendError('NO_MATCH');
                    }
                }, 500);
            } catch(e) { Android.sendError('PARSING_ERROR'); }
        })();
    """.trimIndent()
}

