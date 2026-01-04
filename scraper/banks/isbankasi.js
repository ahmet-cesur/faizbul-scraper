module.exports = {
    name: "İş Bankası",
    url: "https://www.isbank.com.tr/vadeli-tl",
    desc: "İşCep Vadeli TL",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            \n            function logError(msg) { console.log('ISBANK_ERROR: ' + msg); }

            function getCellValue(cell) {
                var contentSpan = cell.querySelector('span.content');
                if (contentSpan) return contentSpan.innerText.trim();
                var headerSpan = cell.querySelector('span.headres');
                if (headerSpan) return cell.innerText.replace(headerSpan.innerText, '').trim();
                return cell.innerText.trim();
            }
            function findIsBankasiRate() {
                var tables = Array.from(document.querySelectorAll('table.ISB_table_basic')).concat(Array.from(document.querySelectorAll('table')));
                
                if (tables.length === 0 && attempts > 10) logError('No tables found in page');

                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var headerRow = table.querySelector('thead tr') || table.rows[0];
                    if (!headerRow) continue;
                    
                    var headerText = headerRow.innerText.toLowerCase();
                    if (!headerText.includes('vade')) continue; // Strict check for VADE
                    if (table.innerText.toLowerCase().includes('kredi') && !table.innerText.toLowerCase().includes('mevduat')) continue; 
                    
                    var headerCells = headerRow.querySelectorAll('th, td');
                    var headers = [];
                    var hasValidHeader = false;
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var min = smartParseNumber(txt);
                        if (min > 0 || txt.includes('TL')) hasValidHeader = true;
                        headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                    }
                    if (!hasValidHeader) {
                        if (attempts > 30) logError('Table with VADE found but no valid amount headers');
                        continue;
                    }

                    var dataRows = table.querySelectorAll('tbody tr'); 
                    if (dataRows.length === 0) dataRows = Array.from(table.rows).slice(1);
                    
                    if (dataRows.length < 2) continue; // Matrix must have rows

                    var tableRows = [];
                    for (var r = 0; r < dataRows.length; r++) {
                        var cells = dataRows[r].querySelectorAll('td'); if (cells.length < 2) continue;
                        var durTxt = getCellValue(cells[0]); 
                        var durParsed = parseDuration(durTxt);
                        
                        if (!durParsed && r < 2) continue; // First few rows must be durations
                        if (!durParsed) continue;
                        
                        var rowRates = [];
                        for (var c = 1; c < cells.length && c <= headers.length; c++) {
                            var rate = smartParseNumber(getCellValue(cells[c]));
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'İşCep Vadeli TL', 'İş Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    } else {
                         if (attempts > 30) logError('Table parsing yielded 0 valid rows');
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                // Try to find table immediately, maybe we don't need to switch channel
                if (findIsBankasiRate()) { clearInterval(interval); return; }

                if (step === 0) {
                    var sel = document.querySelector('#channelCode');
                    if (sel) {
                        sel.value = 'ISCEP';
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                         if (attempts > 5 && attempts % 10 === 0) console.log('INTERN: #channelCode not found yet');
                    }
                    step = 1;
                } else {
                    if (findIsBankasiRate()) clearInterval(interval);
                }
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    logError('Timeout (40 attempts)');
                    Android.sendError('NO_MATCH'); 
                }
            }, 800);
        } catch(e) { 
             console.log('ISBANK_FATAL: ' + e.message);
             Android.sendError('PARSING_ERROR'); 
        }
    })()`
};
