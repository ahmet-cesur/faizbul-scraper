module.exports = {
    name: "Yapı Kredi",
    url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
    desc: "Yeni Param (Hoş Geldin)",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            function extractYapikrediTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; if (table.rows.length < 3) continue;
                    var headers = []; var headerCells = table.rows[0].cells;
                    for (var i = 1; i < headerCells.length; i++) {
                        headers.push({ label: headerCells[i].innerText.trim(), minAmount: 1000, maxAmount: 999999999 });
                    }
                    var tableRows = [];
                    for (var r = 1; r < table.rows.length; r++) {
                        var cells = table.rows[r].cells; if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    Android.sendRateWithTable(tableRows[0].rates[0], 'Yeni Param (Hoş Geldin)', 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractYapikrediTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
