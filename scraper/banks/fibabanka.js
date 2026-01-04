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
                    if (table.innerText.includes('Kiraz') || (table.closest('.accordion__content') && table.closest('.accordion__content').previousElementSibling.innerText.includes('Kiraz'))) continue;

                    var rows = Array.from(table.querySelectorAll('tr'));
                    var headerCells = Array.from(rows[0].querySelectorAll('th, td'));
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
                    if (!hasValidHeader) {
                         if (attempts > 30) logError('Table found but header parsing failed');
                         continue;
                    }

                    var tableRows = [];
                    var tableHasInvalidRates = false;
                    for (var r = 1; r < rows.length; r++) {
                        var cells = Array.from(rows[r].querySelectorAll('td, th'));
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim();
                        var durParsed = parseDuration(durTxt);
                        if (!durParsed) continue;

                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            if (rate > 100) tableHasInvalidRates = true;
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }

                    if (tableHasInvalidRates) {
                        logError('Table contained invalid rates > 100, skipping');
                        continue; 
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
