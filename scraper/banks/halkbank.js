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
                    if (headerCells.length < 4 || !headerRow.textContent.toLowerCase().includes('vade')) continue;
                    
                    var headers = [];
                    for (var i = 1; i < headerCells.length; i++) {
                        var txt = headerCells[i].textContent.trim();
                        var min = smartParseNumber(txt);
                        headers.push({ label: txt, minAmount: min || 0, maxAmount: 999999999 });
                    }
                    
                    var tableRows = [];
                    var maxRateFound = 0;

                    for (var r = 1; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th'); 
                        if (cells.length < headerCells.length) continue;
                        var durTxt = cells[0].textContent.trim(); 
                        var durParsed = parseDuration(durTxt);
                        var rowRates = [];
                        for (var c = 1; c < cells.length; c++) {
                            var rawRate = cells[c].textContent.trim();
                            var rate = smartParseNumber(rawRate);
                            rowRates.push(isNaN(rate) ? null : rate);
                            if (!isNaN(rate) && rate > maxRateFound) maxRateFound = rate;
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

                    if (tableRows.length > 5 && maxRateFound > 0) {
                        Android.sendRateWithTable(maxRateFound, 'İnternet Vadeli TL', 'Halkbank', JSON.stringify({headers: headers, rows: tableRows}));
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
                        Android.log('Setting dropdown to Internet/Mobil');
                        dd.value = '2';
                        dd.dispatchEvent(new Event('change', {bubbles:true}));
                        if (window.jQuery) { 
                            jQuery('#type').val('2').trigger('change'); 
                        }
                        step = 1;
                        attempts = 0; 
                    }
                } else if (step === 1) {
                    if (extractHalkbankTable()) {
                        clearInterval(interval);
                    }
                }
                
                if (++attempts > 40) { 
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH'); 
                }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
