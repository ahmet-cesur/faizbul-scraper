module.exports = {
    name: "Fibabanka",
    url: "https://www.fibabanka.com.tr/faiz-ve-ucretler/bireysel-faiz-oranlari/mevduat-faiz-oranlari",
    desc: "e-Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            \n            function logError(msg) { console.log('FIBA_ERROR: ' + msg); }

            function extractFibabankaTable() {
                var tables = document.querySelectorAll('table');
                if (tables.length === 0 && attempts > 10) logError('No tables found');

                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    // Skip invisible or tiny tables
                    if (table.offsetParent === null || table.rows.length < 2) continue;

                    // Explicitly skip "Kiraz Hesap" tables
                    var tableText = table.innerText;
                    if (tableText.includes('Kiraz')) continue;
                    
                    // Look for e-Mevduat TL table specifically
                    var accordionContent = table.closest('.accordion__content');
                    if (accordionContent) {
                        var accordionTitle = accordionContent.previousElementSibling;
                        if (accordionTitle && !accordionTitle.innerText.includes('e-Mevduat')) continue;
                    }

                    var rows = Array.from(table.querySelectorAll('tr'));
                    if (rows.length < 3) continue;
                    
                    var headerCells = Array.from(rows[0].querySelectorAll('th, td'));
                    if (headerCells.length < 2) continue;
                    
                    var firstHeaderText = headerCells[0].innerText.trim().toUpperCase();
                    
                    // Fibabanka e-Mevduat table has inverted structure:
                    // Header row: "TL Faiz Oranları (%)" with amount ranges as columns
                    // OR Header row: "Vade" with duration in first col and amounts elsewhere
                    
                    // Check if first header cell contains "Faiz" or "TL" - indicates standard structure
                    // Check if it contains "VADE" - indicates duration is first column
                    
                    if (firstHeaderText.includes('VADE') || firstHeaderText.includes('GÜN')) {
                        // Standard structure: first column is duration
                        var headers = []; 
                        var hasValidHeader = false;
                        for (var i = 1; i < headerCells.length; i++) {
                            var txt = headerCells[i].innerText.trim();
                            var parts = txt.replace(/TL/gi, '').split('-');
                            var min = smartParseNumber(parts[0]);
                            var max = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                            if (min > 0) hasValidHeader = true;
                            headers.push({ label: txt, minAmount: min, maxAmount: max });
                        }
                        if (!hasValidHeader) continue;

                        var tableRows = [];
                        for (var r = 1; r < rows.length; r++) {
                            var cells = Array.from(rows[r].querySelectorAll('td, th'));
                            if (cells.length < 2) continue;
                            var durTxt = cells[0].innerText.trim();
                            
                            // Inline duration parsing
                            var durParsed = null;
                            var durMatch = durTxt.match(/(\d+)\s*[-–]\s*(\d+)/);
                            if (durMatch) {
                                durParsed = { min: parseInt(durMatch[1]), max: parseInt(durMatch[2]) };
                            } else {
                                var singleMatch = durTxt.match(/(\d+)/);
                                if (singleMatch && durTxt.toUpperCase().includes('GÜN')) {
                                    durParsed = { min: parseInt(singleMatch[1]), max: parseInt(singleMatch[1]) };
                                } else {
                                    durParsed = parseDuration(durTxt);
                                }
                            }
                            if (!durParsed) continue;

                            var rowRates = [];
                            for (var c = 1; c < cells.length && c <= headers.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                if (rate > 100) { 
                                    logError('Invalid rate > 100: ' + rate);
                                    continue; 
                                }
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                        }

                        if (tableRows.length > 0) {
                            Android.sendRateWithTable(tableRows[0].rates[0], 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                    } else if (firstHeaderText.includes('FAİZ') || firstHeaderText.includes('TL')) {
                        // Inverted structure: amounts are in rows, durations in columns
                        // First row after header contains duration labels
                        // First column contains amount ranges
                        
                        // Try to parse durations from header row (columns 1+)
                        var durationHeaders = [];
                        for (var i = 1; i < headerCells.length; i++) {
                            var txt = headerCells[i].innerText.trim();
                            var durMatch = txt.match(/(\d+)\s*[-–]\s*(\d+)/);
                            if (durMatch) {
                                durationHeaders.push({ label: txt, minDays: parseInt(durMatch[1]), maxDays: parseInt(durMatch[2]) });
                            }
                        }
                        
                        if (durationHeaders.length === 0) continue;
                        
                        // Parse amount headers from first column
                        var amountHeaders = [];
                        var tableRows = [];
                        
                        for (var r = 1; r < rows.length; r++) {
                            var cells = Array.from(rows[r].querySelectorAll('td, th'));
                            if (cells.length < 2) continue;
                            
                            var amtTxt = cells[0].innerText.trim();
                            var parts = amtTxt.replace(/TL/gi, '').split('-');
                            var minAmt = smartParseNumber(parts[0]);
                            var maxAmt = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                            
                            if (minAmt === 0) continue;
                            
                            amountHeaders.push({ label: amtTxt, minAmount: minAmt, maxAmount: maxAmt });
                            
                            var rowRates = [];
                            for (var c = 1; c < cells.length && c <= durationHeaders.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) || rate > 100 ? null : rate);
                            }
                            tableRows.push({ label: amtTxt, rates: rowRates });
                        }
                        
                        if (tableRows.length > 0) {
                            // Pivot: output rows should be durations  
                            var outputRows = durationHeaders.map(function(d, i) {
                                return {
                                    label: d.label,
                                    minDays: d.minDays,
                                    maxDays: d.maxDays,
                                    rates: tableRows.map(function(r) { return r.rates[i]; })
                                };
                            });
                            Android.sendRateWithTable(outputRows[0].rates[0], 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: amountHeaders, rows: outputRows}));
                            return true;
                        }
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var btn = Array.from(document.querySelectorAll('h2.accordion__title, button')).find(h => h.innerText.includes('e-Mevduat'));
                    if (btn) { 
                        btn.click();
                        // Try native click just in case 
                        if (btn.onclick) btn.onclick();
                        step = 1; 
                    } else { 
                        if (attempts > 5 && attempts % 10 === 0) logError('Accordion with e-Mevduat not found');
                        step = 1; 
                    } // Try extracting anyway if button not found (might be already open)
                } else {
                    if (extractFibabankaTable()) clearInterval(interval);
                }
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    logError('Timeout (40 attempts)');
                    Android.sendError('NO_MATCH'); 
                }
            }, 1000);
        } catch(e) { 
            console.log('FIBA_FATAL: ' + e.message);
            Android.sendError('PARSING_ERROR'); 
        }
    })()`
};
