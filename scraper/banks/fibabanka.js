module.exports = {
    name: "Fibabanka",
    url: "https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari",
    desc: "e-Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            function extractFibabankaTable() {
                var container = document.querySelector('.fiba-long-table');
                if (!container) return false;
                var table = container.querySelector('table');
                if (!table) return false;
                var rows = Array.from(table.querySelectorAll('tr'));
                if (rows.length < 2) return false;
                var headerCells = Array.from(rows[0].querySelectorAll('th, td'));
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
                if (!hasValidHeader) return false;

                var tableRows = [];
                for (var r = 1; r < rows.length; r++) {
                    var cells = Array.from(rows[r].querySelectorAll('td, th'));
                    if (cells.length < 2) continue;
                    var durTxt = cells[0].innerText.trim();
                    var durParsed = parseDuration(durTxt);
                    if (!durParsed) continue;
                    var rowRates = [];
                    for (var c = 1; c < cells.length; c++) {
                        var rate = smartParseNumber(cells[c].innerText);
                        rowRates.push(isNaN(rate) ? null : rate);
                    }
                    tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                }
                if (tableRows.length > 0) {
                    Android.sendRateWithTable(tableRows[0].rates[0], 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var btn = Array.from(document.querySelectorAll('h2.accordion__title')).find(h => h.innerText.includes('e-Mevduat'));
                    if (btn) { btn.click(); step = 1; }
                } else {
                    if (extractFibabankaTable()) clearInterval(interval);
                }
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
