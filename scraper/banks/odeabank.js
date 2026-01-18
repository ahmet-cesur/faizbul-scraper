module.exports = {
    name: "Odeabank",
    url: "https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat",
    desc: "İnternet/Mobil Vadeli",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            function extractOdeabankTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; if (table.getBoundingClientRect().height < 10) continue;
                    var rows = table.querySelectorAll('tr'); if (rows.length < 3 || !rows[0].innerText.toUpperCase().includes('VADE')) continue;
                    
                    var headerCells = rows[0].querySelectorAll('td, th');
                    var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                    }
                    
                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim(); 
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        if (rowRates.some(r => r !== null && r > 0)) {
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                    }
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0] || 0, 'İnternet/Mobil Vadeli', 'Odeabank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var btns = Array.from(document.querySelectorAll('button, a, .accordion, .title'));
                    var btn = document.getElementById('accordion-2') || btns.find(b => b.innerText.includes('İnternet/Mobil'));
                    if (btn) { btn.click(); step = 1; }
                } else {
                    if (extractOdeabankTable()) clearInterval(interval);
                }
                if (++attempts > 40) { 
                    if (step === 1 && attempts === 40) { attempts = 0; step = 0; }
                    else { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
