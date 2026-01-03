module.exports = {
    name: "Enpara",
    url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
    desc: "Vadeli Mevduat",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function extractEnparaTable() {
                var table = document.querySelector('.enpara-deposit-interest-rates__flex-table--active') || document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY') || document.querySelector('.enpara-deposit-interest-rates__flex-table');
                if (!table) return false;
                var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item'));
                if (allItems.length < 5) return false;
                var durationHeaders = [];
                for (var i = 1; i <= 4 && i < allItems.length; i++) {
                    var headEl = allItems[i].querySelector('.enpara-deposit-interest-rates__flex-table-head');
                    if (headEl) {
                        var daysTxt = headEl.innerText.trim();
                        if (!daysTxt.toLowerCase().includes('gün')) continue;
                        var daysNum = parseInt(daysTxt.replace(/[^0-9]/g, ''));
                        durationHeaders.push({ label: daysTxt, minDays: daysNum, maxDays: daysNum });
                    }
                }
                if (durationHeaders.length === 0) return false;
                
                var tableRows = []; var headers = [];
                for (var rowStart = 5; rowStart < allItems.length; rowStart += 5) {
                    var amountItem = allItems[rowStart]; if (!amountItem) continue;
                    var valEl = amountItem.querySelector('.enpara-deposit-interest-rates__flex-table-value'); if (!valEl) continue;
                    var amountTxt = valEl.innerText.trim();
                    if (!amountTxt.includes('TL') && !amountTxt.match(/\\d/)) continue;
                    
                    var minAmt = 0, maxAmt = 999999999;
                    if (amountTxt.indexOf('-') > -1) {
                        var parts = amountTxt.split('-');
                        minAmt = smartParseNumber(parts[0]);
                        maxAmt = smartParseNumber(parts[1]);
                    } else if (amountTxt.match(/[\\d+]/)) { minAmt = smartParseNumber(amountTxt); }
                    
                    headers.push({ label: amountTxt, minAmount: minAmt, maxAmount: maxAmt });
                    var rowRates = [];
                    for (var c = 1; c <= 4 && (rowStart + c) < allItems.length; c++) {
                        var rateValEl = allItems[rowStart + c].querySelector('.enpara-deposit-interest-rates__flex-table-value');
                        rowRates.push(rateValEl ? smartParseNumber(rateValEl.innerText) : null);
                    }
                    tableRows.push({ label: amountTxt, rates: rowRates });
                }
                if (tableRows.length < 1) return false;
                
                var outputHeaders = headers;
                var outputRows = durationHeaders.map(function(d, dIdx) {
                    return { label: d.label, minDays: d.minDays, maxDays: d.maxDays, rates: tableRows.map(function(r) { return r.rates[dIdx]; }) };
                });
                Android.sendRateWithTable(outputRows[0].rates[0], 'Vadeli Mevduat', 'Enpara.com', JSON.stringify({headers: outputHeaders, rows: outputRows}));
                return true;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractEnparaTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
