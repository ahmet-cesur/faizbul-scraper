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

                // Fallback: Find by content if class search fails
                if (!table) {
                    var allDivs = document.querySelectorAll('div');
                    for (var i = 0; i < allDivs.length; i++) {
                        if (allDivs[i].innerText.includes('32 Gün') && allDivs[i].innerText.includes('92 Gün')) {
                            // Verify it has children that look like rows
                            if (allDivs[i].children.length > 3) {
                                table = allDivs[i];
                                break;
                            }
                        }
                    }
                }

                if (!table) return false;
                var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item, div[class*="flex-table-item"]'));
                // Use children if querySelectorAll fails to find items but table was found by content
                if (allItems.length < 5) { 
                    allItems = Array.from(table.children).filter(c => c.innerText.trim().length > 0);
                }
                if (allItems.length < 5) return false;
                
                // Find all duration headers first
                var durationHeaders = [];
                var firstRowItems = allItems.slice(0, 10); // Check first few items for headers
                for (var i = 0; i < firstRowItems.length; i++) {
                    var headEl = firstRowItems[i].querySelector('.enpara-deposit-interest-rates__flex-table-head') || firstRowItems[i];
                    if (headEl) {
                        var txt = headEl.innerText.trim();
                        if (txt.toLowerCase().includes('gün')) {
                            var num = parseInt(txt.replace(/[^0-9]/g, ''));
                            durationHeaders.push({ label: txt, minDays: num, maxDays: num, indexInRow: i % 5 });
                        }
                    }
                }
                if (durationHeaders.length === 0) return false;
                
                var amountHeaders = [];
                var tableRows = [];
                // Process in steps of 5
                for (var i = 0; i < allItems.length; i += 5) {
                    var items = allItems.slice(i, i + 5);
                    if (items.length < 5) continue;
                    
                    var amountItem = items[0];
                    var amountEl = amountItem.querySelector('.enpara-deposit-interest-rates__flex-table-value') || 
                                   amountItem.querySelector('.enpara-deposit-interest-rates__flex-table-head') || 
                                   amountItem;
                    if (!amountEl) continue;
                    var amountTxt = amountEl.innerText.trim();
                    if (!amountTxt.match(/\\d/) && !amountTxt.includes('TL')) continue; // Skip header items that might have been picked up
                    
                    if (amountTxt.toLowerCase().includes('mevduat')) continue; // Skip "Mevduat büyüklüğü" header
                    
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
                    
                    amountHeaders.push({ label: amountTxt, minAmount: minAmt, maxAmount: maxAmt });
                    var rowRates = [];
                    for (var c = 1; c < 5; c++) {
                        var valEl = items[c].querySelector('.enpara-deposit-interest-rates__flex-table-value') || items[c];
                        var rate = valEl ? smartParseNumber(valEl.innerText) : null;
                        rowRates.push(rate);
                    }
                    tableRows.push({ label: amountTxt, rates: rowRates });
                }
                
                if (tableRows.length === 0) return false;

                // Re-pivot: Duration headers become the rows for Android app's expectations
                // Each outputRow is a duration, and its rates array contains values for each amount header column
                var outputRows = durationHeaders.map(function(d, dIdx) {
                    var ratesForThisDuration = tableRows.map(function(r) {
                        // d.indexInRow - 1 because rowRates skip the amount column
                        return r.rates[d.indexInRow - 1];
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
