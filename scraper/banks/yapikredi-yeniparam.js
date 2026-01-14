module.exports = {
    name: "Yapı Kredi",
    url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
    desc: "Yeni Param (Hoş Geldin)",
    script: `(function() {
        try {
            var attempts = 0;
            var step = 0;

            function extractYapikrediTable() {
                // Improved selector for FooTable
                var table = document.getElementById('mevduatTable') || document.querySelector('table[data-paging="true"]');
                if (!table || table.rows.length < 2) return false;
                
                var headers = []; 
                var headerCells = table.rows[0].cells;
                
                // Hardcoded ranges as FooTable often hides headers
                if (headerCells.length <= 1 || true) { // Force use of ranges as we know them
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
                }

                var tableRows = [];
                // Check if duration is in first or last column (FooTable quirk)
                var durationIndex = 0;
                // If the first cell of a body row looks empty or weird, and last is filled, swap?
                // Actually, standard logic observed:
                // If it's the collapsed view, things are hidden.
                // We rely on standard parsing but need to respect the columns.
                
                for (var r = 1; r < table.rows.length; r++) {
                    var cells = table.rows[r].cells; 
                    if (cells.length < 2) continue;
                    
                    // Logic from standard scraper fix
                    var durTxt = cells[durationIndex].innerText.trim();
                    
                    // FooTable: Sometimes Vade is in the LAST column if 'toggle' class exists
                    if (cells[cells.length-1].classList.contains('footable-toggle') || cells[cells.length-1].innerText.toLowerCase().includes('gün')) {
                         var lastTxt = cells[cells.length-1].innerText.trim();
                         if (lastTxt.includes('Gün') || lastTxt.includes('Yıl')) durTxt = lastTxt;
                    }

                    var durParsed = parseDuration(durTxt);
                    if (!durParsed) continue;

                    var rowRates = [];
                    // Data columns are indices 1..7 likely (matching ranges)
                    // We simply take the first 7 numeric-looking cells after skipping assumed duration?
                    // No, let's stick to index 1...headers.length
                    
                    var dataStartIndex = 1;
                    // If table has exactly 8 columns (Vade + 7 ranges)
                    
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
                    Android.sendRateWithTable(tableRows[0].rates.find(r => r > 0) || 0, 'Yeni Param (Hoş Geldin)', 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (step === 0) {
                   // Select Yeni Param radio
                   var labels = Array.from(document.querySelectorAll('label'));
                   var targetLabel = labels.find(l => l.innerText.includes('Yeni Param'));
                   if (targetLabel) {
                       var radio = document.getElementById(targetLabel.getAttribute('for'));
                       if (radio) {
                           radio.click();
                           step = 1;
                           attempts = 0;
                       }
                   } else {
                       // Try clicking the text directly if label pattern fails
                       var divs = Array.from(document.querySelectorAll('div, span, label'));
                       var yp = divs.find(d => d.innerText.includes('Yeni Param – Vade Dönüşüm Oranları'));
                       if (yp) {
                           yp.click();
                           step = 1;
                           attempts = 0;
                       }
                   }
                } else if (step === 1) {
                   // Click tıklayınız
                   var links = Array.from(document.querySelectorAll('a'));
                   var link = links.find(a => a.innerText.toLowerCase().includes('tıklayınız') && a.parentElement.innerText.includes('Yeni Param'));
                   if (link) {
                       link.click();
                       step = 2;
                       attempts = 0;
                   }
                } else {
                   if (extractYapikrediTable()) clearInterval(interval);
                }
                
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
