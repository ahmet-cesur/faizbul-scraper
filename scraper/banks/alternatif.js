module.exports = {
    name: "Alternatif Bank",
    url: "https://www.alternatifbank.com.tr/bilgi-merkezi/faiz-oranlari",
    desc: "E-Mevduat TRY",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            \n            function logError(msg) { console.log('ALTERNATIF_ERROR: ' + msg); }

            function extractAlternatifTable() {
                var tables = document.querySelectorAll('table');
                if (tables.length === 0 && attempts > 10) logError('No tables found in DOM');

                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; 
                    var rect = table.getBoundingClientRect(); 
                    if (rect.width === 0 || rect.height === 0) continue; // Skip hidden tables

                    var rows = table.querySelectorAll('tr'); 
                    if (rows.length < 3) continue;
                    
                    var headerRow = rows[0];
                    var headerText = headerRow.innerText.toUpperCase();
                    
                    // Strict keywords: must have VADE and not be a loan table
                    if (!headerText.includes('VADE')) continue;
                    
                    // Must be E-MEVDUAT or MEVDUAT table, not KREDİ
                    var tableText = table.innerText.toUpperCase();
                    if (tableText.includes('KREDİ') && !tableText.includes('E-MEVDUAT')) continue;
                    
                    // Check container for E-MEVDUAT keyword
                    var containerText = table.parentElement ? table.parentElement.innerText.toUpperCase() : '';
                    if (!tableText.includes('E-MEVDUAT') && !containerText.includes('E-MEVDUAT') && 
                        !tableText.includes('MEVDUAT') && !containerText.includes('MEVDUAT')) {
                        continue;
                    }

                    var headerCells = rows[0].querySelectorAll('td, th');
                    var headers = [];
                    var hasValidHeader = false;
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var min = smartParseNumber(txt);
                        if (min > 0) hasValidHeader = true;
                        headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                    }
                    if (!hasValidHeader) {
                        if (attempts > 30) logError('Found VADE table but no valid amount headers');
                        continue;
                    }

                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim();
                        
                        // Inline duration parsing for patterns like "32-45 GÜN"
                        var durParsed = null;
                        var durMatch = durTxt.match(/(\\d+)\\s*[-–]\\s*(\\d+)/);
                        if (durMatch) {
                            durParsed = { min: parseInt(durMatch[1]), max: parseInt(durMatch[2]) };
                        } else {
                            var singleMatch = durTxt.match(/(\\d+)/);
                            if (singleMatch && durTxt.toUpperCase().includes('GÜN')) {
                                durParsed = { min: parseInt(singleMatch[1]), max: parseInt(singleMatch[1]) };
                            } else {
                                durParsed = parseDuration(durTxt);
                            }
                        }
                        
                        if (!durParsed) continue;
                        var rowRates = []; for (var c = 1; c < cells.length; c++) rowRates.push(smartParseNumber(cells[c].innerText));
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'E-Mevduat TRY', 'Alternatif Bank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    // Try to find the accordion header. Site uses .accordion-item .title h2
                    var acc = Array.from(document.querySelectorAll('.accordion-header, .accordion-item .title h2, h2, button'))
                        .find(el => el.innerText.toUpperCase().includes('MEVDUAT') && !el.innerText.toUpperCase().includes('KORUMALI'));
                    
                    if (acc) { 
                        acc.click(); 
                        if (acc.onclick) acc.onclick();
                        step = 1; 
                    } else { 
                        if (attempts > 5 && attempts % 10 === 0) logError('Accordion with MEVDUAT not found');
                        step = 1; 
                    }
                } else {
                    if (extractAlternatifTable()) clearInterval(interval);
                }
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    logError('Timeout (40 attempts)');
                    Android.sendError('NO_MATCH'); 
                }
            }, 800);
        } catch(e) { 
            console.log('ALTERNATIF_FATAL: ' + e.message);
            Android.sendError('PARSING_ERROR'); 
        }
    })()`
};
