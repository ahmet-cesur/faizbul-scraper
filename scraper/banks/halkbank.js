module.exports = {
    name: "Halkbank",
    url: "https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari",
    desc: "İnternet Vadeli TL",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            
            function extractHalkbankTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t]; var rows = table.querySelectorAll('tr'); if (rows.length < 3) continue;
                    var headerCells = rows[0].querySelectorAll('td, th'); if (headerCells.length < 4 || !rows[0].innerText.toLowerCase().includes('vade')) continue;
                    var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var min = smartParseNumber(txt);
                        headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                    }
                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                    }
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'İnternet Vadeli TL', 'Halkbank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (step === 0) {
                    var dd = document.querySelector('#type');
                    if (dd) {
                        if (typeof $ !== 'undefined') { 
                            $('#type').val('2').trigger('change'); 
                        } else { 
                            dd.value = '2'; 
                            dd.dispatchEvent(new Event('change', {bubbles:true})); 
                        }
                        step = 1;
                        attempts = 0; // Reset attempts to give time for update
                    }
                } else if (step === 1) {
                    // Wait one cycle for table update
                    step = 2;
                } else {
                    if (extractHalkbankTable()) clearInterval(interval);
                }
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
