module.exports = {
    name: "Garanti BBVA - Hoş Geldin",
    url: "https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi",
    desc: "Hoş Geldin Faizi",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function extractGarantiTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var rows = table.querySelectorAll('tr');
                    if (rows.length < 2) continue;
                    var headerCells = rows[0].querySelectorAll('th, td');
                    if (headerCells.length < 2) continue;
                    
                    var headers = [];
                    var headerContainsValidAmount = false;
                    
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var minAmt = 0, maxAmt = 999999999;
                        if (txt.indexOf('-') > -1) {
                            var parts = txt.split('-');
                            minAmt = smartParseNumber(parts[0]);
                            maxAmt = smartParseNumber(parts[1]);
                        } else if (txt.match(/[\\d+]/)) { minAmt = smartParseNumber(txt); }
                        
                        if (txt.indexOf('TL') > -1 || minAmt > 100) {
                            headerContainsValidAmount = true;
                        }
                        
                        headers.push({ label: txt, minAmount: minAmt, maxAmount: maxAmt });
                    }
                    
                    if (!headerContainsValidAmount) continue;

                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < headerCells.length) continue;
                        var durTxt = cells[0].innerText.trim();
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    if (tableRows.length > 1) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'Hoş Geldin Faizi', 'Garanti BBVA', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractGarantiTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
