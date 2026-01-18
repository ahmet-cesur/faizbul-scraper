module.exports = {
    name: "Fibabanka",
    url: "https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari",
    desc: "e-Mevduat",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            function log(msg) { console.log('INTERN: ' + msg); }

            function extractFibabankaTable() {
                var tables = document.querySelectorAll('table');
                
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    if (table.rows.length < 2) continue;

                    var tableText = table.textContent || table.innerText;
                    if (tableText.includes('Kiraz') || tableText.includes('Portföy')) continue;

                    var rows = Array.from(table.querySelectorAll('tr'));
                    var headerRowIndex = -1;
                    
                    for (var r = 0; r < Math.min(rows.length, 10); r++) {
                        var cells = Array.from(rows[r].querySelectorAll('th, td'));
                        if (cells.length > 2) {
                            var rowText = rows[r].textContent.toUpperCase();
                            if (rowText.includes('VADE') || rowText.includes('GÜN')) {
                                headerRowIndex = r;
                                break;
                            }
                        }
                    }

                    if (headerRowIndex === -1) continue;
                    
                    var headerCells = Array.from(rows[headerRowIndex].querySelectorAll('th, td'));
                    var headers = []; 
                    var hasValidHeader = false;
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].textContent.trim();
                        var parts = txt.replace(/TL/gi, '').split('-');
                        var min = smartParseNumber(parts[0]);
                        var max = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                        if (!isNaN(min)) hasValidHeader = true;
                        headers.push({ label: txt, minAmount: min || 0, maxAmount: max });
                    }
                    if (!hasValidHeader && headerCells.length < 3) continue;

                    var tableRows = [];
                    for (var r = headerRowIndex + 1; r < rows.length; r++) {
                        var cells = Array.from(rows[r].querySelectorAll('td, th'));
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].textContent.trim();
                        var durParsed = parseDuration(durTxt);
                        
                        if (!durParsed) {
                             var durMatch = durTxt.match(/(\\d+)\\s*[-\\–]\\s*(\\d+)/);
                             if (durMatch) durParsed = { min: parseInt(durMatch[1]), max: parseInt(durMatch[2]) };
                        }
                        
                        if (!durParsed) continue;

                        var rowRates = [];
                        for (var c = 1; c < cells.length && c < headerCells.length; c++) {
                            var rate = smartParseNumber(cells[c].textContent);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        if (rowRates.some(r => r !== null)) {
                            tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                        }
                    }

                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(0, 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (extractFibabankaTable()) {
                    clearInterval(interval);
                    return;
                }
                
                if (step === 0) {
                    var targetTitle = 'e-Mevduat';
                    var elements = Array.from(document.querySelectorAll('h2, button, a, span, .accordion__title'));
                    var btn = elements.find(h => 
                        h.textContent.includes(targetTitle) && 
                        (h.className.includes('accordion') || h.className.includes('title'))
                    );
                    
                    if (btn) {
                        log('Clicking accordion: ' + btn.innerText);
                        btn.click();
                        step = 1;
                    }
                }

                if (++attempts > 40) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH - Timeout. Tables found: ' + document.querySelectorAll('table').length); 
                }
            }, 1000);
        } catch(e) { 
            Android.sendError('PARSING_ERROR: ' + e.toString()); 
        }
    })()`
};
