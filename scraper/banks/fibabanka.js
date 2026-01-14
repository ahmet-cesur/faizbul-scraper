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
                    if (tableText.includes('Kiraz')) continue;

                    var rows = Array.from(table.querySelectorAll('tr'));
                    var headerRowIndex = -1;
                    
                    // Scan first 5 rows for VADE or GÜN in the first cell
                    for (var r = 0; r < Math.min(rows.length, 5); r++) {
                        var cells = Array.from(rows[r].querySelectorAll('th, td'));
                        if (cells.length > 0) {
                            var cellText = cells[0].textContent.toUpperCase().trim();
                            if (cellText.includes('VADE') || cellText.includes('GÜN')) {
                                headerRowIndex = r;
                                break;
                            }
                        }
                    }

                    if (headerRowIndex === -1) continue;
                    
                    var headerCells = Array.from(rows[headerRowIndex].querySelectorAll('th, td'));
                    if (headerCells.length < 2) continue;

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
                    if (!hasValidHeader) continue;

                    var tableRows = [];
                    for (var r = headerRowIndex + 1; r < rows.length; r++) {
                        var cells = Array.from(rows[r].querySelectorAll('td, th'));
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].textContent.trim();
                        
                        var durParsed = null;
                        var durMatch = durTxt.match(/(\\d+)\\s*[-\\–]\\s*(\\d+)/);
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

                        var rowRates = [];
                        for (var c = 1; c < cells.length && c <= headers.length; c++) {
                            var val = cells[c].textContent.trim();
                            var rate = smartParseNumber(val);
                            if (!isNaN(rate) && rate > 100) continue; 
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        if (rowRates.some(r => r !== null)) {
                            tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                        }
                    }

                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates.find(r => r !== null) || 0, 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
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
                
                // Only attempt click if we've waited a while and still found nothing (last resort)
                if (step === 0 && attempts > 5) {
                    var targetTitle = 'e-Mevduat';
                    var btn = Array.from(document.querySelectorAll('h2, button, a, span')).find(h => 
                        h.textContent.includes(targetTitle) && 
                        (h.className.includes('accordion') || h.className.includes('title'))
                    );
                    
                    if (btn && !btn.getAttribute('data-clicked')) {
                        log('Clicking accordion as fallback: ' + btn.innerText);
                        btn.setAttribute('data-clicked', 'true');
                        // Use dispatchEvent to emulate a softer click if possible
                        var evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                        btn.dispatchEvent(evt);
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

