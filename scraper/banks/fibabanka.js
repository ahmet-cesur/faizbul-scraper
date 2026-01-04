module.exports = {
    name: "Fibabanka",
    url: "https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari",
    desc: "e-Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            function logError(msg) { console.log('FIBA_ERROR: ' + msg); }

            function extractFibabankaTable() {
                var tables = document.querySelectorAll('table');
                if (tables.length === 0 && attempts > 10) logError('No tables found');

                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    if (table.offsetParent === null || table.rows.length < 2) continue;

                    var tableText = table.innerText;
                    if (tableText.includes('Kiraz')) continue;
                    
                    var accordionContent = table.closest('.accordion__content');
                    if (accordionContent) {
                        var accordionTitle = accordionContent.previousElementSibling;
                        if (accordionTitle && !accordionTitle.innerText.includes('e-Mevduat')) continue;
                    }

                    var rows = Array.from(table.querySelectorAll('tr'));
                    
                    // Flexible Header Detection: Scan first 3 rows for VADE or GÜN
                    var headerRowIndex = -1;
                    for (var r = 0; r < Math.min(rows.length, 3); r++) {
                        var cells = Array.from(rows[r].querySelectorAll('th, td'));
                        if (cells.length > 0 && (cells[0].innerText.toUpperCase().includes('VADE') || cells[0].innerText.toUpperCase().includes('GÜN'))) {
                            headerRowIndex = r;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                         // Fallback for inverted or other structures handled previously
                         // If no VADE/GÜN found in first column, check for column-based headers (standard logic)
                         var headerCells = Array.from(rows[0].querySelectorAll('th, td'));
                         if (headerCells.length > 1) {
                             var firstHeader = headerCells[0].innerText.toUpperCase();
                             if (firstHeader.includes('FAİZ') || firstHeader.includes('TL')) {
                                 // Inverted structure detection logic...
                                 // (Keeping existing inverted logic if needed, but the simulation showed standard structure with shifted header)
                             }
                         }
                         if (headerRowIndex === -1) continue;
                    }
                    
                    var headerCells = Array.from(rows[headerRowIndex].querySelectorAll('th, td'));
                    if (headerCells.length < 2) continue;

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
                    for (var r = headerRowIndex + 1; r < rows.length; r++) {
                        var cells = Array.from(rows[r].querySelectorAll('td, th'));
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim();
                        
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
                            if (rate > 100) continue; 
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                    }

                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
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
