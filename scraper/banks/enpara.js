module.exports = {
    name: "Enpara",
    url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
    desc: "Vadeli Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function logError(msg) { console.log('ENPARA_ERROR: ' + msg); }
            
            function extractEnparaTable() {
                var table = document.querySelector('.enpara-deposit-interest-rates__flex-table--active') || 
                           document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY') || 
                           document.querySelector('.enpara-deposit-interest-rates__flex-table');

                if (!table) {
                    // Only log this if we've tried a few times
                    if (attempts > 5) logError('Flex table container not found');
                    return false;
                }

                // Enpara Flex Table Structure Validation
                var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item'));
                if (allItems.length < 5) {
                    logError('Table found but has fewer than 5 items (' + allItems.length + ')');
                    return false;
                }
                
                // 1. Identify Headers
                // Expected Headers: "Mevduat büyüklüğü", "32 Gün", "46 Gün", "92 Gün", "181 Gün"
                // We typically expect 5 columns.
                var durationHeaders = [];
                var numColumns = 5; 
                var headerItemsFound = 0;
                
                // Scan first row strictly
                for(var i=1; i<allItems.length; i++) {
                    var txt = allItems[i].innerText.trim();
                    if (txt.toLowerCase().includes('gün')) {
                        var num = parseInt(txt.replace(/[^0-9]/g, ''));
                        durationHeaders.push({ label: txt, minDays: num, maxDays: num, colIndex: i });
                        headerItemsFound++;
                    } else if (allItems[i].querySelector('hr') || txt.includes('%') || (txt === '' && i > 1)) {
                        // End of header row detected
                        numColumns = i;
                        break;
                    }
                    if (headerItemsFound >= 4) { numColumns = i + 1; break; }
                }
                
                if (durationHeaders.length === 0) {
                    logError('No duration headers found (looking for "Gün"). First item text: ' + allItems[1].innerText);
                    return false;
                }
                
                // Strict Matrix Validation
                // We expect at least one "32 Gün" or similar common duration
                var hasStandardDuration = durationHeaders.some(d => d.minDays === 32 || d.minDays === 92);
                if (!hasStandardDuration) {
                    logError('Headers found (' + durationHeaders.map(d=>d.label).join(',') + ') but missing standard 32/92 days.');
                    // Continue anyway, but warn
                }

                var amountHeaders = [];
                var tableRows = [];
                
                // Process rows
                for (var i = numColumns; i < allItems.length; i += numColumns) {
                    var chunk = allItems.slice(i, i + numColumns);
                    if (chunk.length < numColumns) break;
                    
                    var amountItem = chunk[0];
                    var amountTxt = amountItem.innerText.trim().split('\\n')[0].trim(); 
                    
                     var minAmt = 0, maxAmt = 999999999;
                    if (amountTxt.indexOf('-') > -1) {
                        var parts = amountTxt.split('-');
                        minAmt = smartParseNumber(parts[0]);
                        maxAmt = smartParseNumber(parts[1]);
                    } else if (amountTxt.includes('+') || amountTxt.toLowerCase().includes('üzeri')) {
                        minAmt = smartParseNumber(amountTxt);
                    } else {
                        minAmt = smartParseNumber(amountTxt);
                    }
                    
                    if (minAmt === 0 && !amountTxt.includes('TL')) continue; // Skip invalid rows
                    
                    amountHeaders.push({ label: amountTxt, minAmount: minAmt, maxAmount: maxAmt });
                    
                    var rowRates = [];
                    for (var d = 0; d < durationHeaders.length; d++) {
                        // Use relative index in chunk: d+1 because index 0 is amount
                        var cell = chunk[d + 1];
                        if (!cell) continue;
                        var rateTxt = cell.innerText.trim();
                        
                        // Extract rate: "32 Gün\n%48,00" -> 48.00
                        var match = rateTxt.match(/%\s*([0-9,]+)/);
                        var rate = match ? smartParseNumber(match[1]) : (smartParseNumber(rateTxt) < 100 ? smartParseNumber(rateTxt) : null);
                        
                        rowRates.push(rate);
                    }
                     tableRows.push({ label: amountTxt, rates: rowRates });
                }
                
                if (tableRows.length === 0) {
                    logError('Table structure matched but no valid data rows parsed.');
                    return false;
                }

                // Pivot for Android
                var outputRows = durationHeaders.map(function(d, i) {
                    var ratesForThisDuration = tableRows.map(function(r) { return r.rates[i]; });
                    return {
                        label: d.label,
                        minDays: d.minDays,
                        maxDays: d.maxDays,
                        rates: ratesForThisDuration
                    };
                });

                Android.sendRateWithTable(outputRows[0].rates[0], 'Vadeli Mevduat', 'Enpara.com', JSON.stringify({headers: amountHeaders, rows: outputRows}));
                return true;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractEnparaTable()) clearInterval(interval);
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    logError('Timeout waiting for table (40 attempts)');
                    Android.sendError('NO_MATCH'); 
                }
            }, 800);
        } catch(e) { 
            console.log('ENPARA_FATAL_ERROR: ' + e.message);
            Android.sendError('PARSING_ERROR'); 
        }
    })()`
};
