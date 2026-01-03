module.exports = {
    name: "İş Bankası",
    url: "https://www.isbank.com.tr/vadeli-tl",
    desc: "İşCep Vadeli TL",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function getCellValue(cell) {
                var contentSpan = cell.querySelector('span.content');
                if (contentSpan) return contentSpan.innerText.trim();
                var headerSpan = cell.querySelector('span.headres');
                if (headerSpan) return cell.innerText.replace(headerSpan.innerText, '').trim();
                return cell.innerText.trim();
            }
            function findIsBankasiRate() {
                var tables = Array.from(document.querySelectorAll('table.ISB_table_basic')).concat(Array.from(document.querySelectorAll('table')));
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var headerRow = table.querySelector('thead tr') || table.rows[0];
                    if (!headerRow || !headerRow.innerText.toLowerCase().includes('vade')) continue;
                    if (table.innerText.toLowerCase().includes('kredi')) continue; // Avoid loan tables
                    var headerCells = headerRow.querySelectorAll('th, td');
                    var headers = [];
                    var hasValidHeader = false;
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var min = smartParseNumber(txt);
                        if (min > 0 || txt.includes('TL')) hasValidHeader = true;
                        headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                    }
                    if (!hasValidHeader) continue;

                    var dataRows = table.querySelectorAll('tbody tr'); if (dataRows.length === 0) dataRows = Array.from(table.rows).slice(1);
                    var tableRows = [];
                    for (var r = 0; r < dataRows.length; r++) {
                        var cells = dataRows[r].querySelectorAll('td'); if (cells.length < 2) continue;
                        var durTxt = getCellValue(cells[0]); var durParsed = parseDuration(durTxt);
                        if (!durParsed) continue;
                        
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(getCellValue(cells[c]));
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'İşCep Vadeli TL', 'İş Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (findIsBankasiRate()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
