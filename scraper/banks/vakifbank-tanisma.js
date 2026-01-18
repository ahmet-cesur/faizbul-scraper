module.exports = {
    name: "VakıfBank",
    url: "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari",
    desc: "Tanışma Kampanyası",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            function extractVakifbankTable() {
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
                        var rates = []; 
                        for (var c = 1; c < cells.length; c++) {
                            var cellText = cells[c].innerText;
                            var rate = smartParseNumber(cellText);
                            if (r === 1 && c <= 3) console.log('INTERN: Cell[' + r + '][' + c + '] = "' + cellText + '" -> ' + rate);
                            rates.push(isNaN(rate) ? 0 : rate);
                        }
                        if (rates.some(r => r > 0)) {
                            tableRows.push({ label: cells[0].innerText.trim(), minAmount: amt, maxAmount: 999999999, rates: rates });
                        }
                    }
                    
                    if (tableRows.length > 0) {
                        console.log('INTERN: VakıfBank found ' + tableRows.length + ' amount rows');
                        console.log('INTERN: First row rates: ' + tableRows[0].rates.join(', '));
                        var tableJson = JSON.stringify({
                            headers: tableRows.map(r => ({ label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount })),
                            rows: durationHeaders.map((h, idx) => ({ 
                                label: h.label, 
                                minDays: h.minDays, 
                                maxDays: h.maxDays, 
                                rates: tableRows.map(r => r.rates[idx] || 0) 
                            }))
                        });
                        Android.sendRateWithTable(0, 'Tanışma Kampanyası', 'VakıfBank', tableJson);
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var btns = Array.from(document.querySelectorAll('a, button, .btn'));
                    var btn = btns.find(b => b.innerText.includes('Tanışma') || b.className.includes('Tanışma'));
                    if (btn) { 
                        btn.click(); 
                        if (btn.parentElement && btn.parentElement.click) btn.parentElement.click();
                        step = 1; 
                    }
                } else {
                    if (extractVakifbankTable()) clearInterval(interval);
                }
                if (++attempts > 40) { 
                    // If we failed step 1, try step 0 again once
                    if (step === 1 && attempts === 40) { attempts = 0; step = 0; }
                    else { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
