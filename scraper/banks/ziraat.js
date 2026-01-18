module.exports = {
    name: "Ziraat Bankası",
    url: "https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar",
    desc: "İnternet Şubesi Vadeli TL",
    script: `(function() {
        try {
            var attempts = 0;
            
            function parseAmountRange(txt) {
                var val = txt.replace('TL', '').replace('ve üzeri', '').trim();
                // Handle "1.000-5.000" or similar
                if (val.indexOf('-') > -1) {
                    var parts = val.split('-');
                    return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                }
                return { min: smartParseNumber(val), max: 999999999 };
            }

            function extractZiraatTable() {
                // Look for header "Vadeli Türk Lirası" to narrow down
                var headers = Array.from(document.querySelectorAll('h2, h3, a.accordion-toggle, div.accordion-heading'));
                var targetHeader = headers.find(h => h.innerText.includes('Vadeli Türk Lirası'));
                
                if (!targetHeader) {
                    // Fallback: search all tables
                    var tables = document.querySelectorAll('table');
                } else {
                    // Try to find table near header
                    // Traverse up to find container, then query table
                    var container = targetHeader.closest('.accordion-group') || targetHeader.closest('.panel') || document.body;
                    var tables = container.querySelectorAll('table');
                }

                if (!tables || tables.length === 0) tables = document.querySelectorAll('table');

                for (var t = 0; t < tables.length; t++) {
                    var table = tables[t];
                    var rows = Array.from(table.rows);
                    if (rows.length < 2) continue;
                    
                    // Check for "Vade" in header
                    var headerRowIndex = rows.findIndex(r => r.innerText.toLowerCase().includes('vade'));
                    if (headerRowIndex === -1) continue;
                    
                    var headerRow = rows[headerRowIndex];
                    var headerCells = headerRow.querySelectorAll('td, th');
                    if (headerCells.length < 2) continue;
                    
                    // Parse Headers (Amounts)
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
                
                // Click accordion if needed
                var headers = Array.from(document.querySelectorAll('h2, h3, a, button'));
                var targetHeader = headers.find(h => h.innerText.includes('Vadeli Türk Lirası') && (h.className.includes('accordion') || h.className.includes('collapse') || h.getAttribute('data-toggle')));
                if (targetHeader && targetHeader.click) {
                    try { targetHeader.click(); } catch(e){}
                }

                if (extractZiraatTable()) clearInterval(interval);
                
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH'); 
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
