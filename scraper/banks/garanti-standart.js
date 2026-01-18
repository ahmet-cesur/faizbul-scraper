module.exports = {
    name: "Garanti BBVA",
    url: "https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap",
    desc: "Standart E-Vadeli",
    script: `(function() {
        try {
            var attempts = 0;
            function extractGarantiTable() {
                var tables = document.querySelectorAll('table');
                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var rows = table.querySelectorAll('tr');
                    if (rows.length < 2) continue;
                    
                    var headerCells = rows[0].querySelectorAll('th, td');
                    if (headerCells.length < 2) continue;
                    
                    var headers = [];
                    var hasNumbersInHeader = false;
                    
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].textContent.trim();
                        var parts = txt.replace(/TL/gi, '').split('-');
                        var minAmt = smartParseNumber(parts[0]);
                        var maxAmt = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                        
                        if (!isNaN(minAmt)) hasNumbersInHeader = true;
                        headers.push({ label: txt, minAmount: minAmt || 0, maxAmount: maxAmt || 999999999 });
                    }
                    
                    if (!hasNumbersInHeader && headerCells.length < 3) continue;

                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;
                        
                        var durTxt = cells[0].textContent.trim();
                        var durParsed = parseDuration(durTxt);
                        
                        if (!durParsed) {
                            var nums = durTxt.match(/\\d+/g);
                            if (nums && nums.length >= 2) {
                                durParsed = { min: parseInt(nums[0]), max: parseInt(nums[1]) };
                            } else if (nums && nums.length === 1) {
                                durParsed = { min: parseInt(nums[0]), max: parseInt(nums[0]) };
                            }
                        }

                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].textContent);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        
                        if (rowRates.some(r => r !== null)) {
                            tableRows.push({ 
                                label: durTxt, 
                                minDays: durParsed ? durParsed.min : null, 
                                maxDays: durParsed ? durParsed.max : null, 
                                rates: rowRates 
                            });
                        }
                    }
                    
                    if (tableRows.length >= 1) {
                        Android.sendRateWithTable(0, 'Standart E-Vadeli', 'Garanti BBVA', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }
            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                if (extractGarantiTable()) clearInterval(interval);
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
