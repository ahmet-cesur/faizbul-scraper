module.exports = {
    name: "VakıfBank - Standart",
    url: "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari",
    desc: "E-Vadeli Hesabı",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            \n            function extractVakifbankTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; var rows = table.querySelectorAll('tr');
                    if (rows.length < 3 || !rows[0].innerText.toLowerCase().includes('tutar')) continue;
                    var headerCells = rows[0].querySelectorAll('td, th');
                    var durationHeaders = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var durParsed = parseDuration(headerCells[i].innerText);
                        durationHeaders.push({ label: headerCells[i].innerText.trim(), minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null });
                    }
                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                        var amt = smartParseNumber(cells[0].innerText);
                        var rates = []; for (var c = 1; c < cells.length; c++) rates.push(smartParseNumber(cells[c].innerText));
                        tableRows.push({ label: cells[0].innerText.trim(), minAmount: amt, maxAmount: 999999999, rates: rates });
                    }
                    var tableJson = JSON.stringify({
                        headers: tableRows.map(r => ({ label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount })),
                        rows: durationHeaders.map((h, idx) => ({ label: h.label, minDays: h.minDays, maxDays: h.maxDays, rates: tableRows.map(r => r.rates[idx]) }))
                    });
                    Android.sendRateWithTable(0, 'E-Vadeli Hesabı', 'VakıfBank', tableJson);
                    return true;
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var btn = Array.from(document.querySelectorAll('a.btn')).find(b => b.innerText.includes('E-Vadeli'));
                    if (btn) { btn.click(); step = 1; }
                } else {
                    if (extractVakifbankTable()) clearInterval(interval);
                }
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
