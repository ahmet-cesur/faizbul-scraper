module.exports = {
    name: "Ziraat Bankası",
    url: "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar",
    desc: "İnternet Şubesi Vadeli TL",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
            
            function parseAmountRange(txt) {
                var val = txt.replace('TL', '').replace('ve üzeri', '').trim();
                if (val.indexOf('-') > -1) {
                    var parts = val.split('-');
                    return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                }
                return { min: smartParseNumber(val), max: 999999999 };
            }

            function extractZiraatTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var rows = Array.from(table.querySelectorAll('tr'));
                    if (rows.length < 3) continue;
                    
                    // Find header row (the one that contains 'Vade')
                    var headerRowIndex = rows.findIndex(r => r.innerText.toLowerCase().includes('vade'));
                    if (headerRowIndex === -1) continue;
                    
                    var headerRow = rows[headerRowIndex];
                    var headerCells = headerRow.querySelectorAll('td, th');
                    if (headerCells.length < 2) continue;
                    
                    var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var cellTxt = headerCells[i].innerText.trim();
                        var amtRange = parseAmountRange(cellTxt);
                        headers.push({ label: cellTxt, minAmount: amtRange.min, maxAmount: amtRange.max });
                    }
                    
                    var tableRows = [];
                    for (var r = headerRowIndex + 1; r < rows.length; r++) {
                        var row = rows[r];
                        var cells = row.querySelectorAll('td, th');
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim();
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        if (rowRates.some(r => r !== null)) {
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                    }
                    
                    if (tableRows.length > 0) {
                        Android.sendRateWithTable(0, 'İnternet Şubesi Vadeli TL', 'Ziraat Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (step === 0) {
                    var accordion = document.getElementById('accordion1') || Array.from(document.querySelectorAll('button, h2')).find(b => b.innerText.includes('Vadeli Türk Lirası'));
                    if (accordion) {
                        if (accordion.getAttribute('aria-expanded') !== 'true') accordion.click();
                        step = 1;
                    }
                } else if (step === 1) {
                    var radioLabel = Array.from(document.querySelectorAll('label')).find(l => l.innerText.includes('İnternet Şube'));
                    if (radioLabel) {
                        radioLabel.click();
                        step = 2;
                        attempts = 0; // Reset attempts to wait for table reload
                    }
                } else if (step === 2) {
                    if (extractZiraatTable()) clearInterval(interval);
                }
                
                if (++attempts > 60) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH'); 
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
