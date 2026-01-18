module.exports = {
    name: "Akbank",
    url: "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi",
    desc: "Tanışma Faizi",
    script: `(function() {
        try {
            var attempts = 0;
            function extractAkbankData() {
                var table = Array.from(document.querySelectorAll('table')).find(t => t.textContent.includes('Tanışma') || t.textContent.includes('İnternet'));
                
                if (table && table.rows.length >= 2) {
                    var rows = table.rows;
                    var headers = []; 
                    var firstRowCells = rows[0].cells;
                    for (var i = 1; i < firstRowCells.length; i++) {
                        var cellTxt = firstRowCells[i].textContent.trim();
                        var parts = cellTxt.replace(/TL/gi, '').split('-');
                        var minAmt = smartParseNumber(parts[0]);
                        var maxAmt = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                        headers.push({ label: cellTxt, minAmount: minAmt || 0, maxAmount: maxAmt });
                    }
                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].cells; if (cells.length < 2) continue;
                        var durTxt = cells[0].textContent.trim(); 
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].textContent);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        if (rowRates.some(r => r !== null)) {
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                    }
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(0, 'Tanışma Faizi', 'Akbank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }

                // Fallback: Try to find rates in text
                var bodyText = document.body.innerText;
                var rateMatch = bodyText.match(/%\\s*(\\d+[,.]\\d+)/);
                if (rateMatch) {
                    var rate = smartParseNumber(rateMatch[1]);
                    if (rate > 20) {
                        // Create a mock table for consistency
                        var headers = [{ label: "All Amounts", minAmount: 1, maxAmount: 999999999 }];
                        var rows = [{ label: "32-35 Gün", minDays: 32, maxDays: 35, rates: [rate] }];
                        Android.sendRateWithTable(rate, 'Tanışma Faizi', 'Akbank', JSON.stringify({headers: headers, rows: rows}));
                        return true;
                    }
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractAkbankData()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
