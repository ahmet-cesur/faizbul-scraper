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
                var table = document.getElementById('mevduatTable') || document.querySelector('table[data-paging="true"]');
                if (!table || table.rows.length < 2) return false;
                
                var ykRanges = [
                    { min: 1000, max: 24999.99 },
                    { min: 25000, max: 99999.99 },
                    { min: 100000, max: 249999.99 },
                    { min: 250000, max: 499999.99 },
                    { min: 500000, max: 999999.99 },
                    { min: 1000000, max: 2999999.99 },
                    { min: 3000000, max: 15000000 }
                ];

                var headers = ykRanges.map(function(r) {
                    return { label: r.min + " - " + r.max + " TL", minAmount: r.min, maxAmount: r.max };
                });

                var tableRows = [];
                var rows = table.querySelectorAll('tbody tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].cells; 
                    if (cells.length < 2) continue;
                    
                    var durationIndex = 0;
                    var durTxt = cells[durationIndex].innerText.trim();
                    
                    // FooTable: Sometimes Vade is in the LAST column if 'toggle' class exists
                    if (cells[cells.length-1].classList.contains('footable-toggle') || cells[cells.length-1].innerText.toLowerCase().includes('gün')) {
                         var lastTxt = cells[cells.length-1].innerText.trim();
                         if (lastTxt.includes('Gün') || lastTxt.includes('Yıl')) {
                             durTxt = lastTxt;
                         }
                    }

                    var durParsed = parseDuration(durTxt);
                    if (!durParsed) continue;

                    var rowRates = [];
                    // Data columns are indices 1..7 likely (matching ranges)
                    var dataStartIndex = 1;
                    
                    for (var c = 0; c < headers.length; c++) {
                        var cellIdx = dataStartIndex + c;
                        if (cellIdx >= cells.length) { rowRates.push(null); continue; }
                        
                        var cell = cells[cellIdx];
                        var rate = smartParseNumber(cell.innerText);
                        if (isNaN(rate) || rate > 100) {
                            rowRates.push(null);
                        } else {
                            rowRates.push(rate);
                        }
                    }
                    
                    if (rowRates.some(r => r !== null)) {
                        tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
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


