module.exports = {
    name: "İş Bankası",
    url: "https://www.isbank.com.tr/vadeli-tl",
    desc: "İnternet Vadeli TL",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            
            function extractIsbankTable() {
                var table = document.querySelector('table.ISB_table_basic.resTab') || document.querySelector('table');
                if (!table) return false;
                
                var headers = []; 
                var headerCells = table.querySelectorAll('thead th');
                // Skip the first header "Kanal Türü" or "VADE"
                for(var i=1; i<headerCells.length; i++) {
                    var txt = headerCells[i].innerText.trim();
                    var min = smartParseNumber(txt.split('-')[0]);
                    var max = 999999999;
                    if (txt.includes('-')) {
                        max = smartParseNumber(txt.split('-')[1]);
                        if (!max && txt.includes('ÜZERİ')) max = 999999999;
                    } else if (txt.includes('ÜZERİ')) {
                        min = smartParseNumber(txt);
                    }
                    headers.push({ label: txt, minAmount: min, maxAmount: max });
                }
                
                var tableRows = [];
                var rows = table.querySelectorAll('tbody tr');
                for(var r=0; r<rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td');
                    if (cells.length < 2) continue;
                    
                    var durTxt = cells[0].innerText.trim();
                    var durParsed = parseDuration(durTxt);
                    var rowRates = [];
                    
                    for(var c=1; c<cells.length; c++) {
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
                    var headlineRate = tableRows[0].rates[0];
                    if (tableRows.length > 1) {
                         // Prefer 32-35 days if available (usually index 1)
                         for(var t=0; t<tableRows.length; t++) {
                             if (tableRows[t].minDays >= 32 && tableRows[t].minDays <= 35) {
                                 headlineRate = tableRows[t].rates[0];
                                 break;
                             }
                         }
                    }

                    Android.sendRateWithTable(headlineRate, 'İnternet Vadeli TL', 'İş Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (step === 0) {
                    // Try to finding elements
                    var ddChannel = document.querySelector('#channelCode');
                    var ddProduct = document.querySelector('#productType');
                    
                    if (ddChannel && ddProduct) {
                        try {
                            // Select ISCEP
                            if (ddChannel.value !== 'ISCEP') {
                                ddChannel.value = 'ISCEP';
                                ddChannel.dispatchEvent(new Event('change', {bubbles:true}));
                            }
                            
                            // Select 'UzunVadeli' (Longer Term) is usually default, but ensure it.
                            // Options: 'KisaVadeli' (1-27 days), 'UzunVadeli' (28+ days)
                            // We prefer 'UzunVadeli' table for 32 days
                            if (ddProduct.value !== 'UzunVadeli') {
                                ddProduct.value = 'UzunVadeli';
                                ddProduct.dispatchEvent(new Event('change', {bubbles:true}));
                            }
                            
                            step = 1;
                            attempts = 0;
                        } catch(e) { console.log(e); }
                    }
                } else if (step === 1) {
                    // Wait for table update
                    if (extractIsbankTable()) {
                         clearInterval(interval);
                    }
                }
                
                if (++attempts > 40) { // 32 seconds
                    if (step === 0) {
                         // If we couldn't find dropdowns, maybe just scrape whatever table is there
                         if(extractIsbankTable()) clearInterval(interval);
                         else {
                            clearInterval(interval); Android.sendError('NO_MATCH'); 
                         }
                    } else {
                        clearInterval(interval); Android.sendError('NO_MATCH');
                    }
                }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR ' + e.message); }
    })()`
};
