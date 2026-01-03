module.exports = {
    name: "DenizBank",
    url: "https://www.denizbank.com/hesap/e-mevduat",
    desc: "E-Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function extractDenizbankTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; var rows = table.querySelectorAll('tr'); if (rows.length < 3) continue;
                    var headerRow = Array.from(rows).find(r => r.innerText.includes('-') && r.innerText.match(/\\d/));
                    if (!headerRow || !headerRow.cells[0].innerText.toUpperCase().includes('GÜN')) continue;
                    var headerCells = headerRow.cells; var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                    }
                    var tableRows = []; var startIdx = Array.from(rows).indexOf(headerRow) + 1;
                    for (var r = startIdx; r < rows.length; r++) {
                        var cells = rows[r].cells; if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                        var rowRates = []; for (var c = 1; c < cells.length; c++) rowRates.push(smartParseNumber(cells[c].innerText));
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    Android.sendRateWithTable(0, 'E-Mevduat', 'DenizBank', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractDenizbankTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
