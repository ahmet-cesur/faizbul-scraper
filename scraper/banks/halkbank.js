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
                    var table = tables[t]; 
                    var rows = table.querySelectorAll('tr'); 
                    if (rows.length < 3) continue;
                    
                    var headerRow = rows[0];
                    var headerCells = headerRow.querySelectorAll('td, th'); 
                    if (headerCells.length < 4 || !headerRow.innerText.toLowerCase().includes('vade')) continue;
                    
                    Android.log('Found potential table with ' + rows.length + ' rows and ' + headerCells.length + ' columns');

                    var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].innerText.trim();
                        var min = smartParseNumber(txt);
                        headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                    }
                    
                    Android.log('Table columns: ' + headers.map(h => h.label).join(' | '));
                    
                    var tableRows = [];
                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); 
                        if (cells.length < 2) continue;
                        var durTxt = cells[0].innerText.trim(); 
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rate = smartParseNumber(cells[c].innerText);
                            rowRates.push(isNaN(rate) ? null : rate);
                        }
                        tableRows.push({ 
                            label: durTxt, 
                            minDays: durParsed ? durParsed.min : null, 
                            maxDays: durParsed ? durParsed.max : null, 
                            rates: rowRates 
                        });
                    }
                    
                    if (tableRows.length > 0) {
                        Android.log('Row 1 data: ' + tableRows[0].label + ' -> ' + tableRows[0].rates.join(', '));
                    }
                    
                    // VALIDATION: Ensure we have the high rates typical for Internet/Mobil
                    var hasHighRates = false;
                    var maxRateFound = 0;
                    for(var tr=0; tr<tableRows.length; tr++) {
                        for(var rr=0; rr<tableRows[tr].rates.length; rr++) {
                            var rVal = tableRows[tr].rates[rr];
                            if(rVal > maxRateFound) maxRateFound = rVal;
                            if(rVal > 20.0) { hasHighRates = true; break; }
                        }
                    }

                    Android.log('Max rate in this table: ' + maxRateFound);

                    if (tableRows.length > 0 && hasHighRates) {
                        Android.sendRateWithTable(tableRows[0].rates[0], 'İnternet Vadeli TL', 'Halkbank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                var dd = document.querySelector('#type');
                if (step === 0) {
                    if (dd) {
                        Android.log('Setting dropdown to value 2 (Internet/Mobil)');
                        dd.value = '2';
                        dd.dispatchEvent(new Event('change', {bubbles:true}));
                        if (typeof $ !== 'undefined') { 
                            $('#type').val('2').trigger('change').trigger('select2:select'); 
                        }
                        step = 1;
                        attempts = 0; 
                    } else {
                        Android.log('Waiting for #type dropdown...');
                    }
                } else if (step === 1) {
                    // Double check if value is 2
                    if (dd && dd.value !== '2') {
                        Android.log('Dropdown value mismatch (is ' + dd.value + ', expected 2). Retrying selection...');
                        dd.value = '2';
                        dd.dispatchEvent(new Event('change', {bubbles:true}));
                    }
                    
                    if (extractHalkbankTable()) {
                        Android.log('Halkbank extraction successful');
                        clearInterval(interval);
                    }
                }
                
                if (++attempts > 60) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH - Max attempts reached. Check if Internet rates are available.'); 
                }
            }, 1000);
        } catch(e) { Android.log('Error: ' + e.message); Android.sendError('PARSING_ERROR'); }
    })()`
};
