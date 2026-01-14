module.exports = {
    name: "Yapı Kredi",
    url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
    desc: "e-Mevduat",
    script: `(function() {
        try {
            var attempts = 0;
            var step = 0;
            function log(msg) { console.log('INTERN: ' + msg); }

            function extractYapikrediTable() {
                // Selector loosened to find table wherever it is
                var table = document.getElementById('mevduatTable');
                if (!table) {
                    // Try alternative selector if ID fails?
                    table = document.querySelector('table[data-paging="true"]');
                }
                
                if (!table || table.rows.length < 2) return false;
                
                var headerCells = table.querySelectorAll('th');
                var headers = []; 
                
                // If thead th is insufficient, try to find FooTable labels or use column count
                if (headerCells.length <= 1) {
                   // Fallback: Use hardcoded headers based on bank's internal API tiers
                   // Columns 2-8 correspond to these ranges (Column 1 is Duration)
                   var ykRanges = [
                       { min: 1000, max: 24999 },
                       { min: 25000, max: 99999 },
                       { min: 100000, max: 249999 },
                       { min: 250000, max: 499999 },
                       { min: 500000, max: 999999 },
                       { min: 1000000, max: 2999999 },
                       { min: 3000000, max: 15000000 }
                   ];
                   
                   headers = ykRanges.map(function(r) {
                       return { label: r.min + " - " + r.max + " TL", minAmount: r.min, maxAmount: r.max };
                   });
                } else {
                    for (var i = 1; i < headerCells.length; i++) {
                        // If headers are visible but generic, we might still want to map them?
                        // For now trust text if visible, but standard view usually hides them.
                        var txt = headerCells[i].innerText.trim();
                        // If text is empty or generic, use our ranges if count matches
                        if (!txt && (headerCells.length - 1) === 7) {
                             var r = ykRanges[i-1];
                             if (r) headers.push({ label: r.min + " - " + r.max + " TL", minAmount: r.min, maxAmount: r.max });
                             else headers.push({ label: "Range " + i, minAmount: 1000, maxAmount: 999999999 });
                        } else {
                             headers.push({ label: txt || ('Range ' + i), minAmount: 1000, maxAmount: 999999999 });
                         }
                    }
                }
                
                if (headers.length === 0) return false;

                var tableRows = [];
                var rows = table.querySelectorAll('tbody tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].cells; if (cells.length < 2) continue;
                    
                    // Duration might be in the first or last column in FooTable
                    var durTxt = cells[0].innerText.trim();
                    var durParsed = parseDuration(durTxt);
                    var durColIdx = 0;
                    
                    if (!durParsed) {
                        durTxt = cells[cells.length - 1].innerText.trim();
                        durParsed = parseDuration(durTxt);
                        durColIdx = cells.length - 1;
                    }

                    if (!durParsed) {
                         // As a last ditch, check if duration is hidden in first column but FooTable moved it
                         var hiddenDur = cells[0].querySelector('.footable-toggle'); 
                         if (hiddenDur) { 
                             durParsed = parseDuration(hiddenDur.innerText); 
                             if (durParsed) durColIdx = 0;
                         }
                    }

                    if (!durParsed) continue;

                    var rowRates = [];
                    for (var c = 0; c < cells.length; c++) {
                        if (c === durColIdx) continue;
                        var rate = smartParseNumber(cells[c].innerText);
                        if (isNaN(rate) || rate > 100) {
                            rowRates.push(null);
                        } else {
                            rowRates.push(rate);
                        }
                    }
                    
                    // Re-align headers if they don't match rowRates length
                    var finalHeaders = headers;
                    if (rowRates.length !== headers.length) {
                        // If we have mismatched headers, try to just generate generic ones
                        finalHeaders = rowRates.map((rr, idx) => ({ label: 'Range ' + (idx+1), minAmount: 1000, maxAmount: 999999999 }));
                    }

                    if (rowRates.some(r => r !== null)) {
                        tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                        if (finalHeaders.length > 0) headers = finalHeaders;
                    }
                }
                
                if (tableRows.length > 0) {
                    Android.sendRateWithTable(tableRows[0].rates.find(r => r > 0) || 0, 'e-Mevduat', 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (step === 0) {
                   // Ensure Standart is selected
                   var labels = Array.from(document.querySelectorAll('label'));
                   var standartLabel = labels.find(l => l.innerText.includes('e-Mevduat Faiz Oranları'));
                   if (standartLabel) {
                       var radio = document.getElementById(standartLabel.getAttribute('for'));
                       if (radio) {
                           radio.click();
                           step = 1;
                           attempts = 0;
                       }
                   } else {
                       // Try clicking text directly
                       var divs = Array.from(document.querySelectorAll('div, span, label, b'));
                       var sm = divs.find(d => d.innerText.includes('e-Mevduat Faiz Oranları'));
                       if (sm) {
                           sm.click();
                           step = 1;
                           attempts = 0;
                       }
                   }
                } else if (step === 1) {
                   // Click tıklayınız
                   var links = Array.from(document.querySelectorAll('a'));
                   var link = links.find(a => a.innerText.toLowerCase().includes('tıklayınız') && 
                                             (a.parentElement.innerText.includes('e-Mevduat') || a.innerText.includes('e-Mevduat')));
                   if (link) {
                       log('Clicking "tıklayınız" link for Yapı Kredi');
                       link.click();
                       step = 2;
                       attempts = 0;
                   }
                } else {
                   if (extractYapikrediTable()) {
                       log('Yapı Kredi table extracted successfully');
                       clearInterval(interval);
                   }
                }
                
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH - Timeout step: ' + step); 
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR: ' + e.toString()); }
    })()`
};


