module.exports = {
    name: "Enpara",
    url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
    desc: "Vadeli Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function extractEnparaTable() {
                var table = document.querySelector('.enpara-deposit-interest-rates__flex-table--active') || 
                           document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY') || 
                           document.querySelector('.enpara-deposit-interest-rates__flex-table');

                if (!table) return false;

                // Enpara Flex Table Structure:
                // It's a series of DIVs (.enpara-deposit-interest-rates__flex-table-item)
                // The first row (headers) has items 0 to N.
                // Then a HR separator.
                // Then rows...
                
                var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item'));
                if (allItems.length < 5) return false;
                
                // Identify headers from the first few items
                // Usually: "Mevduat büyüklüğü", "32 Gün", "46 Gün", "92 Gün", "181 Gün"
                var durationHeaders = [];
                var numColumns = 5; // Default assumption
                
                // Scan first row to find durations
                for(var i=1; i<allItems.length; i++) {
                    var txt = allItems[i].innerText.trim();
                    // If we hit a value with "TL" or a number that looks like a rate immediately, we might have moved to next row?
                    // But Enpara headers are distinct.
                    if (txt.toLowerCase().includes('gün')) {
                        var num = parseInt(txt.replace(/[^0-9]/g, ''));
                        durationHeaders.push({ label: txt, minDays: num, maxDays: num, colIndex: i });
                    } else if (allItems[i].querySelector('hr') || txt.includes('%') || txt === '') {
                        // End of header row
                        numColumns = i; // This logic might be brittle if there's no clear break, but usually headers are top 5
                        break;
                    }
                    if (durationHeaders.length >= 4) { numColumns = i + 1; break; } // stop if we have typical 4 durations
                }
                
                if (durationHeaders.length === 0) return false;

                var amountHeaders = [];
                var tableRows = [];
                
                // Process rows. 
                // We skip the first 'numColumns' items (headers).
                // Then we take chunks of 'numColumns'.
                for (var i = numColumns; i < allItems.length; i += numColumns) {
                    var chunk = allItems.slice(i, i + numColumns);
                    if (chunk.length < numColumns) break;
                    
                    var amountItem = chunk[0];
                    var amountTxt = amountItem.innerText.trim();
                    // Clean up hidden labels if present
                    amountTxt = amountTxt.split('\\n')[0].trim(); 
                    
                    // Parse amount range
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
                        var colIdx = durationHeaders[d].colIndex; // This is relative to row start? No, colIndex was absolute.
                        // Relative index in chunk is colIdx.
                        // Wait, if headers are 0,1,2,3,4. 1 is 32 days.
                        // Then in chunk, index 1 should be 32 days rate.
                        var cell = chunk[colIdx];
                        var rateTxt = cell.innerText.trim();
                        
                        // Extract rate: "32 Gün\n%48,00" -> 48.00
                        var match = rateTxt.match(/%\\s*([0-9,]+)/);
                        var rate = match ? smartParseNumber(match[1]) : (smartParseNumber(rateTxt) < 100 ? smartParseNumber(rateTxt) : null);
                        
                        rowRates.push(rate);
                    }
                     tableRows.push({ label: amountTxt, rates: rowRates });
                }
                
                if (tableRows.length === 0) return false;

                // Pivot for Android
                var outputRows = durationHeaders.map(function(d, i) {
                    var ratesForThisDuration = tableRows.map(function(r) {
                        return r.rates[i];
                    });
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
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
