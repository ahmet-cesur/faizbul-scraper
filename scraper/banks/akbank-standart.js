module.exports = {
    name: "Akbank",
    url: "https://www.akbank.com/tr-tr/urunler/Sayfalar/Vadeli-Mevduat-Hesabi.aspx",
    desc: "Standart Vadeli",
    script: `(function() {
        try {
            var attempts = 0;
            function extractAkbankTable() {
                var tables = Array.from(document.querySelectorAll('table'));
                var table = tables.find(t => t.textContent.includes('Vade') && t.textContent.includes('Faiz'));
                if (!table) return false;
                
                var rows = table.rows; if (!rows || rows.length < 2) return false;
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
                if(tableRows.length === 0) return false;

                Android.sendRateWithTable(0, 'Standart Vadeli', 'Akbank', JSON.stringify({headers: headers, rows: tableRows}));
                return true;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractAkbankTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
